import { randomBytes } from 'node:crypto';
import { platform } from 'node:os';
import { VERSION } from './version.js';
import { isSecretStoreAvailable, secretDelete, secretGet, secretSet } from './secrets.js';
import { createRpcProcessor, type RpcReply } from './mcp-http.js';
import { setKnownCommands } from './mcp.js';
import { confirmByHuman } from './confirm.js';

/**
 * `telegram mcp --remote`: this computer as a device of the hosted relay (relay/, issue #17).
 * Apps that connect to MCP by URL and OAuth (claude.ai, ChatGPT) talk to the relay; the relay
 * forwards their requests over an outbound WebSocket opened from here. The session, the write
 * guard and the audit log stay on this computer. A new app gets access only after the person here
 * confirms it in a dialog (or a terminal prompt on Linux).
 */

export const DEFAULT_RELAY_URL = 'https://mcp.better-tg-cli.com';
export const relayUrl = (env = process.env) => (env.TG_RELAY_URL || DEFAULT_RELAY_URL).replace(/\/+$/, '');

const SECRET_KEY = 'relayDevice';

/** The device secret is the device's identity at the relay; it lives only in the secret store. */
export function deviceSecret(options: { create?: boolean } = {}): string | null {
  if (!isSecretStoreAvailable()) return null;
  const existing = secretGet(SECRET_KEY);
  if (existing || !options.create) return existing;
  const secret = `tgrd_${randomBytes(32).toString('base64url')}`;
  return secretSet(SECRET_KEY, secret) ? secret : null;
}

export const forgetDevice = () => secretDelete(SECRET_KEY);

const headers = (secret: string) => ({ Authorization: `Bearer ${secret}`, 'User-Agent': `better-tg-cli/${VERSION}` });

/** A `/device/*` call to the relay; throws with the relay's error code on failure. */
export async function relayCall<T>(secret: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${relayUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: { ...headers(secret), ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`Relay answered ${res.status}${data.error ? ` (${data.error})` : ''}`);
  return data;
}

export type ConsentQuestion = { clientName: string; clientDomain?: string; redirectHost: string; redirectIsLoopback: boolean };

/** App names come from whoever registered the client: one line, no control characters, short. */
const clean = (value: unknown, max = 80) =>
  String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').trim().slice(0, max) || '?';

/** What the person at this computer is asked before an app gets access. */
export function consentText(q: ConsentQuestion): string {
  const who = q.clientDomain
    ? `Издатель: ${clean(q.clientDomain)}.`
    : 'Имя приложения не подтверждено: так может назваться кто угодно.';
  const where = `Доступ уйдёт на: ${clean(q.redirectHost)}${q.redirectIsLoopback ? ' (приложение на компьютере)' : ''}.`;
  return (
    `Подключить «${clean(q.clientName)}» к вашему Telegram через relay better-tg-cli?\n\n${who}\n${where}\n\n` +
    'Разрешайте, только если вы сами только что подключали это приложение. Отправка сообщений всё равно останется выключенной, пока вы не включите write-access.'
  );
}

export type RelayDeps = {
  processRpc: (text: string) => Promise<RpcReply>;
  confirm: (question: ConsentQuestion) => Promise<boolean>;
};

/** One message from the relay in, the reply to send back (or null for anything unknown). */
export async function answerRelayMessage(raw: string, deps: RelayDeps): Promise<object | null> {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof msg.id !== 'string') return null;
  if (msg.type === 'rpc' && typeof msg.body === 'string') {
    const reply = await deps.processRpc(msg.body);
    return { type: 'reply', id: msg.id, status: reply.status, body: reply.body === undefined ? '' : JSON.stringify(reply.body) };
  }
  if (msg.type === 'consent') {
    const question: ConsentQuestion = {
      clientName: String(msg.clientName ?? ''),
      clientDomain: typeof msg.clientDomain === 'string' ? msg.clientDomain : undefined,
      redirectHost: String(msg.redirectHost ?? ''),
      redirectIsLoopback: msg.redirectIsLoopback === true,
    };
    const allow = await deps.confirm(question).catch(() => false);
    return { type: 'reply', id: msg.id, allow };
  }
  return null;
}

const PING_MS = 30_000;
const MAX_BACKOFF_MS = 30_000;
/** The relay closes an older connection with this code when the same device connects again. */
export const REPLACED = 4000;

/**
 * Keep one connection to the relay open: reconnect with backoff, ping every 30 s and drop a
 * connection that stopped answering. Resolves when the connection is replaced by another
 * instance, which is a reason to stop, not to fight over the device.
 */
export function connectRelay(
  secret: string,
  deps: RelayDeps,
  events: { onOpen?: () => void; log?: (line: string) => void } = {}
): Promise<void> {
  const log = events.log ?? (line => console.error(line));
  const url = `${relayUrl().replace(/^http/, 'ws')}/device/connect`;
  let backoff = 1000;

  return new Promise(resolve => {
    const open = () => {
      // Node 22+ and Bun take headers here; the secret never goes into the URL
      const ws = new WebSocket(url, { headers: headers(secret) } as unknown as string[]);
      let alive = true;
      let ping: ReturnType<typeof setInterval> | undefined;

      ws.addEventListener('open', () => {
        backoff = 1000;
        ping = setInterval(() => {
          if (!alive) return ws.close(4001, 'No pong');
          alive = false;
          ws.send('{"type":"ping"}');
        }, PING_MS);
        events.onOpen?.();
      });
      ws.addEventListener('message', event => {
        const data = String(event.data);
        if (data === '{"type":"pong"}') {
          alive = true;
          return;
        }
        void answerRelayMessage(data, deps).then(reply => {
          if (reply && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(reply));
        });
      });
      ws.addEventListener('error', () => {}); // a close event always follows
      ws.addEventListener('close', event => {
        clearInterval(ping);
        if (event.code === REPLACED) {
          log('Another `telegram mcp --remote` with this device connected to the relay, so this one stops.');
          log('If that wasn\'t you, run `telegram remote reset` to disconnect every app and get a new device key.');
          return resolve();
        }
        log(`Relay connection closed${event.code ? ` (${event.code})` : ''}; reconnecting in ${backoff / 1000}s`);
        setTimeout(open, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      });
    };
    open();
  });
}

export async function runRemote(commands: Iterable<string>, options: { readOnly?: boolean } = {}): Promise<void> {
  if (typeof WebSocket === 'undefined') {
    console.error('`telegram mcp --remote` needs Node.js 22 or newer (or the standalone binary).');
    process.exit(1);
  }
  const secret = deviceSecret({ create: true });
  if (!secret) {
    console.error('The relay needs a secret store for the device key (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).');
    process.exit(1);
  }
  setKnownCommands(commands);
  const deps: RelayDeps = {
    processRpc: createRpcProcessor({ readOnly: options.readOnly }),
    confirm: async question => {
      const name = `«${question.clientName}»${question.clientDomain ? ` (${question.clientDomain})` : ' (name not verified)'}`;
      console.error(`${new Date().toISOString()} ${name} asks to connect; answer the dialog on this computer`);
      const allowed = await confirmByHuman(consentText(question), { preferDialog: true });
      console.error(`${new Date().toISOString()} ${name} ${allowed ? 'allowed' : 'not allowed (declined, timed out, or no dialog could be shown)'}`);
      return allowed;
    },
  };
  if (platform() === 'darwin' && process.env.SSH_CONNECTION) {
    console.error('Started over SSH: macOS can\'t show the confirmation dialog here, so every new app will be refused.');
    console.error('Start `telegram mcp --remote` in a terminal on this Mac (or tmux started there) instead.');
  }
  let first = true;
  await connectRelay(secret, deps, {
    onOpen: () => {
      if (!first) return console.error('Reconnected to the relay.');
      first = false;
      console.error(`Connected to the relay${options.readOnly ? ' (read-only: no telegram_write)' : ''}.`);
      console.error(`Connector URL for claude.ai, ChatGPT and other apps: ${relayUrl()}/mcp`);
      console.error('To connect an app, run `telegram remote pair` and enter the code on its sign-in page.');
    },
  });
  process.exit(1);
}
