/**
 * `host.http.fetch` (docs/plugins.md §6): one pipeline for every request a plugin makes.
 *
 *   check the request (exact origin from the manifest, method, headers, size)
 *   → inject the secrets whose origin and path match (the plugin never sees them)
 *   → a backend: the network (resolve once, refuse a non-public IP, connect to that IP, speak
 *     HTTP/1.1 over TLS ourselves), or fixtures (`plugin dev --mock`, TG_MOCK)
 *   → cap the body (raw and decompressed), strip every secret form, drop cookies
 *   → {status, headers, body | bodyBase64}
 *
 * No redirect is followed (a 3xx comes back as it is), no cookie is kept or sent, no proxy is used
 * (the socket is opened by tls.connect to the checked IP, which reads no proxy variable), and the
 * request ends with the run (its deadline and cancellation).
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { checkServerIdentity, connect as tlsConnect, type TLSSocket } from 'node:tls';
import { createBrotliDecompress, createGunzip, createInflate, createInflateRaw, type Gunzip } from 'node:zlib';
import { HostError } from './sandbox-types.js';
import { addressProblem, nat64Prefix, type Nat64Prefix } from './net-address.js';
import type { Manifest } from './manifest.js';
import { VERSION } from '../version.js';

export const HTTP_LIMITS = {
  /** Body bytes a plugin may send. */
  requestBytes: 256 * 1024,
  /** Body bytes a plugin may receive, after decompression (and before it, on the wire). */
  responseBytes: 1024 * 1024,
  /**
   * Everything of a response that is not body, together: the status lines and headers of every
   * interim (1xx) and final answer, chunk-size lines with their extensions, the CRLF after each
   * chunk, and trailers.
   */
  headerBytes: 64 * 1024,
  /** Chunks of one chunked body (each costs at least 5 bytes of the budget above, so this binds first). */
  chunks: 8192,
  urlChars: 8192,
  headers: 50,
  headerValueChars: 8192,
  /** All the plugin's header names and values together. */
  requestHeaderBytes: 16 * 1024,
} as const;

/**
 * One request, from entering `http.fetch` (secret reads, DNS, connect, TLS, the response) to its
 * end; never past the run's deadline. Mutable for tests only.
 */
export const httpTiming = { timeoutMs: 30_000 };

/** A request ends a little before the run's deadline, so the plugin still gets its `timeout` error. */
const DEADLINE_MARGIN_MS = 250;

/** The one absolute deadline of a request entering `http.fetch` now: 30 s, or the run's end, whichever is first. */
export function requestDeadline(runDeadline: number, now = Date.now()): number {
  return Math.min(now + httpTiming.timeoutMs, runDeadline - DEADLINE_MARGIN_MS);
}

/** A text body is handed in as text only while its JSON form stays below this (else base64). */
const TEXT_JSON_CHARS = 1_500_000;

/** Request headers the plugin may not set (lower case); `proxy-*` and `sec-*` too. */
const FORBIDDEN_HEADERS = new Set([
  'host', 'cookie', 'cookie2', 'authorization', 'connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer',
  'upgrade', 'content-length', 'expect', 'accept-encoding', 'http2-settings', 'proxy-authorization', 'proxy-connection',
  // A partial body could cut an echoed secret into pieces no stripping would recognize
  'range', 'if-range',
]);
export const isForbiddenHeader = (lower: string) => FORBIDDEN_HEADERS.has(lower) || lower.startsWith('proxy-') || lower.startsWith('sec-');
/** Headers a secret may be injected as: anything the plugin could not set itself, except Authorization (the usual one). */
export const secretHeaderProblem = (header: string): string | undefined => {
  const lower = header.toLowerCase();
  if (lower === 'authorization') return undefined;
  if (isForbiddenHeader(lower)) return `"${header}" is a header the host sets itself`;
  return undefined;
};

const TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;
const VALUE_RE = /^[\t\x20-\x7e]*$/;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** A request as the host checked it: only these values reach a backend. */
export interface CheckedRequest {
  method: string;
  url: URL;
  /** The path as the plugin wrote it, before the URL parser resolved dot segments and backslashes. */
  rawPath: string;
  /** Header names as given, unique case-insensitively; the secrets' headers are added later. */
  headers: [string, string][];
  body?: Buffer;
  responseType: 'text' | 'base64';
}

/** What a backend returns: the body decompressed, at most HTTP_LIMITS.responseBytes. */
export interface RawResponse {
  status: number;
  headers: [string, string][];
  body: Buffer;
}

/** A checked request with the secret headers the host adds (never seen by the plugin). */
export type OutgoingRequest = CheckedRequest & { inject: [string, string][] };

/** `until`: the request's own absolute deadline (requestDeadline), shared by every step. */
export type Backend = (req: OutgoingRequest, signal: AbortSignal, until: number) => Promise<RawResponse>;

export interface FetchResult {
  status: number;
  headers: Record<string, string>;
  body?: string;
  bodyBase64?: string;
}

const invalid = (message: string) => new HostError('invalid_argument', message);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `https://host[:port]` exactly as the manifest must write it (a parsed URL's own origin). */
export function originProblem(origin: string): string | undefined {
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return 'is not a URL';
  }
  if (u.protocol !== 'https:') return 'is not https';
  if (u.origin !== origin) return `is not in its canonical form (${u.origin})`;
  const host = u.hostname;
  if (isIP(host.replace(/^\[|\]$/g, ''))) return 'is an IP address; name a host';
  const labels = host.split('.');
  if (labels.length < 2 || !/[a-z]/.test(labels[labels.length - 1])) return 'needs a host name with a top-level domain';
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa|.*\.arpa)$/.test(host)) return 'names a local or special-use domain';
  return undefined;
}

/** The plugin's arguments of `http.fetch(url, {method, headers, body, bodyBase64, responseType})`, checked. */
export function checkRequest(m: Manifest, urlArg: unknown, optsArg: unknown): CheckedRequest {
  if (typeof urlArg !== 'string' || !urlArg || urlArg.length > HTTP_LIMITS.urlChars) throw invalid(`url must be a string of at most ${HTTP_LIMITS.urlChars} characters`);
  let url: URL;
  try {
    url = new URL(urlArg);
  } catch {
    throw invalid('url is not a valid URL');
  }
  if (url.protocol !== 'https:') throw new HostError('network_denied', `Only https is allowed (got ${url.protocol.replace(/:$/, '')})`);
  if (url.username || url.password) throw new HostError('network_denied', 'A URL with a user name or password is not allowed');
  url.hash = '';
  const allowed = m.network ?? [];
  if (!allowed.includes(url.origin)) {
    throw new HostError('network_denied', `${url.origin} is not one of the plugin's origins (${allowed.join(', ') || 'none'})`);
  }
  const o = optsArg === undefined || optsArg === null ? {} : optsArg;
  if (!isObject(o)) throw invalid('http.fetch: options must be an object');
  for (const k of Object.keys(o)) if (!['method', 'headers', 'body', 'bodyBase64', 'responseType'].includes(k)) throw invalid(`http.fetch: unknown option "${k}"`);
  const method = o.method === undefined ? 'GET' : o.method;
  if (typeof method !== 'string' || !METHODS.has(method)) throw invalid(`method must be one of ${[...METHODS].join(', ')}`);
  const responseType = o.responseType === undefined ? 'text' : o.responseType;
  if (responseType !== 'text' && responseType !== 'base64') throw invalid('responseType must be "text" or "base64"');

  const secretHeaders = new Set((m.secrets ?? []).map(s => s.inject.header.toLowerCase()));
  const headers: [string, string][] = [];
  if (o.headers !== undefined && o.headers !== null) {
    if (!isObject(o.headers)) throw invalid('headers must be an object of name → string value');
    const seen = new Set<string>();
    const entries = Object.entries(o.headers);
    let total = 0;
    if (entries.length > HTTP_LIMITS.headers) throw invalid(`at most ${HTTP_LIMITS.headers} headers`);
    for (const [name, value] of entries) {
      if (!TOKEN_RE.test(name)) throw invalid(`header name "${name.slice(0, 100)}" is not a valid token`);
      const lower = name.toLowerCase();
      if (isForbiddenHeader(lower)) throw new HostError('network_denied', `The header ${name} is set by the host, not the plugin`);
      if (secretHeaders.has(lower)) throw new HostError('network_denied', `The header ${name} carries a secret; the host sets it`);
      if (seen.has(lower)) throw invalid(`header ${name} is given twice`);
      seen.add(lower);
      if (typeof value !== 'string' || value.length > HTTP_LIMITS.headerValueChars) throw invalid(`header ${name}: the value must be a string of at most ${HTTP_LIMITS.headerValueChars} characters`);
      if (!VALUE_RE.test(value)) throw invalid(`header ${name}: the value may hold printable ASCII and tabs only (no line breaks)`);
      total += name.length + value.length + 4;
      if (total > HTTP_LIMITS.requestHeaderBytes) throw new HostError('request_too_large', `The headers are larger than ${HTTP_LIMITS.requestHeaderBytes} bytes`);
      headers.push([name, value]);
    }
  }
  let body: Buffer | undefined;
  if (o.body !== undefined && o.bodyBase64 !== undefined) throw invalid('pass body or bodyBase64, not both');
  if (o.body !== undefined) {
    if (typeof o.body !== 'string') throw invalid('body must be a string (JSON.stringify an object first), or use bodyBase64');
    body = Buffer.from(o.body, 'utf8');
  } else if (o.bodyBase64 !== undefined) {
    if (typeof o.bodyBase64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(o.bodyBase64) || o.bodyBase64.length % 4 !== 0) throw invalid('bodyBase64 must be base64');
    body = Buffer.from(o.bodyBase64, 'base64');
  }
  if (body && !BODY_METHODS.has(method)) throw invalid(`a ${method} request has no body`);
  if (body && body.length > HTTP_LIMITS.requestBytes) {
    throw new HostError('request_too_large', `The request body is ${body.length} bytes; the limit is ${HTTP_LIMITS.requestBytes}`);
  }
  return { method, url, rawPath: rawPathOf(urlArg), headers, ...(body ? { body } : {}), responseType };
}

/**
 * The path of a URL string as written: what the URL parser sees once it dropped tabs and line
 * breaks and trimmed spaces, after the scheme and authority (which end at `/`, `\`, `?` or `#`),
 * up to the query or fragment.
 */
export function rawPathOf(urlText: string): string {
  // eslint-disable-next-line no-control-regex
  const text = urlText.replace(/[\t\n\r]/g, '').replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '');
  const rest = text.replace(/^[A-Za-z][A-Za-z0-9+.-]*:[/\\]*[^/\\?#]*/, '');
  const end = rest.search(/[?#]/);
  return end < 0 ? rest : rest.slice(0, end);
}

const UNRESERVED = /[A-Za-z0-9\-._~]/;

/**
 * Why a server might read this path as another one, or undefined. Checked on the path as the plugin
 * wrote it and as the URL parser normalised it, for a request that would carry a secret limited to
 * some paths (`/v1/..%2fadmin` is under `/v1` to the host and `/admin` to a server that decodes
 * first): a `\` or `;`, a `%` without two hex digits, an encoded `/`, `\`, `.`, `;` or `%`, any
 * encoding that is not normalised (an encoded unreserved character, lowercase hex), an empty
 * segment, a `.` or `..` segment. A trailing `/` is allowed.
 */
export function pathProblem(path: string): string | undefined {
  if (/[\\;]/.test(path)) return 'a "\\" or ";"';
  for (let i = path.indexOf('%'); i >= 0; i = path.indexOf('%', i + 1)) {
    const hex = path.slice(i + 1, i + 3);
    if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return 'a "%" without two hex digits';
    const ch = String.fromCharCode(parseInt(hex, 16));
    if ('/\\.;%'.includes(ch)) return 'an encoded "/", "\\", ".", ";" or "%"';
    if (UNRESERVED.test(ch)) return 'an encoded letter, digit or "-._~" (not normalised)';
    if (hex !== hex.toUpperCase()) return 'a lowercase percent-encoding (not normalised)';
  }
  const segments = path.split('/').slice(1);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === '' && i < segments.length - 1) return 'an empty segment ("//")';
    if (seg === '.' || seg === '..') return 'a "." or ".." segment';
  }
  return undefined;
}

/**
 * Does a secret's `inject` apply to this URL: the exact origin, and with `paths` a path equal to one
 * or below it on a segment boundary. An empty `paths` list matches nothing (the schema refuses one;
 * an installation from before that rule never gets its secret sent anywhere).
 */
export function injectMatches(inject: { origin: string; paths?: string[] }, url: URL): boolean {
  if (url.origin !== inject.origin) return false;
  if (inject.paths === undefined) return true;
  const path = url.pathname;
  return inject.paths.some(p => p !== '' && (path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`)));
}

// ---------- removing secrets from a response ----------

/**
 * Every form of a secret an endpoint might echo: the value and its formatted header, each as is,
 * URL-encoded (both ways), JSON-escaped, hex, and base64 / base64url at each of the three byte
 * alignments (so a secret inside a longer base64 text, such as `Basic base64(user:key)`, is found).
 */
export function secretForms(values: string[]): Buffer[] {
  const forms = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    forms.add(v);
    forms.add(encodeURIComponent(v));
    forms.add(encodeURIComponent(v).replace(/%20/g, '+'));
    // application/x-www-form-urlencoded (URLSearchParams, HTML forms) also encodes !'()~
    forms.add(new URLSearchParams({ k: v }).toString().slice(2));
    forms.add(JSON.stringify(v).slice(1, -1));
    const raw = Buffer.from(v, 'utf8');
    forms.add(raw.toString('hex'));
    forms.add(raw.toString('hex').toUpperCase());
    // Whole base64 (with its padding) first; the alignments below catch it inside a longer text
    forms.add(raw.toString('base64'));
    forms.add(raw.toString('base64url'));
    for (let k = 0; k < 3; k++) {
      const shifted = Buffer.concat([Buffer.alloc(k), raw]);
      const from = Math.ceil((k * 8) / 6);
      const to = Math.floor(((k + raw.length) * 8) / 6);
      for (const enc of ['base64', 'base64url'] as const) {
        const s = shifted.toString(enc).slice(from, to);
        if (s.length >= 8) forms.add(s);
      }
    }
  }
  // Longest first, so a formatted header goes as a whole before its value inside it
  return [...forms].filter(f => f.length >= 8).sort((a, b) => b.length - a.length).map(f => Buffer.from(f, 'utf8'));
}

const MARK = Buffer.from('[secret]');

/** `buf` with every occurrence of every form replaced by `[secret]`. */
export function stripForms(buf: Buffer, forms: Buffer[]): Buffer {
  let out = buf;
  for (const f of forms) {
    if (out.indexOf(f) < 0) continue;
    const parts: Buffer[] = [];
    let at = 0;
    for (let i = out.indexOf(f); i >= 0; i = out.indexOf(f, at)) {
      parts.push(out.subarray(at, i), MARK);
      at = i + f.length;
    }
    parts.push(out.subarray(at));
    out = Buffer.concat(parts);
  }
  return out;
}

/** The answer the sandbox gets: secrets stripped from body and headers, cookies dropped, text or base64. */
export function shapeResponse(r: RawResponse, forms: Buffer[], responseType: 'text' | 'base64'): FetchResult {
  const headers: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [name, value] of r.headers) {
    const lower = name.toLowerCase();
    if (lower === 'set-cookie' || lower === 'set-cookie2') continue;
    // The body is handed in decoded and whole: these would describe the bytes on the wire
    if (lower === 'content-encoding' || lower === 'content-length' || lower === 'transfer-encoding') continue;
    const cleanName = stripForms(Buffer.from(lower, 'latin1'), forms).toString('latin1');
    if (cleanName !== lower) continue;
    const clean = stripForms(Buffer.from(value, 'latin1'), forms).toString('latin1');
    headers[lower] = lower in headers ? `${headers[lower]}, ${clean}` : clean;
  }
  const body = stripForms(r.body, forms);
  if (responseType === 'text') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
      // The bridge counts UTF-8 bytes of the JSON it hands in
      if (Buffer.byteLength(JSON.stringify(text)) <= TEXT_JSON_CHARS) return { status: r.status, headers: { ...headers }, body: text };
    } catch {
      // not UTF-8: handed in as base64
    }
  }
  return { status: r.status, headers: { ...headers }, bodyBase64: body.toString('base64') };
}

// ---------- the network backend ----------

export interface NetDeps {
  /** Every address of a host name (one DNS resolution per request). */
  lookup(hostname: string): Promise<{ address: string; family: number }[]>;
  /** A TLS connection to exactly this address, verified for `servername`. */
  connect(o: { address: string; family: number; port: number; servername: string }): TLSSocket;
}

/**
 * The real resolver and TLS connect (the system's CAs; `ca` only for a test's own local server). A
 * plain tls.connect to an IP literal reads no proxy variable (HTTPS_PROXY, NODE_USE_ENV_PROXY).
 */
export function systemNet(tlsExtra: { ca?: string | Buffer } = {}): NetDeps {
  return {
    lookup: async hostname => {
      const all = await dnsLookup(hostname, { all: true, verbatim: true });
      return all.map(a => ({ address: a.address, family: a.family }));
    },
    connect: ({ address, port, servername }) => {
      const socket = tlsConnect({
        host: address, port, servername, ALPNProtocols: ['http/1.1'], minVersion: 'TLSv1.2', ...tlsExtra,
        // Set here, never inherited: NODE_TLS_REJECT_UNAUTHORIZED=0 in the environment changes nothing,
        // and the certificate must name the origin's host (the socket is opened to an IP literal)
        rejectUnauthorized: true,
        checkServerIdentity: (_host, cert) => checkServerIdentity(servername, cert),
      });
      // The socket must reach the address that was checked, nothing else
      socket.once('secureConnect', () => {
        const remote = (socket.remoteAddress ?? '').replace(/^::ffff:(?=\d+\.)/, '');
        if (remote !== address.replace(/^::ffff:(?=\d+\.)/, '')) socket.destroy(new Error(`connected to ${remote}, not ${address}`));
      });
      return socket;
    },
  };
}

/** RFC 7050: the name whose AAAA answers show the network's own NAT64 prefixes (DNS64). */
export const NAT64_DISCOVERY_NAME = 'ipv4only.arpa';

/**
 * Resolve once, refuse any non-public address, then connect to the address that was checked. When
 * an answer is IPv6, the network's own NAT64 prefixes are discovered once per backend (one run)
 * through the same resolver (RFC 7050), so an address that a translator would carry to a private
 * IPv4 address is refused too; a failed discovery adds no prefix.
 */
export function networkBackend(net: NetDeps): Backend {
  let prefixes: Promise<Nat64Prefix[]> | undefined;
  const discover = (signal: AbortSignal, until: number) => (prefixes ??= withTimeout(net.lookup(NAT64_DISCOVERY_NAME), signal, until)
    .then(all => {
      const out: Nat64Prefix[] = [];
      for (const a of all) {
        const p = nat64Prefix(a.address);
        if (p && !out.some(x => x.text === p.text)) out.push(p);
      }
      return out;
    }, () => []));
  return async (req, signal, until) => {
    const host = req.url.hostname;
    const literal = host.replace(/^\[|\]$/g, '');
    let addresses: { address: string; family: number }[];
    if (isIP(literal)) addresses = [{ address: literal, family: isIP(literal) }];
    else {
      try {
        addresses = await withTimeout(net.lookup(host), signal, until);
      } catch (e) {
        if (e instanceof HostError) throw e;
        throw new HostError('network', `Could not resolve ${host}: ${(e as Error).message}`);
      }
    }
    if (!addresses.length) throw new HostError('network', `${host} has no address`);
    const nat64 = addresses.some(a => isIP(a.address.replace(/%.*$/, '')) === 6) ? await discover(signal, until) : [];
    if (signal.aborted) throw new HostError('cancelled', 'The run ended');
    // Every address must be public: one private answer makes the whole name suspect
    for (const a of addresses) {
      const why = addressProblem(a.address, nat64);
      if (why) throw new HostError('network_denied', `${host} resolves to ${a.address} (${why}); plugins reach public addresses only`);
    }
    const target = addresses[0];
    const port = req.url.port ? Number(req.url.port) : 443;
    return exchange(() => net.connect({ address: target.address, family: target.family, port, servername: host }), req, signal, until);
  };
}

const remainingMs = (until: number) => Math.max(0, until - Date.now());

/** `p`, or `timeout` at the request's deadline, or `cancelled` when the run ends. */
export function withTimeout<T>(p: Promise<T>, signal: AbortSignal, until: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      p.catch(() => {});
      return reject(new HostError('cancelled', 'The run ended'));
    }
    const timer = setTimeout(() => reject(new HostError('timeout', 'The request took too long')), remainingMs(until));
    const onAbort = () => reject(new HostError('cancelled', 'The run ended'));
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    });
  });
}

/** The request as bytes on the wire: only the checked values, CRLF nowhere but between lines. */
export function requestHead(req: CheckedRequest, extra: [string, string][]): string {
  const target = `${req.url.pathname || '/'}${req.url.search}`;
  const lines = [`${req.method} ${target} HTTP/1.1`, `Host: ${req.url.host}`];
  const all = [...req.headers, ...extra];
  if (!all.some(([n]) => n.toLowerCase() === 'user-agent')) lines.push(`User-Agent: better-tg-cli-plugin/${VERSION}`);
  for (const [n, v] of all) {
    if (!TOKEN_RE.test(n) || !VALUE_RE.test(v)) throw new HostError('invalid_argument', `header ${n} is not valid`);
    lines.push(`${n}: ${v}`);
  }
  lines.push('Accept-Encoding: gzip, deflate, br', 'Connection: close');
  if (req.body || BODY_METHODS.has(req.method)) lines.push(`Content-Length: ${req.body?.length ?? 0}`);
  return `${lines.join('\r\n')}\r\n\r\n`;
}

const tooLarge = () => new HostError('response_too_large', `The response is larger than ${HTTP_LIMITS.responseBytes} bytes`);
// A server-supplied value is never put into an error: error messages reach the sandbox unstripped
const badResponse = (why: string) => new HostError('bad_response', `The server's response is not valid HTTP/1.1: ${why}`);

/** What one response may spend on everything that is not body (HTTP_LIMITS.headerBytes, .chunks). */
class Overhead {
  private bytes = 0;
  private chunks = 0;
  /** false once the response spent more than its budget. */
  spend(n: number): boolean {
    this.bytes += n;
    return this.bytes <= HTTP_LIMITS.headerBytes;
  }
  /** Would `n` more bytes still fit (a head whose end has not arrived yet)? */
  fits(n: number): boolean {
    return this.bytes + n <= HTTP_LIMITS.headerBytes;
  }
  chunk(): boolean {
    return ++this.chunks <= HTTP_LIMITS.chunks;
  }
}

/** The body in one buffer that grows by doubling (never one buffer per socket read or per chunk). */
class BodySink {
  private buf = Buffer.alloc(0);
  length = 0;
  /** false when the body passed the limit. */
  push(b: Buffer): boolean {
    if (!b.length) return true;
    if (this.length + b.length > HTTP_LIMITS.responseBytes) return false;
    if (this.length + b.length > this.buf.length) {
      const next = Buffer.alloc(Math.min(HTTP_LIMITS.responseBytes, Math.max(16 * 1024, this.buf.length * 2, this.length + b.length)));
      this.buf.copy(next, 0, 0, this.length);
      this.buf = next;
    }
    b.copy(this.buf, this.length);
    this.length += b.length;
    return true;
  }
  bytes(): Buffer {
    return this.buf.subarray(0, this.length);
  }
}

/**
 * One HTTP/1.1 exchange on a fresh TLS socket: send, read the head (interim 1xx skipped), read the
 * body by Content-Length, chunked or until close (≤ 1 MB on the wire, in one buffer), then
 * decompress (≤ 1 MB, stopping at the limit). Heads, chunk lines and trailers share one 64 KB
 * budget. Secrets are added to the head here (`req.inject`). `until`: the request's deadline.
 */
export function exchange(open: () => TLSSocket, req: OutgoingRequest, signal: AbortSignal, until: number): Promise<RawResponse> {
  return new Promise<RawResponse>((resolve, reject) => {
    if (signal.aborted) return reject(new HostError('cancelled', 'The run ended'));
    let socket: TLSSocket;
    let settled = false;
    const finish = (err: Error | undefined, value?: RawResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      socket?.destroy();
      if (err) reject(err);
      else resolve(value!);
    };
    const timer = setTimeout(() => finish(new HostError('timeout', 'The request took too long')), remainingMs(until));
    const onAbort = () => finish(new HostError('cancelled', 'The run ended'));
    signal.addEventListener('abort', onAbort, { once: true });
    let head: string;
    try {
      head = requestHead(req, req.inject);
      socket = open();
    } catch (e) {
      return finish(e instanceof HostError ? e : new HostError('network', (e as Error).message));
    }
    socket.once('secureConnect', () => {
      socket.write(head, 'latin1');
      if (req.body?.length) socket.write(req.body);
    });
    socket.on('error', e => ended || finish(e instanceof HostError ? e : new HostError('network', `${req.url.host}: ${e.message}`)));

    let buf = Buffer.alloc(0);
    let status = 0;
    let headers: [string, string][] = [];
    let framing: { kind: 'length'; left: number } | { kind: 'chunked'; parser: ChunkParser } | { kind: 'close' } | { kind: 'none' } | undefined;
    const overhead = new Overhead();
    const body = new BodySink();
    // The body is complete: the socket is no longer read, only the decoding can still fail
    let ended = false;
    const done = () => {
      ended = true;
      socket.destroy();
      let decoded: Promise<Buffer>;
      try {
        decoded = decompress(body.bytes(), headerValue(headers, 'content-encoding'));
      } catch (e) {
        decoded = Promise.reject(e instanceof HostError ? e : badResponse('the body could not be decoded'));
      }
      decoded.then(b => finish(undefined, { status, headers, body: b }), e => finish(e instanceof HostError ? e : badResponse('the body could not be decoded')));
    };
    const feedBody = (chunk: Buffer) => {
      if (!framing) return;
      if (framing.kind === 'length') {
        const take = chunk.subarray(0, framing.left);
        framing.left -= take.length;
        if (!body.push(take)) return finish(tooLarge());
        if (framing.left === 0) done();
      } else if (framing.kind === 'chunked') {
        const r = framing.parser.feed(chunk, body, overhead);
        if (r === 'too-large') return finish(tooLarge());
        if (typeof r === 'object') return finish(badResponse(r.error));
        if (r === 'done') done();
      } else if (framing.kind === 'close') {
        if (!body.push(chunk)) finish(tooLarge());
      }
    };
    socket.on('data', (chunk: Buffer) => {
      if (settled || ended) return;
      if (framing) return feedBody(chunk);
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const end = buf.indexOf('\r\n\r\n');
        if (end < 0) {
          // What is buffered counts against the budget too, before its end is seen
          if (!overhead.fits(buf.length)) finish(badResponse('the headers are longer than 64 KB'));
          return;
        }
        // Every head, the interim ones included, spends the one budget
        if (!overhead.spend(end + 4)) return finish(badResponse('the headers are longer than 64 KB'));
        const parsed = parseHead(buf.subarray(0, end).toString('latin1'));
        if ('error' in parsed) return finish(badResponse(parsed.error));
        buf = buf.subarray(end + 4);
        if (parsed.status >= 100 && parsed.status < 200) {
          if (parsed.status === 101) return finish(badResponse('the server switched protocols'));
          continue; // an interim answer (103 Early Hints): the real one follows
        }
        status = parsed.status;
        headers = parsed.headers;
        const f = bodyFraming(req.method, status, headers);
        if ('error' in f) return finish(badResponse(f.error));
        framing = f;
        if (framing.kind === 'length' && framing.left > HTTP_LIMITS.responseBytes) return finish(tooLarge());
        if (framing.kind === 'none' || (framing.kind === 'length' && framing.left === 0)) return done();
        const rest = buf;
        buf = Buffer.alloc(0);
        if (rest.length) feedBody(rest);
        return;
      }
    });
    socket.on('end', () => {
      if (settled || ended) return;
      if (framing?.kind === 'close') return done();
      finish(badResponse(framing ? 'the connection closed before the body ended' : 'the connection closed before a response'));
    });
    socket.on('close', () => {
      if (!settled && !ended) finish(badResponse('the connection closed'));
    });
  });
}

function headerValue(headers: [string, string][], name: string): string | undefined {
  const all = headers.filter(([n]) => n.toLowerCase() === name).map(([, v]) => v);
  return all.length ? all.join(', ') : undefined;
}

function parseHead(text: string): { status: number; headers: [string, string][] } | { error: string } {
  const lines = text.split('\r\n');
  const m = /^HTTP\/1\.[01] (\d{3})(?: [\t\x20-\x7e\x80-\xff]*)?$/.exec(lines[0]);
  if (!m) return { error: 'bad status line' };
  const headers: [string, string][] = [];
  for (const line of lines.slice(1)) {
    if (/^[ \t]/.test(line)) return { error: 'folded header lines' };
    const i = line.indexOf(':');
    if (i <= 0) return { error: 'a header line without a name' };
    const name = line.slice(0, i);
    if (!TOKEN_RE.test(name)) return { error: 'a header name with invalid characters' };
    if (/[\0\r\n]/.test(line)) return { error: 'a header with a control character' };
    headers.push([name, line.slice(i + 1).trim()]);
  }
  return { status: Number(m[1]), headers };
}

function bodyFraming(method: string, status: number, headers: [string, string][]):
  { kind: 'length'; left: number } | { kind: 'chunked'; parser: ChunkParser } | { kind: 'close' } | { kind: 'none' } | { error: string } {
  if (method === 'HEAD' || status === 204 || status === 304) return { kind: 'none' };
  const te = headerValue(headers, 'transfer-encoding');
  if (te !== undefined) {
    // Only chunked: the host cannot undo any other transfer coding (gzip on the wire would hide
    // an echoed secret from the stripper and the size limit from the body)
    if (te.trim().toLowerCase() !== 'chunked') return { error: 'a transfer coding other than chunked' };
    return { kind: 'chunked', parser: new ChunkParser() };
  }
  const lengths = headers.filter(([n]) => n.toLowerCase() === 'content-length').flatMap(([, v]) => v.split(',').map(s => s.trim()));
  if (lengths.length) {
    if (!lengths.every(l => /^\d{1,15}$/.test(l)) || new Set(lengths).size !== 1) return { error: 'Content-Length' };
    return { kind: 'length', left: Number(lengths[0]) };
  }
  return { kind: 'close' };
}

/** Chunked transfer coding, parsed as bytes arrive, written straight into the body's buffer. */
class ChunkParser {
  private state: 'size' | 'data' | 'data-crlf' | 'trailer' | 'done' = 'size';
  private line = '';
  private left = 0;

  feed(chunk: Buffer, body: BodySink, overhead: Overhead): 'more' | 'done' | 'too-large' | { error: string } {
    let i = 0;
    while (i < chunk.length && this.state !== 'done') {
      if (this.state === 'data') {
        const take = chunk.subarray(i, i + this.left);
        if (!body.push(take)) return 'too-large';
        this.left -= take.length;
        i += take.length;
        if (this.left === 0) this.state = 'data-crlf';
        continue;
      }
      // Size lines with their extensions, the CRLF after each chunk and trailers: all overhead
      const c = chunk[i++];
      if (!overhead.spend(1)) return { error: 'the chunk lines and trailers are longer than 64 KB' };
      this.line += String.fromCharCode(c);
      if (this.line.length > 4096) return { error: 'a chunk line is too long' };
      if (!this.line.endsWith('\r\n')) continue;
      const line = this.line.slice(0, -2);
      this.line = '';
      if (this.state === 'data-crlf') {
        if (line !== '') return { error: 'a chunk does not end with CRLF' };
        this.state = 'size';
      } else if (this.state === 'size') {
        const m = /^([0-9a-fA-F]{1,8})(;.*)?$/.exec(line);
        if (!m) return { error: 'a bad chunk size' };
        this.left = parseInt(m[1], 16);
        if (this.left > 0 && !overhead.chunk()) return { error: `more than ${HTTP_LIMITS.chunks} chunks` };
        this.state = this.left === 0 ? 'trailer' : 'data';
      } else if (this.state === 'trailer') {
        if (line === '') this.state = 'done';
      }
    }
    return this.state === 'done' ? 'done' : 'more';
  }
}

/** The decoders the host asked for (`Accept-Encoding`); a Map, so no inherited name is a decoder. */
const DECODERS = new Map<string, () => Gunzip>([
  ['gzip', () => createGunzip()],
  ['x-gzip', () => createGunzip()],
  ['deflate', () => createInflate() as unknown as Gunzip],
  ['br', () => createBrotliDecompress() as unknown as Gunzip],
]);

/** The body decoded by its Content-Encoding, stopping as soon as it passes the limit (a gzip bomb ends there). */
export function decompress(raw: Buffer, encoding: string | undefined): Promise<Buffer> {
  const enc = (encoding ?? 'identity').trim().toLowerCase();
  if (enc === '' || enc === 'identity') return Promise.resolve(raw);
  const make = DECODERS.get(enc);
  // The server's value is not repeated: it never reaches the sandbox unstripped
  if (!make) return Promise.reject(badResponse('a content encoding that was not asked for'));
  const run = (create: () => Gunzip) => new Promise<Buffer>((resolve, reject) => {
    let z: Gunzip;
    try {
      z = create();
    } catch {
      reject(badResponse('the body could not be decoded'));
      return;
    }
    const out = new BodySink();
    let over = false;
    z.on('data', (b: Buffer) => {
      if (over) return;
      if (!out.push(b)) {
        over = true;
        z.destroy();
        reject(tooLarge());
      }
    });
    z.on('error', e => { if (!over) reject(e); });
    z.on('end', () => { if (!over) resolve(Buffer.from(out.bytes())); });
    try {
      z.end(raw);
    } catch {
      reject(badResponse('the body could not be decoded'));
    }
  });
  return run(make).catch(e => {
    if (e instanceof HostError && e.code !== 'bad_response') throw e;
    // "deflate" is sometimes sent without its zlib wrapper
    if (enc === 'deflate') return run(() => createInflateRaw() as unknown as Gunzip).catch(e2 => { throw e2 instanceof HostError && e2.code === 'response_too_large' ? e2 : badResponse('the deflate body is damaged'); });
    throw badResponse(`the ${enc} body is damaged`);
  });
}

// ---------- fixtures (plugin dev --mock, TG_MOCK) ----------

export interface Fixture {
  method: string;
  url: string;
  status: number;
  headers: [string, string][];
  body: Buffer;
}

/** Fixtures from JSON: one `{request: {method, url}, response: {status, headers, body | bodyBase64 | json}}` or a list. */
export function parseFixtures(json: unknown, where: string): Fixture[] {
  const list = Array.isArray(json) ? json : [json];
  return list.map((f, i) => {
    const at = `${where}${Array.isArray(json) ? `[${i}]` : ''}`;
    if (!isObject(f) || !isObject(f.request) || !isObject(f.response)) throw new Error(`${at}: needs "request" and "response" objects`);
    const method = f.request.method ?? 'GET';
    if (typeof method !== 'string' || !METHODS.has(method)) throw new Error(`${at}: request.method must be one of ${[...METHODS].join(', ')}`);
    if (typeof f.request.url !== 'string') throw new Error(`${at}: request.url must be a string`);
    let url: string;
    try {
      const u = new URL(f.request.url);
      u.hash = '';
      url = u.href;
    } catch {
      throw new Error(`${at}: request.url is not a URL`);
    }
    const r = f.response;
    const status = r.status ?? 200;
    if (typeof status !== 'number' || !Number.isInteger(status) || status < 200 || status > 599) throw new Error(`${at}: response.status must be 200-599`);
    const headers: [string, string][] = [];
    if (r.headers !== undefined) {
      if (!isObject(r.headers)) throw new Error(`${at}: response.headers must be an object`);
      for (const [n, v] of Object.entries(r.headers)) {
        if (!TOKEN_RE.test(n) || typeof v !== 'string' || !VALUE_RE.test(v)) throw new Error(`${at}: response header ${n} is not valid`);
        headers.push([n.toLowerCase(), v]);
      }
    }
    const given = ['body', 'bodyBase64', 'json'].filter(k => r[k] !== undefined);
    if (given.length > 1) throw new Error(`${at}: give one of response.body, bodyBase64, json`);
    let body = Buffer.alloc(0);
    if (r.body !== undefined) {
      if (typeof r.body !== 'string') throw new Error(`${at}: response.body must be a string`);
      body = Buffer.from(r.body, 'utf8');
    } else if (r.bodyBase64 !== undefined) {
      if (typeof r.bodyBase64 !== 'string') throw new Error(`${at}: response.bodyBase64 must be a string`);
      body = Buffer.from(r.bodyBase64, 'base64');
    } else if (r.json !== undefined) {
      body = Buffer.from(JSON.stringify(r.json), 'utf8');
      if (!headers.some(([n]) => n === 'content-type')) headers.push(['content-type', 'application/json']);
    }
    return { method, url, status, headers, body };
  });
}

/** Answers from fixtures by method and exact URL; an unmatched request is an error, never the network. */
export function fixtureBackend(fixtures: Fixture[], label: string): Backend {
  return async req => {
    const f = fixtures.find(x => x.method === req.method && x.url === req.url.href);
    if (!f) throw new HostError('fixture_missing', `No ${label} fixture answers ${req.method} ${req.url.href}`);
    if (f.body.length > HTTP_LIMITS.responseBytes) throw tooLarge();
    return { status: f.status, headers: f.headers, body: f.body };
  };
}

/** Under VITEST without an injected backend: no request reaches a socket. */
export const refusingBackend: Backend = async () => {
  throw new HostError('network_denied', 'Tests never reach the network');
};
