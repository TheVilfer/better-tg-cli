import type { ConsentQuestion } from './device';

/** Everything here can come from a client's registration or metadata document: escape it all. */
export const escape = (value: string) => value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

const REPO = 'https://github.com/TheVilfer/better-tg-cli';

const shell = (title: string, body: string) => `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(title)}</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#111;--dim:#666;--line:#e5e5e5;--accent:#2aabee;--warn:#b45309}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0b;--fg:#ececec;--dim:#9a9a9a;--line:#2a2a2a;--warn:#f59e0b}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,sans-serif}
main{max-width:520px;margin:0 auto;padding:48px 16px}
h1{font-size:24px;line-height:1.25;margin:0 0 16px}
p{margin:0 0 14px}.dim{color:var(--dim)}.warn{color:var(--warn)}
code{font:14px ui-monospace,SFMono-Regular,Menlo,monospace}
input[type=text]{box-sizing:border-box;width:100%;padding:12px;font:20px ui-monospace,Menlo,monospace;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--line);border-radius:10px;background:transparent;color:inherit}
.row{display:flex;gap:10px;margin-top:18px}
button{flex:1;padding:12px;border-radius:10px;border:1px solid var(--line);background:transparent;color:inherit;font:inherit;cursor:pointer}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.box{border:1px solid var(--line);border-radius:12px;padding:16px;margin:18px 0}
</style>
<main>${body}</main>
</html>`;

export type ConsentInfo = ConsentQuestion & { requestedScope: string[] };

export function consentPage(info: ConsentInfo, handle: string, error?: string): string {
  const name = escape(info.clientName);
  const origin = info.clientDomain
    ? `Published by <strong>${escape(info.clientDomain)}</strong>.`
    : 'This app registered itself; its name is not verified.';
  return shell(
    `Connect ${info.clientName} to Telegram`,
    `<h1>Let ${name} use your Telegram through better-tg-cli?</h1>
<p>${origin} Access goes to <strong>${escape(info.redirectHost)}</strong>.</p>
${info.redirectIsLoopback ? '<p class="warn"><strong>This sends access to an app on a computer.</strong> Continue only if you just started connecting from it.</p>' : ''}
<div class="box">
<p>Your Telegram session stays on your computer. ${name} reaches it through this relay while
<code>telegram mcp --remote</code> runs there. It can read; sending stays off until you run
<code>telegram write-access on</code> yourself.</p>
<p class="dim">Requests and replies pass through the relay unencrypted (TLS ends here), and nothing is logged or stored. <a href="${REPO}">Source</a></p>
</div>
<form method="post">
<input type="hidden" name="handle" value="${escape(handle)}">
<label for="code">Pairing code from your terminal (<code>telegram remote pair</code>)</label>
<p><input type="text" id="code" name="code" autocomplete="off" spellcheck="false" maxlength="12" placeholder="XXXX-XXXX" autofocus></p>
${error ? `<p class="warn">${escape(error)}</p>` : ''}
<p class="dim">After Allow, confirm on your computer: a prompt or a dialog appears there.</p>
<div class="row"><button name="decision" value="deny">Deny</button><button class="primary" name="decision" value="approve">Allow</button></div>
</form>`
  );
}

export function messagePage(title: string, text: string): string {
  return shell(title, `<h1>${escape(title)}</h1><p>${escape(text)}</p>`);
}

export function homePage(): string {
  return shell(
    'better-tg-cli relay',
    `<h1>better-tg-cli relay</h1>
<p>A remote MCP endpoint for claude.ai, ChatGPT and other apps that connect by URL. They reach
<code>telegram mcp --remote</code> on your own computer; the Telegram session never leaves it.</p>
<p>Connector URL: <code>https://mcp.better-tg-cli.com/mcp</code></p>
<p><a href="${REPO}">How to set it up</a></p>`
  );
}
