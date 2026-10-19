import { getClient, invokeApi, serializeApiResult, disconnectClient } from './client.js';
import { isApiReadMethod, apiRefusalReason } from './api-methods.js';
import { assertWriteEnabled } from './guard.js';
import { auditLog } from './audit.js';
import chalk from './colors.js';
import ora from './spinner.js';

/**
 * One execution path for every raw TL call, shared by the generic `api` command and the generated
 * per-method `tl` commands (src/commands/tl.ts). It enforces the single source of truth in
 * src/api-methods.ts — the same hard refusals, read/write classification, write guard and audit —
 * so `telegram api messages.SendMessage --params …` and `telegram tl messages send-message …`
 * behave identically. `canonical` is the resolved `namespace.Method` class name; `params` is the
 * request body passed to `invokeApi` (peer/byte fields resolved there via {_chat}/{_base64}/…).
 */
export async function runApiMethod(
  canonical: string,
  params: Record<string, unknown>,
  options: { auditCommand?: string } = {},
): Promise<void> {
  const auditCommand = options.auditCommand ?? 'api';

  // Refuse after params are known so param-level checks (shared contact/geo media, phone-privacy) apply.
  const refusal = apiRefusalReason(canonical, params);
  if (refusal) {
    console.error(chalk.red(refusal));
    process.exit(1);
  }

  const isWrite = !isApiReadMethod(canonical);
  if (isWrite) assertWriteEnabled();

  const spinner = ora(`Calling ${canonical}...`).start();
  try {
    const client = await getClient();
    const result = await invokeApi(client, canonical, params);
    spinner.stop();

    if (isWrite) {
      auditLog({ timestamp: new Date().toISOString(), command: auditCommand, target: canonical, result: { success: true } });
    }
    console.log(serializeApiResult(result));
    await disconnectClient();
  } catch (error) {
    if (isWrite) {
      auditLog({ timestamp: new Date().toISOString(), command: auditCommand, target: canonical, result: { success: false, error: error instanceof Error ? error.message : String(error) } });
    }
    spinner.fail(`${canonical} failed`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
