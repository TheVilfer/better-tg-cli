/**
 * The TL methods a raw API call may reach over MCP: `telegram api <method>` and the generated
 * `telegram <namespace> <method>` commands, when the call comes from the MCP server (TG_MCP) or its
 * read tool (TG_READ_ONLY). Everything else among the ~820 schema methods is refused there before
 * anything runs, with "not available over MCP; run it in a terminal". In a terminal nothing changes.
 *
 * An allowlist rather than only a denylist: reviews kept finding dangerous methods one at a time
 * (payments, Passport, passkeys, geo, credentials), so a new or overlooked method now stays off MCP
 * until someone adds it here on purpose. The denylist and param checks in src/api-methods.ts still
 * run after this, so an allowed method keeps its param-level refusals (geo or contact media, a
 * phone-privacy exception, allowPaidStars), and mcpParamRefusal adds the MCP-only ones (a priced
 * suggested post, a stake, a referer, a paid invite link, a story audience, a 2FA button, a view
 * increment, any location). Over MCP the raw result hides phones, birthdays, notes and locations.
 *
 * Deliberately absent: payments and Stars, account/auth/Passport/passkeys, privacy and security
 * settings, sessions, takeout, phone calls, sticker-set management, business and premium
 * purchases, geo/location, bot administration, folders, chat import and export.
 *
 * Each group's `access` must match how src/api-methods.ts classifies its methods (a test checks
 * it), so the read tool never gets a write. scripts/api-coverage.mjs reads this file as text and
 * writes the list into docs/api-coverage.md: keep one group per object literal, in this exact
 * shape, with single-quoted strings and no apostrophes inside them.
 */

export interface McpApiGroup {
  access: 'read' | 'write';
  title: string;
  reason: string;
  methods: readonly string[];
}

export const MCP_API_ALLOWLIST: readonly McpApiGroup[] = [
  {
    access: 'read',
    title: 'Messages, history and threads',
    reason: 'Reading chats is the main job: history, exact messages, comments and replies, scheduled and saved messages, drafts, poll results, view counters (increment=false only) and custom emoji.',
    methods: [
      'messages.GetHistory', 'messages.GetMessages', 'channels.GetMessages', 'messages.GetReplies',
      'messages.GetDiscussionMessage', 'messages.GetScheduledHistory', 'messages.GetScheduledMessages',
      'messages.GetSavedHistory', 'messages.GetUnreadMentions', 'messages.GetRichMessage',
      'messages.GetFactCheck', 'messages.GetMessageEditData', 'messages.GetAllDrafts',
      'messages.GetPollResults', 'messages.GetPollVotes', 'messages.GetMessagesViews',
      'messages.GetCustomEmojiDocuments',
    ],
  },
  {
    access: 'read',
    title: 'Forum topics',
    reason: 'Listing the topics of a forum group, as `topics` does.',
    methods: ['messages.GetForumTopics', 'messages.GetForumTopicsByID'],
  },
  {
    access: 'read',
    title: 'Dialogs',
    reason: 'The chat list with unread counts and pins, as `chats` and `inbox` show it.',
    methods: [
      'messages.GetDialogs', 'messages.GetPeerDialogs', 'messages.GetPinnedDialogs',
      'messages.GetDialogUnreadMarks', 'messages.GetSavedDialogs', 'messages.GetSavedDialogsByID',
      'messages.GetPinnedSavedDialogs',
    ],
  },
  {
    access: 'read',
    title: 'Chats, channels and members',
    reason: 'Chats and their members, as `info` and `members` list them. Full chat info, the admin log and invite links are read with the curated commands.',
    methods: [
      'messages.GetChats', 'messages.GetCommonChats', 'messages.GetOnlines', 'messages.CheckChatInvite',
      'channels.GetChannels', 'channels.GetParticipants', 'channels.GetParticipant', 'channels.GetSendAs',
    ],
  },
  {
    access: 'read',
    title: 'Users and contacts',
    reason: 'Resolving people and reading the contact list, as `contacts` and `profile-photos` do (resolving with a referer is refused). Full profiles are read with `contact`.',
    methods: [
      'users.GetUsers', 'contacts.GetContacts', 'contacts.GetContactIDs', 'contacts.ResolveUsername',
      'contacts.Search', 'photos.GetUserPhotos',
    ],
  },
  {
    access: 'read',
    title: 'Search',
    reason: 'Search in a chat, across chats and in public posts (a paid post search is refused; a new post search may use up the free daily quota).',
    methods: [
      'messages.Search', 'messages.SearchGlobal', 'messages.GetSearchCounters',
      'messages.GetSearchResultsCalendar', 'messages.GetSearchResultsPositions',
      'channels.SearchPosts', 'channels.CheckSearchPostsFlood',
    ],
  },
  {
    access: 'read',
    title: 'Reactions',
    reason: 'Who reacted with what, as `reactions` shows it.',
    methods: [
      'messages.GetMessagesReactions', 'messages.GetMessageReactionsList',
      'messages.GetUnreadReactions', 'messages.GetAvailableReactions',
    ],
  },
  {
    access: 'write',
    title: 'Send, edit and delete messages',
    reason: 'What `send`, `reply`, `edit`, `delete` and `typing` do (media only as a photo, document, poll or dice; map blocks, paid messages, priced suggested posts and stakes are refused). A raw forward is not allowed: Telegram copies the source media, so `forward` checks it first.',
    methods: [
      'messages.SendMessage', 'messages.SendMedia', 'messages.SendMultiMedia', 'messages.EditMessage',
      'messages.DeleteMessages', 'channels.DeleteMessages', 'messages.SetTyping',
    ],
  },
  {
    access: 'write',
    title: 'Reactions and read marks',
    reason: 'What `react`, `mark-read` and `mark-unread` do (a paid reaction is a different method and stays refused).',
    methods: [
      'messages.SendReaction', 'messages.ReadHistory', 'channels.ReadHistory', 'messages.ReadMentions',
      'messages.ReadReactions', 'messages.ReadDiscussion', 'messages.ReadMessageContents',
      'channels.ReadMessageContents', 'messages.MarkDialogUnread',
    ],
  },
  {
    access: 'write',
    title: 'Pins',
    reason: 'What `pin`, `unpin`, `pin-chat` and `unpin-chat` do.',
    methods: ['messages.UpdatePinnedMessage', 'messages.UnpinAllMessages', 'messages.ToggleDialogPin'],
  },
  {
    access: 'write',
    title: 'Polls',
    reason: 'Voting, as `vote` does; a poll itself is sent with messages.SendMedia.',
    methods: ['messages.SendVote'],
  },
  {
    access: 'write',
    title: 'Bots',
    reason: 'Pressing a callback button, as `click` does (a 2FA-protected button is refused), and asking an inline bot, as `inline` does: the bot gets the query and your user ID (a query with geoPoint is refused).',
    methods: ['messages.GetBotCallbackAnswer', 'messages.GetInlineBotResults'],
  },
  {
    access: 'write',
    title: 'Chats, channels, topics and members',
    reason: 'What `create-group`, `create-channel`, `join`, `leave`, `delete-dialog`, `invite-link`, `kick`, `promote`, `edit-permissions` and `topic` do (a geo group and a paid subscription link are refused).',
    methods: [
      'messages.CreateChat', 'channels.CreateChannel', 'channels.JoinChannel', 'messages.ImportChatInvite',
      'channels.LeaveChannel', 'messages.DeleteChatUser', 'messages.DeleteHistory',
      'messages.ExportChatInvite', 'channels.EditBanned', 'channels.EditAdmin', 'messages.EditChatAdmin',
      'messages.EditChatDefaultBannedRights', 'messages.CreateForumTopic', 'messages.EditForumTopic',
      'messages.UpdatePinnedForumTopic',
    ],
  },
  {
    access: 'write',
    title: 'Contacts and blocking',
    reason: 'What `del-contact`, `block` and `unblock` do (myStoriesFrom is refused). Adding a contact widens who sees your phone number, so it goes through `add-contact`.',
    methods: ['contacts.DeleteContacts', 'contacts.Block', 'contacts.Unblock'],
  },
];

const ALLOWED = new Set(MCP_API_ALLOWLIST.flatMap(g => g.methods.map(m => m.toLowerCase())));

/** Is this TL method (any case) on the MCP allowlist? */
export function isMcpApiAllowed(name: string): boolean {
  return ALLOWED.has(name.trim().toLowerCase());
}

/** The refusal for a method that is not on the allowlist (the caller decides it is an MCP call). */
export function notOnMcpAllowlist(name: string): string {
  return `Refused: ${name} is not available over MCP; run it in a terminal (\`telegram api ${name}\`). Only the methods listed in docs/api-coverage.md run over MCP.`;
}

/**
 * Over MCP (TG_MCP or TG_READ_ONLY), the refusal for a method off the allowlist; null when the
 * call is not from MCP or the method is allowed. Checked before params are parsed and again on the
 * built request.
 */
export function mcpApiAllowlistRefusal(name: string): string | null {
  if (!process.env.TG_MCP && !process.env.TG_READ_ONLY) return null;
  return isMcpApiAllowed(name) ? null : notOnMcpAllowlist(name);
}
