/**
 * The next step after "not logged in" or "session expired", for whoever reads it. An agent runs
 * `telegram onboard` (a local page; it notices a dead session and logs in again); over MCP, where
 * onboard can't run, the model calls telegram_setup and gives the user the page. `auth --qr` is only
 * for a person at their own terminal: the agent skill forbids it to agents.
 */
export function loginHint(env: NodeJS.ProcessEnv = process.env): string {
  if (env.TG_MCP) {
    return 'Ask the user to log in: call telegram_setup and give them the page it returns (they log in there; you never see a code or password).';
  }
  return 'Log in with "telegram onboard" (a guided page in the browser; a dead session is replaced). A person at their own terminal can use "telegram auth --qr" instead.';
}
