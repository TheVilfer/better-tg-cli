import { Command } from 'commander';
import { getClient, sendPoll, votePoll, disconnectClient } from '../client.js';
import { formatJson } from '../formatters/json.js';
import { auditLog } from '../audit.js';
import { assertWriteEnabled } from '../guard.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const pollCommand = new Command('poll')
  .description('Send a poll to a chat')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<question>', 'Poll question')
  .argument('<options...>', 'Answer options (2 or more)')
  .option('--multiple', 'Allow selecting multiple answers')
  .option('--quiz', 'Quiz mode (requires --correct)')
  .option('--correct <n>', 'Index (1-based) of the correct answer for quiz mode')
  .option('--public', 'Non-anonymous poll (voters are visible)')
  .option('--json', 'Output as JSON')
  .action(async (chat, question, answers, options) => {
    assertWriteEnabled();
    if (answers.length < 2) {
      console.error('A poll needs at least 2 options');
      process.exit(1);
    }
    const correct = options.correct != null ? parseInt(options.correct, 10) - 1 : undefined;
    if (options.quiz && (correct == null || correct < 0 || correct >= answers.length)) {
      console.error('Quiz mode needs a valid --correct <1-based index>');
      process.exit(1);
    }
    const spinner = ora(`Sending poll to "${chat}"...`).start();
    try {
      const client = await getClient();
      const result = await sendPoll(client, chat, question, answers, {
        multiple: options.multiple,
        quiz: options.quiz,
        correct,
        anonymous: options.public ? false : undefined,
      });
      auditLog({ timestamp: new Date().toISOString(), command: 'poll', target: chat, message: question, result: { success: true, messageId: result.id } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.chatTitle, messageId: result.id, question, options: answers }));
      else console.log(chalk.green(`✓ Poll sent to "${result.chatTitle}"${result.id ? ` (#${result.id})` : ''}`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'poll', target: chat, message: question, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to send poll');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const voteCommand = new Command('vote')
  .description('Vote in a poll')
  .argument('<chat>', 'Chat name, username (@user), or ID')
  .argument('<messageId>', 'Poll message ID')
  .argument('<options...>', 'Option number(s) to vote for, 1-based (e.g. 2, or 1 3 for multiple)')
  .option('--json', 'Output as JSON')
  .action(async (chat, messageId, optionNums, options) => {
    assertWriteEnabled();
    const id = parseInt(messageId, 10);
    if (!Number.isInteger(id)) {
      console.error('Message ID must be a number');
      process.exit(1);
    }
    const indexes = optionNums.map((s: string) => parseInt(s, 10) - 1).filter((n: number) => n >= 0);
    if (indexes.length === 0) {
      console.error('Provide at least one 1-based option number');
      process.exit(1);
    }
    const spinner = ora(`Voting in poll #${id}...`).start();
    try {
      const client = await getClient();
      const result = await votePoll(client, chat, id, indexes);
      auditLog({ timestamp: new Date().toISOString(), command: 'vote', target: chat, message: `#${id} [${indexes.map((i: number) => i + 1).join(',')}]`, result: { success: true } });
      spinner.stop();
      if (options.json) console.log(formatJson({ chat: result.chatTitle, messageId: id, voted: indexes.map((i: number) => i + 1) }));
      else console.log(chalk.green(`✓ Voted in poll #${id} in "${result.chatTitle}"`));
      await disconnectClient();
    } catch (error) {
      auditLog({ timestamp: new Date().toISOString(), command: 'vote', target: chat, message: `#${id}`, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      spinner.fail('Failed to vote');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
