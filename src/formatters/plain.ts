import chalk from 'chalk';
import type { ChatInfo, MessageInfo, FolderInfo, MediaInfo, ButtonInfo, ButtonLayout, ClickOutcome } from '../client.js';

function buttonTypeHint(b: ButtonInfo): string {
  switch (b.type) {
    case 'callback': return b.requiresPassword ? 'callback 🔒' : 'callback';
    case 'url': return `url → ${b.url}`;
    case 'url_auth': return `url-auth → ${b.url}`;
    case 'webview': return `webapp → ${b.url}`;
    case 'switch_inline': return `switch-inline "${b.query ?? ''}"`;
    case 'switch_inline_current': return `switch-inline (here) "${b.query ?? ''}"`;
    case 'copy': return `copy "${b.copyText ?? ''}"`;
    case 'text': return 'sends text';
    case 'game': return 'game';
    case 'buy': return 'buy';
    case 'request_phone': return 'shares phone';
    case 'request_geo': return 'shares location';
    case 'request_poll': return 'creates poll';
    case 'request_peer': return 'shares a peer';
    case 'user_profile': return 'user profile';
    default: return b.type;
  }
}

export function formatButtonLayout(layout: ButtonLayout, indent = '  '): string {
  const kind = layout.isInline ? 'inline keyboard' : 'reply keyboard';
  const lines: string[] = [`${indent}${chalk.yellow(`⌨ ${kind}:`)}`];
  for (const row of layout.rows) {
    for (const b of row) {
      const idx = chalk.bold(`[${b.index}]`);
      const label = chalk.cyan(b.text || '(no label)');
      const hint = chalk.gray(`— ${buttonTypeHint(b)}`);
      lines.push(`${indent}  ${idx} ${label} ${hint}`);
    }
  }
  return lines.join('\n');
}

function mediaIcon(kind: MediaInfo['kind']): string {
  switch (kind) {
    case 'photo': return '📷';
    case 'video': return '🎬';
    case 'video_note': return '⭕';
    case 'voice': return '🎤';
    case 'audio': return '🎵';
    case 'sticker': return '🎨';
    case 'gif': return '🎞';
    default: return '📎';
  }
}

function formatBytes(size?: number): string {
  if (!size || !Number.isFinite(size)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMediaLabel(media: MediaInfo): string {
  const icon = mediaIcon(media.kind);
  const parts: string[] = [media.kind];
  if (media.fileName) parts.push(media.fileName);
  const meta: string[] = [];
  if (media.mimeType && !media.fileName) meta.push(media.mimeType);
  if (media.size) meta.push(formatBytes(media.size));
  if (media.duration) meta.push(formatDuration(media.duration));
  if (media.width && media.height) meta.push(`${media.width}×${media.height}`);
  const metaStr = meta.length ? ` · ${meta.join(' · ')}` : '';
  return `${icon} ${parts.join(' ')}${metaStr}`;
}

export function formatChats(chats: ChatInfo[]): string {
  const lines: string[] = [];

  for (const chat of chats) {
    const typeIcon = getTypeIcon(chat.type);
    const unread = chat.unreadCount > 0 ? chalk.red(` (${chat.unreadCount})`) : '';
    const username = chat.username ? chalk.gray(` @${chat.username}`) : '';

    lines.push(`${typeIcon} ${chalk.bold(chat.title)}${username}${unread}`);

    if (chat.lastMessage) {
      const preview = chat.lastMessage.substring(0, 60).replace(/\n/g, ' ');
      lines.push(chalk.gray(`   ${preview}${chat.lastMessage.length > 60 ? '...' : ''}`));
    }
  }

  return lines.join('\n');
}

export function formatMessages(messages: MessageInfo[], chatTitle?: string): string {
  const lines: string[] = [];

  if (chatTitle) {
    lines.push(chalk.bold.blue(`\n--- ${chatTitle} ---\n`));
  }

  for (const msg of messages) {
    const time = formatTime(msg.date);
    const sender = msg.isOutgoing ? chalk.green('You') : chalk.cyan(msg.sender);
    const reply = msg.replyToMsgId ? chalk.gray(` [reply to #${msg.replyToMsgId}]`) : '';

    lines.push(`${chalk.gray(time)} ${sender}${reply}:`);
    if (msg.media) {
      lines.push(`  ${chalk.magenta(`[${formatMediaLabel(msg.media)}]`)}`);
    }
    if (msg.text) {
      lines.push(`  ${msg.text}`);
    } else if (!msg.media) {
      lines.push(`  ${chalk.gray('(no text)')}`);
    }
    if (msg.buttons) {
      lines.push(formatButtonLayout(msg.buttons));
    }
    lines.push(chalk.gray(`  #${msg.id}`));
    lines.push('');
  }

  return lines.join('\n');
}

export function formatClickOutcome(o: ClickOutcome): string {
  const lines: string[] = [];
  lines.push(`${chalk.green('✓ Pressed')} ${chalk.cyan(`[${o.button.index}] ${o.button.text || '(no label)'}`)} ${chalk.gray(`(${o.button.type})`)}`);

  if (o.answerText) {
    const tag = o.isAlert ? chalk.yellow('⚠ alert') : chalk.gray('💬 toast');
    lines.push(`  ${tag}: ${o.answerText}`);
  }
  if (o.url) lines.push(`  ${chalk.blue('🔗 url:')} ${o.url}`);
  if (o.query != null) lines.push(`  ${chalk.gray('inline query:')} ${o.query}`);
  if (o.copyText) lines.push(`  ${chalk.gray('copy text:')} ${o.copyText}`);
  if (o.sentMessageId) lines.push(`  ${chalk.gray(`sent message #${o.sentMessageId}`)}`);
  if (o.note) lines.push(`  ${chalk.gray(o.note)}`);

  if (o.edited) {
    lines.push('');
    lines.push(chalk.bold.blue(`↻ Message #${o.edited.id} updated by the bot:`));
    if (o.edited.text) lines.push(`  ${o.edited.text.replace(/\n/g, '\n  ')}`);
    if (o.edited.layout) lines.push(formatButtonLayout(o.edited.layout));
  }

  if (o.newMessages?.length) {
    lines.push('');
    lines.push(chalk.bold.blue('✉ New bot message(s):'));
    for (const m of o.newMessages) {
      if (m.text) lines.push(`  ${m.text.replace(/\n/g, '\n  ')}`);
      if (m.layout) lines.push(formatButtonLayout(m.layout));
      lines.push(chalk.gray(`  #${m.id}`));
    }
  }

  if (!o.edited && !o.newMessages?.length && (o.action === 'callback' || o.action === 'game')) {
    lines.push(chalk.gray('  (no visible change to the message)'));
  }

  return lines.join('\n');
}

export function formatContact(contact: {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  isBot: boolean;
  isMutualContact: boolean;
}): string {
  const lines: string[] = [];

  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown';
  lines.push(chalk.bold(name));

  if (contact.username) {
    lines.push(chalk.cyan(`@${contact.username}`));
  }

  if (contact.phone) {
    lines.push(chalk.gray(`Phone: ${contact.phone}`));
  }

  if (contact.bio) {
    lines.push(chalk.gray(`Bio: ${contact.bio}`));
  }

  if (contact.isBot) {
    lines.push(chalk.yellow('Bot'));
  }

  if (contact.isMutualContact) {
    lines.push(chalk.green('Mutual contact'));
  }

  lines.push(chalk.gray(`ID: ${contact.id}`));

  return lines.join('\n');
}

export function formatMembers(
  members: { id: string; name: string; username?: string; isAdmin: boolean }[]
): string {
  const lines: string[] = [];

  for (const member of members) {
    const admin = member.isAdmin ? chalk.yellow(' [admin]') : '';
    const username = member.username ? chalk.gray(` @${member.username}`) : '';
    lines.push(`${chalk.bold(member.name)}${username}${admin}`);
  }

  return lines.join('\n');
}

export function formatInbox(chats: ChatInfo[]): string {
  const unreadChats = chats.filter(c => c.unreadCount > 0);

  if (unreadChats.length === 0) {
    return chalk.green('No unread messages!');
  }

  const lines: string[] = [];
  lines.push(chalk.bold(`\n${unreadChats.length} chats with unread messages:\n`));

  // Sort by unread count descending
  unreadChats.sort((a, b) => b.unreadCount - a.unreadCount);

  for (const chat of unreadChats) {
    const typeIcon = getTypeIcon(chat.type);
    lines.push(`${typeIcon} ${chalk.bold(chat.title)}: ${chalk.red(chat.unreadCount)} unread`);

    if (chat.lastMessage) {
      const preview = chat.lastMessage.substring(0, 50).replace(/\n/g, ' ');
      lines.push(chalk.gray(`   ${preview}${chat.lastMessage.length > 50 ? '...' : ''}`));
    }
  }

  return lines.join('\n');
}

export function formatUser(user: { firstName?: string; lastName?: string; username?: string; phone?: string }): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const username = user.username ? chalk.cyan(`@${user.username}`) : '';
  const phone = user.phone ? chalk.gray(` (${user.phone})`) : '';

  return `${chalk.bold(name)} ${username}${phone}`;
}

function getTypeIcon(type: ChatInfo['type']): string {
  switch (type) {
    case 'user':
      return '👤';
    case 'group':
      return '👥';
    case 'supergroup':
      return '👥';
    case 'channel':
      return '📢';
    default:
      return '💬';
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFolders(folders: FolderInfo[]): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`\n${folders.length} folder${folders.length !== 1 ? 's' : ''}:\n`));

  for (const folder of folders) {
    const emoticon = folder.emoticon ? `${folder.emoticon} ` : '📁 ';
    const chatCount = folder.includedChats.length;
    lines.push(`${emoticon}${chalk.bold(folder.title)} ${chalk.gray(`(${chatCount} chat${chatCount !== 1 ? 's' : ''})`)}`);
  }

  return lines.join('\n');
}

export function formatFolder(folder: FolderInfo): string {
  const lines: string[] = [];

  const emoticon = folder.emoticon ? `${folder.emoticon} ` : '📁 ';
  lines.push(chalk.bold(`\n${emoticon}${folder.title}\n`));

  if (folder.includedChats.length === 0) {
    lines.push(chalk.gray('  No chats in this folder'));
  } else {
    lines.push(chalk.gray(`  ${folder.includedChats.length} chat${folder.includedChats.length !== 1 ? 's' : ''}:\n`));

    for (const chat of folder.includedChats) {
      const typeIcon = getFolderChatIcon(chat.type);
      lines.push(`  ${typeIcon} ${chat.title}`);
    }
  }

  return lines.join('\n');
}

function getFolderChatIcon(type: string): string {
  switch (type) {
    case 'user':
      return '👤';
    case 'group':
    case 'supergroup':
      return '👥';
    case 'channel':
      return '📢';
    default:
      return '💬';
  }
}
