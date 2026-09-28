/**
 * Install guide on the signup page: common steps (CLI, login), then one tab per agent (Claude Code, Codex, Cursor, Claude Desktop) with
 * its own steps and a drawn "screenshot" of what the person will see. The screens are HTML mockups,
 * not captures: crisp on any display, no personal data, nothing extra to host.
 */

export const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const CURSOR_INSTALL = 'https://cursor.com/en/install-mcp?name=telegram&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImJldHRlci10Zy1jbGlAbGF0ZXN0IiwibWNwIl19';
const MCPB = 'https://github.com/TheVilfer/better-tg-cli/releases/latest/download/better-tg-cli.mcpb';

/** A copyable command or text block. */
export const code = (text: string, wrap = false) =>
  `<div class="box"><pre${wrap ? ' class="wrap"' : ''}>${escape(text)}</pre><button type="button" data-copy>Копировать</button></div>`;

// ---- drawn screens -----------------------------------------------------------------------------

const d = (t: string) => `<span class="s-dim">${t}</span>`;
const a = (t: string) => `<span class="s-acc">${t}</span>`;
const g = (t: string) => `<span class="s-ok">${t}</span>`;
const b = (t: string) => `<b>${t}</b>`;

function terminal(title: string, lines: string[]): string {
  return `<figure class="screen term" aria-hidden="true"><div class="s-bar"><i></i><i></i><i></i><span>${title}</span></div>
<div class="s-body">${lines.join('<br>')}</div></figure>`;
}

const SCREENS: Record<string, string> = {
  'claude-code': terminal('claude', [
    `${d('&gt;')} /plugin install better-tg-cli@better-tg-cli`,
    `  ${d('⎿')} ${g('✓ Installed better-tg-cli')} ${d('(skill + MCP server)')}`,
    '',
    `${d('&gt;')} что у меня непрочитанного в телеге?`,
    '',
    `${a('⏺')} ${b('telegram_read')}${d('(inbox -n 5)')}`,
    `  ${d('⎿')} ${d('12 unread in 4 chats')}`,
    `${a('⏺')} Больше всего в «Rust Seattle» (41). Алиса`,
    `  спрашивает, в силе ли встреча в 7.`,
  ]),
  codex: terminal('codex', [
    `${d('&gt;_')} ${b('OpenAI Codex')}`,
    '',
    `${d('›')} что пишет Алиса?`,
    '',
    `${d('•')} ${b('Ran')} ${a('telegram read @alice -n 5')}`,
    `  ${d('└')} ${d('5 messages')}`,
    '',
    `${d('•')} Алиса спрашивает, в силе ли встреча в 7,`,
    `  и просит взять ноутбук.`,
  ]),
  cursor: `<figure class="screen app" aria-hidden="true"><div class="s-bar"><i></i><i></i><i></i><span>Cursor</span></div>
<div class="s-dialog"><div class="s-title">Install MCP Server?</div>
<div class="s-row"><span class="s-dim">Name</span><span>telegram</span></div>
<div class="s-row"><span class="s-dim">Command</span><span class="s-mono">npx -y better-tg-cli@latest mcp</span></div>
<div class="s-actions"><span class="s-btn ghost">Cancel</span><span class="s-btn">Install</span></div></div></figure>`,
  'claude-desktop': `<figure class="screen app" aria-hidden="true"><div class="s-bar"><i></i><i></i><i></i><span>Claude</span></div>
<div class="s-dialog"><div class="s-ext"><div class="s-logo"><svg viewBox="0 0 12 12" shape-rendering="crispEdges"><rect x="2" y="2" width="2" height="8" fill="#fff"/><rect x="4" y="5" width="2" height="2" fill="#fff"/><rect x="6" y="8" width="4" height="2" fill="#0b0b0b"/></svg></div><div><div class="s-title">Telegram (better-tg-cli)</div>
<div class="s-dim">Sergei Polin · MCP server</div></div></div>
<div class="s-row"><span class="s-dim">Tools</span><span class="s-mono">telegram_help, telegram_read, telegram_write</span></div>
<div class="s-row"><span class="s-dim">Profile</span><span class="s-mono">default</span></div>
<div class="s-actions"><span class="s-btn ghost">Cancel</span><span class="s-btn">Install</span></div></div></figure>`,
};

// ---- tabs --------------------------------------------------------------------------------------

interface Tab { id: string; label: string; steps: string }

const step = (title: string, body: string) => `<li><h4>${title}</h4>${body}</li>`;

const TABS: Tab[] = [
  {
    id: 'claude-code', label: 'Claude Code',
    steps: step('Поставьте плагин', `<p>В Claude Code наберите по очереди. Плагин — это скилл и MCP-сервер сразу.</p>${code('/plugin marketplace add TheVilfer/better-tg-cli')}${code('/plugin install better-tg-cli@better-tg-cli')}`)
      + step('Перезапустите Claude Code', '<p>И попросите, например: «что у меня непрочитанного в телеге?»</p>'),
  },
  {
    id: 'codex', label: 'Codex',
    steps: step('Поставьте скилл', `<p>В обычном терминале:</p>${code('npx skills add TheVilfer/better-tg-cli -g -a codex -y')}`)
      + step('Откройте Codex заново', '<p>Скилл подхватится сам. Спросите: «что пишет Алиса?»</p>'),
  },
  {
    id: 'cursor', label: 'Cursor',
    steps: step('Поставьте MCP-сервер', `<p><a class="btn" href="${CURSOR_INSTALL}">Установить в Cursor</a></p><p>Cursor спросит подтверждение — нажмите Install.</p>`)
      + step('Добавьте скилл (по желанию)', `<p>Он учит агента аккуратной работе с Telegram:</p>${code('npx skills add TheVilfer/better-tg-cli -g -a cursor -y')}`),
  },
  {
    id: 'claude-desktop', label: 'Claude Desktop',
    steps: step('Скачайте расширение', `<p><a class="btn" href="${MCPB}">Скачать better-tg-cli.mcpb</a></p><p>Откройте файл двойным кликом — Claude покажет карточку, нажмите Install. Node и brew для расширения не нужны.</p>`)
      + step('Спросите в чате', '<p>Например: «сделай сводку непрочитанного в Telegram».</p>'),
  },
];

/** Auto mode: one prompt that has the agent do the setup; the person only logs in. */
export const AUTO_PROMPT = [
  'Подключи мне Telegram через better-tg-cli (https://github.com/TheVilfer/better-tg-cli):',
  '1. Установи CLI: `brew install thevilfer/tap/better-tg-cli`. Если Homebrew нет — `npm install -g better-tg-cli` (нужен Node 20+).',
  '2. Установи скилл для себя: `npx skills add TheVilfer/better-tg-cli -g -y`.',
  '3. Не входи в Telegram сам: вход интерактивный. Попроси меня выполнить в терминале `telegram auth --invite --qr` и подожди, пока я скажу «готово».',
  '4. Проверь вход командой `telegram whoami` и коротко расскажи, что ты теперь умеешь в Telegram.',
].join('\n');

const AUTO_SCREEN = terminal('агент', [
  `${d('&gt;')} Подключи мне Telegram через better-tg-cli…`,
  '',
  `${a('⏺')} ${b('Bash')}${d('(brew install thevilfer/tap/better-tg-cli)')}`,
  `  ${d('⎿')} ${g('✓')} ${d('better-tg-cli installed')}`,
  `${a('⏺')} ${b('Bash')}${d('(npx skills add TheVilfer/better-tg-cli -g -y)')}`,
  `  ${d('⎿')} ${g('✓')} ${d('Installed better-tg-cli')}`,
  `${a('⏺')} Всё готово. Теперь войдите сами — в терминале:`,
  `  ${a('telegram auth --invite --qr')}`,
  `  Вставьте инвайт, отсканируйте QR и напишите «готово».`,
]);

function tablist(label: string, items: { id: string; label: string; body: string }[], cls: string): string {
  const tabs = items.map((t, i) =>
    `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t.label}</button>`).join('');
  const panels = items.map((t, i) =>
    `<div role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}"${i === 0 ? '' : ' hidden'}>${t.body}</div>`).join('');
  return `<div class="${cls}" role="tablist" aria-label="${label}">${tabs}</div>${panels}`;
}

const LOGIN_NOTE = '<p class="note">Вставьте инвайт с этой страницы и отсканируйте QR в Telegram: Настройки → Устройства → Подключить устройство. Со своими ключами с my.telegram.org — <span class="mono">telegram auth --qr</span>.</p>';

function autoHtml(): string {
  return `<ol class="steps">
<li><h3>Вставьте промпт своему агенту</h3>
  <p>Claude Code, Codex, Cursor или любой другой агент с терминалом. Он сам поставит CLI и скилл.</p>${code(AUTO_PROMPT, true)}
  ${AUTO_SCREEN}</li>
<li><h3>Войдите, когда агент попросит</h3>
  <p>Вход делаете вы, а не агент. В терминале:</p>${code('telegram auth --invite --qr')}${LOGIN_NOTE}</li>
<li><h3>Готово</h3>
  <p>Скажите агенту «готово» и спросите, например: «что у меня непрочитанного в телеге?» Писать от вашего имени он сможет, только когда вы разрешите: <span class="mono">telegram write-access on --for 1h</span>.</p>
  <p class="note">Claude Desktop без терминала так не умеет — для него режим PRO.</p></li>
</ol>`;
}

function proHtml(): string {
  const agents = tablist('Агент', TABS.map(t => ({ id: t.id, label: t.label, body: `<ol class="sub">${t.steps}</ol>${SCREENS[t.id]}` })), 'tabs');
  return `<ol class="steps">
<li><h3>Поставьте CLI</h3>
  <p>macOS или Linux, в терминале:</p>${code('brew install thevilfer/tap/better-tg-cli')}
  <p class="note">Нет Homebrew — <span class="mono">npm install -g better-tg-cli</span> (Node 20+).</p></li>
<li><h3>Войдите в Telegram сами</h3>
  <p>Вход интерактивный, поэтому его делаете вы, а не агент:</p>${code('telegram auth --invite --qr')}${LOGIN_NOTE}</li>
<li><h3>Подключите своего агента</h3>${agents}</li>
<li><h3>Готово</h3>
  <p>По умолчанию агент только читает. Писать от вашего имени он сможет, когда вы разрешите:</p>${code('telegram write-access on --for 1h')}</li>
</ol>`;
}

export function guideHtml(): string {
  const modes = tablist('Режим', [
    { id: 'auto', label: 'Auto <small>промпт для агента</small>', body: autoHtml() },
    { id: 'pro', label: 'PRO <small>команды вручную</small>', body: proHtml() },
  ], 'modes');
  return `<section class="guide" id="guide">
<h2>Как установить</h2>
${modes}
</section>`;
}

export const GUIDE_CSS = `
.guide{margin-top:64px;padding-top:40px;border-top:1px solid var(--line)}
.guide h2{font-size:26px;letter-spacing:-.5px;margin:0 0 24px}
.steps{list-style:none;counter-reset:s;padding:0;margin:0}
.steps>li{counter-increment:s;position:relative;padding-left:44px;margin-bottom:36px}
.steps>li::before{content:counter(s);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center;font-size:14px;font-weight:500;color:var(--dim)}
.steps h3{font-size:18px;margin:2px 0 8px}
.steps p{margin:0 0 10px;color:var(--dim)}
.steps .box{margin-bottom:10px}
.note{font-size:14px}
.modes{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--panel);margin:0 0 28px}
.modes button{font-size:15px;font-weight:600;padding:10px 8px;border-radius:9px;border:0;background:transparent;color:var(--dim);display:flex;flex-direction:column;align-items:center;gap:1px}
.modes button small{font-size:12px;font-weight:400;opacity:.8}
.modes button[aria-selected="true"]{background:var(--bg);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.steps .screen{margin-top:14px}
.tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:14px 0 18px;padding-bottom:2px}
.tabs::-webkit-scrollbar{display:none}
.tabs button{flex:none;font-size:14px;font-weight:500;padding:8px 13px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--dim)}
.tabs button[aria-selected="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.sub{padding-left:20px;margin:0 0 16px}
.sub li{margin-bottom:14px;color:var(--dim)}
.sub h4{font-size:15px;color:var(--fg);margin:0 0 6px;font-weight:600}
.btn{display:inline-block;text-decoration:none;font-weight:500;padding:10px 16px;border-radius:10px;background:var(--fg);color:var(--bg)!important}
.screen{margin:0;border:1px solid #2a2a2a;border-radius:12px;background:#0b0b0b;color:#ececec;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.18)}
.s-bar{height:32px;display:flex;align-items:center;gap:6px;padding:0 12px;border-bottom:1px solid #222;background:#111}
.s-bar i{width:10px;height:10px;border-radius:50%;background:#333}
.s-bar span{margin:0 auto;transform:translateX(-24px);font:12px 'Geist Mono',ui-monospace,monospace;color:#8a8a8a}
.s-body{padding:14px 16px 16px;font:13px/1.65 'Geist Mono',ui-monospace,monospace;overflow-x:auto;white-space:nowrap}
.s-dim{color:#7d7d7d}.s-acc{color:#2AABEE}.s-ok{color:#3fb950}
.s-dialog{margin:22px auto;max-width:400px;border:1px solid #2a2a2a;border-radius:12px;background:#151515;padding:18px;font-size:14px}
.s-title{font-weight:600;font-size:15px;margin-bottom:12px}
.s-row{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-top:1px solid #232323}
.s-row span:last-child{text-align:right;min-width:0;overflow-wrap:anywhere}
.s-mono{font:12.5px 'Geist Mono',ui-monospace,monospace}
.s-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.s-btn{padding:7px 14px;border-radius:8px;background:#ececec;color:#0b0b0b;font-weight:500;font-size:13px}
.s-btn.ghost{background:transparent;color:#bbb;border:1px solid #333}
.s-ext{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.s-ext .s-title{margin:0}
.s-logo{width:40px;height:40px;border-radius:10px;background:#2AABEE;flex:none;padding:6px}
.s-logo svg{width:100%;height:100%}
.box pre{white-space:pre;word-break:normal;overflow-x:auto;scrollbar-width:thin}
.box pre.wrap{white-space:pre-wrap;overflow-wrap:anywhere}
`;

/** Tab switching with arrow keys; ?agent=<id> preselects a tab. */
export const GUIDE_JS = `
(() => {
  const lists = [...document.querySelectorAll('[role="tablist"]')];
  const select = t => {
    for (const x of t.parentElement.querySelectorAll('[role="tab"]')) {
      const on = x === t;
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    }
  };
  for (const list of lists) {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    for (const t of tabs) {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const i = tabs.indexOf(t), n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (n) { const next = tabs[(i + n + tabs.length) % tabs.length]; select(next); next.focus(); }
      });
    }
  }
  // ?mode=pro and/or ?agent=<id> (an agent implies PRO)
  const q = new URLSearchParams(location.search);
  const agent = q.get('agent') && document.getElementById('tab-' + q.get('agent'));
  const mode = document.getElementById('tab-' + (agent ? 'pro' : q.get('mode')));
  if (mode) select(mode);
  if (agent) select(agent);
})();
`;
