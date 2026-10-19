import { Command } from 'commander';
import { getClient, setChatPermissions, permissionPresets, disconnectClient, parseDuration, type BannedRight } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

/** Friendly `--deny` names → ChatBannedRights keys. */
const DENY_MAP: Record<string, BannedRight> = {
  view: 'viewMessages', send: 'sendMessages', media: 'sendMedia', stickers: 'sendStickers',
  gifs: 'sendGifs', games: 'sendGames', inline: 'sendInline', links: 'embedLinks', polls: 'sendPolls',
  changeinfo: 'changeInfo', invite: 'inviteUsers', pin: 'pinMessages', topics: 'manageTopics',
  photos: 'sendPhotos', videos: 'sendVideos', roundvideos: 'sendRoundvideos', audio: 'sendAudios',
  voice: 'sendVoices', docs: 'sendDocs', plain: 'sendPlain', reactions: 'sendReactions',
};

export const editPermissionsCommand = new Command('edit-permissions')
  .description("Set a chat's default permissions, or restrict one member (Telethon edit_permissions)")
  .argument('<chat>', 'Supergroup or channel name, username (@chat), or ID')
  .argument('[user]', 'Restrict this member; omit to change the chat default permissions')
  .option('--mute', 'Restrict to read-only (deny all sending)')
  .option('--ban', 'Remove the member entirely (deny viewing messages); per-user only')
  .option('--lift', 'Lift all restrictions (full permissions)')
  .option('--deny <list>', `Comma-separated rights to deny: ${Object.keys(DENY_MAP).join(', ')}`)
  .option('--until <duration>', 'Temporary restriction (e.g. 1h, 1d, 1w); per-user only')
  .option('--json', 'Output as JSON')
  .action(async (chat, user, options) => {
    assertWriteEnabled();

    const denied = new Set<BannedRight>();
    if (options.mute) permissionPresets.MUTE_RIGHTS.forEach(r => denied.add(r));
    if (options.ban) denied.add('viewMessages');
    if (options.deny) {
      for (const name of String(options.deny).split(',').map(s => s.trim()).filter(Boolean)) {
        const key = DENY_MAP[name.toLowerCase()];
        if (!key) { console.error(`Unknown right "${name}". Use: ${Object.keys(DENY_MAP).join(', ')}`); process.exit(1); }
        denied.add(key);
      }
    }
    if (!options.lift && denied.size === 0) {
      console.error('Specify what to restrict (--mute, --ban, --deny <list>) or --lift to remove restrictions.');
      process.exit(1);
    }

    let untilDate = 0;
    if (options.until) {
      const { seconds, isForever } = parseDuration(options.until);
      untilDate = isForever ? 0 : Math.floor(Date.now() / 1000) + seconds;
    }

    const spinner = ora(`Updating permissions in "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await setChatPermissions(client, chat, user, [...denied], untilDate);
      auditLog({ timestamp: new Date().toISOString(), command: 'edit-permissions', target: chat, message: `${result.target}: ${[...denied].join(',') || '(lifted)'}`, result: { success: true } });
      spinner.stop();
      if (options.json) {
        console.log(formatJson(result));
      } else if (!denied.size) {
        console.log(chalk.green(`✓ Lifted restrictions on ${result.target === 'default' ? `"${result.chatTitle}" (default)` : `${result.target} in "${result.chatTitle}"`}`));
      } else {
        const where = result.target === 'default' ? `"${result.chatTitle}" default permissions` : `${result.target} in "${result.chatTitle}"`;
        console.log(chalk.green(`✓ Restricted ${where}: denied ${[...denied].join(', ')}${result.until ? ` until ${new Date(result.until).toLocaleString()}` : ''}`));
      }
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'edit-permissions', target: chat, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to update permissions');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
