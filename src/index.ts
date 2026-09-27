#!/usr/bin/env node

import './env.js';
import { VERSION } from './version.js';
import { Command } from 'commander';
import { BACKGROUND_CHECK_COMMAND, maybeNotifyUpdate, runBackgroundCheck } from './update.js';
import {
  authCommand,
  logoutCommand,
  whoamiCommand,
  checkCommand,
  chatsCommand,
  readCommand,
  getCommand,
  infoCommand,
  topicsCommand,
  linkCommand,
  contactsCommand,
  searchCommand,
  sendCommand,
  replyCommand,
  inboxCommand,
  contactCommand,
  membersCommand,
  adminsCommand,
  groupsCommand,
  syncCommand,
  kickCommand,
  promoteCommand,
  transferOwnerCommand,
  muteCommand,
  unmuteCommand,
  foldersCommand,
  folderCommand,
  folderAddCommand,
  folderRemoveCommand,
  writeAccessCommand,
  downloadCommand,
  sendFileCommand,
  buttonsCommand,
  clickCommand,
  reactCommand,
  forwardCommand,
  pinCommand,
  unpinCommand,
  editCommand,
  deleteCommand,
  markReadCommand,
  pinnedCommand,
  pollCommand,
  voteCommand,
  reactionsCommand,
  blockCommand,
  unblockCommand,
  addContactCommand,
  delContactCommand,
  joinCommand,
  leaveCommand,
  inviteLinkCommand,
  archiveCommand,
  unarchiveCommand,
  createGroupCommand,
  createChannelCommand,
  typingCommand,
  setNameCommand,
  setBioCommand,
  setUsernameCommand,
  setAvatarCommand,
  avatarCommand,
  inlineCommand,
  storiesCommand,
  watchCommand,
  updateCommand,
} from './commands/index.js';


const program = new Command();

program
  .name('tg')
  .description('Fast Telegram CLI for reading, searching, and sending messages')
  .version(VERSION);

// Auth commands
program.addCommand(authCommand);
program.addCommand(logoutCommand);
program.addCommand(checkCommand);
program.addCommand(whoamiCommand);

// Read commands
program.addCommand(chatsCommand);
program.addCommand(readCommand);
program.addCommand(getCommand);
program.addCommand(infoCommand);
program.addCommand(topicsCommand);
program.addCommand(linkCommand);
program.addCommand(contactsCommand);
program.addCommand(searchCommand);
program.addCommand(inboxCommand);
program.addCommand(buttonsCommand);
program.addCommand(pinnedCommand);
program.addCommand(reactionsCommand);
program.addCommand(storiesCommand);
program.addCommand(avatarCommand);
program.addCommand(inlineCommand);
program.addCommand(watchCommand);

// Contact/group commands
program.addCommand(contactCommand);
program.addCommand(membersCommand);
program.addCommand(adminsCommand);
program.addCommand(groupsCommand);
program.addCommand(kickCommand);
program.addCommand(promoteCommand);
program.addCommand(transferOwnerCommand);
program.addCommand(muteCommand);
program.addCommand(unmuteCommand);

// Folder commands
program.addCommand(foldersCommand);
program.addCommand(folderCommand);
program.addCommand(folderAddCommand);
program.addCommand(folderRemoveCommand);

// Write commands
program.addCommand(sendCommand);
program.addCommand(replyCommand);
program.addCommand(sendFileCommand);
program.addCommand(clickCommand);
program.addCommand(reactCommand);
program.addCommand(forwardCommand);
program.addCommand(pinCommand);
program.addCommand(unpinCommand);
program.addCommand(editCommand);
program.addCommand(deleteCommand);
program.addCommand(markReadCommand);
program.addCommand(pollCommand);
program.addCommand(voteCommand);
program.addCommand(blockCommand);
program.addCommand(unblockCommand);
program.addCommand(addContactCommand);
program.addCommand(delContactCommand);
program.addCommand(joinCommand);
program.addCommand(leaveCommand);
program.addCommand(inviteLinkCommand);
program.addCommand(archiveCommand);
program.addCommand(unarchiveCommand);
program.addCommand(createGroupCommand);
program.addCommand(createChannelCommand);
program.addCommand(typingCommand);
program.addCommand(setNameCommand);
program.addCommand(setBioCommand);
program.addCommand(setUsernameCommand);
program.addCommand(setAvatarCommand);

// Configuration
program.addCommand(writeAccessCommand);

// Utilities
program.addCommand(syncCommand);
program.addCommand(downloadCommand);
program.addCommand(updateCommand);

// Dense reference of every command and flag, generated from the definitions
// above so it can never drift from the code. Cheaper for agents than N --help calls.
program
  .command('help-all')
  .description('Print every command with its arguments and flags (compact reference)')
  .option('-g, --grep <text>', 'Only commands whose name, description or flags mention this text')
  .action((options) => {
    const needle = options.grep?.toLowerCase();
    const lines: string[] = [];
    for (const cmd of program.commands) {
      if (cmd.name() === 'help-all') continue;
      const desc = cmd.description();
      const haystack = [cmd.name(), desc, ...cmd.options.map(o => `${o.flags} ${o.description}`)].join(' ').toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const args = cmd.registeredArguments.map(a => (a.required ? `<${a.name()}${a.variadic ? '...' : ''}>` : `[${a.name()}${a.variadic ? '...' : ''}]`)).join(' ');
      lines.push(`${cmd.name()}${args ? ' ' + args : ''} — ${desc}`);
      for (const opt of cmd.options) {
        if (opt.long === '--json' || opt.long === '--markdown') continue;
        const def = opt.defaultValue !== undefined && typeof opt.defaultValue !== 'boolean' ? ` (default ${opt.defaultValue})` : '';
        lines.push(`  ${opt.flags} — ${opt.description}${def}`);
      }
    }
    lines.push('', 'Most read commands accept --json; --markdown where noted in `<cmd> --help`.');
    console.log(lines.join('\n'));
  });

if (process.argv[2] === BACKGROUND_CHECK_COMMAND) {
  void runBackgroundCheck();
} else {
  maybeNotifyUpdate();
  program.parse();
}
