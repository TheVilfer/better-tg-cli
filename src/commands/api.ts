import { Command } from 'commander';
import { readFileSync } from 'fs';
import { getClient, invokeApi, serializeApiResult, disconnectClient } from '../client.js';
import { resolveApiMethod, isApiReadMethod, apiRefusalReason } from '../api-methods.js';
import { assertWriteEnabled } from '../guard.js';
import { auditLog } from '../audit.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

export const apiCommand = new Command('api')
  .description('Call any raw Telegram TL method (full API reachability; output is JSON)')
  .argument('<method>', 'TL method, e.g. "messages.GetHistory", "help.GetConfig" (case-insensitive)')
  .option('-p, --params <json>', 'Request parameters as a JSON object; "-" reads JSON from stdin', '{}')
  .option('--write', 'Acknowledge this is a write (optional; writes still need write access)')
  .addHelpText('after', [
    '',
    'Peer/byte fields:',
    '  {"_chat": "<id|@user|title|me>"}  resolve a chat as other commands do',
    '  {"_base64": "…"} / {"_hex": "…"}  raw bytes',
    'Other entity-like fields also accept a bare @username or ID (resolved on send).',
    '',
    'Read methods (Get*/Check*/Search*/Resolve*) run without write access; everything else is a',
    'write and needs `telegram write-access on`. Paying, account deletion, session termination,',
    '2FA changes and sharing your location are always refused.',
    '',
    'Examples:',
    '  telegram api help.GetConfig',
    '  telegram api messages.GetAllDrafts',
    '  telegram api channels.GetAdminLog --params \'{"channel":{"_chat":"My Group"},"limit":20,"q":""}\'',
  ].join('\n'))
  .action(async (method: string, options: { params: string; write?: boolean }) => {
    let parsed: Record<string, unknown>;
    let canonical: string;
    try {
      const resolved = resolveApiMethod(method);
      canonical = resolved.className;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    const raw = options.params === '-' ? readFileSync(0, 'utf-8') : options.params;
    try {
      parsed = raw.trim() ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('params must be a JSON object');
      }
    } catch (error) {
      console.error(`Invalid --params JSON: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    // Refuse after parsing so param-level checks (shared contact/geo media, phone-privacy) apply.
    const refusal = apiRefusalReason(canonical, parsed);
    if (refusal) {
      console.error(chalk.red(refusal));
      process.exit(1);
    }

    const isWrite = !isApiReadMethod(canonical);
    if (isWrite) assertWriteEnabled();

    const spinner = ora(`Calling ${canonical}...`).start();
    try {
      const client = await getClient();
      const result = await invokeApi(client, canonical, parsed);
      spinner.stop();

      if (isWrite) {
        auditLog({ timestamp: new Date().toISOString(), command: 'api', target: canonical, result: { success: true } });
      }
      console.log(serializeApiResult(result));
      await disconnectClient();
    } catch (error) {
      if (isWrite) {
        auditLog({ timestamp: new Date().toISOString(), command: 'api', target: canonical, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
      }
      spinner.fail(`${canonical} failed`);
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
