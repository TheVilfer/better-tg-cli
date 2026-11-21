import {
  isApiReadCall,
  apiRefusalReason,
  mcpPaidStarsRefusal,
  mcpParamRefusal,
  plainParams,
} from "./api-methods.js";
import { bindStringPeers } from "./api-peers.js";
import { auditLog } from "./audit.js";
import {
  getClient,
  invokeApi,
  serializeApiResult,
  disconnectClient,
} from "./client.js";
import { CliError, EXIT, fail } from "./errors.js";
import { assertWriteEnabled } from "./guard.js";
import { mcpApiAllowlistRefusal } from "./mcp-api-allowlist.js";
import ora from "./spinner.js";

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
  options: { auditCommand?: string; paramsFromStdin?: boolean } = {}
): Promise<void> {
  const auditCommand = options.auditCommand ?? "api";

  params = plainParams(params);
  const refusal =
    apiRefusalReason(canonical, params) ??
    mcpApiAllowlistRefusal(canonical) ??
    mcpPaidStarsRefusal(canonical, params) ??
    mcpParamRefusal(canonical, params);
  if (refusal) {
    fail(new CliError(refusal, "refused", EXIT.ERROR));
  }
  bindStringPeers(canonical, params);

  const isWrite = !isApiReadCall(canonical, params);
  if (isWrite) {
    await assertWriteEnabled(undefined, {
      readsStdin: options.paramsFromStdin === true,
      apiParams: params,
    });
  }

  const spinner = ora(`Calling ${canonical}...`).start();
  try {
    const client = await getClient();
    const result = await invokeApi(client, canonical, params);
    spinner.stop();

    if (isWrite) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: auditCommand,
        target: canonical,
        result: { success: true },
      });
    }
    console.log(serializeApiResult(result));
    await disconnectClient();
  } catch (error) {
    if (isWrite) {
      auditLog({
        timestamp: new Date().toISOString(),
        command: auditCommand,
        target: canonical,
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    fail(error, spinner, `${canonical} failed`);
  }
}
