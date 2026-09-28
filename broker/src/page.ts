/** The signup page at /: inline HTML, one nonce per response, only Turnstile and Google Fonts outside. */

import { escape, GUIDE_CSS, GUIDE_JS, guideHtml } from './guide';

export function pageResponse(open: boolean, siteKey: string | undefined): Response {
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
  return new Response(page(nonce, open, siteKey ?? ''), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': csp,
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

function page(nonce: string, open: boolean, siteKey: string): string {
  const form = open
    ? `<form id="f" novalidate>
  <label for="email">Почта</label>
  <input id="email" name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com">
  <p class="hint">Только для оповещений: важные обновления и отзыв ключей. Никому не передаём, рассылок не шлём.</p>
  <div class="cf-turnstile" data-sitekey="${escape(siteKey)}" data-theme="auto" data-language="ru"></div>
  <button id="go" type="submit">Получить инвайт</button>
  <p id="err" class="err" role="alert" hidden></p>
</form>`
    : `<div class="closed"><b>Регистрация сейчас закрыта.</b> Можно войти со своими ключами:
  создайте приложение на <a href="https://my.telegram.org/apps">my.telegram.org</a> и запустите
  <code>telegram auth</code>. Инструкция — в <a href="https://github.com/TheVilfer/better-tg-cli#log-in">README</a>.</div>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Инвайт better-tg-cli</title>
<meta name="description" content="Инвайт для входа в better-tg-cli без своих API-ключей Telegram">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&display=swap">
<style nonce="${nonce}">
:root{--bg:#fff;--fg:#0a0a0a;--dim:#6b6f73;--line:#e4e5e7;--panel:#fafafa;--accent:#1c93d1;--err:#c62828;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f2f2f2;--dim:#8d9297;--line:#26282a;--panel:#0b0b0b;--accent:#2AABEE;--err:#ff6b6b;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 Geist,system-ui,sans-serif}
main{max-width:620px;margin:0 auto;padding:56px 16px 72px}
.brand{display:flex;align-items:center;gap:10px;font-weight:400;letter-spacing:1px;font-size:15px;margin-bottom:40px}
.brand i{font-style:normal;color:var(--accent)}
.brand svg{width:22px;height:22px}
h1{font-size:34px;line-height:1.1;letter-spacing:-.8px;font-weight:600;margin:0 0 14px;text-wrap:balance}
.lead{color:var(--dim);margin:0 0 32px;max-width:52ch}
label{display:block;font-weight:500;font-size:14px;margin-bottom:8px}
input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);outline:none}
input:focus{border-color:var(--accent)}
.hint{font-size:13px;color:var(--dim);margin:8px 0 18px}
.cf-turnstile{min-height:65px;margin-bottom:16px}
button{font:inherit;font-weight:500;cursor:pointer;border:0;border-radius:10px;padding:12px 18px;background:var(--fg);color:var(--bg)}
button:disabled{opacity:.5;cursor:default}
.err{color:var(--err);font-size:14px;margin:12px 0 0}
.closed{padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
a{color:var(--accent)}
code,.mono{font-family:'Geist Mono',ui-monospace,monospace;font-size:.92em}
.box{position:relative;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:14px 14px 14px 16px;display:flex;gap:12px;align-items:flex-start}
.box pre{margin:0;flex:1;min-width:0;white-space:pre-wrap;word-break:break-all;font:14px/1.6 'Geist Mono',ui-monospace,monospace}
.box button{padding:7px 12px;font-size:13px;background:transparent;color:var(--fg);border:1px solid var(--line);flex:none}
.box.token pre{color:var(--accent);white-space:pre-wrap;word-break:break-all}
.done-h{font-size:22px;margin:0 0 6px}
.done-p{color:var(--dim);margin:0 0 12px}
${GUIDE_CSS}
footer{margin-top:56px;font-size:13px;color:var(--dim)}
[hidden]{display:none!important}
</style></head><body><main>
<div class="brand"><svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><rect width="12" height="12" fill="currentColor"/><rect x="2" y="2" width="2" height="8" fill="var(--bg)"/><rect x="4" y="5" width="2" height="2" fill="var(--bg)"/><rect x="6" y="8" width="4" height="2" fill="var(--accent)"/></svg><span>BETTER-TG-CLI<i>.</i></span></div>
<h1>Инвайт для входа в better-tg-cli</h1>
<p class="lead">Инвайт позволяет войти в свой Telegram через CLI без своих API-ключей с my.telegram.org.
Одна почта — один инвайт на один вход. Сообщения и сессия остаются только на вашем компьютере.\nУже есть свои ключи? <a href="#guide">Сразу к установке</a>.</p>
<section id="start">${form}</section>
<section id="done" hidden>
  <h2 class="done-h">Ваш инвайт</h2>
  <p class="done-p">Показываем один раз. Сохраните его и не отправляйте агенту или кому-то ещё — он понадобится на шаге входа.</p>
  <div class="box token"><pre id="tok"></pre><button type="button" data-copy>Копировать</button></div>
  <p class="done-p"><a href="#guide">Дальше — установка ↓</a></p>
</section>
${guideHtml()}
<footer>Открытый код: <a href="https://github.com/TheVilfer/better-tg-cli">github.com/TheVilfer/better-tg-cli</a></footer>
</main>
${open ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer nonce="' + nonce + '"></script>' : ''}
<script nonce="${nonce}">
const ERRORS = {
  bad_email: 'Проверьте адрес почты.',
  captcha_failed: 'Проверка не прошла. Обновите страницу и попробуйте ещё раз.',
  email_used: 'На эту почту инвайт уже выдан. Если он потерялся, напишите нам в GitHub.',
  rate_limited: 'Слишком много попыток. Попробуйте позже.',
  daily_limit: 'На сегодня инвайты закончились. Загляните завтра.',
  signups_closed: 'Регистрация сейчас закрыта.',
};
const f = document.getElementById('f');
if (f) f.addEventListener('submit', async e => {
  e.preventDefault();
  const err = document.getElementById('err'), go = document.getElementById('go');
  err.hidden = true;
  const turnstile = (f.querySelector('[name="cf-turnstile-response"]') || {}).value || '';
  if (!turnstile) { err.textContent = 'Дождитесь проверки «Я не робот».'; err.hidden = false; return; }
  go.disabled = true;
  try {
    const res = await fetch('/v1/invites', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('email').value, turnstile }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(ERRORS[data.error] || 'Что-то пошло не так. Попробуйте ещё раз.');
    document.getElementById('tok').textContent = data.invite;
    document.getElementById('start').hidden = true;
    document.getElementById('done').hidden = false;
    document.getElementById('done').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (x) {
    err.textContent = x.message; err.hidden = false;
    if (window.turnstile) window.turnstile.reset();
  } finally { go.disabled = false; }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.parentElement.querySelector('pre').textContent); b.textContent = 'Скопировано'; }
  catch { b.textContent = 'Выделите вручную'; }
  setTimeout(() => { b.textContent = 'Копировать'; }, 1600);
});
${GUIDE_JS}
</script></body></html>`;
}
