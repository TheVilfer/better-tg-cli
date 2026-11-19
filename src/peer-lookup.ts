import { Api, utils } from 'teleproto';
import { getClient, resolveChat } from './client.js';
import type { PeerInfo } from './approval-action.js';

/**
 * Looks up the chats and users an approval names, so the person sees who gets the message, not a
 * number. Only reads: the dialog list and username lookups that resolving a chat does anyway, with
 * the same strict matching the write uses (the guard turns it on first). Nothing is sent.
 *
 * Connecting is not optional: a failure there (not logged in, no network) throws, since the write
 * could not run either. A recipient that does not resolve is reported as such, not thrown.
 */
export async function lookupPeers(values: string[]): Promise<Map<string, PeerInfo>> {
  const out = new Map<string, PeerInfo>();
  const wanted = [...new Set(values)];
  if (!wanted.length) return out;
  const client = await getClient();
  for (const v of wanted) {
    try {
      out.set(v, peerInfo(await resolveChat(client, v)));
    } catch (e) {
      // The whole message (it may list the candidates), as one line
      out.set(v, { ok: false, error: (e instanceof Error ? e.message : String(e)).split('\n').map(l => l.trim()).filter(Boolean).join('; ').replace(/:; /g, ': ') });
    }
  }
  return out;
}

function peerInfo(entity: Api.User | Api.Chat | Api.Channel): PeerInfo {
  const id = utils.getPeerId(entity).toString();
  if (entity instanceof Api.User) {
    const title = [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || 'Unknown';
    return { ok: true, id, title, type: entity.bot ? 'bot' : 'user', username: entity.username ?? undefined, ...(entity.self ? { self: true } : {}) };
  }
  if (entity instanceof Api.Channel) {
    const type = entity.forum ? 'forum' : entity.megagroup ? 'supergroup' : 'channel';
    return { ok: true, id, title: entity.title, type, username: entity.username ?? undefined };
  }
  return { ok: true, id, title: entity.title, type: 'group' };
}
