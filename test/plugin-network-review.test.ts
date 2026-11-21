import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { connect as tlsConnect, createServer } from "node:tls";
import type { Server, TLSSocket } from "node:tls";
import { gzipSync } from "node:zlib";

import type { TelegramClient } from "teleproto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  httpTiming,
  injectMatches,
  networkBackend,
  pathProblem,
  rawPathOf,
  systemNet,
} from "../src/plugins/http.js";
import type { NetDeps } from "../src/plugins/http.js";
import { installSummary } from "../src/plugins/human.js";
import { checkManifest } from "../src/plugins/manifest.js";
import type { Manifest } from "../src/plugins/manifest.js";
import { addressProblem, nat64Prefix } from "../src/plugins/net-address.js";
import {
  memoryCursors,
  memoryStorage,
  runPluginCommand,
} from "../src/plugins/run.js";

// The review fixes of the plugin network (P3). No real network: names resolve through the injected
// `lookup`, every connection dials this file's own TLS server on 127.0.0.1, which writes raw bytes
// (responses node:http would never send). The test certificate is trusted only where `ca` says so.
const CERT = readFileSync(resolve("test/fixtures/tls/test-cert.pem"));
const KEY = readFileSync(resolve("test/fixtures/tls/test-key.pem"));
const LAB = resolve("test/fixtures/plugins/net-lab");
const manifest = checkManifest(
  readFileSync(resolve(LAB, "tg-plugin.json")),
  "99.0.0"
).manifest as Manifest;
const code = readFileSync(resolve(LAB, "code/net.js"), "utf-8");
const PUBLIC = "93.184.216.34";
const SECRET = "sk/test+KEY=1234567890abc";

interface Seen {
  method: string;
  path: string;
  headers: Record<string, string>;
}
const seen: Seen[] = [];
type Reply = (req: Seen, socket: TLSSocket) => void | Promise<void>;
const routes = new Map<string, Reply>();
let server: Server;
let port: number;

const head = (status: string, headers: Record<string, string> = {}) =>
  `HTTP/1.1 ${status}\r\n${Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}\r\n`)
    .join("")}\r\n`;
const echoValue = (req: Seen) => req.headers.authorization ?? "";

beforeAll(async () => {
  server = createServer(
    { key: KEY, cert: CERT, ALPNProtocols: ["http/1.1"] },
    (socket) => {
      let buf = "";
      socket.on("error", () => {});
      socket.on("data", (d) => {
        if (buf === null) {
          return;
        }
        buf += d.toString("latin1");
        const end = buf.indexOf("\r\n\r\n");
        if (end === -1) {
          return;
        }
        const [line, ...rest] = buf.slice(0, end).split("\r\n");
        buf = null as unknown as string;
        const [method, path] = line.split(" ");
        const headers: Record<string, string> = {};
        for (const h of rest) {
          headers[h.slice(0, h.indexOf(":")).toLowerCase()] = h
            .slice(h.indexOf(":") + 1)
            .trim();
        }
        const req = { method, path, headers };
        seen.push(req);
        const route = routes.get(new URL(path, "https://x").pathname);
        if (!route) {
          socket.end(`${head("200 OK", { "Content-Length": "2" })}ok`);
          return;
        }
        void route(req, socket);
      });
    }
  );
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));
afterEach(() => {
  seen.length = 0;
  routes.clear();
  httpTiming.timeoutMs = 30_000;
});

function testNet(
  answers: Record<string, string[] | (() => string[] | Promise<string[]>)> = {}
) {
  const lookups: string[] = [];
  const dials: string[] = [];
  const net: NetDeps = {
    lookup: async (host) => {
      lookups.push(host);
      const a = answers[host] ?? [PUBLIC];
      const list = typeof a === "function" ? await a() : a;
      return list.map((address) => ({ address, family: isIP(address) }));
    },
    connect: (o) => {
      dials.push(o.address);
      return tlsConnect({
        host: "127.0.0.1",
        port,
        servername: o.servername,
        ca: CERT,
        ALPNProtocols: ["http/1.1"],
      });
    },
  };
  return { net, lookups, dials };
}

const noTelegram = async (): Promise<TelegramClient> => {
  throw new Error("no Telegram in this test");
};

type SecretFn = (
  name: string,
  signal: AbortSignal
) => string | null | Promise<string | null>;
async function run(
  input: Record<string, unknown>,
  net: NetDeps,
  opts: {
    secrets?: Record<string, string>;
    secret?: SecretFn;
    m?: Manifest;
  } = {}
) {
  const m = opts.m ?? manifest;
  const secrets = opts.secrets ?? {
    apikey: SECRET,
    other: "other-key-0987654321",
  };
  const out = await runPluginCommand(
    {
      manifest: m,
      command: m.commands!.find((c) => c.name === "fetch")!,
      code,
      filename: "code/net.js",
      input,
      client: noTelegram,
      account: async () => "1000",
      storage: async () => memoryStorage(m),
      cursors: memoryCursors(),
      installId: "plugin-dev",
      mcp: false,
      network: {
        backend: networkBackend(net),
        secret: opts.secret ?? ((n) => secrets[n] ?? null),
        setCommand: (n) => ["plugin", "secret", "set", m.name, n],
      },
    },
    []
  );
  return out.envelope.data as any;
}
const fetchVia = (
  net: NetDeps,
  url: string,
  extra: Parameters<typeof run>[2] = {},
  times?: number
) => run({ url, ...(times ? { times } : {}) }, net, extra);

describe("#1 only chunked transfer coding is read", () => {
  it("Transfer-Encoding gzip that echoes the secret is bad_response; nothing of it reaches the sandbox", async () => {
    for (const te of [
      "gzip",
      "chunked, gzip",
      "gzip, chunked",
      "identity",
      "x-custom",
    ]) {
      routes.set("/v1/te", (req, s) => {
        s.end(
          Buffer.concat([
            Buffer.from(
              head("200 OK", { "Transfer-Encoding": te, Connection: "close" }),
              "latin1"
            ),
            gzipSync(JSON.stringify({ echo: echoValue(req) })),
          ])
        );
      });
      const r = await fetchVia(testNet().net, "https://api.example.com/v1/te");
      expect(r, te).toMatchObject({
        ok: false,
        error: { code: "bad_response" },
      });
      // The server's value is never repeated in the error
      expect(r.error.message, te).not.toContain(te);
      expect(JSON.stringify(r)).not.toMatch(/H4sI|bodyBase64/);
      routes.clear();
    }
    // Plain chunked (any case) still works
    routes.set("/v1/te", (_req, s) => {
      s.end(
        `${head("200 OK", { "Transfer-Encoding": "Chunked" })}5\r\nhello\r\n0\r\n\r\n`
      );
    });
    await expect(
      fetchVia(testNet().net, "https://api.example.com/v1/te")
    ).resolves.toMatchObject({ ok: true, response: { body: "hello" } });
  });
});

describe("#2 a path-restricted secret goes only with an unambiguous path", () => {
  it("pathProblem refuses every form a server could read as another path", () => {
    for (const p of [
      "/v1/%3Badmin",
      "/v1/%25admin",
      "/v1/%2",
      "/v1/%zz",
      "/v1/%41dmin",
      "/v1/%7E",
      "/v1/%c3%a9",
      "/v1//admin",
      "/v1/./echo",
      "/v1/../v1",
      "/v1\\x",
      "/v1;x",
      "/v1/%2F",
      "/v1/%5C",
      "/v1/%2E",
    ]) {
      expect(pathProblem(p), p).toBeDefined();
    }
    for (const p of [
      "/v1",
      "/v1/",
      "/v1/echo",
      "/v1/%C3%A9",
      "/v1/a%20b",
      "",
    ]) {
      expect(pathProblem(p), p).toBeUndefined();
    }
    // The path as written, before the parser resolves anything (tabs and newlines are dropped first)
    expect(rawPathOf("https://api.example.com/v2/../v1/echo?x=/../#a")).toBe(
      "/v2/../v1/echo"
    );
    expect(rawPathOf("  https://api.example.com/v1/.\t./x")).toBe("/v1/../x");
    expect(rawPathOf("https://api.example.com\\v1\\x")).toBe("\\v1\\x");
    expect(rawPathOf("https://api.example.com?q")).toBe("");
  });

  it("each ambiguous form is refused with ambiguous_path before anything is sent; clean paths and unrestricted origins pass", async () => {
    const t = testNet();
    const refused = [
      "/v1/%3Badmin",
      "/v1/%25admin",
      "/v1/%2",
      "/v1/%41dmin",
      "/v1/%c3%a9",
      "/v1//admin",
      "/v1/./echo",
      // Resolved by the parser to /v1/echo (so the secret would go): the written form is checked too
      "/v2/../v1/echo",
      "/v2/%2e%2e/v1/echo",
      "/x/..\\v1/echo",
      "/v2/.\t./v1/echo",
    ];
    for (const path of refused) {
      const r = await fetchVia(t.net, `https://api.example.com${path}`);
      expect(r, path).toMatchObject({
        ok: false,
        error: { code: "ambiguous_path" },
      });
    }
    expect(seen).toEqual([]);
    expect(t.lookups).toEqual([]);
    expect((await fetchVia(t.net, "https://api.example.com/v1/echo/")).ok).toBe(
      true
    );
    expect(
      (await fetchVia(t.net, "https://api.example.com/v1/%C3%A9")).ok
    ).toBe(true);
    expect(seen.map((s) => s.headers.authorization)).toEqual([
      `Bearer ${SECRET}`,
      `Bearer ${SECRET}`,
    ]);
    // No path-restricted secret would be sent: nothing to refuse (and none is sent)
    expect((await fetchVia(t.net, "https://api.example.com/v1/../x")).ok).toBe(
      true
    );
    expect((await fetchVia(t.net, "https://other.example.com/a//b;c")).ok).toBe(
      true
    );
    expect(seen[2].headers.authorization).toBeUndefined();
  });

  it("a manifest path with such a form is refused at install", () => {
    const raw = JSON.parse(
      readFileSync(resolve(LAB, "tg-plugin.json"), "utf-8")
    );
    for (const p of ["/v1//x", "/v1/../x", "/v1;x", "/v1/%2F"]) {
      raw.secrets[0].inject.paths = [p];
      expect(
        checkManifest(Buffer.from(JSON.stringify(raw)), "99.0.0").errors.join(
          "\n"
        ),
        p
      ).toMatch(/inject\.paths/);
    }
  });
});

describe("#3 an empty paths list sends the secret nowhere", () => {
  it("the schema refuses it; at run time an installed manifest with [] matches no path", async () => {
    const raw = JSON.parse(
      readFileSync(resolve(LAB, "tg-plugin.json"), "utf-8")
    );
    raw.secrets[0].inject.paths = [];
    expect(
      checkManifest(Buffer.from(JSON.stringify(raw)), "99.0.0").errors.join(
        "\n"
      )
    ).toMatch(/paths/);
    expect(
      injectMatches(
        { origin: "https://api.example.com", paths: [] },
        new URL("https://api.example.com/v1/x")
      )
    ).toBe(false);
    expect(
      injectMatches(
        { origin: "https://api.example.com" },
        new URL("https://api.example.com/anything")
      )
    ).toBe(true);
    // As if installed before the rule: the secret goes nowhere
    const old: Manifest = {
      ...manifest,
      secrets: manifest.secrets!.map((s) =>
        s.name === "apikey" ? { ...s, inject: { ...s.inject, paths: [] } } : s
      ),
    };
    const t = testNet();
    expect(
      (await fetchVia(t.net, "https://api.example.com/v1/echo", { m: old })).ok
    ).toBe(true);
    expect(
      (await fetchVia(t.net, "https://api.example.com/", { m: old })).ok
    ).toBe(true);
    expect(seen.map((s) => s.headers.authorization)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("the install summary says which paths, or any path", () => {
    const summary = installSummary({
      manifest,
      source: { type: "local", path: LAB },
      revision: "sha256-x",
      files: new Map(),
      bytes: 0,
      official: false,
    } as never);
    expect(summary).toContain(
      "Secret apikey: sent by the host only to https://api.example.com (only the paths /v1 and below them) as Authorization"
    );
    expect(summary).toContain(
      "Secret other: sent by the host only to https://other.example.com (any path) as X-Api-Key"
    );
  });
});

describe("#4 the form-urlencoded serialisation of a secret is stripped", () => {
  it("an echo built with URLSearchParams (value and header, a key with !~'()* and a space) gives only [secret]", async () => {
    const key = "k!~'()* ey-12345";
    routes.set("/v1/form", (req, s) => {
      const auth = echoValue(req);
      const body = new URLSearchParams({
        v: auth.replace(/^Bearer /, ""),
        h: auth,
      }).toString();
      s.end(
        head("200 OK", {
          "Content-Length": String(body.length),
          Location: `/next?${new URLSearchParams({ k: auth })}`,
        }) + body
      );
    });
    const r = await fetchVia(testNet().net, "https://api.example.com/v1/form", {
      secrets: { apikey: key },
    });
    expect(seen[0].headers.authorization).toBe(`Bearer ${key}`);
    expect(r.response.body).toBe("v=[secret]&h=[secret]");
    expect(r.response.headers.location).toBe("/next?k=[secret]");
    const text = JSON.stringify(r);
    expect(text).not.toContain(
      new URLSearchParams({ k: key }).toString().slice(2)
    );
  });
});

describe("#5 the network's own NAT64 prefixes (RFC 7050)", () => {
  it("nat64Prefix finds the prefix at every RFC 6052 length from the ipv4only.arpa answer", () => {
    expect(nat64Prefix("2001:db8:64::c000:aa")).toMatchObject({
      bits: 96,
      text: "2001:db8:64:0:0:0:0:0/96",
    });
    expect(nat64Prefix("2a00:1450:1:2:c0:0:aa00:0")).toMatchObject({
      bits: 64,
    });
    expect(nat64Prefix("2a00:1450:1:c0:0:aa::")).toMatchObject({ bits: 56 });
    expect(nat64Prefix("2a00:1450:1:c000:0:aa00::")).toMatchObject({
      bits: 48,
    });
    expect(nat64Prefix("2a00:1450:c0:0:aa::")).toMatchObject({ bits: 40 });
    expect(nat64Prefix("2a00:1450:c000:ab::")).toMatchObject({ bits: 32 });
    expect(nat64Prefix("2a00:1450::1")).toBeUndefined();
    expect(nat64Prefix("192.0.0.170")).toBeUndefined();
    const p = nat64Prefix("2a00:1450:1:2:c0:0:aa00:0")!;
    expect(addressProblem("2a00:1450:1:2:7f:0:100:0", [p])).toMatch(
      /NAT64 .* of 127\.0\.0\.1, loopback/
    );
    expect(addressProblem("2a00:1450:1:2:5d:b8d8:2200:0", [p])).toBeUndefined();
  });

  it("an address in a discovered prefix is checked by the IPv4 address it carries (injected DNS)", async () => {
    // A custom /96 inside 2001:db8::/32: the reason names the embedded IPv4, not "documentation"
    const doc = testNet({
      "ipv4only.arpa": ["2001:db8:64::c000:aa", "2001:db8:64::c000:ab"],
      "api.example.com": ["2001:db8:64::a00:1"],
    });
    const r1 = await fetchVia(doc.net, "https://api.example.com/v2/x");
    expect(r1).toMatchObject({ ok: false, error: { code: "network_denied" } });
    expect(r1.error.message).toMatch(
      /NAT64 \(2001:db8:64:0:0:0:0:0\/96\) of 10\.0\.0\.1, private/
    );
    // An ordinary global-unicast /64 prefix that a translator carries to loopback
    const glob = testNet({
      "ipv4only.arpa": ["2a00:1450:1:2:c0:0:aa00:0"],
      "api.example.com": ["2a00:1450:1:2:7f:0:100:0"],
    });
    const r2 = await fetchVia(glob.net, "https://api.example.com/v2/x", {}, 2);
    expect(r2.all.map((x: any) => x.error?.code)).toEqual([
      "network_denied",
      "network_denied",
    ]);
    expect(glob.dials).toEqual([]);
    // Discovered once per run
    expect(glob.lookups.filter((h) => h === "ipv4only.arpa")).toHaveLength(1);
    // A public IPv4 address behind the prefix is fine
    const pub = testNet({
      "ipv4only.arpa": ["2a00:1450:1:2:c0:0:aa00:0"],
      "api.example.com": ["2a00:1450:1:2:5d:b8d8:2200:0"],
    });
    expect((await fetchVia(pub.net, "https://api.example.com/v2/x")).ok).toBe(
      true
    );
  });

  it("a failed discovery adds no prefix and is no error; IPv4-only answers need no discovery", async () => {
    const failing = testNet({
      "ipv4only.arpa": () => {
        throw new Error("NXDOMAIN");
      },
      "api.example.com": ["2a00:1450:4001:80b::200e"],
    });
    expect(
      (await fetchVia(failing.net, "https://api.example.com/v2/x")).ok
    ).toBe(true);
    const v4 = testNet();
    expect((await fetchVia(v4.net, "https://api.example.com/v2/x")).ok).toBe(
      true
    );
    expect(v4.lookups).toEqual(["api.example.com"]);
  });
});

describe("#6 certificate checks never come from the environment", () => {
  it("systemNet refuses an untrusted certificate with NODE_TLS_REJECT_UNAUTHORIZED=0 set, and a certificate for another name", async () => {
    const saved = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    const warn = process.emitWarning;
    process.emitWarning = () => {};
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
      const sys = systemNet();
      const net: NetDeps = {
        lookup: async () => [{ address: PUBLIC, family: 4 }],
        connect: (o) => sys.connect({ ...o, address: "127.0.0.1", port }),
      };
      const r = await fetchVia(net, "https://api.example.com/v1/echo");
      expect(r).toMatchObject({ ok: false, error: { code: "network" } });
      // Trusted CA, but the certificate does not name the host
      const withCa = systemNet({ ca: CERT });
      const net2: NetDeps = {
        lookup: async () => [{ address: PUBLIC, family: 4 }],
        connect: (o) => withCa.connect({ ...o, address: "127.0.0.1", port }),
      };
      await expect(
        fetchVia(net2, "https://wrong.example.net/x")
      ).resolves.toMatchObject({ ok: false, error: { code: "network" } });
      expect(seen).toEqual([]);
      // The right name with the trusted CA works
      expect((await fetchVia(net2, "https://api.example.com/v2/x")).ok).toBe(
        true
      );
    } finally {
      if (saved === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = saved;
      }
      process.emitWarning = warn;
    }
  });
});

describe("#8 one budget for heads, chunk lines and trailers, and a bounded chunk count", () => {
  const chunked = (parts: string) =>
    head("200 OK", { "Transfer-Encoding": "chunked" }) + parts;

  it("a few thousand 1-byte chunks arrive; too many chunks are refused", async () => {
    routes.set("/few", (_r, s) => {
      s.end(chunked(`${"1\r\na\r\n".repeat(4000)}0\r\n\r\n`));
    });
    const ok = await fetchVia(testNet().net, "https://api.example.com/few");
    expect(ok).toMatchObject({ ok: true });
    expect(ok.response.body).toBe("a".repeat(4000));
    // 9000 chunks fit the 64 KB budget (5 bytes each) but not the chunk count
    routes.set("/many", (_r, s) => {
      s.end(chunked(`${"1\r\na\r\n".repeat(9000)}0\r\n\r\n`));
    });
    const many = await fetchVia(testNet().net, "https://api.example.com/many");
    expect(many).toMatchObject({ ok: false, error: { code: "bad_response" } });
    expect(many.error.message).toMatch(/more than 8192 chunks/);
    routes.set("/flood", (_r, s) => {
      s.end(chunked(`${"1\r\na\r\n".repeat(20_000)}0\r\n\r\n`));
    });
    await expect(
      fetchVia(testNet().net, "https://api.example.com/flood")
    ).resolves.toMatchObject({ ok: false, error: { code: "bad_response" } });
  });

  it("long chunk extensions and trailers spend the budget", async () => {
    const ext = `;x=${"e".repeat(1000)}`;
    routes.set("/ext", (_r, s) => {
      s.end(chunked(`${`1${ext}\r\na\r\n`.repeat(100)}0\r\n\r\n`));
    });
    await expect(
      fetchVia(testNet().net, "https://api.example.com/ext")
    ).resolves.toMatchObject({ ok: false, error: { code: "bad_response" } });
    routes.set("/trailers", (_r, s) => {
      s.end(
        chunked(
          `1\r\na\r\n0\r\n${`X-T: ${"t".repeat(1000)}\r\n`.repeat(100)}\r\n`
        )
      );
    });
    await expect(
      fetchVia(testNet().net, "https://api.example.com/trailers")
    ).resolves.toMatchObject({ ok: false, error: { code: "bad_response" } });
  });

  it("many interim (1xx) answers spend the same budget", async () => {
    routes.set("/hints", (_r, s) => {
      s.end(
        `${head("103 Early Hints", { Link: "</style.css>; rel=preload" }).repeat(2000)}${head("200 OK", { "Content-Length": "2" })}ok`
      );
    });
    await expect(
      fetchVia(testNet().net, "https://api.example.com/hints")
    ).resolves.toMatchObject({ ok: false, error: { code: "bad_response" } });
    routes.set("/hint", (_r, s) => {
      s.end(
        `${head("103 Early Hints", { Link: "</a>" }).repeat(3)}${head("200 OK", { "Content-Length": "2" })}ok`
      );
    });
    await expect(
      fetchVia(testNet().net, "https://api.example.com/hint")
    ).resolves.toMatchObject({ ok: true, response: { body: "ok" } });
  });
});

describe("#9 an unknown Content-Encoding is bad_response, never a crash", () => {
  it("__proto__, constructor, toString and an unknown name", async () => {
    for (const enc of [
      "__proto__",
      "constructor",
      "toString",
      "hasOwnProperty",
      "zstd",
    ]) {
      routes.set("/enc", (_r, s) => {
        s.end(
          `${head("200 OK", { "Content-Encoding": enc, "Content-Length": "4" })}abcd`
        );
      });
      const r = await fetchVia(testNet().net, "https://api.example.com/enc");
      expect(r, enc).toMatchObject({
        ok: false,
        error: { code: "bad_response" },
      });
    }
  });
});

describe("#10 one deadline for the whole request", () => {
  it("slow DNS plus a slow response exceed the single deadline together", async () => {
    httpTiming.timeoutMs = 1000;
    routes.set("/slow", async (_r, s) => {
      await new Promise((r) => setTimeout(r, 700));
      s.end(`${head("200 OK", { "Content-Length": "4" })}slow`);
    });
    const t = testNet({
      "api.example.com": async () => {
        await new Promise((r) => setTimeout(r, 700));
        return [PUBLIC];
      },
    });
    const started = Date.now();
    await expect(
      fetchVia(t.net, "https://api.example.com/slow")
    ).resolves.toMatchObject({ ok: false, error: { code: "timeout" } });
    // Well short of the two steps' 1.4 s plus the sandbox start; the code itself is what tells
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("a slow secret store counts too, is read asynchronously and is told to stop", async () => {
    httpTiming.timeoutMs = 1000;
    let aborted = false;
    const secret: SecretFn = (_n, signal) =>
      new Promise((r) => {
        signal.addEventListener("abort", () => {
          aborted = true;
        });
        setTimeout(() => r(SECRET), 3000);
      });
    let ticks = 0;
    const tick = setInterval(() => ticks++, 50);
    const started = Date.now();
    try {
      await expect(
        fetchVia(testNet().net, "https://api.example.com/v1/echo", { secret })
      ).resolves.toMatchObject({ ok: false, error: { code: "timeout" } });
    } finally {
      clearInterval(tick);
    }
    expect(Date.now() - started).toBeLessThan(3000);
    expect(aborted).toBe(true);
    // The event loop kept running while the store was busy
    expect(ticks).toBeGreaterThan(5);
    expect(seen).toEqual([]);
  });
});
