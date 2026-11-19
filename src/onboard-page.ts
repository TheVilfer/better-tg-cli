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
  doneH: 'Done!',
  doneNote: 'Logged in as {user}. You can close this tab and go back to your agent.',
  errorH: 'Could not log in',
  retry: 'Try again',
  modeTitle: 'What may your agent do in Telegram?',
  modeH: 'Last step. What may the agent do?',
  modeNote: 'You can change this later with telegram write-access ask, on or off.',
  roName: 'Read only', roNote: 'Reads and searches only.',
  askName: 'Ask me each time (recommended)', askNote: 'Before each message or action, the agent shows it to you in the chat and sends only after your yes. It relies on the agent following its instructions.',
  onName: 'Write freely', onNote: 'Sends, edits and deletes without asking. Only for an agent you trust: a message it reads could talk it into posting as you.',
  forLabel: 'For', forAlways: 'until I change it', for1h: '1 hour', for1d: '1 day', for1w: '1 week',
  save: 'Save',
  modeDone: 'Saved: {mode}. You can close this tab and go back to your agent.',
  doneMode: 'Logged in as {user}. Write mode: {mode}. You can close this tab and go back to your agent.',
  gone: 'This page can\'t reach Better-TG-CLI on this computer. Your agent may have stopped telegram onboard, or its time ran out. Ask the agent to run telegram onboard again (or run it yourself in a terminal) and open the new link. This page keeps trying meanwhile.',
  goneSaved: 'This page can\'t reach Better-TG-CLI on this computer. Your agent may have stopped telegram onboard, or its time ran out. Your login is saved. To see which write mode is in effect, run telegram write-access with nothing after it; to change it, telegram write-access ask, on or off (ask the agent, or run it yourself in a terminal). This page keeps trying meanwhile.',
  goneMode: 'This page can\'t reach Better-TG-CLI on this computer. Your agent may have stopped telegram write-access on, or its time ran out. To see which write mode is in effect, run telegram write-access with nothing after it. To change it, ask the agent to run telegram write-access on again and open the new link, or run telegram write-access ask, on or off yourself in a terminal. This page keeps trying meanwhile.',
  notSent: 'It\'s not clear whether that reached Better-TG-CLI. If the page doesn\'t move on by itself, try again.',
  notSentMode: 'It\'s not clear whether Better-TG-CLI got your choice, so the write mode may or may not have changed. If a confirmation window opened, answer it. To see which mode is in effect, run telegram write-access with nothing after it in a terminal, or choose again here.',
  failed: 'Something went wrong.',
  inEffect: 'Write mode in effect now: {mode}.',
  errors: {
    wrong_host: 'This page was opened under a different address. Open the exact link your agent gave you; it starts with http://127.0.0.1.',
    not_found: 'This page\'s link is no longer valid: the command that opened it has finished or was started again. Open the newest link your agent gave you.',
    wrong_origin: 'The request didn\'t come from this page. Reload the page and try again.',
    bad_request: 'Better-TG-CLI couldn\'t read what the page sent. Reload the page and try again.',
    internal: 'Something went wrong inside Better-TG-CLI. Try again; if it keeps happening, tell your agent what this page says.',
    already_started: 'A login has already started. Wait for the next step to appear on this page.',
    bad_keys: 'Check the keys: api_id is a number, api_hash is 32 characters from 0-9 and a-f.',
    invite_failed: 'This login key didn\'t work: it may be used up, expired or mistyped. Get a new one with the button above.',
    not_waiting_for_password: 'The password isn\'t expected right now. Wait for the page to update.',
    wrong_password: 'Wrong password, try again.',
    nothing_to_retry: 'There is nothing to retry right now. Wait for the page to update.',
    not_waiting_for_mode: 'The write mode can\'t be changed right now: it was saved already, the time to choose ran out, or a confirmation window is still open (answer it). Wait for the page to update.',
    bad_mode: 'Pick one of the options, then press Save.',
    not_confirmed: 'Not confirmed in the dialog. Choose again.',
    needs_terminal: 'This computer can only confirm that in a terminal. Run telegram write-access on there. Until then the agent asks before each write.',
    store_failed: 'Couldn\'t save the write mode: this computer\'s secret store refused it. Choose again, or run telegram write-access ask, on or off in a terminal.',
  },
};

type Strings = typeof en;
/** Every error code the local server (src/onboard.ts) can answer with */
export type ErrorCode = keyof Strings['errors'];

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
  doneH: '¡Listo!',
  doneNote: 'Has iniciado sesión como {user}. Puedes cerrar esta pestaña y volver a tu agente.',
  errorH: 'No se pudo iniciar sesión',
  retry: 'Intentar de nuevo',
  modeTitle: '¿Qué puede hacer tu agente en Telegram?',
  modeH: 'Último paso. ¿Qué puede hacer el agente?',
  modeNote: 'Puedes cambiarlo más tarde con telegram write-access ask, on u off.',
  roName: 'Solo lectura', roNote: 'Solo lee y busca.',
  askName: 'Preguntarme cada vez (recomendado)', askNote: 'Antes de cada mensaje o acción, el agente te lo muestra en el chat y solo lo envía tras tu sí. Depende de que el agente siga sus instrucciones.',
  onName: 'Escribir libremente', onNote: 'Envía, edita y borra sin preguntar. Solo para un agente de confianza: un mensaje que lea podría convencerlo de publicar en tu nombre.',
  forLabel: 'Durante', forAlways: 'hasta que lo cambie', for1h: '1 hora', for1d: '1 día', for1w: '1 semana',
  save: 'Guardar',
  modeDone: 'Guardado: {mode}. Puedes cerrar esta pestaña y volver a tu agente.',
  doneMode: 'Has iniciado sesión como {user}. Modo de escritura: {mode}. Puedes cerrar esta pestaña y volver a tu agente.',
  gone: 'Esta página no puede comunicarse con Better-TG-CLI en este equipo. Puede que tu agente haya detenido telegram onboard o que se le acabara el tiempo. Pide al agente que vuelva a ejecutar telegram onboard (o ejecútalo tú en una terminal) y abre el enlace nuevo. Mientras tanto, esta página sigue intentándolo.',
  goneSaved: 'Esta página no puede comunicarse con Better-TG-CLI en este equipo. Puede que tu agente haya detenido telegram onboard o que se le acabara el tiempo. Tu sesión ya está guardada. Para ver qué modo de escritura está vigente, ejecuta telegram write-access sin nada más; para cambiarlo, telegram write-access ask, on u off (pídeselo al agente o ejecútalo tú en una terminal). Mientras tanto, esta página sigue intentándolo.',
  goneMode: 'Esta página no puede comunicarse con Better-TG-CLI en este equipo. Puede que tu agente haya detenido telegram write-access on o que se le acabara el tiempo. Para ver qué modo de escritura está vigente, ejecuta telegram write-access sin nada más. Para cambiarlo, pide al agente que vuelva a ejecutar telegram write-access on y abre el enlace nuevo, o ejecuta tú telegram write-access ask, on u off en una terminal. Mientras tanto, esta página sigue intentándolo.',
  notSent: 'No está claro si esto llegó a Better-TG-CLI. Si la página no avanza sola, inténtalo de nuevo.',
  notSentMode: 'No está claro si Better-TG-CLI recibió tu elección, así que el modo de escritura puede haber cambiado o no. Si se abrió una ventana de confirmación, respóndela. Para ver qué modo está vigente, ejecuta telegram write-access sin nada más en una terminal, o vuelve a elegir aquí.',
  failed: 'Algo salió mal.',
  inEffect: 'Modo de escritura vigente: {mode}.',
  errors: {
    wrong_host: 'Esta página se abrió con otra dirección. Abre el enlace exacto que te dio tu agente; empieza por http://127.0.0.1.',
    not_found: 'El enlace de esta página ya no es válido: el comando que la abrió terminó o se volvió a iniciar. Abre el enlace más reciente que te dio tu agente.',
    wrong_origin: 'La solicitud no vino de esta página. Recarga la página e inténtalo de nuevo.',
    bad_request: 'Better-TG-CLI no pudo leer lo que envió la página. Recarga la página e inténtalo de nuevo.',
    internal: 'Algo falló dentro de Better-TG-CLI. Inténtalo de nuevo; si se repite, cuéntale a tu agente lo que dice esta página.',
    already_started: 'Ya se inició un inicio de sesión. Espera a que aparezca el siguiente paso en esta página.',
    bad_keys: 'Revisa las claves: api_id es un número y api_hash tiene 32 caracteres de 0-9 y a-f.',
    invite_failed: 'Esta clave de acceso no funcionó: puede que ya se haya usado, que haya caducado o que tenga un error. Obtén una nueva con el botón de arriba.',
    not_waiting_for_password: 'Ahora no se espera la contraseña. Espera a que la página se actualice.',
    wrong_password: 'Contraseña incorrecta, inténtalo de nuevo.',
    nothing_to_retry: 'Ahora no hay nada que reintentar. Espera a que la página se actualice.',
    not_waiting_for_mode: 'Ahora no se puede cambiar el modo de escritura: ya se guardó, se acabó el tiempo para elegir o sigue abierta una ventana de confirmación (respóndela). Espera a que la página se actualice.',
    bad_mode: 'Elige una de las opciones y pulsa Guardar.',
    not_confirmed: 'No se confirmó en el diálogo. Elige de nuevo.',
    needs_terminal: 'Este equipo solo puede confirmarlo en una terminal. Ejecuta allí telegram write-access on. Hasta entonces el agente pregunta antes de cada escritura.',
    store_failed: 'No se pudo guardar el modo de escritura: el almacén de secretos de este equipo lo rechazó. Elige de nuevo o ejecuta telegram write-access ask, on u off en una terminal.',
  },
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
  doneH: 'Готово!',
  doneNote: 'Вы вошли как {user}. Эту вкладку можно закрыть и вернуться к агенту.',
  errorH: 'Не получилось войти',
  retry: 'Попробовать ещё раз',
  modeTitle: 'Что агенту можно делать в Telegram?',
  modeH: 'Последний шаг. Что можно агенту?',
  modeNote: 'Это можно поменять потом командой telegram write-access ask, on или off.',
  roName: 'Только чтение', roNote: 'Только читает и ищет.',
  askName: 'Спрашивать каждый раз (рекомендуем)', askNote: 'Перед каждым сообщением или действием агент показывает его вам в чате и отправляет только после вашего «да». Держится на том, что агент слушается инструкций.',
  onName: 'Писать без вопросов', onNote: 'Отправляет, правит и удаляет, не спрашивая. Только для агента, которому вы доверяете: прочитанное сообщение может уговорить его написать от вашего имени.',
  forLabel: 'На', forAlways: 'пока не поменяю', for1h: '1 час', for1d: '1 день', for1w: '1 неделю',
  save: 'Сохранить',
  modeDone: 'Сохранено: {mode}. Эту вкладку можно закрыть и вернуться к агенту.',
  doneMode: 'Вы вошли как {user}. Режим записи: {mode}. Эту вкладку можно закрыть и вернуться к агенту.',
  gone: 'Страница не может связаться с Better-TG-CLI на этом компьютере. Возможно, агент остановил telegram onboard или у команды вышло время. Попросите агента запустить telegram onboard ещё раз (или запустите сами в терминале) и откройте новую ссылку. Пока что страница продолжает пробовать.',
  goneSaved: 'Страница не может связаться с Better-TG-CLI на этом компьютере. Возможно, агент остановил telegram onboard или у команды вышло время. Вход уже сохранён. Какой режим записи действует сейчас, покажет telegram write-access без аргументов, а поменять его можно командой telegram write-access ask, on или off (попросите агента или выполните сами в терминале). Пока что страница продолжает пробовать.',
  goneMode: 'Страница не может связаться с Better-TG-CLI на этом компьютере. Возможно, агент остановил telegram write-access on или у команды вышло время. Какой режим записи действует сейчас, покажет telegram write-access без аргументов. Чтобы его поменять, попросите агента ещё раз выполнить telegram write-access on и откройте новую ссылку либо выполните сами в терминале telegram write-access ask, on или off. Пока что страница продолжает пробовать.',
  notSent: 'Непонятно, дошло ли это до Better-TG-CLI. Если страница сама не перейдёт дальше, попробуйте ещё раз.',
  notSentMode: 'Непонятно, получил ли Better-TG-CLI ваш выбор, поэтому режим записи мог поменяться, а мог и нет. Если открылось окно подтверждения, ответьте в нём. Какой режим действует сейчас, покажет telegram write-access без аргументов в терминале; можно и выбрать ещё раз здесь.',
  failed: 'Что-то пошло не так.',
  inEffect: 'Сейчас действует режим записи: {mode}.',
  errors: {
    wrong_host: 'Страница открыта по другому адресу. Откройте ровно ту ссылку, которую дал агент: она начинается с http://127.0.0.1.',
    not_found: 'Ссылка этой страницы больше не действует: команда, которая её открыла, завершилась или запущена заново. Откройте самую свежую ссылку от агента.',
    wrong_origin: 'Запрос пришёл не с этой страницы. Обновите страницу и попробуйте ещё раз.',
    bad_request: 'Better-TG-CLI не смог прочитать, что отправила страница. Обновите страницу и попробуйте ещё раз.',
    internal: 'Внутри Better-TG-CLI что-то сломалось. Попробуйте ещё раз; если повторится, расскажите агенту, что написано на этой странице.',
    already_started: 'Вход уже начат. Дождитесь, пока на странице появится следующий шаг.',
    bad_keys: 'Проверьте ключи: api_id — число, api_hash — 32 символа из 0-9 и a-f.',
    invite_failed: 'Ключ входа не подошёл: возможно, он уже использован, истёк или скопирован с ошибкой. Получите новый кнопкой выше.',
    not_waiting_for_password: 'Пароль сейчас не нужен. Дождитесь, пока страница обновится.',
    wrong_password: 'Пароль не подошёл, попробуйте ещё раз.',
    nothing_to_retry: 'Сейчас нечего повторять. Дождитесь, пока страница обновится.',
    not_waiting_for_mode: 'Режим записи сейчас не поменять: он уже сохранён, время на выбор вышло или ещё открыто окно подтверждения (ответьте в нём). Дождитесь, пока страница обновится.',
    bad_mode: 'Выберите один из вариантов и нажмите «Сохранить».',
    not_confirmed: 'В диалоге не подтвердили. Выберите ещё раз.',
    needs_terminal: 'На этом компьютере это подтверждается только в терминале. Запустите там telegram write-access on. До тех пор агент спрашивает перед каждой записью.',
    store_failed: 'Не удалось сохранить режим записи: хранилище секретов этого компьютера его не приняло. Выберите ещё раз или выполните в терминале telegram write-access ask, on или off.',
  },
};

export const STRINGS = { en, es, ru };

/** `modeOnly`: the page of `write-access` alone, known before the first /state answer (which may not come). */
export function onboardPage(options: { site: string; returnTo: string; modeOnly?: boolean }): { html: string; csp: string } {
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
#msg small{display:block;margin-top:4px;color:var(--dim);font:12px/1.4 ui-monospace,monospace}
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
const modeTitle = () => { document.title = L.modeTitle; document.querySelector('h1').textContent = L.modeTitle; document.querySelector('h1 + p').hidden = true; };
const $ = id => document.getElementById(id);
const base = location.pathname.replace(/cb$/, '');
// The last step the server reported; the page starts on the login key, or on the mode for write-access alone
let modeOnly = ${options.modeOnly ? 'true' : 'false'}, step = modeOnly ? 'mode' : 'invite';
// Its own heading from the start, even if the first /state answer never comes
if (modeOnly) modeTitle();
// What the line under the form is about, so a newer state can drop it once it no longer holds:
// 'net' a dropped connection (sent: during a click), 'act' the answer to a click on that step,
// 'state' an error the state itself carries
let shown = null;
// A line of text, and the code or server detail under it in small print
const msg = (t, small, kind, sent) => {
  const el = $('msg');
  el.textContent = t || '';
  if (t && small) { const c = document.createElement('small'); c.textContent = small; el.appendChild(c); }
  el.hidden = !t;
  shown = t ? { kind: kind || 'act', step, sent: !!sent } : null;
};
const MODE_NAMES = { 'read-only': 'roName', ask: 'askName', on: 'onName' };
// 'offline' is a dropped connection: what to do depends on how far it got (logged in or not, or
// write-access alone). Anything else is a code from the server, known or not.
function explain(code, detail, mode) {
  if (code === 'offline') return [modeOnly ? L.goneMode : step === 'mode' ? L.goneSaved : L.gone];
  if (!code || !Object.hasOwn(L.errors, code)) return [L.failed, [code, detail].filter(Boolean).join(': ')];
  let text = L.errors[code];
  if (code === 'store_failed' && mode && MODE_NAMES[mode]) text += ' ' + L.inEffect.replace('{mode}', L[MODE_NAMES[mode]]);
  return [text, detail];
}
const fail = (code, detail, mode, kind, sent) => {
  const [t, small] = explain(code, detail, mode);
  msg(t, small, code === 'offline' ? 'net' : kind, sent);
};

async function post(route, body) {
  let res;
  try { res = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw { code: 'offline' }; }
  if (res.ok) return;
  // The server said no; a body cut short leaves only the status
  let data = {};
  try { data = JSON.parse(await res.text()); } catch { /* the status is all there is */ }
  throw { code: data.error || 'HTTP ' + res.status, detail: data.message };
}
async function act(route, body, btn) {
  msg(''); if (btn) btn.disabled = true;
  // Once done, a late answer to a click (or its loss) changes nothing: the server has moved on
  try { await post(route, body); } catch (e) { if (step !== 'done') fail(e.code, e.detail, undefined, 'act', true); } finally { if (btn) btn.disabled = false; }
  // The state may hold more (the mode in effect after a store failure), and the next step
  await poll();
}

// Back from better-tg-cli.com with #invite=…: take it, then drop it from the address bar
const m = /[#&]invite=([^&]+)/.exec(location.hash);
history.replaceState(null, '', base);
if (m) act('invite', { invite: decodeURIComponent(m[1]) });

$('use').onclick = () => act('invite', { invite: $('tok').value }, $('use'));
$('keys').onclick = () => act('invite', { apiId: $('apiId').value, apiHash: $('apiHash').value }, $('keys'));
$('pwgo').onclick = () => { const pw = $('pw').value; $('pw').value = ''; return act('password', { password: pw }, $('pwgo')); };
$('pw').onkeydown = e => { if (e.key === 'Enter') $('pwgo').click(); };
$('retry').onclick = () => act('retry', {}, $('retry'));
const picked = () => document.querySelector('input[name=mode]:checked').value;
for (const r of document.querySelectorAll('input[name=mode]')) r.onchange = () => { $('forrow').hidden = picked() === 'read-only'; };
$('modego').onclick = () => act('mode', { mode: picked(), for: picked() === 'read-only' ? '' : $('for').value }, $('modego'));

let last = '', timer, modeSeeded = false;
async function poll() {
  if (!timer) return;
  let res, text, s = null;
  // No answer at all, or one cut off midway: the command may have been stopped, or the connection
  // dropped for a moment. Say what to do and keep trying, so the page comes back by itself if the server does.
  // A click lost on the way stays lost while the server is still away (act() polls right after it)
  const away = () => fail('offline', '', undefined, 'net', !!(shown && shown.kind === 'net' && shown.sent));
  try { res = await fetch(base + 'state', { cache: 'no-store' }); } catch { if (step !== 'done') away(); return; }
  // A body cut short: for a 200 the state may follow on the next try; an error status is the answer already
  try { text = await res.text(); } catch { if (res.ok) { if (step !== 'done') away(); return; } }
  // A poll sent before "done" and answered after it says nothing new
  if (step === 'done') return;
  try { s = JSON.parse(text); } catch { /* a whole answer that is not JSON, or none: not the state */ }
  // An answer, but not the state: the server is there and says no (an old link, a wrong address)
  if (!res.ok || !s || typeof s.step !== 'string') {
    fail(s && s.error || (res.status === 404 ? 'not_found' : 'HTTP ' + res.status));
    clearInterval(timer); timer = undefined; return;
  }
  modeOnly = !!s.modeOnly;
  // Drop a line this state no longer backs: a drop (the server answers again; a click lost on the
  // way is said so), the answer to a click on a step left behind, or a state error that is gone
  if (shown) {
    // Lost on the way or only its answer lost: the server may have taken it (a mode it saved, or a
    // dialog it shows now), so the page cannot say it did not arrive
    if (shown.kind === 'net') msg(shown.sent && s.step === shown.step ? (s.step === 'mode' ? L.notSentMode : L.notSent) : '');
    else if (s.step === 'done' || s.step !== shown.step || (shown.kind === 'state' && !s.error)) msg('');
  }
  step = s.step;
  for (const id of ['invite', 'connecting', 'scan', 'password', 'mode', 'done', 'error']) $(id).hidden = s.step !== id;
  if (s.step === 'mode' && !modeSeeded && s.mode) { const r = document.querySelector('input[name=mode][value="' + s.mode + '"]'); if (r) r.checked = true; $('forrow').hidden = s.mode === 'read-only'; modeSeeded = true; }
  if (s.modeOnly) modeTitle();
  // qrSvg is rendered by this local CLI from the Telegram login token, not taken from any site
  if (s.step === 'scan' && s.qrSvg !== last) { $('qr').innerHTML = s.qrSvg; last = s.qrSvg; }
  if (s.step === 'password') { $('hint').textContent = s.hint || '—'; if (s.error) fail(s.error, '', undefined, 'state'); }
  // A mode that was not saved (also the default one right after the login) stays on this step
  if (s.step === 'mode' && s.error) fail(s.error, '', s.mode, 'state');
  if (s.step === 'error') $('errtext').textContent = s.error || '';
  if (s.step === 'done') {
    const u = s.user || {};
    const who = (u.name || '') + (u.username ? ' (@' + u.username + ')' : '');
    const mode = s.mode ? L[MODE_NAMES[s.mode]] : '';
    $('donetext').textContent = s.modeOnly ? L.modeDone.replace('{mode}', mode)
      : s.mode ? L.doneMode.replace('{user}', who).replace('{mode}', mode) : L.doneNote.replace('{user}', who);
    clearInterval(timer); timer = undefined;
  }
}
timer = setInterval(poll, 1000);
poll();
</script></body></html>`;
  return { html, csp };
}
