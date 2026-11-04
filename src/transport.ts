import type { TelegramClient } from 'teleproto';
import { loadConfig, saveConfig } from './config.js';

/**
 * How the client reaches Telegram's servers.
 * - `tcp`: MTProto straight to a DC address on port 443 (teleproto's default, fastest).
 * - `wss`: MTProto inside a WebSocket to `wss://<dc>.web.telegram.org/apiws`, the endpoint
 *   web.telegram.org uses. It is real TLS on 443, so it passes networks that let only HTTPS out,
 *   such as some cloud agent computers (Grok Bot), where raw TCP fails with "NetSocket was closed".
 * - `auto` (default): TCP first; on a network failure, WSS, remembered in the profile's config.
 */
export type Transport = 'tcp' | 'wss';
export type TransportSetting = Transport | 'auto';

const VALUES: TransportSetting[] = ['tcp', 'wss', 'auto'];

/** TG_TRANSPORT wins, then `transport` in the config, then auto. */
export function transportSetting(env = process.env.TG_TRANSPORT): TransportSetting {
  const fromEnv = env?.trim().toLowerCase();
  if (fromEnv) {
    if ((VALUES as string[]).includes(fromEnv)) return fromEnv as TransportSetting;
    throw new Error(`Invalid TG_TRANSPORT "${env}": use tcp, wss or auto`);
  }
  const saved = loadConfig(() => {}).transport;
  return saved === 'tcp' || saved === 'wss' ? saved : 'auto';
}

/** Node 22+ and Bun have a global WebSocket; Node 20 does not. */
export function hasWebSocket(): boolean {
  return typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'function';
}

const NETWORK_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'EAI_AGAIN', 'ENOTFOUND',
]);

/** A failure to reach Telegram at all, as opposed to an RPC error from a server we did reach. */
export function isNetworkFailure(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const code = (e as Error & { code?: string }).code;
  if (code && NETWORK_CODES.has(code)) return true;
  if (e.name === 'NetSocketClosedError') return true;
  return /NetSocket was closed|WebSocket was closed|Not connected|connection (timed out|closed)|socket hang up/i.test(e.message);
}

export const BLOCKED_HINT =
  "Telegram's servers are unreachable from this machine over TCP and over WebSocket (wss://*.web.telegram.org). " +
  'Check the network or firewall; cloud agent computers sometimes block Telegram entirely.';

const NO_WEBSOCKET_HINT =
  "Telegram's TCP transport is blocked on this network (common on cloud agent computers that only allow HTTPS). " +
  'The WebSocket transport that gets through needs Node.js 22+ or the standalone binary (brew install thevilfer/tap/better-tg-cli).';

/**
 * Connects a client made by `make`, choosing the transport by `transportSetting()`. In auto mode a
 * network failure over TCP is retried once over WSS; when that works, `transport: "wss"` is saved
 * so later runs skip the failing attempt. RPC errors and explicit settings never switch.
 */
export async function connectClient(
  make: (transport: Transport) => TelegramClient,
  options: { setting?: TransportSetting; remember?: boolean; notice?: (message: string) => void } = {},
): Promise<TelegramClient> {
  const setting = options.setting ?? transportSetting();
  const notice = options.notice ?? ((m: string) => process.stderr.write(`${m}\n`));

  if (setting === 'wss' && !hasWebSocket()) throw new Error(`TG_TRANSPORT=wss: ${NO_WEBSOCKET_HINT}`);
  const first = make(setting === 'wss' ? 'wss' : 'tcp');
  try {
    await first.connect();
    return first;
  } catch (e) {
    await first.destroy().catch(() => {});
    if (!isNetworkFailure(e)) throw e;
    if (setting === 'wss') throw new Error(`${BLOCKED_HINT} (${(e as Error).message})`);
    if (setting === 'tcp') {
      throw new Error(`${(e as Error).message}. Telegram is unreachable over TCP here; try TG_TRANSPORT=wss.`);
    }
    if (!hasWebSocket()) throw new Error(`${NO_WEBSOCKET_HINT} (${(e as Error).message})`);
    notice(`Telegram over TCP failed (${(e as Error).message}); switching to WebSocket (wss://*.web.telegram.org).`);
  }

  const second = make('wss');
  try {
    await second.connect();
  } catch (e) {
    await second.destroy().catch(() => {});
    throw isNetworkFailure(e) ? new Error(`${BLOCKED_HINT} (${(e as Error).message})`) : e;
  }
  if (options.remember !== false) {
    try {
      saveConfig({ transport: 'wss' });
      notice('Saved transport "wss" for this profile (TG_TRANSPORT=tcp or auto overrides it).');
    } catch {
      // Not fatal: the next run just tries TCP first again
    }
  }
  return second;
}
