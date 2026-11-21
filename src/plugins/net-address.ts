/**
 * Which IP addresses a plugin's request may connect to (docs/plugins.md §6): public unicast only.
 * Loopback, private, link-local, CGNAT, multicast, unspecified, reserved and documentation ranges are
 * refused, and so is any IPv6 form that carries one of those IPv4 addresses (IPv4-mapped,
 * IPv4-compatible, NAT64 64:ff9b::/96, 6to4). Pure functions: no DNS, no sockets.
 */
import { isIP } from 'node:net';

/** IPv4 ranges a plugin may never reach: [first octets as a number, prefix length, why]. */
const V4_BLOCKED: [string, number, string][] = [
  ['0.0.0.0', 8, 'unspecified ("this network")'],
  ['10.0.0.0', 8, 'private'],
  ['100.64.0.0', 10, 'carrier-grade NAT (shared)'],
  ['127.0.0.0', 8, 'loopback'],
  ['169.254.0.0', 16, 'link-local'],
  ['172.16.0.0', 12, 'private'],
  ['192.0.0.0', 24, 'IETF protocol assignments'],
  ['192.0.2.0', 24, 'documentation'],
  ['192.88.99.0', 24, '6to4 relay'],
  ['192.168.0.0', 16, 'private'],
  ['198.18.0.0', 15, 'benchmarking'],
  ['198.51.100.0', 24, 'documentation'],
  ['203.0.113.0', 24, 'documentation'],
  ['224.0.0.0', 4, 'multicast'],
  ['240.0.0.0', 4, 'reserved (and broadcast)'],
];

function v4Number(ip: string): number {
  return ip.split('.').reduce((n, part) => n * 256 + Number(part), 0);
}

/** Why an IPv4 address is refused, or undefined for a public one. */
function v4Problem(n: number): string | undefined {
  for (const [base, bits, why] of V4_BLOCKED) {
    const size = 2 ** (32 - bits);
    const start = v4Number(base);
    if (n >= start && n < start + size) return why;
  }
  return undefined;
}

const v4Text = (n: number) => [24, 16, 8, 0].map(s => Math.floor(n / 2 ** s) % 256).join('.');

/** Eight 16-bit groups of an IPv6 address (with `::` and a dotted IPv4 tail expanded), or undefined. */
export function v6Groups(ip: string): number[] | undefined {
  let text = ip.toLowerCase();
  const dotted = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (dotted) {
    if (isIP(dotted[2]) !== 4) return undefined;
    const n = v4Number(dotted[2]);
    text = `${dotted[1]}${Math.floor(n / 65536).toString(16)}:${(n % 65536).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return undefined;
  const parse = (s: string) => (s ? s.split(':') : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  if (halves.length === 2 ? head.length + rest.length > 7 : head.length !== 8) return undefined;
  const all = [...head, ...new Array<string>(8 - head.length - rest.length).fill('0'), ...rest];
  if (!all.every(x => /^[0-9a-f]{1,4}$/.test(x))) return undefined;
  return all.map(x => parseInt(x, 16));
}

/** Why an IPv6 address is refused, or undefined for a public one. */
function v6Problem(g: number[]): string | undefined {
  const embedded = (hi: number, lo: number) => hi * 65536 + lo;
  const zeros = (from: number, to: number) => g.slice(from, to).every(x => x === 0);
  if (zeros(0, 8)) return 'unspecified';
  if (zeros(0, 7) && g[7] === 1) return 'loopback';
  // IPv4-mapped ::ffff:a.b.c.d: the IPv4 address is what the socket reaches
  if (zeros(0, 5) && g[5] === 0xffff) {
    const why = v4Problem(embedded(g[6], g[7]));
    return why ? `IPv4-mapped ${v4Text(embedded(g[6], g[7]))}, ${why}` : undefined;
  }
  // IPv4-translated ::ffff:0:a.b.c.d (SIIT)
  if (zeros(0, 4) && g[4] === 0xffff && g[5] === 0) return 'IPv4-translated (SIIT)';
  // Deprecated IPv4-compatible ::a.b.c.d
  if (zeros(0, 6)) return 'IPv4-compatible (deprecated)';
  // NAT64 well-known prefix: the gateway connects to the embedded IPv4 address
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) {
    const why = v4Problem(embedded(g[6], g[7]));
    return why ? `NAT64 of ${v4Text(embedded(g[6], g[7]))}, ${why}` : undefined;
  }
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return 'local-use NAT64';
  if (g[0] === 0x100 && zeros(1, 4)) return 'discard-only';
  // Teredo hides the client address; 6to4 carries an IPv4 address in bits 16-48
  if (g[0] === 0x2001 && g[1] === 0) return 'Teredo';
  if (g[0] === 0x2001 && g[1] === 0xdb8) return 'documentation';
  if (g[0] === 0x2001 && g[1] >= 0x10 && g[1] <= 0x2f) return 'ORCHID';
  if (g[0] === 0x2002) {
    const why = v4Problem(embedded(g[1], g[2]));
    return why ? `6to4 of ${v4Text(embedded(g[1], g[2]))}, ${why}` : undefined;
  }
  if ((g[0] & 0xfe00) === 0xfc00) return 'unique local (private)';
  if ((g[0] & 0xffc0) === 0xfe80) return 'link-local';
  if ((g[0] & 0xffc0) === 0xfec0) return 'site-local (deprecated)';
  if ((g[0] & 0xff00) === 0xff00) return 'multicast';
  // Only global unicast (2000::/3) is reachable on the internet
  if ((g[0] & 0xe000) !== 0x2000) return 'not global unicast';
  return undefined;
}

/** Why the host must not connect to `ip`, or undefined when it is a public unicast address. */
export function addressProblem(ip: string): string | undefined {
  const kind = isIP(ip.includes('%') ? ip.slice(0, ip.indexOf('%')) : ip);
  if (kind === 4) return v4Problem(v4Number(ip));
  if (kind === 6) {
    if (ip.includes('%')) return 'scoped (zone) address';
    const g = v6Groups(ip);
    return g ? v6Problem(g) : 'unreadable IPv6 address';
  }
  return 'not an IP address';
}
