/** The signup page at /login: inline HTML, one nonce per response, only Turnstile and Google Fonts outside. */

import { escape, GUIDE_CSS, GUIDE_JS, guideHtml } from './guide';
import { DICT, LANGS, type Dict, type Lang } from './i18n';
import { localPath, pageUrl, SITE } from './seo';

/**
 * `telegram onboard` sends people here with ?return=<its loopback callback>. Only that exact shape
 * is accepted: anything else would be an open redirect that leaks invite tokens.
 */
export function loopbackReturn(raw: string | null): string | null {
  if (!raw) return null;
  const m = /^http:\/\/127\.0\.0\.1:(\d{4,5})\/s\/[A-Za-z0-9_-]{32,64}\/cb$/.exec(raw);
  if (!m) return null;
  const port = Number(m[1]);
  return port >= 1024 && port <= 65535 ? raw : null;
}

export interface PageOptions {
  open: boolean;
  siteKey?: string;
  returnTo?: string | null;
  lang?: Lang;
  /** The request's query, so the language links keep ?return= (the onboard handoff), ?mode= and ?agent= */
  query?: URLSearchParams;
}

export function pageResponse({ open, siteKey, returnTo = null, lang = 'en', query = new URLSearchParams() }: PageOptions): Response {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' https://challenges.cloudflare.com`,
    `style-src 'nonce-${nonce}' https://fonts.googleapis.com`,
    'font-src https://fonts.gstatic.com',
    'frame-src https://challenges.cloudflare.com',
    "connect-src 'self'",
    "img-src 'self' data:",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return new Response(page(nonce, open, siteKey ?? '', returnTo, lang, query), {
    headers: {
      'content-language': lang,
      vary: 'Accept-Language, Cookie',
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': csp,
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}


/** Where the signup page lives; / is the landing page (src/landing.ts). */
export const LOGIN_PATH = '/login';
/** Where the page lived until 0.36: released CLIs, emails and READMEs still point there */
export const OLD_LOGIN_PATH = '/invite';

/** Link-preview tags (Open Graph, X card), the favicon and the per-language alternates of the page at `path`. */
export function cardMeta(lang: Lang, x: { title: string; description: string }, path: string): string {
  const href = (l: Lang) => pageUrl(path, l);
  const url = href(lang);
  const image = `${SITE}/og.png`;
  return [
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="canonical" href="${url}">`,
    ...LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${href(l)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}${path}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Better-TG-CLI">`,
    `<meta property="og:title" content="${escape(x.title)}">`,
    `<meta property="og:description" content="${escape(x.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${DICT[lang].page.ogLocale}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1280">`,
    `<meta property="og:image:height" content="640">`,
    `<meta property="og:image:alt" content="Better-TG-CLI: Telegram for your terminal and your AI agents">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escape(x.title)}">`,
    `<meta name="twitter:description" content="${escape(x.description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="theme-color" content="#000000">`,
  ].join('\n');
}

/** Colour tokens, light and dark, shared with the landing page. */
export const TOKENS_CSS = `:root{--bg:#fff;--fg:#0a0a0a;--dim:#6b6f73;--line:#e4e5e7;--panel:#fafafa;--accent:#1c93d1;--err:#c62828;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f2f2f2;--dim:#8d9297;--line:#26282a;--panel:#0b0b0b;--accent:#2AABEE;--err:#ff6b6b;color-scheme:dark}}`;

/** The pixel logo and the name. */
export const BRAND = `<div class="brand"><svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><rect width="12" height="12" fill="currentColor"/><rect x="2" y="2" width="2" height="8" fill="var(--bg)"/><rect x="4" y="5" width="2" height="2" fill="var(--bg)"/><rect x="6" y="8" width="4" height="2" fill="var(--accent)"/></svg><span>BETTER-TG-CLI<i>.</i></span></div>`;

/**
 * The layout every page shares: width, the header (logo, languages, page links), headings, links
 * and the footer. Pages add only the styles of their own content.
 */
export const SHELL_CSS = `*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Geist,system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 16px 72px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px 20px;flex-wrap:wrap;margin-bottom:48px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.top>a{color:inherit;text-decoration:none}
.brand{display:flex;align-items:center;gap:10px;font-weight:400;letter-spacing:1px;font-size:15px}
.brand i{font-style:normal;color:var(--accent)}
.brand svg{width:22px;height:22px}
.langs,.site{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;font-size:14px}
.langs b,.site b{font-weight:500}
.langs a,.site a{color:var(--dim);text-decoration:none}
.langs a:hover,.site a:hover{color:var(--fg)}
.site{margin-left:auto}
h1{font-size:40px;line-height:1.08;letter-spacing:-1.1px;font-weight:600;margin:0 0 16px;text-wrap:balance}
.lead{color:var(--dim);font-size:18px;margin:0 0 32px;text-wrap:pretty}
a{color:var(--accent)}
footer{margin-top:72px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--dim)}
footer .pages,footer .langs{margin-bottom:8px}
footer .langs{font-size:13px;gap:12px}
@media (max-width:480px){main{padding-top:28px}.site{gap:6px 14px}h1{font-size:31px;letter-spacing:-.7px}.lead{font-size:16px}}`;

/** Pages in the header, in this order. */
const NAV_PAGES = [['/cases', 'cases'], ['/faq', 'faq'], ['/compare', 'compare']] as const;

/**
 * The header of every page, the same everywhere: the logo (a link home) and the page links, with the
 * current page marked. `bare` leaves out the links, for the login page opened by the CLI, where
 * leaving would lose the way back. The language switch and the login key sit in the footer.
 */
export function header(lang: Lang, query: URLSearchParams, path: string, bare = false): string {
  const n = DICT[lang].page.nav;
  const href = (p: string) => localPath(p, lang);
  const logo = bare || path === '/' ? BRAND : `<a href="${href('/')}" aria-label="Better-TG-CLI">${BRAND}</a>`;
  const links = bare
    ? ''
    : `<nav class="site" aria-label="${escape(n.onThisSite)}">${NAV_PAGES.map(([p, k]) =>
        p === path ? `<b aria-current="page">${escape(n[k])}</b>` : `<a href="${href(p)}">${escape(n[k])}</a>`).join('')}</nav>`;
  return `<header class="top">${logo}${links}</header>`;
}
/** The footer, the same on every page: the language switch, the page links and the source. */
export const footer = (lang: Lang, query: URLSearchParams, path: string) => {
  const x = DICT[lang].page;
  return `<footer>${langLinks(lang, query, DICT[lang], path)}<nav class="pages">${(['mcp', 'cases', 'faq', 'compare', 'login'] as const).map(k => `<a href="${localPath(`/${k}`, lang)}">${escape(x.footerPages[k])}</a>`).join(' · ')}</nav>${escape(x.footerSource)}: <a href="https://github.com/TheVilfer/better-tg-cli">github.com/TheVilfer/better-tg-cli</a> · <a href="https://github.com/TheVilfer/better-tg-cli/blob/main/PRIVACY.md">${escape(x.footerPrivacy)}</a> · <a href="https://github.com/TheVilfer/better-tg-cli#code-signing-policy">Code signing policy</a></footer>`;
};

/**
 * Links to the same page in the other languages, keeping the rest of the query intact. Each carries
 * ?lang=, which the worker turns into a remembered choice and a redirect to the clean URL, so a
 * browser that prefers another language is not sent back to it from the bare English pages.
 */
export function langLinks(current: Lang, query: URLSearchParams, t: Dict, path: string): string {
  const links = LANGS.map(l => {
    const q = new URLSearchParams(query);
    q.delete('lang');
    q.set('lang', l);
    const name = escape(DICT[l].langName);
    return l === current
      ? `<b aria-current="true">${name}</b>`
      : `<a href="${localPath(path, l)}?${escape(q.toString())}" hreflang="${l}" lang="${l}">${name}</a>`;
  });
  return `<nav class="langs" aria-label="${escape(t.page.language)}">${links.join('')}</nav>`;
}

/** Strings the browser script needs; `<` escaped so nothing can close the script tag. */
const clientJson = (t: Dict) => JSON.stringify(t.client).replace(/</g, '\\u003c');

function page(nonce: string, open: boolean, siteKey: string, returnTo: string | null, lang: Lang, query: URLSearchParams): string {
  const t = DICT[lang];
  const x = t.page;
  const form = open
    ? `<form id="f" novalidate>
  <label for="email">${escape(x.emailLabel)}</label>
  <input id="email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com">
  <p class="hint">${escape(x.emailHint)}</p>
  <div class="cf-turnstile" data-sitekey="${escape(siteKey)}" data-theme="auto" data-language="${lang}"></div>
  <button id="go" type="submit">${escape(x.getCode)}</button>
  <p id="err" class="err" role="alert" hidden></p>
</form>
<form id="v" novalidate hidden>
  <label for="code">${escape(x.codeLabel)}</label>
  <p class="hint vhint">${escape(x.codeHintBefore)} <b id="sent-to"></b>. ${escape(x.codeHintAfter)}</p>
  <input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required placeholder="123456" class="code">
  <div class="vrow"><button id="vgo" type="submit">${escape(x.getKey)}</button>
  <button id="back" type="button" class="link">${escape(x.changeEmail)}</button></div>
  <p id="verr" class="err" role="alert" hidden></p>
</form>`
    : `<div class="closed">${x.closedHtml}</div>`;

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(x.title)}</title>
<meta name="description" content="${escape(x.description)}">
${returnTo ? '<meta name="robots" content="noindex">\n' : ''}${cardMeta(lang, x, LOGIN_PATH)}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&display=swap">
<style nonce="${nonce}">
${TOKENS_CSS}
${SHELL_CSS}
label{display:block;font-weight:500;font-size:14px;margin-bottom:8px}
input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);outline:none}
input:focus{border-color:var(--accent)}
.hint{font-size:13px;color:var(--dim);margin:8px 0 18px}
.cf-turnstile{min-height:65px;margin-bottom:16px}
button{font:inherit;font-weight:500;cursor:pointer;border:0;border-radius:10px;padding:12px 18px;background:var(--fg);color:var(--bg)}
button:disabled{opacity:.5;cursor:default}
.code{font:600 24px/1 'Geist Mono',ui-monospace,monospace;letter-spacing:6px;max-width:220px;margin-bottom:16px}
.vhint{margin:0 0 10px}
.vrow{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.link{background:none;color:var(--accent);padding:0;font-weight:400;font-size:14px}
.cli{padding:12px 14px;border:1px solid var(--accent);border-radius:10px;margin:0 0 24px;font-size:15px}
.err{color:var(--err);font-size:14px;margin:12px 0 0}
.closed{padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
code,.mono{font-family:'Geist Mono',ui-monospace,monospace;font-size:.92em}
.box{position:relative;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:14px 14px 14px 16px;display:flex;gap:12px;align-items:flex-start}
.box pre{margin:0;flex:1;min-width:0;white-space:pre-wrap;word-break:break-all;font:14px/1.6 'Geist Mono',ui-monospace,monospace}
.box button{padding:7px 12px;font-size:13px;background:transparent;color:var(--fg);border:1px solid var(--line);flex:none}
.box.token pre{color:var(--accent);white-space:pre-wrap;word-break:break-all}
.done-h{font-size:22px;margin:0 0 6px}
.done-p{color:var(--dim);margin:0 0 12px}
${GUIDE_CSS}
#start,#done{max-width:560px}
[hidden]{display:none!important}
</style></head><body><main${returnTo ? ` data-return="${escape(returnTo)}"` : ''}>
${header(lang, query, LOGIN_PATH, !!returnTo)}
<h1>${escape(x.h1)}</h1>
<p class="lead">${x.leadHtml}</p>
${returnTo ? `<p class="cli">${x.cliBannerHtml}</p>` : ''}
<section id="start">${form}</section>
<section id="done" hidden>
  <h2 class="done-h">${escape(x.doneTitle)}</h2>
  <p class="done-p">${escape(x.doneText)}</p>
  <div class="box token"><pre id="tok"></pre><button type="button" data-copy>${escape(t.client.copy)}</button></div>
  <p class="done-p" id="back-cli" hidden>${escape(x.backCli)}</p>
  <p class="done-p"><a href="#guide">${escape(x.nextInstall)}</a></p>
</section>
${guideHtml(t)}
${footer(lang, query, LOGIN_PATH)}
</main>
${open ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer nonce="' + nonce + '"></script>' : ''}
<script nonce="${nonce}">
const T = ${clientJson(t)};
const LANG = ${JSON.stringify(lang)};
const post = async (path, body) => {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(T.errors[data.error] || T.generic);
  return data;
};
const $ = id => document.getElementById(id);
const f = $('f'), v = $('v');
let email = '';
if (f) f.addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('err'), go = $('go');
  err.hidden = true;
  const turnstile = (f.querySelector('[name="cf-turnstile-response"]') || {}).value || '';
  if (!turnstile) { err.textContent = T.waitCaptcha; err.hidden = false; return; }
  go.disabled = true;
  try {
    email = $('email').value.trim();
    await post('/v1/invites', { email, turnstile, lang: LANG });
    $('sent-to').textContent = email;
    f.hidden = true; v.hidden = false; $('code').value = ''; $('code').focus();
  } catch (x) {
    err.textContent = x.message; err.hidden = false;
  } finally {
    go.disabled = false;
    if (window.turnstile) window.turnstile.reset();
  }
});
if (v) v.addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('verr'), go = $('vgo');
  err.hidden = true; go.disabled = true;
  try {
    const data = await post('/v1/invites/verify', { email, code: $('code').value });
    $('tok').textContent = data.invite;
    $('start').hidden = true; $('done').hidden = false;
    $('done').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Back to telegram onboard: the token rides in the fragment, which never reaches a server
    const back = document.querySelector('main').dataset.return;
    if (back) { $('back-cli').hidden = false; location.assign(back + '#invite=' + encodeURIComponent(data.invite)); }
  } catch (x) {
    err.textContent = x.message; err.hidden = false;
  } finally { go.disabled = false; }
});
if (v) $('back').addEventListener('click', () => { v.hidden = true; f.hidden = false; $('verr').hidden = true; });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.parentElement.querySelector('pre').textContent); b.textContent = T.copied; }
  catch { b.textContent = T.copyManual; }
  setTimeout(() => { b.textContent = T.copy; }, 1600);
});
${GUIDE_JS}
</script></body></html>`;
}
