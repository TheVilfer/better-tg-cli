import { getClient, invokeApi, serializeApiResult, disconnectClient } from './client.js';
import { isApiReadCall, apiRefusalReason, mcpPaidStarsRefusal, mcpParamRefusal, plainParams } from './api-methods.js';
import { mcpApiAllowlistRefusal } from './mcp-api-allowlist.js';
import { assertWriteEnabled } from './guard.js';
import { auditLog } from './audit.js';
import chalk from './colors.js';
import ora from './spinner.js';

/**
 * One execution path for every raw TL call, shared by the generic `api` command and the generated
 * per-method commands (src/commands/generated.ts). It enforces the single source of truth in
 * src/api-methods.ts — the same hard refusals, read/write classification, write guard and audit —
 * so `telegram api messages.SendMessage --params …` and `telegram messages send-message …`
 * behave identically. `canonical` is the resolved `namespace.Method` class name; `params` is the
 * request body passed to `invokeApi` (peer/byte fields resolved there via {_chat}/{_base64}/…).
 */
export async function runApiMethod(
  canonical: string,
  params: Record<string, unknown>,
  options: { auditCommand?: string; paramsFromStdin?: boolean } = {},
): Promise<void> {
  const auditCommand = options.auditCommand ?? 'api';

  // Prototype-free, so every check below sees exactly the fields the request gets. Refuse after
  // params are known so param-level checks (shared contact/geo media, phone-privacy, a paid call
  // over MCP) apply.
  params = plainParams(params);
  // Over MCP only allowlisted methods run (src/mcp-api-allowlist.ts); the denylist reason wins
  // when there is one, since such a method is refused in a terminal too.
  const refusal = apiRefusalReason(canonical, params) ?? mcpApiAllowlistRefusal(canonical) ?? mcpPaidStarsRefusal(canonical, params)
    ?? mcpParamRefusal(canonical, params);
  if (refusal) {
    console.error(chalk.red(refusal));
    process.exit(1);
  }

  // A read that may spend Stars (allowPaidStars) or add a view (increment) needs write access like any write
  const isWrite = !isApiReadCall(canonical, params);
  if (isWrite) assertWriteEnabled(undefined, { readsStdin: options.paramsFromStdin === true });

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
