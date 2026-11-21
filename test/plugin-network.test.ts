import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer, type Server } from 'node:https';
import { isIP, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { connect as tlsConnect } from 'node:tls';
import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib';
import type { TelegramClient } from 'teleproto';
import { checkManifest, type Manifest } from '../src/plugins/manifest.js';
import { memoryCursors, memoryStorage, runDeps, runPluginCommand, type NetworkStats } from '../src/plugins/run.js';
import { addressProblem } from '../src/plugins/net-address.js';
import {
  checkRequest, injectMatches, networkBackend, originProblem, secretForms, stripForms, systemNet, type NetDeps,
} from '../src/plugins/http.js';
import { CliError } from '../src/errors.js';

// No real network anywhere: every name resolves through `lookup` below to a public-looking address,
// and every connection dials this file's own HTTPS server on 127.0.0.1 with a test-only certificate
// (SANs api.example.com, other.example.com, api.example.org) trusted only here.
const CERT = readFileSync(resolve('test/fixtures/tls/test-cert.pem'));
const KEY = readFileSync(resolve('test/fixtures/tls/test-key.pem'));
const LAB = resolve('test/fixtures/plugins/net-lab');
const manifest = checkManifest(readFileSync(resolve(LAB, 'tg-plugin.json')), '99.0.0').manifest as Manifest;
const code = readFileSync(resolve(LAB, 'code/net.js'), 'utf8');
const PUBLIC = '93.184.216.34';

const SECRET = 'sk/test+KEY=1234567890abc';
const OTHER = 'other-key-0987654321';

interface Seen { method: string; url: string; headers: IncomingMessage['headers']; body: string }
let server: Server;
let port: number;
const seen: Seen[] = [];

function route(req: IncomingMessage, res: ServerResponse, body: string) {
  const url = new URL(req.url!, 'https://x');
  const auth = String(req.headers.authorization ?? '');
  switch (url.pathname) {
    case '/v1/echo':
    case '/v2/echo':
    case '/v1x/echo':
    case '/echo': {
      const value = auth.replace(/^Bearer /, '') || String(req.headers['x-api-key'] ?? '');
      res.setHeader('x-echo', auth || value);
      res.setHeader('x-echo-b64', Buffer.from(value).toString('base64'));
      res.setHeader('set-cookie', 'session=abc; Path=/');
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        headers: req.headers,
        plain: value,
        formatted: auth,
        url: encodeURIComponent(auth),
        urlValue: encodeURIComponent(value),
        b64: Buffer.from(auth).toString('base64'),
        b64url: Buffer.from(value).toString('base64url'),
        // The header inside a longer base64 text, at another byte alignment
        embedded: Buffer.from(`x-forwarded: Authorization: ${auth};`).toString('base64'),
        hex: Buffer.from(value).toString('hex'),
        json: JSON.stringify({ k: value }),
        body,
      }));
      return;
    }
    case '/redirect':
      res.writeHead(302, { location: 'https://127.0.0.1/admin' });
      res.end('moved');
      return;
    case '/big': {
      const n = Number(url.searchParams.get('n'));
      res.setHeader('content-length', String(n));
      res.end(Buffer.alloc(n, url.searchParams.get('bin') ? 0xff : 0x61));
      return;
    }
    case '/chunked-big':
      // No Content-Length: Node sends it chunked; 2 MB in 64 KB pieces
      for (let i = 0; i < 32; i++) res.write(Buffer.alloc(64 * 1024, 0x62));
      res.end();
      return;
    case '/gzip-bomb':
      res.setHeader('content-encoding', 'gzip');
      res.end(gzipSync(Buffer.alloc(20 * 1024 * 1024)));
      return;
    case '/gzip':
      res.setHeader('content-encoding', 'gzip');
      res.end(gzipSync(Buffer.from('compressed hello')));
      return;
    case '/br':
      res.setHeader('content-encoding', 'br');
      res.end(brotliCompressSync(Buffer.from('brotli hello')));
      return;
    case '/deflate':
      res.setHeader('content-encoding', 'deflate');
      res.end(deflateSync(Buffer.from('deflate hello')));
      return;
    case '/binary':
      res.end(Buffer.from([0xff, 0xfe, 0x00, 0x80]));
      return;
    case '/v1/partial':
      res.writeHead(206, { 'content-range': 'bytes 0-3/100' });
      res.end('part');
      return;
    case '/hang':
      return; // never answers
    default:
      res.end(`ok ${req.method} ${url.pathname}${url.search}`);
  }
}

beforeAll(async () => {
  server = createServer({ key: KEY, cert: CERT }, (req, res) => {
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => parts.push(c));
    req.on('end', () => {
      const body = Buffer.concat(parts).toString('utf8');
      seen.push({ method: req.method!, url: req.url!, headers: req.headers, body });
      route(req, res, body);
    });
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>(r => { server.closeAllConnections(); server.close(() => r()); }));
afterEach(() => {
  seen.length = 0;
  delete runDeps.limits;
});

/** DNS answers per host (a function may answer differently each time), and the dials it was asked for. */
function testNet(answers: Record<string, string[] | (() => string[])> = {}) {
  const lookups: string[] = [];
  const dials: { address: string; port: number; servername: string }[] = [];
  const net: NetDeps = {
    lookup: async host => {
      lookups.push(host);
      const a = answers[host] ?? [PUBLIC];
      return (typeof a === 'function' ? a() : a).map(address => ({ address, family: isIP(address) }));
    },
    connect: o => {
      dials.push({ address: o.address, port: o.port, servername: o.servername });
      return tlsConnect({ host: '127.0.0.1', port, servername: o.servername, ca: CERT, ALPNProtocols: ['http/1.1'] });
    },
  };
  return { net, lookups, dials };
}

const noTelegram = async (): Promise<TelegramClient> => { throw new Error('no Telegram in this test'); };

async function run(command: string, input: Record<string, unknown>, net: NetDeps, opts: { secrets?: Record<string, string>; m?: Manifest; signal?: AbortSignal; stats?: NetworkStats } = {}) {
  const m = opts.m ?? manifest;
  const secrets = opts.secrets ?? { apikey: SECRET, other: OTHER };
  const out = await runPluginCommand({
    manifest: m, command: m.commands!.find(c => c.name === command)!, code, filename: 'code/net.js', input,
    client: noTelegram, account: async () => '1000', storage: async () => memoryStorage(m), cursors: memoryCursors(), installId: 'plugin-dev',
    mcp: false, signal: opts.signal,
    network: { backend: networkBackend(net), secret: n => secrets[n] ?? null, setCommand: n => ['plugin', 'secret', 'set', m.name, n] },
  }, [], opts.stats);
  return out.envelope.data as any;
}
const fetchVia = (net: NetDeps, url: string, opts?: Record<string, unknown>, extra = {}) => run('fetch', { url, ...(opts ? { opts } : {}) }, net, extra);

describe('the addresses a plugin may connect to', () => {
  it('refuses loopback, private, link-local, CGNAT, multicast, unspecified and their IPv6 forms', () => {
    for (const ip of [
      '127.0.0.1', '127.1.2.3', '10.0.0.1', '172.16.5.4', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '100.127.255.255',
      '0.0.0.0', '224.0.0.1', '239.255.255.250', '255.255.255.255', '192.0.2.1', '198.51.100.7', '203.0.113.9', '198.18.0.1',
      '::', '::1', 'fd00::1', 'fc00::abcd', 'fe80::1', 'febf::1', 'ff02::1', 'fec0::1',
      '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.1.2.3', '::ffff:169.254.169.254', '::127.0.0.1',
      '64:ff9b::7f00:1', '64:ff9b::10.0.0.1', '64:ff9b:1::1', '2002:7f00:1::1', '2002:a00:1::', '2001::1', '2001:db8::1', '100::1',
      'fe80::1%en0', 'not-an-ip',
    ]) expect(addressProblem(ip), ip).toBeDefined();
  });

  it('allows public unicast, IPv4 and IPv6, and NAT64 / 6to4 / mapped forms of a public address', () => {
    for (const ip of ['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4001:80b::200e', '::ffff:93.184.216.34', '64:ff9b::5db8:d822', '2002:5db8:d822::1', '172.32.0.1', '100.128.0.1']) {
      expect(addressProblem(ip), ip).toBeUndefined();
    }
  });
});

describe('manifest origins and the URL a request names', () => {
  it('an origin is https, canonical, by host name, not local or an IP', () => {
    expect(originProblem('https://api.example.com')).toBeUndefined();
    for (const o of ['http://api.example.com', 'https://API.example.com', 'https://api.example.com.', 'https://127.0.0.1', 'https://2130706433', 'https://[::1]', 'https://localhost', 'https://printer.local', 'https://intranet', 'https://user@api.example.com', 'https://api.example.com/']) {
      expect(originProblem(o), o).toBeDefined();
    }
  });

  it('only the exact origins of the manifest, https, no user info, no other port, no trailing dot, no lookalike', () => {
    const denied = (url: string) => {
      try {
        checkRequest(manifest, url, {});
      } catch (e) {
        return (e as { code: string }).code;
      }
      return 'allowed';
    };
    expect(denied('https://api.example.com/v1/x?q=1')).toBe('allowed');
    expect(denied('https://API.EXAMPLE.COM/v1')).toBe('allowed'); // the same origin once parsed
    expect(denied('https://api.example.com:443/v1')).toBe('allowed');
    expect(denied('http://api.example.com/v1')).toBe('network_denied');
    expect(denied('https://api.example.com:8443/v1')).toBe('network_denied');
    expect(denied('https://user:pw@api.example.com/v1')).toBe('network_denied');
    expect(denied('https://api.example.com@127.0.0.1/')).toBe('network_denied');
    expect(denied('https://api.example.com./v1')).toBe('network_denied');
    expect(denied('https://аpi.example.com/v1')).toBe('network_denied'); // Cyrillic "а": another host (punycode)
    expect(denied('https://api.example.com.evil.net/')).toBe('network_denied');
    expect(denied('https://127.0.0.1/')).toBe('network_denied');
    expect(denied('ftp://api.example.com/')).toBe('network_denied');
    expect(denied('not a url')).toBe('invalid_argument');
  });

  it('a secret goes only to its origin and paths (segment prefix), never to another host', () => {
    const inject = { origin: 'https://api.example.com', paths: ['/v1'] };
    expect(injectMatches(inject, new URL('https://api.example.com/v1'))).toBe(true);
    expect(injectMatches(inject, new URL('https://api.example.com/v1/chat'))).toBe(true);
    expect(injectMatches(inject, new URL('https://api.example.com/v1x/chat'))).toBe(false);
    expect(injectMatches(inject, new URL('https://api.example.com/v2/x'))).toBe(false);
    expect(injectMatches(inject, new URL('https://api.example.com/v1/../v2/x'))).toBe(false);
    expect(injectMatches(inject, new URL('https://api.example.com/%2e%2e/v1'))).toBe(true); // the parser removes the dot segment
    expect(injectMatches(inject, new URL('https://other.example.com/v1'))).toBe(false);
  });
});

describe('SSRF: what DNS says decides nothing until the IP is checked', () => {
  for (const ip of ['127.0.0.1', '::1', '10.0.0.7', '169.254.169.254', 'fd00::1', '::ffff:127.0.0.1', '100.64.1.1', '64:ff9b::a00:1']) {
    it(`a name that resolves to ${ip} is refused before any connection`, async () => {
      const t = testNet({ 'api.example.com': [ip] });
      const r = await fetchVia(t.net, 'https://api.example.com/v1/echo');
      expect(r).toMatchObject({ ok: false, error: { code: 'network_denied' } });
      expect(r.error.message).toContain(ip);
      expect(t.dials).toEqual([]);
      expect(seen).toEqual([]);
    });
  }

  it('one private address among public ones refuses the name', async () => {
    const t = testNet({ 'api.example.com': [PUBLIC, '10.0.0.1'] });
    expect(await fetchVia(t.net, 'https://api.example.com/x')).toMatchObject({ ok: false, error: { code: 'network_denied' } });
    expect(t.dials).toEqual([]);
  });

  it('DNS rebinding: one resolution per request, and the connection goes to the checked IP, never a second answer', async () => {
    let n = 0;
    const t = testNet({ 'api.example.com': () => (++n === 1 ? [PUBLIC] : ['127.0.0.1']) });
    const r = await run('fetch', { url: 'https://api.example.com/plain', times: 2 }, t.net);
    expect(r.all[0]).toMatchObject({ ok: true, response: { status: 200, body: 'ok GET /plain' } });
    // The second request resolves again, gets the private answer and is refused: nothing pinned from before
    expect(r.all[1]).toMatchObject({ ok: false, error: { code: 'network_denied' } });
    expect(t.lookups).toEqual(['api.example.com', 'api.example.com']);
    expect(t.dials).toEqual([{ address: PUBLIC, port: 443, servername: 'api.example.com' }]);
  });

  it('a redirect is returned as it is (even one to a private address) and never followed', async () => {
    const t = testNet();
    const r = await fetchVia(t.net, 'https://api.example.com/redirect');
    expect(r).toMatchObject({ ok: true, response: { status: 302, headers: { location: 'https://127.0.0.1/admin' }, body: 'moved' } });
    expect(seen.map(s => s.url)).toEqual(['/redirect']);
    expect(t.dials).toHaveLength(1);
  });

  it('a certificate for another host fails the TLS check', async () => {
    const t = testNet();
    const r = await fetchVia(t.net, 'https://wrong.example.net/x');
    expect(r).toMatchObject({ ok: false, error: { code: 'network' } });
    expect(seen).toEqual([]);
  });

  it('the system connect ignores proxy variables and checks the address it reached (local server, test CA)', async () => {
    const saved = { ...process.env };
    Object.assign(process.env, { HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', HTTP_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9', NODE_USE_ENV_PROXY: '1' });
    try {
      const sys = systemNet({ ca: CERT });
      // The address is the checked one (a test lets the loopback through by calling connect directly)
      const net: NetDeps = { lookup: async () => [{ address: PUBLIC, family: 4 }], connect: o => sys.connect({ ...o, address: '127.0.0.1', port }) };
      const r = await fetchVia(net, 'https://api.example.com/plain');
      expect(r).toMatchObject({ ok: true, response: { status: 200, body: 'ok GET /plain' } });
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
  });
});

describe('sizes, encodings, headers and cookies', () => {
  it('a request body over 256 KB is refused before anything is sent; 256 KB passes', async () => {
    const t = testNet();
    const over = await fetchVia(t.net, 'https://api.example.com/plain', { method: 'POST', body: 'x'.repeat(256 * 1024 + 1) });
    expect(over).toMatchObject({ ok: false, error: { code: 'request_too_large' } });
    expect(t.dials).toEqual([]);
    const at = await run('size', { url: 'https://api.example.com/echo', opts: { method: 'POST', body: 'x'.repeat(256 * 1024) } }, t.net);
    expect(at.status).toBe(200);
    expect(seen[0].body.length).toBe(256 * 1024);
  });

  it('a response of exactly 1 MB arrives whole, as text and as base64; one byte more is response_too_large', async () => {
    const t = testNet();
    expect(await run('size', { url: `https://api.example.com/big?n=${1024 * 1024}` }, t.net)).toEqual({ status: 200, body: 1024 * 1024, bodyBase64: null });
    expect(await run('size', { url: `https://api.example.com/big?n=${1024 * 1024}`, opts: { responseType: 'base64' } }, t.net)).toEqual({ status: 200, body: null, bodyBase64: 1398104 });
    expect(await run('size', { url: `https://api.example.com/big?n=${1024 * 1024}&bin=1` }, t.net)).toEqual({ status: 200, body: null, bodyBase64: 1398104 });
    expect(await fetchVia(t.net, `https://api.example.com/big?n=${1024 * 1024 + 1}`)).toMatchObject({ ok: false, error: { code: 'response_too_large' } });
  });

  it('a chunked body over 1 MB stops at the limit', async () => {
    expect(await fetchVia(testNet().net, 'https://api.example.com/chunked-big')).toMatchObject({ ok: false, error: { code: 'response_too_large' } });
  });

  it('a gzip bomb (20 MB of zeros in ~20 KB) stops at 1 MB decompressed; gzip, br and deflate decode', async () => {
    const t = testNet();
    const started = Date.now();
    expect(await fetchVia(t.net, 'https://api.example.com/gzip-bomb')).toMatchObject({ ok: false, error: { code: 'response_too_large' } });
    expect(Date.now() - started).toBeLessThan(5000);
    const gz = (await fetchVia(t.net, 'https://api.example.com/gzip')).response;
    expect(gz.body).toBe('compressed hello');
    expect(gz.headers['content-encoding']).toBeUndefined();
    expect((await fetchVia(t.net, 'https://api.example.com/br')).response.body).toBe('brotli hello');
    expect((await fetchVia(t.net, 'https://api.example.com/deflate')).response.body).toBe('deflate hello');
    expect(seen[0].headers['accept-encoding']).toBe('gzip, deflate, br');
  });

  it('a body that is not UTF-8 comes as base64', async () => {
    const r = await fetchVia(testNet().net, 'https://api.example.com/binary');
    expect(r.response).toMatchObject({ status: 200, bodyBase64: Buffer.from([0xff, 0xfe, 0x00, 0x80]).toString('base64') });
    expect(r.response.body).toBeUndefined();
  });

  it('header injection: CR/LF, bad names, the host\'s own headers and a secret\'s header are refused before sending', async () => {
    const t = testNet();
    const cases: [Record<string, string>, string][] = [
      [{ 'X-A': 'a\r\nX-Injected: 1' }, 'invalid_argument'],
      [{ 'X-A': 'a\nb' }, 'invalid_argument'],
      [{ 'X-A\r\nX-B': 'a' }, 'invalid_argument'],
      [{ 'Bad Name': 'a' }, 'invalid_argument'],
      [{ Host: 'evil.example.com' }, 'network_denied'],
      [{ host: 'evil.example.com' }, 'network_denied'],
      [{ Cookie: 'a=b' }, 'network_denied'],
      [{ Authorization: 'Bearer mine' }, 'network_denied'],
      [{ 'Proxy-Authorization': 'x' }, 'network_denied'],
      [{ 'Proxy-Anything': 'x' }, 'network_denied'],
      [{ Connection: 'keep-alive' }, 'network_denied'],
      [{ 'Transfer-Encoding': 'chunked' }, 'network_denied'],
      [{ 'Content-Length': '0' }, 'network_denied'],
      [{ 'Accept-Encoding': 'identity' }, 'network_denied'],
      [{ 'X-Api-Key': 'mine' }, 'network_denied'], // the header the secret "other" goes in
      [{ Range: 'bytes=0-3' }, 'network_denied'], // a part of a body could cut an echoed secret
      [{ 'If-Range': 'x' }, 'network_denied'],
      [Object.fromEntries(Array.from({ length: 3 }, (_, i) => [`X-H${i}`, 'v'.repeat(8000)])), 'request_too_large'],
      [{ 'x-a': '1', 'X-A': '2' }, 'invalid_argument'],
    ];
    for (const [headers, code] of cases) {
      expect(await fetchVia(t.net, 'https://api.example.com/plain', { headers }), JSON.stringify(headers)).toMatchObject({ ok: false, error: { code } });
    }
    expect(t.dials).toEqual([]);
    expect(seen).toEqual([]);
    // A body on GET, an unknown option, a bad method
    expect(await fetchVia(t.net, 'https://api.example.com/plain', { body: 'x' })).toMatchObject({ ok: false, error: { code: 'invalid_argument' } });
    expect(await fetchVia(t.net, 'https://api.example.com/plain', { follow: true })).toMatchObject({ ok: false, error: { code: 'invalid_argument' } });
    expect(await fetchVia(t.net, 'https://api.example.com/plain', { method: 'CONNECT' })).toMatchObject({ ok: false, error: { code: 'invalid_argument' } });
  });

  it('allowed headers arrive as given; no cookie goes out, Set-Cookie never comes in; Host is the URL\'s', async () => {
    const t = testNet();
    const r = await fetchVia(t.net, 'https://other.example.com/echo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Trace': 'abc' }, body: '{"a":1}' });
    expect(r.ok).toBe(true);
    expect(r.response.headers['set-cookie']).toBeUndefined();
    expect(seen[0].headers).toMatchObject({ host: 'other.example.com', 'content-type': 'application/json', 'x-trace': 'abc', connection: 'close' });
    expect(seen[0].headers.cookie).toBeUndefined();
    expect(seen[0].body).toBe('{"a":1}');
  });

  it('a request ends before the run\'s deadline with "timeout"; a cancelled run stops its request', async () => {
    runDeps.limits = { timeoutMs: 1500 };
    const started = Date.now();
    expect(await fetchVia(testNet().net, 'https://api.example.com/hang')).toMatchObject({ ok: false, error: { code: 'timeout' } });
    expect(Date.now() - started).toBeLessThan(3000);
    delete runDeps.limits;
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 300);
    await expect(fetchVia(testNet().net, 'https://api.example.com/hang', undefined, { signal: ac.signal })).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('each request is a host call: the host-call limit ends a run that makes too many', async () => {
    runDeps.limits = { hostCalls: 2 };
    await expect(run('fetch', { url: 'https://api.example.com/plain', times: 3 }, testNet().net)).rejects.toMatchObject({ code: 'plugin_limit', fields: { limit: 'hostCalls' } });
  });

  it('the run reports requests and origins for the audit, nothing else', async () => {
    const stats: NetworkStats = { requests: 0, origins: [] };
    await run('fetch', { url: 'https://api.example.com/plain?token=abc', times: 2 }, testNet().net, { stats });
    expect(stats).toEqual({ requests: 2, origins: ['https://api.example.com'] });
  });

  it('a command without the network effect gets no host.http', async () => {
    const r = await run('no-net', {}, testNet().net);
    expect(r.http).toBe('undefined');
  });
});

describe('secrets the plugin never sees', () => {
  const forbidden = (v: string) => [
    v, `Bearer ${v}`, encodeURIComponent(v), encodeURIComponent(`Bearer ${v}`), Buffer.from(v).toString('base64'), Buffer.from(`Bearer ${v}`).toString('base64'),
    Buffer.from(v).toString('base64url'), Buffer.from(v).toString('hex'), JSON.stringify(v).slice(1, -1),
  ];

  it('injected for the matching origin and path; an endpoint that echoes it (plain, formatted, encoded) gives the plugin only [secret]', async () => {
    const t = testNet();
    const r = await fetchVia(t.net, 'https://api.example.com/v1/echo');
    expect(seen[0].headers.authorization).toBe(`Bearer ${SECRET}`);
    const text = JSON.stringify(r);
    for (const f of forbidden(SECRET)) expect(text, f).not.toContain(f);
    // The middle of the embedded base64 header, at another alignment, is gone too
    const embedded = Buffer.from(`x-forwarded: Authorization: Bearer ${SECRET};`).toString('base64');
    expect(text).not.toContain(embedded.slice(8, 40));
    expect(r.response.headers['x-echo']).toBe('[secret]');
    expect(r.response.headers['x-echo-b64']).toBe('[secret]');
    const body = JSON.parse(r.response.body);
    expect(body).toMatchObject({ plain: '[secret]', formatted: '[secret]', url: '[secret]', urlValue: '[secret]', b64: '[secret]', b64url: '[secret]', hex: '[secret]' });
    expect(body.json).toBe('{"k":"[secret]"}');
    expect(body.headers.authorization).toBe('[secret]');
  });

  it('never sent to another path, a lookalike path, or another origin; the other origin gets its own secret', async () => {
    const t = testNet();
    for (const url of ['https://api.example.com/v2/echo', 'https://api.example.com/v1x/echo', 'https://api.example.com/echo']) {
      const r = await fetchVia(t.net, url);
      expect(r.ok, url).toBe(true);
    }
    expect(seen.map(s => s.headers.authorization)).toEqual([undefined, undefined, undefined]);
    const o = await fetchVia(t.net, 'https://other.example.com/echo');
    expect(seen[3].headers['x-api-key']).toBe(OTHER);
    expect(seen[3].headers.authorization).toBeUndefined();
    expect(JSON.stringify(o)).not.toContain(OTHER);
  });

  it('a path a server could read as another (encoded / \\ . or ;) is refused at an origin whose secret covers only some paths', async () => {
    const t = testNet();
    for (const path of ['/v1/..%2fadmin', '/v1/..%2Fadmin', '/v1/..%5cadmin', '/v1/%2e%2e%2fadmin', '/v1/x;y=../admin', '/v1/a%2Eb']) {
      const r = await fetchVia(t.net, `https://api.example.com${path}`);
      expect(r, path).toMatchObject({ ok: false, error: { code: 'ambiguous_path' } });
    }
    expect(seen).toEqual([]);
    // The parser resolves plain and encoded dot segments itself: /v1/%2e%2e/admin is /admin, without the secret
    expect((await fetchVia(t.net, 'https://api.example.com/v1/%2e%2e/echo')).ok).toBe(true);
    expect(seen[0].url).toBe('/echo');
    expect(seen[0].headers.authorization).toBeUndefined();
    // An origin whose secret has no path limit is not affected
    expect((await fetchVia(t.net, 'https://other.example.com/a%2fb')).ok).toBe(true);
  });

  it('a partial response (206) to a request that carried a secret is not handed in', async () => {
    expect(await fetchVia(testNet().net, 'https://api.example.com/v1/partial')).toMatchObject({ ok: false, error: { code: 'bad_response' } });
  });

  it('a missing secret is secret_missing with the command for the human, and nothing is sent', async () => {
    const t = testNet();
    const r = await fetchVia(t.net, 'https://api.example.com/v1/echo', undefined, { secrets: {} });
    expect(r).toMatchObject({ ok: false, error: { code: 'secret_missing', command: ['plugin', 'secret', 'set', 'net-lab', 'apikey'] } });
    expect(seen).toEqual([]);
    // Uncaught, it reaches the CLI with its own code and the command
    const e = await run('fetch-raw', { url: 'https://api.example.com/v1/echo' }, t.net, { secrets: {} }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(CliError);
    expect(e).toMatchObject({ code: 'secret_missing', command: ['plugin', 'secret', 'set', 'net-lab', 'apikey'] });
    expect(String((e as CliError).hint)).toContain('telegram plugin secret set net-lab apikey');
    // A path without the secret needs none
    expect((await fetchVia(t.net, 'https://api.example.com/v2/x', undefined, { secrets: {} })).ok).toBe(true);
  });

  it('every form of a secret is found by the stripper, also inside base64 at any alignment', () => {
    const v = 'abcDEF123/+=xyz789';
    const forms = secretForms([v, `Token ${v}`]);
    for (const pad of ['', 'a', 'ab']) {
      const b64 = Buffer.from(`${pad}Authorization: Token ${v}!`).toString('base64');
      expect(stripForms(Buffer.from(b64), forms).toString()).toContain('[secret]');
    }
    expect(stripForms(Buffer.from(`x ${v} y`), forms).toString()).toBe('x [secret] y');
    // Nothing short is ever a form (a short value would wipe ordinary text)
    expect(secretForms(['abc'])).toEqual([]);
  });
});
