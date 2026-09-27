import { TelegramClient, Api, Rich } from 'teleproto';
import { StringSession } from 'teleproto/sessions/index.js';
import { CustomFile } from 'teleproto/client/uploads.js';
import { Logger, LogLevel } from 'teleproto/extensions/Logger.js';
import { generateRandomLong } from 'teleproto/Helpers.js';
import { getCredentials, getSessionString, setSessionString, isConfigured } from './config.js';
import bigInt from 'big-integer';
import { existsSync, mkdirSync, statSync } from 'fs';
import { basename, join } from 'path';

let clientInstance: TelegramClient | null = null;

export async function getClient(): Promise<TelegramClient> {
  if (clientInstance?.connected) {
    return clientInstance;
  }

  if (!isConfigured()) {
    throw new Error('Not configured. Run "tg auth" first to set up your API credentials.');
  }

  const { apiId, apiHash } = getCredentials();
  const sessionString = getSessionString() || '';
  const session = new StringSession(sessionString);

  // GramJS logs connection chatter to stdout at INFO/WARN (including a version
  // banner in the constructor) — start it at ERROR so command output, and
  // especially --json / `watch --json`, stays clean and parseable.
  const baseLogger = new Logger(LogLevel.ERROR);

  clientInstance = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    baseLogger,
  });

  await clientInstance.connect();

  if (!await clientInstance.isUserAuthorized()) {
    throw new Error('Not authenticated. Run "tg auth" to log in.');
  }

  return clientInstance;
}

export async function createClient(apiId: number, apiHash: string): Promise<TelegramClient> {
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  return client;
}

export async function saveSession(client: TelegramClient): Promise<void> {
  const sessionString = (client.session as StringSession).save();
  setSessionString(sessionString);
}

export async function disconnectClient(): Promise<void> {
  if (clientInstance) {
    try {
      // destroy() closes main connection AND any borrowed senders (e.g. file-download DC).
      // disconnect() leaves the secondary download-loop alive, which then throws TIMEOUT.
      await clientInstance.destroy();
    } catch {
      // ignore teardown noise
    }
    clientInstance = null;
  }
  resolvedChatCache.clear();
}

// Cache resolved chat entities by identifier (normalized) to avoid re-fetching
// getDialogs({limit: 500}) on every call, which triggers FLOOD_WAIT on messages.GetDialogs.
const resolvedChatCache = new Map<string, ResolvedEntity>();

function cacheKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export async function getMe(client: TelegramClient): Promise<Api.User> {
  const me = await client.getMe();
  if (!me || !(me instanceof Api.User)) {
    throw new Error('Failed to get user info');
  }
  return me;
}

export interface ChatInfo {
  id: string;
  title: string;
  type: 'user' | 'group' | 'supergroup' | 'channel';
  username?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageDate?: Date;
}

export async function getDialogs(client: TelegramClient, limit = 100): Promise<ChatInfo[]> {
  const dialogs = await client.getDialogs({ limit });
  const chats: ChatInfo[] = [];

  for (const dialog of dialogs) {
    let type: ChatInfo['type'] = 'user';
    let title = dialog.title || 'Unknown';
    let username: string | undefined;

    if (dialog.isUser) {
      type = 'user';
      const entity = dialog.entity as Api.User;
      username = entity.username ?? undefined;
    } else if (dialog.isGroup) {
      type = 'group';
    } else if (dialog.isChannel) {
      const entity = dialog.entity as Api.Channel;
      type = entity.megagroup ? 'supergroup' : 'channel';
      username = entity.username ?? undefined;
    }

    chats.push({
      id: dialog.id?.toString() || '',
      title,
      type,
      username,
      unreadCount: dialog.unreadCount,
      lastMessage: dialog.message?.message,
      lastMessageDate: dialog.message?.date ? new Date(dialog.message.date * 1000) : undefined,
    });
  }

  return chats;
}

export type MediaKind =
  | 'photo'
  | 'document'
  | 'video'
  | 'audio'
  | 'voice'
  | 'video_note'
  | 'sticker'
  | 'gif';

export interface MediaInfo {
  kind: MediaKind;
  fileName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  hasSpoiler?: boolean;
}

export type ButtonType =
  | 'callback'
  | 'url'
  | 'text'
  | 'switch_inline'
  | 'switch_inline_current'
  | 'webview'
  | 'url_auth'
  | 'game'
  | 'buy'
  | 'copy'
  | 'request_phone'
  | 'request_geo'
  | 'request_poll'
  | 'request_peer'
  | 'user_profile'
  | 'unknown';

export interface ButtonInfo {
  /** 1-based flat index across all rows (what the user passes to `tg click`). */
  index: number;
  row: number;
  col: number;
  text: string;
  type: ButtonType;
  /** URL for url/webview/url_auth buttons. */
  url?: string;
  /** Query string for switch_inline buttons. */
  query?: string;
  /** base64 of the raw callback payload (display only — never round-tripped back for clicking). */
  data?: string;
  /** Text a copy button places on the clipboard. */
  copyText?: string;
  /** Callback button that needs the account 2FA password to press. */
  requiresPassword?: boolean;
}

export interface ButtonLayout {
  /** true = inline keyboard attached under the message; false = custom reply keyboard. */
  isInline: boolean;
  rows: ButtonInfo[][];
}

export interface MessageInfo {
  id: number;
  date: Date;
  sender: string;
  senderId?: string;
  text: string;
  replyToMsgId?: number;
  isOutgoing: boolean;
  media?: MediaInfo;
  buttons?: ButtonLayout;
}

type RawButton = Api.KeyboardButton | Api.KeyboardInlineButton;

/**
 * Layer 229 (teleproto) models a button as `{ text, type }` where `type` is a
 * `ButtonType*` (reply keyboard) or `InlineButtonType*` (inline keyboard)
 * object, instead of one TL constructor per button kind as in GramJS layer 198.
 */
function classifyButton(btn: RawButton, index: number, row: number, col: number): ButtonInfo {
  const base = { index, row, col, text: btn.text || '' };
  const t: Api.TypeButtonType | Api.TypeInlineButtonType = btn.type;

  if (t instanceof Api.InlineButtonTypeCallback) {
    return { ...base, type: 'callback', data: Buffer.from(t.data).toString('base64'), requiresPassword: t.requiresPassword || undefined };
  }
  if (t instanceof Api.InlineButtonTypeUrl) {
    return { ...base, type: 'url', url: t.url };
  }
  if (t instanceof Api.InlineButtonTypeUrlAuth || t instanceof Api.InputInlineButtonTypeUrlAuth) {
    return { ...base, type: 'url_auth', url: t.url };
  }
  if (t instanceof Api.InlineButtonTypeWebView || t instanceof Api.ButtonTypeSimpleWebView) {
    return { ...base, type: 'webview', url: t.url };
  }
  if (t instanceof Api.InlineButtonTypeSwitchInline) {
    return { ...base, type: t.samePeer ? 'switch_inline_current' : 'switch_inline', query: t.query };
  }
  if (t instanceof Api.InlineButtonTypeGame) {
    return { ...base, type: 'game' };
  }
  if (t instanceof Api.InlineButtonTypeBuy) {
    return { ...base, type: 'buy' };
  }
  if (t instanceof Api.InlineButtonTypeCopy) {
    return { ...base, type: 'copy', copyText: t.copyText };
  }
  if (t instanceof Api.ButtonTypeRequestPhone) {
    return { ...base, type: 'request_phone' };
  }
  if (t instanceof Api.ButtonTypeRequestGeoLocation) {
    return { ...base, type: 'request_geo' };
  }
  if (t instanceof Api.ButtonTypeRequestPoll) {
    return { ...base, type: 'request_poll' };
  }
  if (t instanceof Api.ButtonTypeRequestPeer || t instanceof Api.InputButtonTypeRequestPeer) {
    return { ...base, type: 'request_peer' };
  }
  if (t instanceof Api.InlineButtonTypeUserProfile || t instanceof Api.InputInlineButtonTypeUserProfile) {
    return { ...base, type: 'user_profile' };
  }
  if (t instanceof Api.ButtonTypeDefault) {
    // Plain reply-keyboard button: pressing it sends its text as a message.
    return { ...base, type: 'text' };
  }
  return { ...base, type: 'unknown' };
}


/**
 * Plain text of a message. Since layer 228 bots (and Telegram clients) can send
 * "rich messages": `message` is then empty and the content is a block tree in
 * `richMessage` (headings, bold, mentions, lists…). Render it to plain text so
 * `read`/`search`/`watch`/`click` show the actual reply instead of "(no text)".
 */
export function messageText(msg: Api.Message): string {
  if (msg.message) return msg.message;
  if (msg.richMessage) {
    try {
      return Rich.toPlainText(msg.richMessage).trim();
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Sender name/id without an extra round-trip: teleproto attaches the entities
 * returned with the message, so `msg.sender` is usually already resolved. In a
 * private chat an incoming message has no `fromId` (the peer is the sender),
 * which the old `fromId`-only lookup reported as "Unknown".
 */
async function resolveSender(client: TelegramClient, msg: Api.Message): Promise<{ sender: string; senderId?: string }> {
  let entity: unknown = msg.sender ?? undefined;
  if (!entity) {
    const ref = msg.out ? undefined : (msg.fromId ?? (msg.peerId instanceof Api.PeerUser ? msg.peerId : undefined));
    if (ref) {
      try {
        entity = await client.getEntity(ref);
      } catch {
        // Ignore entity resolution errors
      }
    }
  }
  if (entity instanceof Api.User) {
    return { sender: entity.firstName || entity.username || 'Unknown', senderId: entity.id.toString() };
  }
  if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
    return { sender: entity.title || 'Unknown', senderId: entity.id.toString() };
  }
  return { sender: msg.out ? 'You' : 'Unknown' };
}

/** Build a display-friendly button layout from a message's reply markup. */
export function extractButtons(msg: Api.Message): ButtonLayout | undefined {
  const markup = msg.replyMarkup;
  if (!(markup instanceof Api.ReplyInlineMarkup) && !(markup instanceof Api.ReplyKeyboardMarkup)) {
    return undefined;
  }

  const isInline = markup instanceof Api.ReplyInlineMarkup;
  const rows: ButtonInfo[][] = [];
  let flatIndex = 0;

  markup.rows.forEach((row, rowIdx) => {
    const parsedRow: ButtonInfo[] = [];
    row.buttons.forEach((btn, colIdx) => {
      flatIndex += 1;
      parsedRow.push(classifyButton(btn, flatIndex, rowIdx, colIdx));
    });
    rows.push(parsedRow);
  });

  return { isInline, rows };
}

function extractMediaInfo(msg: Api.Message): MediaInfo | undefined {
  const media = msg.media;
  if (!media) return undefined;

  if (media instanceof Api.MessageMediaPhoto) {
    const info: MediaInfo = { kind: 'photo' };
    if (media.spoiler) info.hasSpoiler = true;
    return info;
  }

  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    if (!(doc instanceof Api.Document)) {
      return { kind: 'document' };
    }

    let kind: MediaKind = 'document';
    let fileName: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;

    for (const attr of doc.attributes) {
      if (attr instanceof Api.DocumentAttributeFilename) {
        fileName = attr.fileName;
      } else if (attr instanceof Api.DocumentAttributeVideo) {
        kind = attr.roundMessage ? 'video_note' : 'video';
        width = attr.w;
        height = attr.h;
        duration = Math.round(attr.duration);
      } else if (attr instanceof Api.DocumentAttributeAudio) {
        kind = attr.voice ? 'voice' : 'audio';
        duration = attr.duration;
      } else if (attr instanceof Api.DocumentAttributeAnimated) {
        kind = 'gif';
      } else if (attr instanceof Api.DocumentAttributeSticker) {
        kind = 'sticker';
      }
    }

    // Document size is `long` (big-integer). Convert safely.
    let size: number | undefined;
    try {
      const sizeNum = typeof (doc.size as unknown as { toJSNumber?: () => number }).toJSNumber === 'function'
        ? (doc.size as unknown as { toJSNumber: () => number }).toJSNumber()
        : Number(doc.size as unknown as number);
      if (Number.isFinite(sizeNum)) size = sizeNum;
    } catch {
      // ignore
    }

    return {
      kind,
      fileName,
      mimeType: doc.mimeType || undefined,
      size,
      width,
      height,
      duration,
      hasSpoiler: media.spoiler ? true : undefined,
    };
  }

  return undefined;
}

export async function getMessages(
  client: TelegramClient,
  chatIdentifier: string,
  options: { limit?: number; offsetId?: number; minDate?: Date; maxDate?: Date } = {}
): Promise<{ messages: MessageInfo[]; chatTitle: string }> {
  const { limit = 50, offsetId, minDate, maxDate } = options;

  // Find the chat by name or username
  const entity = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(entity);

  const messages: MessageInfo[] = [];

  // Use iterMessages for better control over parameters
  const iterParams: { limit: number; offsetId?: number; reverse?: boolean } = {
    limit: limit * 2, // Get more to filter by date
  };

  if (offsetId) {
    iterParams.offsetId = offsetId;
  }

  const result = await client.getMessages(entity, iterParams);

  for (const msg of result) {
    if (msg instanceof Api.Message) {
      const msgDate = new Date(msg.date * 1000);

      // Filter by date if specified
      if (minDate && msgDate < minDate) continue;
      if (maxDate && msgDate > maxDate) continue;
      if (messages.length >= limit) break;

      const { sender, senderId } = await resolveSender(client, msg);

      messages.push({
        id: msg.id,
        date: msgDate,
        sender,
        senderId,
        text: messageText(msg),
        replyToMsgId: msg.replyTo?.replyToMsgId,
        isOutgoing: msg.out ?? false,
        media: extractMediaInfo(msg),
        buttons: extractButtons(msg),
      });
    }
  }

  return { messages, chatTitle };
}

export async function downloadMessageMedia(
  client: TelegramClient,
  chatIdentifier: string,
  messageId: number,
  outputDir: string
): Promise<{ filePath: string; media: MediaInfo } | null> {
  const entity = await resolveChat(client, chatIdentifier);

  const msgs = await client.getMessages(entity, { ids: [messageId] });
  const msg = msgs[0];

  if (!(msg instanceof Api.Message) || !msg.media) {
    return null;
  }

  const mediaInfo = extractMediaInfo(msg);
  if (!mediaInfo) return null;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const fileName = buildMediaFilename(mediaInfo, msg.id);
  const filePath = join(outputDir, fileName);

  const result = await client.downloadMedia(msg, { outputFile: filePath });
  // downloadMedia returns the path/Buffer; when outputFile is a string, file is written there.
  const savedPath = typeof result === 'string' ? result : filePath;

  return { filePath: savedPath, media: mediaInfo };
}

export function buildMediaFilename(media: MediaInfo, messageId: number): string {
  if (media.fileName) {
    // Prefix with message ID to guarantee uniqueness across chat.
    return `${messageId}_${sanitizeFilename(media.fileName)}`;
  }

  const ext = guessExtension(media);
  return `${messageId}_${media.kind}${ext}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_');
}

function guessExtension(media: MediaInfo): string {
  if (media.mimeType) {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
      'application/pdf': '.pdf',
      'application/zip': '.zip',
    };
    if (map[media.mimeType]) return map[media.mimeType];
    const match = media.mimeType.match(/\/([a-zA-Z0-9.+-]+)$/);
    if (match) return `.${match[1].replace(/\+.*$/, '')}`;
  }
  if (media.kind === 'photo') return '.jpg';
  if (media.kind === 'voice') return '.ogg';
  if (media.kind === 'video' || media.kind === 'video_note' || media.kind === 'gif') return '.mp4';
  if (media.kind === 'audio') return '.mp3';
  if (media.kind === 'sticker') return '.webp';
  return '.bin';
}

export async function sendFileMessage(
  client: TelegramClient,
  chatIdentifier: string,
  filePath: string,
  options: { caption?: string; asDocument?: boolean; replyToMsgId?: number } = {}
): Promise<Api.Message> {
  const entity = await resolveChat(client, chatIdentifier);

  const result = await client.sendFile(entity, {
    file: filePath,
    caption: options.caption,
    forceDocument: options.asDocument,
    replyTo: options.replyToMsgId,
  });

  return result;
}

export async function searchMessages(
  client: TelegramClient,
  query: string,
  options: { chat?: string; limit?: number } = {}
): Promise<{ messages: MessageInfo[]; chatTitle?: string }[]> {
  const { chat, limit = 50 } = options;
  const results: { messages: MessageInfo[]; chatTitle?: string }[] = [];

  if (chat) {
    const entity = await resolveChat(client, chat);
    const chatTitle = getChatTitle(entity);

    const searchResult = await client.invoke(
      new Api.messages.Search({
        peer: entity,
        q: query,
        filter: new Api.InputMessagesFilterEmpty(),
        minDate: 0,
        maxDate: 0,
        offsetId: 0,
        addOffset: 0,
        limit,
        maxId: 0,
        minId: 0,
        hash: bigInt(0),
      })
    );

    const messages: MessageInfo[] = [];
    if ('messages' in searchResult) {
      for (const msg of searchResult.messages) {
        if (msg instanceof Api.Message) {
          let sender = msg.out ? 'You' : 'Unknown';
          if ('users' in searchResult) {
            const from = msg.fromId ?? (msg.out ? undefined : msg.peerId);
            const wantedId = from instanceof Api.PeerUser ? from.userId : bigInt(0);
            const user = searchResult.users.find((u): u is Api.User => u instanceof Api.User && u.id.equals(wantedId));
            if (user) {
              sender = user.firstName || user.username || 'Unknown';
            }
          }

          messages.push({
            id: msg.id,
            date: new Date(msg.date * 1000),
            sender,
            text: messageText(msg),
            replyToMsgId: msg.replyTo?.replyToMsgId,
            isOutgoing: msg.out ?? false,
          });
        }
      }
    }

    results.push({ messages, chatTitle });
  } else {
    // Global search
    const searchResult = await client.invoke(
      new Api.messages.SearchGlobal({
        q: query,
        filter: new Api.InputMessagesFilterEmpty(),
        minDate: 0,
        maxDate: 0,
        offsetRate: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        offsetId: 0,
        limit,
      })
    );

    const messages: MessageInfo[] = [];
    if ('messages' in searchResult) {
      for (const msg of searchResult.messages) {
        if (msg instanceof Api.Message) {
          messages.push({
            id: msg.id,
            date: new Date(msg.date * 1000),
            sender: (await resolveSender(client, msg)).sender,
            text: messageText(msg),
            replyToMsgId: msg.replyTo?.replyToMsgId,
            isOutgoing: msg.out ?? false,
          });
        }
      }
    }

    results.push({ messages });
  }

  return results;
}

export async function sendMessage(
  client: TelegramClient,
  chatIdentifier: string,
  text: string,
  replyToMsgId?: number,
  options: { parseMode?: 'html' | 'md'; schedule?: number; silent?: boolean } = {}
): Promise<Api.Message> {
  const entity = await resolveChat(client, chatIdentifier);

  const result = await client.sendMessage(entity, {
    message: text,
    replyTo: replyToMsgId,
    parseMode: options.parseMode,
    schedule: options.schedule,
    silent: options.silent,
  });

  return result;
}

export async function getContactInfo(
  client: TelegramClient,
  identifier: string
): Promise<{
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  isBot: boolean;
  isMutualContact: boolean;
}> {
  const entity = await client.getEntity(identifier);

  if (!(entity instanceof Api.User)) {
    throw new Error('Not a user');
  }

  let bio: string | undefined;
  try {
    const fullUser = await client.invoke(
      new Api.users.GetFullUser({ id: entity })
    );
    bio = fullUser.fullUser.about ?? undefined;
  } catch {
    // Ignore
  }

  return {
    id: entity.id.toString(),
    firstName: entity.firstName ?? undefined,
    lastName: entity.lastName ?? undefined,
    username: entity.username ?? undefined,
    phone: entity.phone ?? undefined,
    bio,
    isBot: entity.bot ?? false,
    isMutualContact: entity.mutualContact ?? false,
  };
}

export async function getChatMembers(
  client: TelegramClient,
  chatIdentifier: string,
  options: { adminsOnly?: boolean; limit?: number } = {}
): Promise<{ id: string; name: string; username?: string; isAdmin: boolean }[]> {
  const { adminsOnly = false, limit = 200 } = options;
  const entity = await resolveChat(client, chatIdentifier);

  if (entity instanceof Api.Channel) {
    const filter = adminsOnly
      ? new Api.ChannelParticipantsAdmins()
      : new Api.ChannelParticipantsRecent();

    const result = await client.invoke(
      new Api.channels.GetParticipants({
        channel: entity,
        filter,
        offset: 0,
        limit,
        hash: bigInt(0),
      })
    );

    if (!(result instanceof Api.channels.ChannelParticipants)) {
      return [];
    }

    const members: { id: string; name: string; username?: string; isAdmin: boolean }[] = [];

    for (const participant of result.participants) {
      const userId = 'userId' in participant ? participant.userId : null;
      if (!userId) continue;

      const user = result.users.find(
        (u): u is Api.User => u instanceof Api.User && u.id.equals(userId)
      );

      if (user) {
        const isAdmin = participant instanceof Api.ChannelParticipantAdmin ||
                       participant instanceof Api.ChannelParticipantCreator;

        members.push({
          id: user.id.toString(),
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown',
          username: user.username ?? undefined,
          isAdmin,
        });
      }
    }

    return members;
  } else if (entity instanceof Api.Chat) {
    const fullChat = await client.invoke(
      new Api.messages.GetFullChat({ chatId: entity.id })
    );

    if (!('fullChat' in fullChat) || !(fullChat.fullChat instanceof Api.ChatFull)) {
      return [];
    }

    const members: { id: string; name: string; username?: string; isAdmin: boolean }[] = [];

    if (fullChat.fullChat.participants instanceof Api.ChatParticipants) {
      for (const participant of fullChat.fullChat.participants.participants) {
        const userId = participant.userId;
        const user = fullChat.users.find(
          (u): u is Api.User => u instanceof Api.User && u.id.equals(userId)
        );

        if (user) {
          const isAdmin = participant instanceof Api.ChatParticipantAdmin ||
                         participant instanceof Api.ChatParticipantCreator;

          if (!adminsOnly || isAdmin) {
            members.push({
              id: user.id.toString(),
              name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown',
              username: user.username ?? undefined,
              isAdmin,
            });
          }
        }
      }
    }

    return members;
  }

  throw new Error('Not a group chat');
}

export async function getAdminGroups(client: TelegramClient): Promise<ChatInfo[]> {
  const dialogs = await client.getDialogs({ limit: 500 });
  const adminGroups: ChatInfo[] = [];

  for (const dialog of dialogs) {
    if (dialog.isGroup || dialog.isChannel) {
      const entity = dialog.entity;

      if (entity instanceof Api.Channel) {
        if (entity.adminRights || entity.creator) {
          adminGroups.push({
            id: dialog.id?.toString() || '',
            title: dialog.title || 'Unknown',
            type: entity.megagroup ? 'supergroup' : 'channel',
            username: entity.username ?? undefined,
            unreadCount: dialog.unreadCount,
          });
        }
      } else if (entity instanceof Api.Chat) {
        // For regular groups, we need to check participants
        try {
          const fullChat = await client.invoke(
            new Api.messages.GetFullChat({ chatId: entity.id })
          );

          const me = await client.getMe() as Api.User;

          if ('fullChat' in fullChat && fullChat.fullChat instanceof Api.ChatFull) {
            if (fullChat.fullChat.participants instanceof Api.ChatParticipants) {
              const myParticipant = fullChat.fullChat.participants.participants.find(
                p => p.userId.equals(me.id)
              );

              if (myParticipant instanceof Api.ChatParticipantAdmin ||
                  myParticipant instanceof Api.ChatParticipantCreator) {
                adminGroups.push({
                  id: dialog.id?.toString() || '',
                  title: dialog.title || 'Unknown',
                  type: 'group',
                  unreadCount: dialog.unreadCount,
                });
              }
            }
          }
        } catch {
          // Skip if we can't get chat info
        }
      }
    }
  }

  return adminGroups;
}

export type ResolvedEntity = Api.User | Api.Chat | Api.Channel;

export async function resolveChat(client: TelegramClient, identifier: string): Promise<ResolvedEntity> {
  const key = cacheKey(identifier);
  const cached = resolvedChatCache.get(key);
  if (cached) return cached;

  const entity = await resolveChatUncached(client, identifier);
  resolvedChatCache.set(key, entity);
  return entity;
}

async function resolveChatUncached(client: TelegramClient, identifier: string): Promise<ResolvedEntity> {
  // Check if it's a username (starts with @)
  if (identifier.startsWith('@')) {
    const entity = await client.getEntity(identifier);
    if (entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel) {
      return entity;
    }
    throw new Error(`Invalid entity type for: ${identifier}`);
  }

  // Try to find by exact name in dialogs
  const dialogs = await client.getDialogs({ limit: 500 });

  // First try exact match
  let dialog = dialogs.find(d => d.title?.toLowerCase() === identifier.toLowerCase());

  // Then try partial match
  if (!dialog) {
    dialog = dialogs.find(d => d.title?.toLowerCase().includes(identifier.toLowerCase()));
  }

  if (dialog && dialog.entity) {
    const entity = dialog.entity;
    if (entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel) {
      return entity;
    }
  }

  // Try as a direct entity identifier
  try {
    const entity = await client.getEntity(identifier);
    if (entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel) {
      return entity;
    }
    throw new Error(`Invalid entity type for: ${identifier}`);
  } catch {
    throw new Error(`Chat not found: ${identifier}`);
  }
}

function getChatTitle(entity: ResolvedEntity): string {
  if (entity instanceof Api.User) {
    return entity.firstName || entity.username || 'Unknown';
  }
  if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
    return entity.title;
  }
  return 'Unknown';
}

// --- Mute/Unmute Functions ---

const MAX_INT32 = 2147483647;

export function parseDuration(duration: string): { seconds: number; isForever: boolean } {
  if (duration === 'forever') {
    return { seconds: 0, isForever: true };
  }

  const match = duration.match(/^(\d+)(m|h|d|w)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use formats like 1h, 8h, 1d, 1w, or "forever"`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let seconds: number;
  switch (unit) {
    case 'm': seconds = value * 60; break;
    case 'h': seconds = value * 3600; break;
    case 'd': seconds = value * 86400; break;
    case 'w': seconds = value * 604800; break;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }

  return { seconds, isForever: false };
}

// Keep for backward compatibility
export function parseDurationToSeconds(duration: string): number {
  if (duration === 'forever') {
    return MAX_INT32;
  }
  return parseDuration(duration).seconds;
}

export async function muteChat(
  client: TelegramClient,
  chatIdentifier: string,
  duration: string = 'forever'
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);

  let inputPeer: Api.TypeInputNotifyPeer;
  if (chat instanceof Api.User) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerUser({ userId: chat.id, accessHash: chat.accessHash || bigInt(0) })
    });
  } else if (chat instanceof Api.Chat) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChat({ chatId: chat.id })
    });
  } else if (chat instanceof Api.Channel) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChannel({ channelId: chat.id, accessHash: chat.accessHash || bigInt(0) })
    });
  } else {
    return { success: false, message: 'Unknown chat type' };
  }

  try {
    const parsed = parseDuration(duration);
    // For "forever", use MAX_INT32 directly; otherwise add seconds to current time
    const muteUntil = parsed.isForever
      ? MAX_INT32
      : Math.floor(Date.now() / 1000) + parsed.seconds;

    await client.invoke(
      new Api.account.UpdateNotifySettings({
        // teleproto types this as EntityLike; its resolver passes a ready InputNotifyPeer through unchanged.
        peer: inputPeer as unknown as Api.TypeEntityLike,
        settings: new Api.InputPeerNotifySettings({
          muteUntil,
        }),
      })
    );

    const durationText = duration === 'forever' ? 'forever' : `for ${duration}`;
    return { success: true, message: `Muted "${chatTitle}" ${durationText}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: msg };
  }
}

export async function unmuteChat(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);

  let inputPeer: Api.TypeInputNotifyPeer;
  if (chat instanceof Api.User) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerUser({ userId: chat.id, accessHash: chat.accessHash || bigInt(0) })
    });
  } else if (chat instanceof Api.Chat) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChat({ chatId: chat.id })
    });
  } else if (chat instanceof Api.Channel) {
    inputPeer = new Api.InputNotifyPeer({
      peer: new Api.InputPeerChannel({ channelId: chat.id, accessHash: chat.accessHash || bigInt(0) })
    });
  } else {
    return { success: false, message: 'Unknown chat type' };
  }

  try {
    await client.invoke(
      new Api.account.UpdateNotifySettings({
        // teleproto types this as EntityLike; its resolver passes a ready InputNotifyPeer through unchanged.
        peer: inputPeer as unknown as Api.TypeEntityLike,
        settings: new Api.InputPeerNotifySettings({
          muteUntil: 0,
        }),
      })
    );

    return { success: true, message: `Unmuted "${chatTitle}"` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: msg };
  }
}

// --- Folder Functions ---

export interface FolderInfo {
  id: number;
  title: string;
  includedChats: { id: string; title: string; type: string }[];
  excludedChats: { id: string; title: string; type: string }[];
  emoticon?: string;
}

export async function getFolders(client: TelegramClient): Promise<FolderInfo[]> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());

  const folders: FolderInfo[] = [];

  for (const filter of result.filters) {
    if (filter instanceof Api.DialogFilter) {
      const includedChats: { id: string; title: string; type: string }[] = [];
      const excludedChats: { id: string; title: string; type: string }[] = [];

      // Resolve included peers
      for (const peer of filter.includePeers) {
        try {
          const entity = await client.getEntity(peer);
          if (entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel) {
            includedChats.push({
              id: entity.id.toString(),
              title: getChatTitleFromEntity(entity),
              type: getEntityType(entity),
            });
          }
        } catch {
          // Skip unresolvable peers
        }
      }

      // Resolve excluded peers
      for (const peer of filter.excludePeers) {
        try {
          const entity = await client.getEntity(peer);
          if (entity instanceof Api.User || entity instanceof Api.Chat || entity instanceof Api.Channel) {
            excludedChats.push({
              id: entity.id.toString(),
              title: getChatTitleFromEntity(entity),
              type: getEntityType(entity),
            });
          }
        } catch {
          // Skip unresolvable peers
        }
      }

      // Handle title which can be string or TextWithEntities
      const titleStr = typeof filter.title === 'string' ? filter.title : (filter.title?.text ?? 'Untitled');

      folders.push({
        id: filter.id,
        title: titleStr,
        includedChats,
        excludedChats,
        emoticon: filter.emoticon ?? undefined,
      });
    }
  }

  return folders;
}

export async function getFolder(
  client: TelegramClient,
  folderName: string
): Promise<FolderInfo | null> {
  const folders = await getFolders(client);
  return folders.find(f => f.title.toLowerCase() === folderName.toLowerCase()) || null;
}

export async function addChatToFolder(
  client: TelegramClient,
  folderName: string,
  chatIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());

  let targetFilter: Api.DialogFilter | null = null;
  for (const filter of result.filters) {
    if (filter instanceof Api.DialogFilter) {
      const filterTitle = typeof filter.title === 'string' ? filter.title : (filter.title?.text ?? '');
      if (filterTitle.toLowerCase() === folderName.toLowerCase()) {
        targetFilter = filter;
        break;
      }
    }
  }

  if (!targetFilter) {
    return { success: false, message: `Folder not found: ${folderName}` };
  }

  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);
  const folderTitle = typeof targetFilter.title === 'string' ? targetFilter.title : (targetFilter.title?.text ?? 'Untitled');

  // Create the input peer for the chat
  let inputPeer: Api.TypeInputPeer;
  if (chat instanceof Api.User) {
    inputPeer = new Api.InputPeerUser({ userId: chat.id, accessHash: chat.accessHash || bigInt(0) });
  } else if (chat instanceof Api.Chat) {
    inputPeer = new Api.InputPeerChat({ chatId: chat.id });
  } else if (chat instanceof Api.Channel) {
    inputPeer = new Api.InputPeerChannel({ channelId: chat.id, accessHash: chat.accessHash || bigInt(0) });
  } else {
    return { success: false, message: 'Unknown chat type' };
  }

  // Check if already included
  for (const peer of targetFilter.includePeers) {
    try {
      const entity = await client.getEntity(peer);
      if (entity.id.equals(chat.id)) {
        return { success: false, message: `"${chatTitle}" is already in folder "${folderTitle}"` };
      }
    } catch {
      // Skip
    }
  }

  // Add to includePeers
  const newIncludePeers = [...targetFilter.includePeers, inputPeer];

  try {
    await client.invoke(
      new Api.messages.UpdateDialogFilter({
        id: targetFilter.id,
        filter: new Api.DialogFilter({
          id: targetFilter.id,
          title: targetFilter.title,
          pinnedPeers: targetFilter.pinnedPeers,
          includePeers: newIncludePeers,
          excludePeers: targetFilter.excludePeers,
          contacts: targetFilter.contacts,
          nonContacts: targetFilter.nonContacts,
          groups: targetFilter.groups,
          broadcasts: targetFilter.broadcasts,
          bots: targetFilter.bots,
          excludeMuted: targetFilter.excludeMuted,
          excludeRead: targetFilter.excludeRead,
          excludeArchived: targetFilter.excludeArchived,
          emoticon: targetFilter.emoticon,
        }),
      })
    );

    return { success: true, message: `Added "${chatTitle}" to folder "${folderTitle}"` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: msg };
  }
}

export async function removeChatFromFolder(
  client: TelegramClient,
  folderName: string,
  chatIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());

  let targetFilter: Api.DialogFilter | null = null;
  for (const filter of result.filters) {
    if (filter instanceof Api.DialogFilter) {
      const filterTitle = typeof filter.title === 'string' ? filter.title : (filter.title?.text ?? '');
      if (filterTitle.toLowerCase() === folderName.toLowerCase()) {
        targetFilter = filter;
        break;
      }
    }
  }

  if (!targetFilter) {
    return { success: false, message: `Folder not found: ${folderName}` };
  }

  const chat = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(chat);
  const folderTitle = typeof targetFilter.title === 'string' ? targetFilter.title : (targetFilter.title?.text ?? 'Untitled');

  // Find and remove from includePeers
  let found = false;
  const newIncludePeers: Api.TypeInputPeer[] = [];

  for (const peer of targetFilter.includePeers) {
    try {
      const entity = await client.getEntity(peer);
      if (entity.id.equals(chat.id)) {
        found = true;
        continue; // Skip this peer (remove it)
      }
    } catch {
      // Keep unresolvable peers
    }
    newIncludePeers.push(peer);
  }

  if (!found) {
    return { success: false, message: `"${chatTitle}" is not in folder "${folderTitle}"` };
  }

  try {
    await client.invoke(
      new Api.messages.UpdateDialogFilter({
        id: targetFilter.id,
        filter: new Api.DialogFilter({
          id: targetFilter.id,
          title: targetFilter.title,
          pinnedPeers: targetFilter.pinnedPeers,
          includePeers: newIncludePeers,
          excludePeers: targetFilter.excludePeers,
          contacts: targetFilter.contacts,
          nonContacts: targetFilter.nonContacts,
          groups: targetFilter.groups,
          broadcasts: targetFilter.broadcasts,
          bots: targetFilter.bots,
          excludeMuted: targetFilter.excludeMuted,
          excludeRead: targetFilter.excludeRead,
          excludeArchived: targetFilter.excludeArchived,
          emoticon: targetFilter.emoticon,
        }),
      })
    );

    return { success: true, message: `Removed "${chatTitle}" from folder "${folderTitle}"` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: msg };
  }
}

function getChatTitleFromEntity(entity: Api.User | Api.Chat | Api.Channel | Api.ChatForbidden | Api.ChannelForbidden): string {
  if (entity instanceof Api.User) {
    return entity.firstName || entity.username || 'Unknown User';
  }
  if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
    return entity.title;
  }
  if (entity instanceof Api.ChatForbidden || entity instanceof Api.ChannelForbidden) {
    return entity.title;
  }
  return 'Unknown';
}

function getEntityType(entity: Api.User | Api.Chat | Api.Channel | Api.ChatForbidden | Api.ChannelForbidden): string {
  if (entity instanceof Api.User) return 'user';
  if (entity instanceof Api.Chat) return 'group';
  if (entity instanceof Api.Channel) return entity.megagroup ? 'supergroup' : 'channel';
  return 'unknown';
}

// --- Kick Function ---

export async function kickUser(
  client: TelegramClient,
  chatIdentifier: string,
  userIdentifier: string
): Promise<{ success: boolean; message: string }> {
  const chat = await resolveChat(client, chatIdentifier);

  // Get the user to kick
  let user: Api.User;
  try {
    const entity = await client.getEntity(userIdentifier);
    if (!(entity instanceof Api.User)) {
      return { success: false, message: 'Target is not a user' };
    }
    user = entity;
  } catch (e) {
    return { success: false, message: `User not found: ${userIdentifier}` };
  }

  if (chat instanceof Api.Channel) {
    // For channels/supergroups, use EditBanned
    try {
      await client.invoke(
        new Api.channels.EditBanned({
          channel: chat,
          participant: user,
          bannedRights: new Api.ChatBannedRights({
            untilDate: 0, // Permanent
            viewMessages: true,
            sendMessages: true,
            sendMedia: true,
            sendStickers: true,
            sendGifs: true,
            sendGames: true,
            sendInline: true,
            embedLinks: true,
          }),
        })
      );
      return { success: true, message: `Kicked ${user.username || user.firstName} from ${chat.title}` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('ADMIN') || msg.includes('RIGHT')) {
        return { success: false, message: 'Not admin or insufficient rights' };
      }
      if (msg.includes('USER_NOT_PARTICIPANT')) {
        return { success: false, message: 'User is not a member' };
      }
      return { success: false, message: msg };
    }
  } else if (chat instanceof Api.Chat) {
    // For regular groups, use DeleteChatUser
    try {
      await client.invoke(
        new Api.messages.DeleteChatUser({
          chatId: chat.id,
          userId: user,
          revokeHistory: false,
        })
      );
      return { success: true, message: `Kicked ${user.username || user.firstName} from ${chat.title}` };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('ADMIN') || msg.includes('RIGHT')) {
        return { success: false, message: 'Not admin or insufficient rights' };
      }
      if (msg.includes('USER_NOT_PARTICIPANT')) {
        return { success: false, message: 'User is not a member' };
      }
      return { success: false, message: msg };
    }
  }

  return { success: false, message: 'Not a group chat' };
}

// --- Reactions ---

export async function reactToMessage(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  emoji: string | undefined,
  options: { big?: boolean; remove?: boolean } = {}
): Promise<{ chatTitle: string; emoji?: string; removed: boolean }> {
  const entity = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(entity);
  const peer = await client.getInputEntity(entity);

  const removed = options.remove === true || !emoji;
  const reaction = removed ? [] : [new Api.ReactionEmoji({ emoticon: emoji! })];

  await client.invoke(
    new Api.messages.SendReaction({
      peer,
      msgId,
      reaction,
      big: options.big || undefined,
      addToRecent: true,
    })
  );

  return { chatTitle, emoji: removed ? undefined : emoji, removed };
}

// --- Forward ---

export async function forwardMessages(
  client: TelegramClient,
  fromChat: string,
  msgIds: number[],
  toChat: string,
  options: { silent?: boolean; dropAuthor?: boolean } = {}
): Promise<{ count: number; fromTitle: string; toTitle: string }> {
  const from = await resolveChat(client, fromChat);
  const to = await resolveChat(client, toChat);

  // forwardMessages throws if the forward fails; on success every requested id
  // was forwarded. The returned array under-reports (a GramJS quirk), so we
  // report the requested count instead.
  await client.forwardMessages(to, {
    messages: msgIds,
    fromPeer: from,
    silent: options.silent,
    dropAuthor: options.dropAuthor,
  });

  return {
    count: msgIds.length,
    fromTitle: getChatTitle(from),
    toTitle: getChatTitle(to),
  };
}

// --- Pin / Unpin ---

export async function pinChatMessage(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  options: { notify?: boolean; pmOneSide?: boolean } = {}
): Promise<{ chatTitle: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.pinMessage(entity, msgId, {
    notify: options.notify,
    pmOneSide: options.pmOneSide,
  });
  return { chatTitle: getChatTitle(entity) };
}

export async function unpinChatMessage(
  client: TelegramClient,
  chatIdentifier: string,
  msgId?: number
): Promise<{ chatTitle: string; all: boolean }> {
  const entity = await resolveChat(client, chatIdentifier);
  if (msgId == null) {
    await client.unpinMessage(entity);
  } else {
    await client.unpinMessage(entity, msgId);
  }
  return { chatTitle: getChatTitle(entity), all: msgId == null };
}

// --- Button functions ---

async function fetchRawMessage(
  client: TelegramClient,
  entity: ResolvedEntity,
  msgId: number
): Promise<Api.Message | null> {
  const msgs = await client.getMessages(entity, { ids: [msgId] });
  const msg = msgs[0];
  return msg instanceof Api.Message ? msg : null;
}

export interface MessageButtonsResult {
  chatTitle: string;
  messageId: number;
  text: string;
  layout?: ButtonLayout;
}

export async function getMessageButtons(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number
): Promise<MessageButtonsResult> {
  const entity = await resolveChat(client, chatIdentifier);
  const chatTitle = getChatTitle(entity);
  const msg = await fetchRawMessage(client, entity, msgId);
  if (!msg) {
    throw new Error(`Message #${msgId} not found in "${chatTitle}"`);
  }
  return {
    chatTitle,
    messageId: msgId,
    text: messageText(msg),
    layout: extractButtons(msg),
  };
}

export interface ClickSelector {
  index?: number;       // 1-based flat index
  text?: string;        // match by button label
  dataBase64?: string;  // match a callback button by exact payload
}

export interface ClickOutcome {
  button: ButtonInfo;
  action: 'callback' | 'game' | 'sent_text' | 'url' | 'copy' | 'info' | 'refused';
  answerText?: string;   // toast / alert text returned by the bot
  isAlert?: boolean;     // true = shown as a blocking alert, false = transient toast
  url?: string;
  query?: string;
  copyText?: string;
  sentMessageId?: number;
  note?: string;
  /** The clicked message after the bot edited it (if it changed). */
  edited?: { id: number; text: string; layout?: ButtonLayout };
  /** New messages the bot sent in response, newer than the clicked one. */
  newMessages?: { id: number; sender: string; text: string; layout?: ButtonLayout }[];
}

function findRawButton(
  markup: Api.ReplyInlineMarkup | Api.ReplyKeyboardMarkup,
  layout: ButtonLayout,
  selector: ClickSelector
): { raw: RawButton; info: ButtonInfo } | null {
  const flatRaw: RawButton[] = [];
  for (const row of markup.rows) for (const b of row.buttons) flatRaw.push(b);
  const flatInfo = layout.rows.flat();

  let pos = -1;
  if (selector.index != null) {
    pos = selector.index - 1;
  } else if (selector.dataBase64 != null) {
    pos = flatInfo.findIndex((b) => b.type === 'callback' && b.data === selector.dataBase64);
  } else if (selector.text != null) {
    const needle = selector.text.trim().toLowerCase();
    pos = flatInfo.findIndex((b) => b.text.trim().toLowerCase() === needle);
    if (pos < 0) pos = flatInfo.findIndex((b) => b.text.trim().toLowerCase().includes(needle));
  }

  if (pos < 0 || pos >= flatRaw.length) return null;
  return { raw: flatRaw[pos], info: flatInfo[pos] };
}

function buttonSignature(layout?: ButtonLayout): string {
  if (!layout) return '';
  return layout.rows.flat().map((b) => `${b.type}:${b.text}:${b.data ?? b.url ?? ''}`).join('|');
}

/**
 * Press a button on a bot message and report what happened.
 *
 * Callback buttons are clicked with the button's raw callback bytes (never a
 * string round-trip) and the message is re-read afterwards so the caller sees
 * how the bot edited it — the whole point of "navigating" a bot's keyboard.
 */
export async function clickButton(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  selector: ClickSelector,
  options: { password?: string; waitMs?: number } = {}
): Promise<ClickOutcome> {
  const { waitMs = 1500 } = options;
  const entity = await resolveChat(client, chatIdentifier);
  const msg = await fetchRawMessage(client, entity, msgId);
  if (!msg) throw new Error(`Message #${msgId} not found`);

  const markup = msg.replyMarkup;
  if (!(markup instanceof Api.ReplyInlineMarkup) && !(markup instanceof Api.ReplyKeyboardMarkup)) {
    throw new Error(`Message #${msgId} has no buttons`);
  }
  const layout = extractButtons(msg)!;
  const match = findRawButton(markup, layout, selector);
  if (!match) {
    const label = selector.index != null ? `#${selector.index}` : selector.dataBase64 != null ? `data ${selector.dataBase64}` : `"${selector.text}"`;
    throw new Error(`Button ${label} not found on message #${msgId}`);
  }

  const { raw, info } = match;
  const beforeText = messageText(msg);
  const beforeSig = buttonSignature(layout);

  // Non-server-side / non-clickable button types: report and stop.
  const kind: Api.TypeButtonType | Api.TypeInlineButtonType = raw.type;
  if (kind instanceof Api.InlineButtonTypeUrl || kind instanceof Api.InlineButtonTypeUrlAuth || kind instanceof Api.InputInlineButtonTypeUrlAuth) {
    return { button: info, action: 'url', url: kind.url, note: 'URL button — opening links is left to you (not opened automatically).' };
  }
  if (kind instanceof Api.InlineButtonTypeWebView || kind instanceof Api.ButtonTypeSimpleWebView) {
    return { button: info, action: 'url', url: kind.url, note: 'Web-app button — open this URL in a browser to interact.' };
  }
  if (kind instanceof Api.InlineButtonTypeCopy) {
    return { button: info, action: 'copy', copyText: kind.copyText, note: 'Copy button — no server call; this is the text it copies.' };
  }
  if (kind instanceof Api.InlineButtonTypeSwitchInline) {
    return { button: info, action: 'info', query: kind.query, note: `Switch-inline button — composes an inline query "${kind.query}" (not auto-sent).` };
  }
  if (kind instanceof Api.ButtonTypeRequestPhone || kind instanceof Api.ButtonTypeRequestGeoLocation || kind instanceof Api.ButtonTypeRequestPoll || kind instanceof Api.ButtonTypeRequestPeer || kind instanceof Api.InputButtonTypeRequestPeer) {
    return { button: info, action: 'refused', note: 'This button shares your phone / location / poll / a peer. Refused automatically — do this manually in a Telegram client if you intend to.' };
  }
  if (kind instanceof Api.InlineButtonTypeBuy) {
    return { button: info, action: 'refused', note: 'Payment button — opens a checkout flow that cannot be automated safely.' };
  }
  if (kind instanceof Api.InlineButtonTypeUserProfile || kind instanceof Api.InputInlineButtonTypeUserProfile) {
    return { button: info, action: 'info', note: `Opens a user profile (user id ${kind.userId.toString()}).` };
  }
  if (kind instanceof Api.InlineButtonTypeDisabled) {
    return { button: info, action: 'refused', note: 'This button is disabled by the bot.' };
  }

  // Plain reply-keyboard button: pressing it just sends its label as a message.
  if (kind instanceof Api.ButtonTypeDefault) {
    const sent = await sendMessage(client, chatIdentifier, raw.text);
    const outcome: ClickOutcome = { button: info, action: 'sent_text', sentMessageId: sent.id, note: `Reply-keyboard button — sent "${raw.text}" as a message.` };
    await collectBotResponse(client, entity, msgId, beforeText, beforeSig, waitMs, outcome);
    return outcome;
  }

  // Callback / game buttons: the real "press a bot button" path.
  const isGame = kind instanceof Api.InlineButtonTypeGame;
  const callback = kind instanceof Api.InlineButtonTypeCallback ? kind : undefined;
  if (!isGame && !callback) {
    return { button: info, action: 'refused', note: `Unsupported button type ${kind.className} — nothing was sent.` };
  }
  if (callback?.requiresPassword && !options.password) {
    throw new Error('This button requires your 2FA password. Re-run with --password <pw>.');
  }

  const peer = await client.getInputEntity(entity);
  const answer = await client.invoke(
    new Api.messages.GetBotCallbackAnswer({
      peer,
      msgId,
      game: isGame,
      // Raw callback bytes straight from the live message — no string round-trip.
      data: callback ? Buffer.from(callback.data) : undefined,
    })
  );

  const outcome: ClickOutcome = {
    button: info,
    action: isGame ? 'game' : 'callback',
    answerText: answer.message || undefined,
    isAlert: answer.message ? answer.alert : undefined,
    url: answer.url || undefined,
  };

  await collectBotResponse(client, entity, msgId, beforeText, beforeSig, waitMs, outcome);
  return outcome;
}

/** After a click, re-read the message (for edits) and pick up any new bot replies. */
async function collectBotResponse(
  client: TelegramClient,
  entity: ResolvedEntity,
  msgId: number,
  beforeText: string,
  beforeSig: string,
  waitMs: number,
  outcome: ClickOutcome
): Promise<void> {
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));

  // 1) Did the bot edit the message in place?
  try {
    const after = await fetchRawMessage(client, entity, msgId);
    if (after) {
      const afterLayout = extractButtons(after);
      const changed = messageText(after) !== beforeText || buttonSignature(afterLayout) !== beforeSig;
      if (changed) {
        outcome.edited = { id: msgId, text: messageText(after), layout: afterLayout };
      }
    }
  } catch {
    // ignore
  }

  // 2) Did the bot send new messages after the clicked one?
  try {
    const newer = await client.getMessages(entity, { minId: msgId, limit: 5 });
    const collected: NonNullable<ClickOutcome['newMessages']> = [];
    for (const m of newer) {
      if (!(m instanceof Api.Message)) continue;
      if (m.id <= msgId || m.out) continue;
      collected.push({
        id: m.id,
        sender: getChatTitle(entity),
        text: messageText(m),
        layout: extractButtons(m),
      });
    }
    if (collected.length) {
      collected.sort((a, b) => a.id - b.id);
      outcome.newMessages = collected;
    }
  } catch {
    // ignore
  }
}

// --- Extended message operations ---

export async function editMessageText(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  text: string,
  options: { parseMode?: 'html' | 'md' } = {}
): Promise<{ chatTitle: string; id: number }> {
  const entity = await resolveChat(client, chatIdentifier);
  const result = await client.editMessage(entity, {
    message: msgId,
    text,
    parseMode: options.parseMode,
  });
  return { chatTitle: getChatTitle(entity), id: result?.id ?? msgId };
}

export async function deleteChatMessages(
  client: TelegramClient,
  chatIdentifier: string,
  msgIds: number[],
  revoke: boolean
): Promise<{ chatTitle: string; count: number }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.deleteMessages(entity, msgIds, { revoke });
  return { chatTitle: getChatTitle(entity), count: msgIds.length };
}

export async function markChatRead(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ chatTitle: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  await client.markAsRead(entity);
  return { chatTitle: getChatTitle(entity) };
}

export async function getPinnedMessages(
  client: TelegramClient,
  chatIdentifier: string,
  limit = 20
): Promise<{ chatTitle: string; messages: MessageInfo[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  const result = await client.getMessages(entity, { limit, filter: new Api.InputMessagesFilterPinned() });
  const messages: MessageInfo[] = [];
  for (const msg of result) {
    if (msg instanceof Api.Message) {
      messages.push({
        id: msg.id,
        date: new Date(msg.date * 1000),
        sender: (await resolveSender(client, msg)).sender,
        text: messageText(msg),
        isOutgoing: msg.out ?? false,
        media: extractMediaInfo(msg),
        buttons: extractButtons(msg),
      });
    }
  }
  return { chatTitle: getChatTitle(entity), messages };
}

// --- Polls ---

export async function sendPoll(
  client: TelegramClient,
  chatIdentifier: string,
  question: string,
  answers: string[],
  options: { multiple?: boolean; quiz?: boolean; correct?: number; anonymous?: boolean } = {}
): Promise<{ chatTitle: string; id: number }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);

  // Layer 229: outgoing answers carry no option bytes — the server assigns them.
  const pollAnswers = answers.map((a) =>
    new Api.InputPollAnswer({
      text: new Api.TextWithEntities({ text: a, entities: [] }),
    })
  );

  const poll = new Api.Poll({
    id: bigInt(0),
    question: new Api.TextWithEntities({ text: question, entities: [] }),
    answers: pollAnswers,
    publicVoters: options.anonymous === false,
    multipleChoice: options.multiple || undefined,
    quiz: options.quiz || undefined,
    hash: bigInt(0),
  });

  const media = new Api.InputMediaPoll({
    poll,
    // Layer 229: correct answers are 0-based answer indexes, not option bytes.
    correctAnswers: options.quiz && options.correct != null ? [options.correct] : undefined,
  });

  const result = await client.invoke(
    new Api.messages.SendMedia({
      peer,
      media,
      message: '',
      randomId: generateRandomLong(),
    })
  );

  let id = 0;
  if (result instanceof Api.Updates) {
    for (const u of result.updates) {
      if (u instanceof Api.UpdateMessageID) id = u.id;
    }
  }
  return { chatTitle: getChatTitle(entity), id };
}

export async function votePoll(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  optionIndexes: number[]
): Promise<{ chatTitle: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);

  const msg = await fetchRawMessage(client, entity, msgId);
  if (!msg || !(msg.media instanceof Api.MessageMediaPoll)) {
    throw new Error(`Message #${msgId} is not a poll`);
  }
  const pollAnswers = msg.media.poll.answers;
  const chosen: Buffer[] = [];
  for (const idx of optionIndexes) {
    const ans = pollAnswers[idx];
    if (!ans || !(ans instanceof Api.PollAnswer)) throw new Error(`Poll has no option #${idx + 1}`);
    chosen.push(Buffer.from(ans.option));
  }

  await client.invoke(new Api.messages.SendVote({ peer, msgId, options: chosen }));
  return { chatTitle: getChatTitle(entity) };
}

// --- Reaction list (who reacted) ---

export async function getReactionsList(
  client: TelegramClient,
  chatIdentifier: string,
  msgId: number,
  limit = 50
): Promise<{ chatTitle: string; reactions: { user: string; emoji: string }[] }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  const result = await client.invoke(
    new Api.messages.GetMessageReactionsList({ peer, id: msgId, limit })
  );

  const reactions: { user: string; emoji: string }[] = [];
  for (const r of result.reactions) {
    let emoji = '?';
    if (r.reaction instanceof Api.ReactionEmoji) emoji = r.reaction.emoticon;
    else if (r.reaction instanceof Api.ReactionCustomEmoji) emoji = `[custom:${r.reaction.documentId.toString()}]`;
    let user = 'Unknown';
    if (r.peerId instanceof Api.PeerUser) {
      const u = result.users.find((x): x is Api.User => x instanceof Api.User && x.id.equals((r.peerId as Api.PeerUser).userId));
      if (u) user = u.firstName || u.username || u.id.toString();
    }
    reactions.push({ user, emoji });
  }
  return { chatTitle: getChatTitle(entity), reactions };
}

// --- Block / contacts ---

export async function setBlocked(
  client: TelegramClient,
  userIdentifier: string,
  blocked: boolean
): Promise<{ name: string }> {
  const entity = await resolveChat(client, userIdentifier);
  const peer = await client.getInputEntity(entity);
  if (blocked) await client.invoke(new Api.contacts.Block({ id: peer }));
  else await client.invoke(new Api.contacts.Unblock({ id: peer }));
  return { name: getChatTitle(entity) };
}

export async function addContact(
  client: TelegramClient,
  userIdentifier: string,
  firstName: string,
  lastName = ''
): Promise<{ name: string }> {
  const entity = await resolveChat(client, userIdentifier);
  if (!(entity instanceof Api.User)) throw new Error('Not a user');
  await client.invoke(
    new Api.contacts.AddContact({
      id: entity,
      firstName,
      lastName,
      phone: entity.phone || '',
      addPhonePrivacyException: false,
    })
  );
  return { name: [firstName, lastName].filter(Boolean).join(' ') };
}

export async function deleteContact(
  client: TelegramClient,
  userIdentifier: string
): Promise<{ name: string }> {
  const entity = await resolveChat(client, userIdentifier);
  if (!(entity instanceof Api.User)) throw new Error('Not a user');
  await client.invoke(new Api.contacts.DeleteContacts({ id: [entity] }));
  return { name: getChatTitle(entity) };
}

// --- Chat membership / management ---

export async function joinChat(
  client: TelegramClient,
  target: string
): Promise<{ title: string }> {
  // Invite link (t.me/+hash or t.me/joinchat/hash) → ImportChatInvite; otherwise JoinChannel.
  const inviteMatch = target.match(/(?:t\.me\/(?:joinchat\/|\+)|^\+)([A-Za-z0-9_-]+)/);
  if (inviteMatch) {
    const res = await client.invoke(new Api.messages.ImportChatInvite({ hash: inviteMatch[1] }));
    let title = 'chat';
    if (res instanceof Api.messages.ChatInviteJoinResultOk && res.updates instanceof Api.Updates) {
      const chat = res.updates.chats[0];
      if (chat instanceof Api.Channel || chat instanceof Api.Chat) title = chat.title;
    }
    return { title };
  }
  const entity = await resolveChat(client, target);
  if (!(entity instanceof Api.Channel)) throw new Error('Can only join channels/supergroups by username');
  await client.invoke(new Api.channels.JoinChannel({ channel: entity }));
  return { title: getChatTitle(entity) };
}

export async function leaveChat(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const title = getChatTitle(entity);
  if (entity instanceof Api.Channel) {
    await client.invoke(new Api.channels.LeaveChannel({ channel: entity }));
  } else if (entity instanceof Api.Chat) {
    const me = await getMe(client);
    await client.invoke(new Api.messages.DeleteChatUser({ chatId: entity.id, userId: me, revokeHistory: false }));
  } else {
    throw new Error('Not a group or channel');
  }
  return { title };
}

export async function exportInviteLink(
  client: TelegramClient,
  chatIdentifier: string
): Promise<{ title: string; link: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  const res = await client.invoke(new Api.messages.ExportChatInvite({ peer }));
  const link = res instanceof Api.ChatInviteExported ? res.link : '';
  return { title: getChatTitle(entity), link };
}

export async function setArchived(
  client: TelegramClient,
  chatIdentifier: string,
  archived: boolean
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  await client.invoke(
    new Api.folders.EditPeerFolders({
      folderPeers: [new Api.InputFolderPeer({ peer, folderId: archived ? 1 : 0 })],
    })
  );
  return { title: getChatTitle(entity) };
}

export async function createGroup(
  client: TelegramClient,
  title: string,
  userIdentifiers: string[]
): Promise<{ title: string; id: string }> {
  const users: Api.TypeInputUser[] = [];
  for (const u of userIdentifiers) {
    const entity = await resolveChat(client, u);
    if (entity instanceof Api.User) {
      users.push(new Api.InputUser({ userId: entity.id, accessHash: entity.accessHash || bigInt(0) }));
    }
  }
  const res = await client.invoke(new Api.messages.CreateChat({ users, title }));
  let id = '';
  const updates = (res as { updates?: Api.Updates }).updates ?? res;
  if (updates instanceof Api.Updates) {
    const chat = updates.chats[0];
    if (chat) id = chat.id.toString();
  }
  return { title, id };
}

export async function createChannel(
  client: TelegramClient,
  title: string,
  about: string,
  options: { broadcast?: boolean } = {}
): Promise<{ title: string; id: string }> {
  const res = await client.invoke(
    new Api.channels.CreateChannel({
      title,
      about,
      broadcast: options.broadcast || undefined,
      megagroup: options.broadcast ? undefined : true,
    })
  );
  let id = '';
  if (res instanceof Api.Updates) {
    const chat = res.chats[0];
    if (chat) id = chat.id.toString();
  }
  return { title, id };
}

// --- Presence / typing ---

export async function sendTyping(
  client: TelegramClient,
  chatIdentifier: string,
  action: 'typing' | 'photo' | 'video' | 'audio' | 'document' | 'cancel' = 'typing'
): Promise<{ title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const peer = await client.getInputEntity(entity);
  const actionMap: Record<string, Api.TypeSendMessageAction> = {
    typing: new Api.SendMessageTypingAction(),
    photo: new Api.SendMessageUploadPhotoAction({ progress: 0 }),
    video: new Api.SendMessageUploadVideoAction({ progress: 0 }),
    audio: new Api.SendMessageUploadAudioAction({ progress: 0 }),
    document: new Api.SendMessageUploadDocumentAction({ progress: 0 }),
    cancel: new Api.SendMessageCancelAction(),
  };
  await client.invoke(new Api.messages.SetTyping({ peer, action: actionMap[action] }));
  return { title: getChatTitle(entity) };
}

// --- Own profile ---

export async function updateProfile(
  client: TelegramClient,
  fields: { firstName?: string; lastName?: string; about?: string }
): Promise<void> {
  await client.invoke(new Api.account.UpdateProfile(fields));
}

export async function updateUsername(client: TelegramClient, username: string): Promise<void> {
  await client.invoke(new Api.account.UpdateUsername({ username }));
}

export async function setProfilePhoto(
  client: TelegramClient,
  filePath: string
): Promise<void> {
  const file = await client.uploadFile({
    file: new CustomFile(basename(filePath), statSync(filePath).size, filePath),
    workers: 1,
  });
  await client.invoke(new Api.photos.UploadProfilePhoto({ file }));
}

export async function downloadAvatar(
  client: TelegramClient,
  chatIdentifier: string,
  outputDir: string
): Promise<{ filePath: string | null; title: string }> {
  const entity = await resolveChat(client, chatIdentifier);
  const title = getChatTitle(entity);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const fileName = `avatar_${entity.id.toString()}.jpg`;
  const filePath = join(outputDir, fileName);
  const result = await client.downloadProfilePhoto(entity, { outputFile: filePath });
  if (!result) return { filePath: null, title };
  return { filePath: typeof result === 'string' ? result : filePath, title };
}

// --- Inline bot queries ---

export async function queryInlineBot(
  client: TelegramClient,
  botIdentifier: string,
  query: string,
  limit = 20
): Promise<{ results: { type: string; title: string; description?: string; id: string }[] }> {
  const bot = await resolveChat(client, botIdentifier);
  if (!(bot instanceof Api.User)) throw new Error('Inline queries can only target bots');
  const inputBot = new Api.InputUser({ userId: bot.id, accessHash: bot.accessHash || bigInt(0) });

  const res = await client.invoke(
    new Api.messages.GetInlineBotResults({
      bot: inputBot,
      peer: new Api.InputPeerSelf(),
      query,
      offset: '',
    })
  );

  const results: { type: string; title: string; description?: string; id: string }[] = [];
  for (const raw of res.results.slice(0, limit)) {
    if (raw instanceof Api.BotInlineResult || raw instanceof Api.BotInlineMediaResult) {
      results.push({
        type: raw.type,
        title: raw.title || '',
        description: raw.description || undefined,
        id: raw.id,
      });
    }
  }
  return { results };
}

// --- Stories ---

export async function getUserStories(
  client: TelegramClient,
  userIdentifier: string
): Promise<{ name: string; stories: { id: number; date: Date; caption: string }[] }> {
  const entity = await resolveChat(client, userIdentifier);
  const peer = await client.getInputEntity(entity);
  const res = await client.invoke(new Api.stories.GetPeerStories({ peer }));
  const stories: { id: number; date: Date; caption: string }[] = [];
  for (const s of res.stories.stories) {
    if (s instanceof Api.StoryItem) {
      stories.push({ id: s.id, date: new Date(s.date * 1000), caption: s.caption || '' });
    }
  }
  return { name: getChatTitle(entity), stories };
}
