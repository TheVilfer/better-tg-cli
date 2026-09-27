#!/usr/bin/env node

import './env.js';
import { Command } from 'commander';
import { createRequire } from 'module';
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
} from './commands/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('tg')
  .description('Fast Telegram CLI for reading, searching, and sending messages')
  .version(pkg.version);

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

program.parse();
