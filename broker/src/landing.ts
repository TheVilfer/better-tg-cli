/** The landing page at /: what the tool is, one install command, the way to an invite. No forms, no Turnstile. */

import { a, b, code, d, escape, SCREEN_CSS, terminal } from './guide';
import { DICT, type Dict, type Lang } from './i18n';
import { BRAND, cardMeta, footer, INVITE_PATH, langLinks, TOKENS_CSS } from './page';

const INSTALL = 'npm install -g better-tg-cli';
const AGENTS = ['Claude Code', 'Codex', 'Cursor', 'Claude Desktop', 'Gemini CLI'];
const REPO = 'https://github.com/TheVilfer/better-tg-cli';

export interface LandingOptions {
  lang?: Lang;
  /** The request's query: the language links keep it, and an explicit ?lang= follows the visitor to the invite page */
  query?: URLSearchParams;
}

export function landingResponse({ lang = 'en', query = new URLSearchParams() }: LandingOptions): Response {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}' https://fonts.googleapis.com`,
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return new Response(landing(nonce, lang, query), {
    headers: {
      'content-language': lang,
      vary: 'Accept-Language',
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': csp,
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** An agent answering a question about the inbox: the whole pitch in one picture. */
function screen(t: Dict): string {
  const s = t.guide.screens;
  return terminal('claude', [
    `${d('&gt;')} ${escape(s.claudeAsk)}`,
    '',
    `${a('⏺')} ${b('telegram_read')}${d('(inbox -n 5)')}`,
    `  ${d('⎿')} ${d('12 unread in 4 chats')}`,
    `${a('⏺')} ${escape(s.claudeAnswer.join(' '))}`,
  ]);
}

const tile = (cls: string, f: { title: string; text: string }, extra = '', lead = '') =>
  `<div class="tile${cls ? ` ${cls}` : ''}">${lead}<h3>${escape(f.title)}</h3><p>${escape(f.text)}</p>${extra}</div>`;

/** The few things that set the tool apart, as a bento grid. */
function bento(x: Dict['landing']): string {
  const f = x.features;
  const chip = (html: string) => `<div class="chip" aria-hidden="true">${html}</div>`;
  return `<h2>${escape(x.featuresTitle)}</h2>
<div class="bento">
${tile('wide', f.safe, chip('<span>$</span> telegram write-access on <b>--for 1h</b>'))}
${tile('narrow', f.commands, '', '<div class="num">60+</div>')}
${tile('narrow', f.deps, '', '<div class="num">0</div>')}
${tile('wide', f.tokens, chip('<b>1234567890</b> user unread=2 Alice @alice <span>|</span> see you at 7?'))}
${tile('', f.bots, chip('<span>$</span> telegram click @bot 812 <b>"Confirm"</b>'))}
${tile('', f.agents, `<div class="agents">${AGENTS.map(n => `<span>${n}</span>`).join('')}</div>`)}
</div>`;
}

/** What an invite is and the three steps to one. */
function invites(x: Dict['landing'], href: string): string {
  return `<h2 id="invites">${escape(x.invitesTitle)}</h2>
<p class="how">${escape(x.invitesLead)}</p>
<ol class="steps">${x.steps.map(s => `<li><h3>${escape(s.title)}</h3><p>${escape(s.text)}</p></li>`).join('')}</ol>
<p class="own">${escape(x.ownKeys)} <code>telegram auth</code>.</p>
<div class="cta"><a class="btn" href="${href}">${escape(x.invite)}</a></div>`;
}

function landing(nonce: string, lang: Lang, query: URLSearchParams): string {
  const t = DICT[lang];
  const x = t.landing;
  const invite = query.has('lang') ? `${INVITE_PATH}?lang=${lang}` : INVITE_PATH;

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(x.title)}</title>
<meta name="description" content="${escape(x.description)}">
${cardMeta(lang, x, '/')}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&display=swap">
<style nonce="${nonce}">
${TOKENS_CSS}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 Geist,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:56px 16px 72px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:72px}
.brand{display:flex;align-items:center;gap:10px;font-weight:400;letter-spacing:1px;font-size:15px}
.brand i{font-style:normal;color:var(--accent)}
.brand svg{width:22px;height:22px}
.langs{display:flex;gap:12px;font-size:14px}
.langs b{font-weight:500}
.langs a{color:var(--dim);text-decoration:none}
.langs a:hover{color:var(--fg)}
h1{font-size:44px;line-height:1.05;letter-spacing:-1.4px;font-weight:600;margin:0 0 18px;text-wrap:balance}
.lead{color:var(--dim);font-size:18px;margin:0 0 32px;max-width:48ch;text-wrap:pretty}
a{color:var(--accent)}
.box{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:14px 14px 14px 16px;display:flex;gap:12px;align-items:center;margin-bottom:16px}
.box pre{margin:0;flex:1;min-width:0;white-space:nowrap;overflow-x:auto;font:14px/1.6 'Geist Mono',ui-monospace,monospace}
.box pre::before{content:'$ ';color:var(--dim)}
.box button{font:inherit;font-weight:500;font-size:13px;cursor:pointer;padding:7px 12px;border-radius:10px;background:transparent;color:var(--fg);border:1px solid var(--line);flex:none}
.cta{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;margin-bottom:8px}
.btn{display:inline-block;text-decoration:none;font-weight:500;padding:12px 18px;border-radius:10px;background:var(--fg);color:var(--bg)}
.gh{color:var(--fg);text-decoration:none;font-weight:500}
.gh:hover,.btn:hover{opacity:.8}
.note{font-size:13px;color:var(--dim);margin:0 0 56px}
${SCREEN_CSS}
.s-body{white-space:pre-wrap;overflow-wrap:anywhere}
h2{font-size:26px;line-height:1.15;letter-spacing:-.6px;font-weight:600;margin:88px 0 20px;text-wrap:balance}
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.tile{grid-column:span 3;border:1px solid var(--line);border-radius:16px;background:var(--panel);padding:20px;display:flex;flex-direction:column;gap:6px;min-width:0}
.tile.wide{grid-column:span 4}
.tile.narrow{grid-column:span 2}
.tile h3{font-size:16px;font-weight:600;margin:0}
.tile p{font-size:14px;line-height:1.5;color:var(--dim);margin:0}
.tile .num{font-size:52px;line-height:1;letter-spacing:-2px;font-weight:600}
.tile .num+h3{font-weight:500;color:var(--dim);font-size:14px;margin-bottom:6px}
.chip{margin-top:auto;padding-top:14px;font:12.5px/1.6 'Geist Mono',ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip span{color:var(--dim)}
.chip b{font-weight:400;color:var(--accent)}
.agents{margin-top:auto;padding-top:14px;display:flex;flex-wrap:wrap;gap:6px}
.agents span{font-size:12.5px;padding:3px 9px;border:1px solid var(--line);border-radius:999px;background:var(--bg)}
.how{color:var(--dim);margin:0 0 24px;max-width:56ch}
.steps{list-style:none;counter-reset:s;padding:0;margin:0 0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.steps li{counter-increment:s;border-top:1px solid var(--line);padding-top:14px}
.steps li::before{content:counter(s,decimal-leading-zero);display:block;font:13px 'Geist Mono',ui-monospace,monospace;color:var(--accent);margin-bottom:10px}
.steps h3{font-size:16px;font-weight:600;margin:0 0 6px}
.steps p{font-size:14px;line-height:1.5;color:var(--dim);margin:0}
.own{font-size:14px;color:var(--dim);margin:0 0 20px}
.own code{font:13px 'Geist Mono',ui-monospace,monospace;color:var(--fg)}
.facts{list-style:none;padding:0;margin:32px 0 0;display:flex;flex-wrap:wrap;gap:6px 24px;font-size:14px;color:var(--dim)}
.facts li::before{content:'';display:inline-block;width:6px;height:6px;margin-right:9px;background:var(--accent);vertical-align:middle}
footer{margin-top:56px;font-size:13px;color:var(--dim)}
@media (max-width:480px){main{padding-top:32px}.top{margin-bottom:48px}h1{font-size:34px;letter-spacing:-.9px}.lead{font-size:16px}.box{flex-direction:column;align-items:flex-start}.box pre{font-size:13px;max-width:100%}}
@media (max-width:620px){h2{margin-top:64px}.bento,.steps{grid-template-columns:1fr}.tile,.tile.wide,.tile.narrow{grid-column:auto}}
</style></head><body><main>
<div class="top">${BRAND}
${langLinks(lang, query, t, '/')}</div>
<h1>${escape(x.h1)}</h1>
<p class="lead">${escape(x.lead)}</p>
${code(INSTALL, t.client.copy)}
<div class="cta"><a class="btn" href="${invite}">${escape(x.invite)}</a><a class="gh" href="${REPO}">GitHub ↗</a></div>
<p class="note">${escape(x.inviteNote)}</p>
${screen(t)}
<ul class="facts">${x.facts.map(f => `<li>${escape(f)}</li>`).join('')}</ul>
${bento(x)}
${invites(x, invite)}
${footer(t.page)}
</main>
<script nonce="${nonce}">
const T = ${JSON.stringify({ copy: t.client.copy, copied: t.client.copied, copyManual: t.client.copyManual }).replace(/</g, '\\u003c')};
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.parentElement.querySelector('pre').textContent); b.textContent = T.copied; }
  catch { b.textContent = T.copyManual; }
  setTimeout(() => { b.textContent = T.copy; }, 1600);
});
</script></body></html>`;
}
