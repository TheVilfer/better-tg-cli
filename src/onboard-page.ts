import { randomBytes } from 'node:crypto';

/** The local onboarding page: inline only, one nonce per response, English, Spanish or Russian from the browser. */

const en = {
  title: 'Log in to Telegram for Better-TG-CLI',
  lead: 'Your agent opened this page. What you enter here stays on this computer: the agent never sees the login key, the QR code or your password.',
  inviteH: 'Step 1. Login key',
  getInvite: 'Get a login key',
  getInviteNote: 'better-tg-cli.com opens: confirm your email with the code we send, and the login key comes back here by itself.',
  haveInvite: 'I already have a login key',
  paste: 'Paste your login key',
  use: 'Continue',
  ownKeys: 'Use my own keys from my.telegram.org',
  apiId: 'api_id', apiHash: 'api_hash',
  connecting: 'Connecting to Telegram…',
  scanH: 'Step 2. Scan the QR code',
  scanNote: 'On your phone: Telegram → Settings → Devices → Link Desktop Device. The code refreshes by itself.',
  passwordH: 'Step 3. Two-step verification password',
  passwordNote: 'You have one if you turned on a cloud password in Telegram. Hint:',
  send: 'Log in',
  wrong: 'Wrong password, try again.',
  doneH: 'Done!',
  doneNote: 'Logged in as {user}. You can close this tab and go back to your agent.',
  errorH: 'Could not log in',
  retry: 'Try again',
  gone: 'This page stopped answering. Run telegram onboard again.',
  failed: 'Something went wrong',
  modeTitle: 'What may your agent do in Telegram?',
  modeH: 'Last step. What may the agent do?',
  modeNote: 'You can change this later with telegram write-access.',
  roName: 'Read only', roNote: 'Reads and searches only.',
  askName: 'Ask me each time (recommended)', askNote: 'Before each message or action, the agent shows it to you in the chat and sends only after your yes. It relies on the agent following its instructions.',
  onName: 'Write freely', onNote: 'Sends, edits and deletes without asking. Only for an agent you trust: a message it reads could talk it into posting as you.',
  forLabel: 'For', forAlways: 'until I change it', for1h: '1 hour', for1d: '1 day', for1w: '1 week',
  save: 'Save',
  notConfirmed: 'Not confirmed in the dialog. Choose again.',
  needsTerminal: 'This computer can only confirm that in a terminal. Run telegram write-access on there. Until then the agent asks before each write.',
  modeDone: 'Saved: {mode}. You can close this tab and go back to your agent.',
  doneMode: 'Logged in as {user}. Write mode: {mode}. You can close this tab and go back to your agent.',
};

type Strings = typeof en;

const es: Strings = {
  title: 'Inicia sesión en Telegram para Better-TG-CLI',
  lead: 'Tu agente abrió esta página. Lo que introduces aquí se queda en este equipo: el agente nunca ve la clave de acceso, el código QR ni tu contraseña.',
  inviteH: 'Paso 1. Clave de acceso',
  getInvite: 'Obtener una clave de acceso',
  getInviteNote: 'Se abrirá better-tg-cli.com: confirma tu correo con el código que te enviamos y la clave de acceso volverá aquí sola.',
  haveInvite: 'Ya tengo una clave de acceso',
  paste: 'Pega tu clave de acceso',
  use: 'Continuar',
  ownKeys: 'Usar mis propias claves de my.telegram.org',
  apiId: 'api_id', apiHash: 'api_hash',
  connecting: 'Conectando con Telegram…',
  scanH: 'Paso 2. Escanea el código QR',
  scanNote: 'En tu teléfono: Telegram → Ajustes → Dispositivos → Vincular dispositivo de escritorio. El código se actualiza solo.',
  passwordH: 'Paso 3. Contraseña de la verificación en dos pasos',
  passwordNote: 'La tienes si activaste una contraseña en la nube en Telegram. Pista:',
  send: 'Iniciar sesión',
  wrong: 'Contraseña incorrecta, inténtalo de nuevo.',
  doneH: '¡Listo!',
  doneNote: 'Has iniciado sesión como {user}. Puedes cerrar esta pestaña y volver a tu agente.',
  errorH: 'No se pudo iniciar sesión',
  retry: 'Intentar de nuevo',
  gone: 'Esta página ya no responde. Vuelve a ejecutar telegram onboard.',
  failed: 'Algo salió mal',
  modeTitle: '¿Qué puede hacer tu agente en Telegram?',
  modeH: 'Último paso. ¿Qué puede hacer el agente?',
  modeNote: 'Puedes cambiarlo más tarde con telegram write-access.',
  roName: 'Solo lectura', roNote: 'Solo lee y busca.',
  askName: 'Preguntarme cada vez (recomendado)', askNote: 'Antes de cada mensaje o acción, el agente te lo muestra en el chat y solo lo envía tras tu sí. Depende de que el agente siga sus instrucciones.',
  onName: 'Escribir libremente', onNote: 'Envía, edita y borra sin preguntar. Solo para un agente de confianza: un mensaje que lea podría convencerlo de publicar en tu nombre.',
  forLabel: 'Durante', forAlways: 'hasta que lo cambie', for1h: '1 hora', for1d: '1 día', for1w: '1 semana',
  save: 'Guardar',
  notConfirmed: 'No se confirmó en el diálogo. Elige de nuevo.',
  needsTerminal: 'Este equipo solo puede confirmarlo en una terminal. Ejecuta allí telegram write-access on. Hasta entonces el agente pregunta antes de cada escritura.',
  modeDone: 'Guardado: {mode}. Puedes cerrar esta pestaña y volver a tu agente.',
  doneMode: 'Has iniciado sesión como {user}. Modo de escritura: {mode}. Puedes cerrar esta pestaña y volver a tu agente.',
};

const ru: Strings = {
  title: 'Вход в Telegram для Better-TG-CLI',
  lead: 'Эту страницу открыл ваш агент. Всё, что здесь вводите, остаётся на этом компьютере: агент не видит ни ключ входа, ни QR, ни пароль.',
  inviteH: 'Шаг 1. Ключ входа',
  getInvite: 'Получить ключ входа',
  getInviteNote: 'Откроется better-tg-cli.com: подтвердите почту кодом из письма, и ключ входа сам вернётся сюда.',
  haveInvite: 'У меня уже есть ключ входа',
  paste: 'Вставьте ключ входа',
  use: 'Продолжить',
  ownKeys: 'Войти со своими ключами с my.telegram.org',
  apiId: 'api_id', apiHash: 'api_hash',
  connecting: 'Подключаемся к Telegram…',
  scanH: 'Шаг 2. Отсканируйте QR',
  scanNote: 'На телефоне: Telegram → Настройки → Устройства → Подключить устройство. Код обновляется сам.',
  passwordH: 'Шаг 3. Пароль двухэтапной проверки',
  passwordNote: 'Он есть, если вы включали «Облачный пароль» в Telegram. Подсказка:',
  send: 'Войти',
  wrong: 'Пароль не подошёл, попробуйте ещё раз.',
  doneH: 'Готово!',
  doneNote: 'Вы вошли как {user}. Эту вкладку можно закрыть и вернуться к агенту.',
  errorH: 'Не получилось войти',
  retry: 'Попробовать ещё раз',
  gone: 'Страница больше не отвечает. Запустите telegram onboard ещё раз.',
  failed: 'Что-то пошло не так',
  modeTitle: 'Что агенту можно делать в Telegram?',
  modeH: 'Последний шаг. Что можно агенту?',
  modeNote: 'Это можно поменять потом командой telegram write-access.',
  roName: 'Только чтение', roNote: 'Только читает и ищет.',
  askName: 'Спрашивать каждый раз (рекомендуем)', askNote: 'Перед каждым сообщением или действием агент показывает его вам в чате и отправляет только после вашего «да». Держится на том, что агент слушается инструкций.',
  onName: 'Писать без вопросов', onNote: 'Отправляет, правит и удаляет, не спрашивая. Только для агента, которому вы доверяете: прочитанное сообщение может уговорить его написать от вашего имени.',
  forLabel: 'На', forAlways: 'пока не поменяю', for1h: '1 час', for1d: '1 день', for1w: '1 неделю',
  save: 'Сохранить',
  notConfirmed: 'В диалоге не подтвердили. Выберите ещё раз.',
  needsTerminal: 'На этом компьютере это подтверждается только в терминале. Запустите там telegram write-access on. До тех пор агент спрашивает перед каждой записью.',
  modeDone: 'Сохранено: {mode}. Эту вкладку можно закрыть и вернуться к агенту.',
  doneMode: 'Вы вошли как {user}. Режим записи: {mode}. Эту вкладку можно закрыть и вернуться к агенту.',
};

const STRINGS = { en, es, ru };

export function onboardPage(options: { site: string; returnTo: string }): { html: string; csp: string } {
  const nonce = randomBytes(16).toString('base64');
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  const inviteUrl = `${options.site}/?return=${encodeURIComponent(options.returnTo)}`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Better-TG-CLI</title>
<style nonce="${nonce}">
:root{--bg:#fff;--fg:#0a0a0a;--dim:#6b6f73;--line:#e4e5e7;--panel:#fafafa;--accent:#1c93d1;--err:#c62828;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#000;--fg:#f2f2f2;--dim:#8d9297;--line:#26282a;--panel:#0b0b0b;--accent:#2AABEE;--err:#ff6b6b;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,sans-serif}
main{max-width:560px;margin:0 auto;padding:48px 16px 64px}
.brand{font:500 14px/1 ui-monospace,monospace;letter-spacing:1px;margin-bottom:32px}.brand i{font-style:normal;color:var(--accent)}
h1{font-size:28px;line-height:1.15;letter-spacing:-.5px;margin:0 0 10px}
h2{font-size:19px;margin:0 0 10px}
p{margin:0 0 14px;color:var(--dim)}
section{margin-top:28px}
.btn,button{display:inline-block;font:inherit;font-weight:500;cursor:pointer;border:0;border-radius:10px;padding:11px 18px;background:var(--fg);color:var(--bg);text-decoration:none}
button.ghost{background:transparent;color:var(--accent);padding:0;font-weight:400}
button:disabled{opacity:.5}
input{width:100%;font:inherit;padding:11px 13px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);margin-bottom:10px}
details{margin-top:18px}summary{cursor:pointer;color:var(--accent)}
details>div{margin-top:12px}
.qr{display:inline-block;background:#fff;padding:10px;border-radius:14px;border:1px solid var(--line)}
.qr svg{display:block;width:260px;height:260px}
.err{color:var(--err)}
.mono{font-family:ui-monospace,monospace}
.opt{display:block;border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer;background:var(--panel)}
.opt:has(input:checked){border-color:var(--accent)}
.opt input{width:auto;margin:0 8px 0 0}.opt b{color:var(--fg)}.opt small{display:block;color:var(--dim);margin:4px 0 0 24px}
select{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--fg);margin:0 0 14px 6px}
[hidden]{display:none!important}
</style></head><body><main>
<div class="brand">BETTER-TG-CLI<i>.</i></div>
<h1 data-t="title"></h1>
<p data-t="lead"></p>

<section id="invite" hidden>
  <h2 data-t="inviteH"></h2>
  <a class="btn" id="get" href="${inviteUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" data-t="getInvite"></a>
  <p data-t="getInviteNote"></p>
  <details><summary data-t="haveInvite"></summary><div>
    <input id="tok" autocomplete="off" spellcheck="false" data-ph="paste">
    <button id="use" data-t="use"></button></div></details>
  <details><summary data-t="ownKeys"></summary><div>
    <input id="apiId" inputmode="numeric" autocomplete="off" data-ph="apiId">
    <input id="apiHash" autocomplete="off" spellcheck="false" data-ph="apiHash">
    <button id="keys" data-t="use"></button></div></details>
</section>

<section id="connecting" hidden><p data-t="connecting"></p></section>

<section id="scan" hidden>
  <h2 data-t="scanH"></h2><p data-t="scanNote"></p>
  <div class="qr" id="qr"></div>
</section>

<section id="password" hidden>
  <h2 data-t="passwordH"></h2>
  <p><span data-t="passwordNote"></span> <b id="hint"></b></p>
  <input id="pw" type="password" autocomplete="current-password">
  <button id="pwgo" data-t="send"></button>
</section>

<section id="mode" hidden>
  <h2 data-t="modeH"></h2><p data-t="modeNote"></p>
  <label class="opt"><input type="radio" name="mode" value="read-only"><b data-t="roName"></b><small data-t="roNote"></small></label>
  <label class="opt"><input type="radio" name="mode" value="ask" checked><b data-t="askName"></b><small data-t="askNote"></small></label>
  <label class="opt"><input type="radio" name="mode" value="on"><b data-t="onName"></b><small data-t="onNote"></small></label>
  <p id="forrow" hidden><span data-t="forLabel"></span><select id="for"><option value="" data-t="forAlways"></option><option value="1h" data-t="for1h"></option><option value="1d" data-t="for1d"></option><option value="1w" data-t="for1w"></option></select></p>
  <button id="modego" data-t="save"></button>
</section>

<section id="done" hidden><h2 data-t="doneH"></h2><p id="donetext"></p></section>
<section id="error" hidden><h2 data-t="errorH"></h2><p class="mono" id="errtext"></p><button id="retry" data-t="retry"></button></section>
<p class="err" id="msg" role="alert" hidden></p>
</main>
<script nonce="${nonce}">
const S = ${JSON.stringify(STRINGS)};
// First browser language we have, else English; the invite site gets the same one
const LANG = (navigator.languages || [navigator.language || '']).map(l => l.toLowerCase().split('-')[0]).find(l => l in S) || 'en';
const L = S[LANG];
document.documentElement.lang = LANG;
const getLink = document.getElementById('get');
getLink.href = getLink.getAttribute('href') + '&lang=' + LANG;
document.title = L.title;
for (const el of document.querySelectorAll('[data-t]')) el.textContent = L[el.dataset.t];
for (const el of document.querySelectorAll('[data-ph]')) el.placeholder = L[el.dataset.ph];
const $ = id => document.getElementById(id);
const base = location.pathname.replace(/cb$/, '');
const msg = t => { $('msg').textContent = t || ''; $('msg').hidden = !t; };

async function post(route, body) {
  const res = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'not_confirmed' ? L.notConfirmed : data.error === 'needs_terminal' ? L.needsTerminal : data.message || data.error || L.failed);
}
async function act(route, body, btn) {
  msg(''); if (btn) btn.disabled = true;
  try { await post(route, body); await poll(); } catch (e) { msg(e.message); } finally { if (btn) btn.disabled = false; }
}

// Back from better-tg-cli.com with #invite=…: take it, then drop it from the address bar
const m = /[#&]invite=([^&]+)/.exec(location.hash);
history.replaceState(null, '', base);
if (m) act('invite', { invite: decodeURIComponent(m[1]) });

$('use').onclick = () => act('invite', { invite: $('tok').value }, $('use'));
$('keys').onclick = () => act('invite', { apiId: $('apiId').value, apiHash: $('apiHash').value }, $('keys'));
$('pwgo').onclick = () => { const pw = $('pw').value; $('pw').value = ''; act('password', { password: pw }, $('pwgo')); };
$('pw').onkeydown = e => { if (e.key === 'Enter') $('pwgo').click(); };
$('retry').onclick = () => act('retry', {}, $('retry'));
const picked = () => document.querySelector('input[name=mode]:checked').value;
for (const r of document.querySelectorAll('input[name=mode]')) r.onchange = () => { $('forrow').hidden = picked() === 'read-only'; };
const MODE_NAMES = { 'read-only': 'roName', ask: 'askName', on: 'onName' };
$('modego').onclick = () => act('mode', { mode: picked(), for: picked() === 'read-only' ? '' : $('for').value }, $('modego'));

let last = '', timer, modeSeeded = false;
async function poll() {
  let s;
  try { s = await (await fetch(base + 'state', { cache: 'no-store' })).json(); }
  catch { msg(L.gone); clearInterval(timer); return; }
  for (const id of ['invite', 'connecting', 'scan', 'password', 'mode', 'done', 'error']) $(id).hidden = s.step !== id;
  if (s.step === 'mode' && !modeSeeded && s.mode) { const r = document.querySelector('input[name=mode][value="' + s.mode + '"]'); if (r) r.checked = true; $('forrow').hidden = s.mode === 'read-only'; modeSeeded = true; }
  if (s.modeOnly) { document.title = L.modeTitle; document.querySelector('h1').textContent = L.modeTitle; document.querySelector('h1 + p').hidden = true; }
  // qrSvg is rendered by this local CLI from the Telegram login token, not taken from any site
  if (s.step === 'scan' && s.qrSvg !== last) { $('qr').innerHTML = s.qrSvg; last = s.qrSvg; }
  if (s.step === 'password') { $('hint').textContent = s.hint || '—'; if (s.error === 'wrong_password') msg(L.wrong); }
  if (s.step === 'error') $('errtext').textContent = s.error || '';
  if (s.step === 'done') {
    const u = s.user || {};
    const who = (u.name || '') + (u.username ? ' (@' + u.username + ')' : '');
    const mode = s.mode ? L[MODE_NAMES[s.mode]] : '';
    $('donetext').textContent = s.modeOnly ? L.modeDone.replace('{mode}', mode)
      : s.mode ? L.doneMode.replace('{user}', who).replace('{mode}', mode) : L.doneNote.replace('{user}', who);
    clearInterval(timer);
  }
}
poll();
timer = setInterval(poll, 1000);
</script></body></html>`;
  return { html, csp };
}
