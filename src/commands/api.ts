import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolveApiMethod } from '../api-methods.js';
import { runApiMethod } from '../api-run.js';

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
    'Every method also has a typed top-level command: `telegram <namespace> <method>` (e.g.',
    '`telegram messages get-all-drafts`). Use `api` for scripted JSON params, the typed command',
    'for a command line. Run `telegram <namespace> --help` to list a namespace.',
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

    await runApiMethod(canonical, parsed, { auditCommand: 'api' });
  });
