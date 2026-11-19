import {
  assertMessagesInChat, buttonFingerprint, deletesForEveryone, expectButton, findButton, getClient, parseIdList, resolveChat,
  type ButtonInfo, type ClickSelector,
} from './client.js';
import { fileSnapshot, snapshotDigest } from './file-snapshot.js';
import { descriptorOf, oneLine, type ParsedAction } from './approval-action.js';

/**
 * The parts of an action that only Telegram or the disk can tell, read before an approval is shown
 * or checked: they go into the approval hash and the description, and the write later uses exactly
 * what was read here (the same file bytes, the same button), or refuses.
 */
export interface Prepared {
  /** Bound into the approval hash */
  bound: unknown[];
  /** More lines for the person to read */
  lines: string[];
  /** Called once the approval for this action held, before the write runs */
  onApproved(): void;
}

const arg = (action: ParsedAction, name: string): string | undefined => {
  const a = action.args.find(x => x.name === name);
  return a === undefined ? undefined : Array.isArray(a.value) ? a.value.join(',') : a.value;
};

const quote = (text: string) => JSON.stringify(oneLine(text));

/** A button in words: which one, its kind, and what pressing it sends. */
export function describeButton(info: ButtonInfo): string {
  const head = `#${info.index} ${quote(info.text)}`;
  switch (info.type) {
    case 'callback': {
      const raw = Buffer.from(info.data ?? '', 'base64');
      const text = raw.toString('utf8');
      const shown = Buffer.from(text, 'utf8').equals(raw) ? ` = ${quote(text)}` : '';
      return `${head}: a bot button, sends the bot the data ${info.data}${shown}${info.requiresPassword ? ' (asks for your 2FA password)' : ''}`;
    }
    case 'text': return `${head}: a keyboard button, sends ${quote(info.text)} as a message to the chat`;
    case 'game': return `${head}: a game button, starts the game`;
    case 'url': case 'url_auth': case 'webview': return `${head}: a link button (${info.type}), nothing is sent; it shows ${quote(info.url ?? '')}`;
    default: return `${head}: a ${info.type} button`;
  }
}

/** The click's button, chosen as the command chooses it. */
function selectorOf(action: ParsedAction): ClickSelector | undefined {
  const data = action.options.find(([k]) => k === 'data')?.[1];
  if (typeof data === 'string') return { dataBase64: data };
  const button = arg(action, 'button');
  if (button === undefined) return undefined;
  return /^\d+$/.test(button) ? { index: parseInt(button, 10) } : { text: button };
}

/**
 * Reads what the approval of this action has to cover beyond its arguments. Throws (the guard
 * then stops with "nothing to approve") when the write could not run as shown: a file that can't
 * be read, a message that is not in the chat shown, a button that is not there.
 */
export async function prepareAction(action: ParsedAction): Promise<Prepared> {
  const prepared: Prepared = { bound: [], lines: [], onApproved: () => {} };
  if (!action.parsed) return prepared;
  const d = descriptorOf(action.command);

  for (const name of d?.files ?? []) {
    const path = arg(action, name);
    if (path === undefined) continue;
    const snap = fileSnapshot(path);
    prepared.bound.push(['file', name, snapshotDigest(snap)]);
    prepared.lines.push(`  File size: ${snap.bytes.length} bytes (the approval covers exactly these bytes)`);
  }

  if (action.command === 'delete') {
    const chat = arg(action, 'chat')!;
    const ids = parseIdList(arg(action, 'messageIds') ?? '');
    const client = await getClient();
    const entity = await resolveChat(client, chat);
    await assertMessagesInChat(client, entity, ids);
    if (deletesForEveryone(entity)) {
      prepared.lines.push('  For everyone: in a channel or supergroup Telegram deletes a message for all members; --just-me cannot keep it for others.');
    }
  }

  if (action.command === 'click') {
    const selector = selectorOf(action);
    const id = parseInt(arg(action, 'messageId') ?? '', 10);
    if (selector && Number.isInteger(id)) {
      const client = await getClient();
      const { info } = await findButton(client, arg(action, 'chat')!, id, selector);
      const fingerprint = buttonFingerprint(info);
      prepared.bound.push(['button', fingerprint]);
      prepared.lines.push(`  Pressing: ${describeButton(info)}`);
      prepared.onApproved = () => expectButton(fingerprint);
    }
  }
  return prepared;
}
