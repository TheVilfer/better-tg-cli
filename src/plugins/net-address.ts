import { isIP } from "node:net";

const V4_BLOCKED: [string, number, string][] = [
  ["0.0.0.0", 8, 'unspecified ("this network")'],
  ["10.0.0.0", 8, "private"],
  ["100.64.0.0", 10, "carrier-grade NAT (shared)"],
  ["127.0.0.0", 8, "loopback"],
  ["169.254.0.0", 16, "link-local"],
  ["172.16.0.0", 12, "private"],
  ["192.0.0.0", 24, "IETF protocol assignments"],
  ["192.0.2.0", 24, "documentation"],
  ["192.88.99.0", 24, "6to4 relay"],
  ["192.168.0.0", 16, "private"],
  ["198.18.0.0", 15, "benchmarking"],
  ["198.51.100.0", 24, "documentation"],
  ["203.0.113.0", 24, "documentation"],
  ["224.0.0.0", 4, "multicast"],
  ["240.0.0.0", 4, "reserved (and broadcast)"],
];

function v4Number(ip: string): number {
  return ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);
}

function v4Problem(n: number): string | undefined {
  for (const [base, bits, why] of V4_BLOCKED) {
    const size = 2 ** (32 - bits);
    const start = v4Number(base);
    if (n >= start && n < start + size) {
      return why;
    }
  }
  return undefined;
}

const v4Text = (n: number) =>
  [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join(".");

/** Eight 16-bit groups of an IPv6 address (with `::` and a dotted IPv4 tail expanded), or undefined. */
export function v6Groups(ip: string): number[] | undefined {
  let text = ip.toLowerCase();
  const dotted = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (dotted) {
    if (isIP(dotted[2]) !== 4) {
      return undefined;
    }
    const n = v4Number(dotted[2]);
    text = `${dotted[1]}${Math.floor(n / 65_536).toString(16)}:${(n % 65_536).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) {
    return undefined;
  }
  const parse = (s: string) => (s ? s.split(":") : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  if (halves.length === 2 ? head.length + rest.length > 7 : head.length !== 8) {
    return undefined;
  }
  const all = [
    ...head,
    ...Array.from<string>({ length: 8 - head.length - rest.length }).fill("0"),
    ...rest,
  ];
  if (!all.every((x) => /^[0-9a-f]{1,4}$/.test(x))) {
    return undefined;
  }
  return all.map((x) => Number.parseInt(x, 16));
}

/**
 * A NAT64 prefix of the network (RFC 6052: 32, 40, 48, 56, 64 or 96 bits), found by RFC 7050 discovery.
 *
 * - `text`: `prefix/bits` for messages and de-duplication.
 */
export interface Nat64Prefix {
  bytes: number[];
  bits: 32 | 40 | 48 | 56 | 64 | 96;
  text: string;
}

const NAT64_LENGTHS = [96, 64, 56, 48, 40, 32] as const;

const bytesOf = (g: number[]) => g.flatMap((x) => [x >> 8, x & 0xff]);

function embeddedV4(bytes: number[], bits: number): number {
  const out: number[] = [];
  for (let i = bits / 8; out.length < 4; i++) {
    if (i !== 8) {
      out.push(bytes[i]);
    }
  }
  return ((out[0] << 24) >>> 0) + (out[1] << 16) + (out[2] << 8) + out[3];
}

const IPV4ONLY = new Set([0xc0_00_00_aa, 0xc0_00_00_ab]);

/**
 * The NAT64 prefix an AAAA answer for ipv4only.arpa shows: the length at which 192.0.0.170 or
 * 192.0.0.171 is embedded (RFC 7050 §3), or undefined (not a synthesized answer).
 */
export function nat64Prefix(address: string): Nat64Prefix | undefined {
  if (isIP(address) !== 6) {
    return undefined;
  }
  const g = v6Groups(address);
  if (!g) {
    return undefined;
  }
  const bytes = bytesOf(g);
  for (const bits of NAT64_LENGTHS) {
    if (bits < 96 && bytes[8] !== 0) {
      continue;
    }
    if (!IPV4ONLY.has(embeddedV4(bytes, bits))) {
      continue;
    }
    const prefix = bytes.slice(0, bits / 8);
    const groups: string[] = [];
    for (let i = 0; i < 16; i += 2) {
      groups.push(
        (((prefix[i] ?? 0) << 8) | (prefix[i + 1] ?? 0)).toString(16)
      );
    }
    return { bytes: prefix, bits, text: `${groups.join(":")}/${bits}` };
  }
  return undefined;
}

function v6Problem(g: number[], nat64: Nat64Prefix[] = []): string | undefined {
  const bytes = bytesOf(g);
  for (const p of nat64) {
    if (!p.bytes.every((b, i) => bytes[i] === b)) {
      continue;
    }
    const v4 = embeddedV4(bytes, p.bits);
    const why = v4Problem(v4);
    return why ? `NAT64 (${p.text}) of ${v4Text(v4)}, ${why}` : undefined;
  }
  const embedded = (hi: number, lo: number) => hi * 65_536 + lo;
  const zeros = (from: number, to: number) =>
    g.slice(from, to).every((x) => x === 0);
  if (zeros(0, 8)) {
    return "unspecified";
  }
  if (zeros(0, 7) && g[7] === 1) {
    return "loopback";
  }
  if (zeros(0, 5) && g[5] === 0xff_ff) {
    const why = v4Problem(embedded(g[6], g[7]));
    return why
      ? `IPv4-mapped ${v4Text(embedded(g[6], g[7]))}, ${why}`
      : undefined;
  }
  if (zeros(0, 4) && g[4] === 0xff_ff && g[5] === 0) {
    return "IPv4-translated (SIIT)";
  }
  if (zeros(0, 6)) {
    return "IPv4-compatible (deprecated)";
  }
  if (g[0] === 0x64 && g[1] === 0xff_9b && zeros(2, 6)) {
    const why = v4Problem(embedded(g[6], g[7]));
    return why ? `NAT64 of ${v4Text(embedded(g[6], g[7]))}, ${why}` : undefined;
  }
  if (g[0] === 0x64 && g[1] === 0xff_9b && g[2] === 1) {
    return "local-use NAT64";
  }
  if (g[0] === 0x1_00 && zeros(1, 4)) {
    return "discard-only";
  }
  if (g[0] === 0x20_01 && g[1] === 0) {
    return "Teredo";
  }
  if (g[0] === 0x20_01 && g[1] === 0xd_b8) {
    return "documentation";
  }
  if (g[0] === 0x20_01 && g[1] >= 0x10 && g[1] <= 0x2f) {
    return "ORCHID";
  }
  if (g[0] === 0x20_02) {
    const why = v4Problem(embedded(g[1], g[2]));
    return why ? `6to4 of ${v4Text(embedded(g[1], g[2]))}, ${why}` : undefined;
  }
  if ((g[0] & 0xfe_00) === 0xfc_00) {
    return "unique local (private)";
  }
  if ((g[0] & 0xff_c0) === 0xfe_80) {
    return "link-local";
  }
  if ((g[0] & 0xff_c0) === 0xfe_c0) {
    return "site-local (deprecated)";
  }
  if ((g[0] & 0xff_00) === 0xff_00) {
    return "multicast";
  }
  if ((g[0] & 0xe0_00) !== 0x20_00) {
    return "not global unicast";
  }
  return undefined;
}

/**
 * Why the host must not connect to `ip`, or undefined when it is a public unicast address.
 * `nat64`: the network's own NAT64 prefixes (discovered per RFC 7050), besides the well-known one.
 */
export function addressProblem(
  ip: string,
  nat64: Nat64Prefix[] = []
): string | undefined {
  const kind = isIP(ip.includes("%") ? ip.slice(0, ip.indexOf("%")) : ip);
  if (kind === 4) {
    return v4Problem(v4Number(ip));
  }
  if (kind === 6) {
    if (ip.includes("%")) {
      return "scoped (zone) address";
    }
    const g = v6Groups(ip);
    return g ? v6Problem(g, nat64) : "unreadable IPv6 address";
  }
  return "not an IP address";
}
