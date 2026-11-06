/**
 * Answer-first pages for search engines and AI assistants: /mcp (connect an MCP client), /faq,
 * /compare and /cases (what people ask an agent to do in Telegram). Each one answers one need, in the three languages of the site, as plain HTML with a nonce
 * CSP and JSON-LD. Texts follow the README; keep them in step when the behaviour changes.
 */

import { escape } from './guide';
import { DICT, type Lang } from './i18n';
import { BRAND, cardMeta, footer, langLinks, LOGIN_PATH, TOKENS_CSS } from './page';
import { pageUrl, SITE } from './seo';

export const DOC_PATHS = ['/mcp', '/faq', '/compare', '/cases'] as const;
export type DocPath = (typeof DOC_PATHS)[number];
export const isDocPath = (p: string): p is DocPath => (DOC_PATHS as readonly string[]).includes(p);

const REPO = 'https://github.com/TheVilfer/better-tg-cli';

/** A section: paragraphs and list items take `code` and [links](url); `code` blocks are shown as is. */
interface Section {
  h2: string;
  p?: string[];
  list?: string[];
  code?: string;
  after?: string[];
}
interface Doc {
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: Section[];
}
interface Nav {
  home: string;
  mcp: string;
  faq: string;
  compare: string;
  cases: string;
  login: string;
  onThisSite: string;
}
interface Faq {
  title: string;
  description: string;
  h1: string;
  lead: string;
  items: { q: string; a: string }[];
}
interface Compare {
  title: string;
  description: string;
  h1: string;
  lead: string;
  rows: string[];
  cells: string[][];
  note: string;
  whenTitle: string;
  when: string[];
}
/** One use case: the request in the user's words, the commands the agent runs, and what to know. */
interface Case {
  h2: string;
  ask: string;
  code: string;
  note: string;
}
interface Cases {
  title: string;
  description: string;
  h1: string;
  lead: string;
  askLabel: string;
  runsLabel: string;
  items: Case[];
  outro: string;
}
interface Texts {
  nav: Nav;
  mcp: Doc;
  faq: Faq;
  compare: Compare;
  cases: Cases;
}

const INSTALL = `brew install thevilfer/tap/better-tg-cli   # macOS or Linux
scoop bucket add thevilfer https://github.com/TheVilfer/scoop-bucket
scoop install better-tg-cli                 # Windows
npm install -g better-tg-cli                # any OS, Node 20+`;
const LOGIN = `telegram onboard      # free login key or your own API keys, then a QR code`;
const CLIENTS = `claude mcp add telegram -- telegram mcp                     # Claude Code
codex plugin marketplace add TheVilfer/better-tg-cli         # Codex (skill and server)
codex plugin add better-tg-cli@better-tg-cli
gemini extensions install https://github.com/TheVilfer/better-tg-cli   # Gemini CLI`;
const JSON_CONFIG = `{
  "mcpServers": {
    "telegram": { "command": "/opt/homebrew/bin/telegram", "args": ["mcp"] }
  }
}`;
const NPX_CONFIG = `{
  "mcpServers": {
    "telegram": { "command": "npx", "args": ["-y", "better-tg-cli@latest", "mcp"] }
  }
}`;

/** Projects compared on /compare, from each one's README and manifest (November 2026). */
const RIVALS = [
  { name: 'Better-TG-CLI', url: REPO },
  { name: 'chigwell/telegram-mcp', url: 'https://github.com/chigwell/telegram-mcp' },
  { name: 'chaindead/telegram-mcp', url: 'https://github.com/chaindead/telegram-mcp' },
  { name: 'WireCatLabs/tg-cli', url: 'https://github.com/WireCatLabs/tg-cli' },
];

/** The commands each case runs, the same in every language (checked against `telegram help-all`). */
const CASE_CODE = [
  `telegram inbox --unmuted -n 20
telegram read <chat> --unread --max-text 200`,
  `telegram search "invoice" --type document --since 30d
telegram search "staging url" --chat "Dev team" --type url
telegram get <chat> <id>`,
  `telegram read @channel -n 5            # 💬N marks posts with comments
telegram read @channel --thread <postId>
telegram topics <forum> ; telegram read <forum> --topic <id>`,
  `telegram send @somebot "/start"
telegram read @somebot -n 1             # buttons are listed as [index] label
telegram click @somebot <msgId> "Next"`,
  `telegram send @Stickers "/newemojipack"
telegram read @Stickers -n 1            # the bot's question and its buttons
telegram click @Stickers <msgId> <type>   # static, animated or video
telegram send @Stickers "Team emoji"    # the pack's name
telegram send-file @Stickers ./emoji/rocket.png --as-document
telegram send @Stickers "🚀"
telegram send @Stickers "/publish"`,
  `telegram reply <chat> <msgId> "Thanks, Thursday at 3 works"
# mode ask: the exact chat and text are shown, it is sent after your yes`,
  `telegram sync --chat "Project X" --output ./notes/project-x --resume`,
  `telegram watch "Support" -t 600 --json   # always bounded by -t or -n
telegram search "outage" --chat "Support" --since 1d`,
  `telegram stats @mychannel
telegram stats @mychannel --message <postId>
telegram admin-log "My group" ; telegram members "My group" -q anna`,
];

const TEXTS: Record<Lang, Texts> = {
  en: {
    nav: { home: 'Home', mcp: 'MCP server', faq: 'FAQ', compare: 'Compare', cases: 'Use cases', login: 'Login key', onThisSite: 'On this site' },
    mcp: {
      title: 'Telegram MCP server for Claude Code and Cursor | Better-TG-CLI',
      description: 'Connect Telegram to Claude Code, Cursor, Codex, Claude Desktop or Gemini CLI with the open-source Better-TG-CLI MCP server: install, log in, add one line.',
      h1: 'Telegram MCP server for Claude Code, Cursor, Codex and Claude Desktop',
      lead: 'Better-TG-CLI includes an MCP server, `telegram mcp`, that lets an AI client read and search your own Telegram account and, after you approve each send, write to it. It runs on your computer over stdio and talks to Telegram directly; nothing goes through our servers.',
      sections: [
        { h2: '1. Install the CLI', code: INSTALL, after: ['The npm package is one file with zero runtime dependencies; Homebrew and Scoop install a standalone binary that needs no Node.'] },
        { h2: '2. Log in once', code: LOGIN, after: ['You scan a QR code in Telegram on your phone. Your login code, 2FA password and session never reach the agent. The session is kept in the macOS Keychain, the Linux Secret Service, Windows DPAPI or 1Password.'] },
        { h2: '3. Add it to your client', code: CLIENTS, after: [
          'For Claude Desktop, download [better-tg-cli.mcpb](https://github.com/TheVilfer/better-tg-cli/releases/latest/download/better-tg-cli.mcpb) from the latest release and open it: it needs no Node, npm or Homebrew.',
          'For Cursor (`.cursor/mcp.json`), Claude Desktop (`claude_desktop_config.json`) and other MCP hosts, use the JSON form with the full path that `which telegram` prints, because GUI apps may not see your shell PATH:',
        ] },
        { h2: 'JSON config', code: `${JSON_CONFIG}\n\n# without a global install:\n${NPX_CONFIG}`, after: ['The server is listed in the official [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=better-tg-cli) as `io.github.TheVilfer/better-tg-cli`.'] },
        { h2: 'What the server exposes', list: [
          '`telegram_read`: read-only commands (inbox, read, search, threads, forum topics, channel comments, contacts), so clients may approve it automatically.',
          '`telegram_write`: sends, edits, reactions, forwards, bot buttons. It is marked destructive.',
          '`telegram_help`: a searchable reference of every command and flag.',
        ] },
        { h2: 'How writes are approved', p: [
          'After login the profile is in mode `ask`. Before each write you see the exact action, and it runs only after your yes. Clients that support MCP elicitation ask you in their own dialog, so the model never handles the approval; others pass a one-time code that is bound to that exact text.',
          '`telegram write-access off` makes the profile read-only. Writing without asking (`telegram write-access on --for 1h`) needs your confirmation in a terminal or a system dialog. These modes guard against an agent’s mistakes; an agent that runs commands on your computer as you could still read the session, so connect such agents only to chats you trust. Details are in [SECURITY.md](https://github.com/TheVilfer/better-tg-cli/blob/main/SECURITY.md).',
        ] },
        { h2: 'Cloud agents', p: ['Cloud agents such as Grok Bot cannot start a program on your computer. Run `telegram mcp --http` with a bearer token and reach it through a tunnel; the session and the write guard stay on your machine. The [README](https://github.com/TheVilfer/better-tg-cli#grok-bot-remote-mcp-over-http) has the steps.'] },
      ],
    },
    faq: {
      title: 'Better-TG-CLI FAQ: Telegram for AI agents, safety, login',
      description: 'Is it allowed by Telegram, how is an agent kept from sending on its own, where is the session stored? Answers about Better-TG-CLI, login keys and cloud agents.',
      h1: 'Better-TG-CLI: frequently asked questions',
      lead: 'Better-TG-CLI is an open-source Telegram CLI and MCP server that AI agents use on your own account. These are the questions people ask most.',
      items: [
        { q: 'What is Better-TG-CLI?', a: 'An unofficial, open-source (MIT) Telegram client for your own account, made for AI agents. It is a CLI (`telegram`, about 60 commands), an MCP server (`telegram mcp`) and an agent skill for Claude Code, Codex, Cursor, Claude Desktop and Gemini CLI. It speaks MTProto, Telegram’s own client protocol, at the current API layer.' },
        { q: 'Is it a Telegram bot?', a: 'No. It logs in as you, like Telegram Desktop, and sees exactly what you see. A bot cannot read your chats; this can.' },
        { q: 'Will Telegram ban my account?', a: 'Using your own account from a third-party client is allowed by the [Telegram API terms](https://core.telegram.org/api/terms). What gets accounts limited is behaviour that looks like a bot: bulk messaging, mass joins or invites, spam, and new accounts doing a lot at once. Use it the way you would use Telegram yourself; the skill tells agents to avoid these patterns.' },
        { q: 'Can an agent send messages on its own?', a: 'Not by design. After login the profile is in mode `ask`: before each write the agent shows you the exact action and runs it only after your yes. `telegram write-access off` makes it read-only. This relies on the agent following its instructions: an agent with a shell on your user account could read the session and act as you.' },
        { q: 'Do I need my own Telegram API keys?', a: 'No. Get a free login key at [better-tg-cli.com/login](/login) (one email, up to 3 computers), or create your own keys at my.telegram.org and run `telegram auth`.' },
        { q: 'Where is my session stored, and who sees my messages?', a: 'The session is kept in the macOS Keychain, the Linux Secret Service, Windows DPAPI or 1Password. The CLI talks to Telegram directly and has no analytics. Whatever your agent reads is also seen by the company behind that agent.' },
        { q: 'Does reading mark messages as read?', a: 'No. `read`, `inbox` and `search` leave chats unread; only `telegram mark-read` marks them.' },
        { q: 'Can it read channel comments, threads and forum topics, and press bot buttons?', a: 'Yes: `telegram read --thread` opens the replies or comments under a post, `telegram topics` lists forum topics and `telegram read --topic` reads one, and `telegram click` presses buttons in bot messages.' },
        { q: 'Does it work on Windows?', a: 'Yes, experimentally: `scoop install better-tg-cli` or npm. Secrets are stored with Windows DPAPI.' },
        { q: 'Can I use it from ChatGPT, Grok Bot or another cloud agent?', a: 'Cloud agents cannot start a program on your computer, so run the MCP server over HTTP (`telegram mcp --http`) with a bearer token and reach it through a tunnel.' },
      ],
    },
    compare: {
      title: 'Telegram MCP servers compared: Better-TG-CLI, telegram-mcp, tg-cli',
      description: 'Better-TG-CLI vs chigwell/telegram-mcp, chaindead/telegram-mcp and WireCatLabs/tg-cli: what each ships, language, Telegram library, dependencies, install.',
      h1: 'Telegram MCP servers compared',
      lead: 'Several open-source projects connect AI agents to a personal Telegram account. This table compares what each one ships, taken from its README and manifest in November 2026.',
      rows: ['What you get', 'Language', 'Telegram library', 'Runtime dependencies', 'Install'],
      cells: [
        ['CLI, MCP server, agent skill', 'MCP server', 'MCP server', 'CLI, MCP server, agent skill'],
        ['TypeScript (Node 20+ or a standalone binary)', 'Python', 'Go', 'TypeScript'],
        ['teleproto (GramJS fork, layer 229)', 'Telethon', 'gotd/td', 'mtcute'],
        ['none (one file)', 'Python packages', 'one Go binary', 'npm packages'],
        ['Homebrew, Scoop, npm, binaries', 'pip, uvx, Docker', 'Homebrew, npx, go install', 'npm, bun'],
      ],
      note: 'If something here is out of date, open an issue on GitHub.',
      whenTitle: 'When Better-TG-CLI fits',
      when: [
        'You want the same tool as a CLI for agents with a shell (Claude Code, Codex) and as an MCP server for the others.',
        'You want each send approved: mode `ask` shows the exact text and runs it only after your yes.',
        'You want output that is cheap on tokens: one compact line per item, single-line JSON.',
        'You want one file with no runtime dependencies, or a standalone binary.',
      ],
    },
    cases: {
      title: 'What AI agents can do in your Telegram: 9 use cases | Better-TG-CLI',
      description: 'Use cases for Claude Code, Codex, Cursor and Claude Desktop with Telegram: unread digests, search, channel comments, bot buttons, custom emoji, approved replies, exports.',
      h1: 'What an AI agent can do in your Telegram',
      lead: 'Nine things people ask Claude Code, Codex, Cursor or Claude Desktop to do with their own Telegram account through Better-TG-CLI. Each case shows the request, the commands the agent runs (the same argv over MCP) and what to know. Reads never mark chats as read; every send waits for your yes.',
      askLabel: 'You ask',
      runsLabel: 'The agent runs',
      items: [
        { h2: 'A digest of what you missed', ask: '“What did I miss in Telegram today? Skip muted chats, give me the three things I should answer.”', code: '', note: 'Starts from unread chats instead of reading everything, and truncates long messages, so it stays cheap on tokens. Chats stay unread until you open them or run `telegram mark-read`.' },
        { h2: 'Find a message, link or file you lost', ask: '“Find the invoice PDF someone sent me last month” or “What was the staging URL in the dev chat?”', code: '', note: 'Global search across all chats, or inside one chat, filtered by type (photo, url, document, voice, mentions) and date. `telegram download` saves the file.' },
        { h2: 'Read channel comments, threads and forum topics', ask: '“Summarise the discussion under the last post in @channel” or “What is new in the Releases topic?”', code: '', note: 'Most Telegram tools stop at the post itself. Comments, reply threads and forum topics are read the same way as a chat.' },
        { h2: 'Talk to a bot and press its buttons', ask: '“Ask @somebot for my order status and go through its menu.”', code: '', note: 'Bot replies come with their inline and keyboard buttons; the agent presses one by index or label and reads the answer. Pressing a button counts as a write, so in mode `ask` you approve it.' },
        { h2: 'Create a custom emoji pack', ask: '“Turn the icons in ./emoji into a Telegram emoji pack called Team emoji.”', code: '', note: 'The agent goes through the official @Stickers bot step by step: it sends commands, presses the pack-type button, uploads each image as a file and gives it an emoji. It can prepare the images too: static custom emoji are 100×100 PNG or WEBP. Each message to the bot is a write, so in mode `ask` you approve every step, or allow writing for a short while with `telegram write-access on --for 15m`. Creating a pack needs no Telegram Premium; using custom emoji in messages does.' },
        { h2: 'Draft replies, send only what you approve', ask: '“Reply to Anna that Thursday at 3 works, and react 👍 to Max’s message.”', code: '', note: 'In mode `ask` every send, edit, reaction or forward is shown to you word for word and runs only after your yes. Clients with MCP elicitation ask in their own dialog, so the model never handles the approval.' },
        { h2: 'Export a chat to Markdown', ask: '“Save the Project X chat to my notes folder and keep it up to date.”', code: '', note: 'An incremental Markdown export: `--resume` fetches only what is new since the last run. Useful for notes, search in your editor, or as context for a coding agent.' },
        { h2: 'Watch a chat for a while', ask: '“Keep an eye on the Support chat for ten minutes and tell me if anyone reports an outage.”', code: '', note: 'A live stream of new messages as JSON, always bounded by time (`-t`) or count (`-n`), so the agent does not hang.' },
        { h2: 'Channel stats and group admin', ask: '“How did my last post do?” or “Who changed the group settings yesterday?”', code: '', note: 'Channel and post statistics, the admin log and member search. Changing permissions, banning or pinning are writes and go through the same approval.' },
      ],
      outro: 'To set it up, see [MCP server setup](/mcp); for safety and login questions, the [FAQ](/faq). Please don’t use it for bulk messaging, mass joins or invites: Telegram limits accounts that behave like bots, and the skill tells agents to refuse.',
    },
  },
  es: {
    nav: { home: 'Inicio', mcp: 'Servidor MCP', faq: 'Preguntas', compare: 'Comparación', cases: 'Casos de uso', login: 'Clave de acceso', onThisSite: 'En este sitio' },
    mcp: {
      title: 'Servidor MCP de Telegram para Claude Code y Cursor | Better-TG-CLI',
      description: 'Conecta Telegram con Claude Code, Cursor, Codex o Claude Desktop con el servidor MCP de código abierto de Better-TG-CLI: instala, inicia sesión y añade una línea.',
      h1: 'Servidor MCP de Telegram para Claude Code, Cursor, Codex y Claude Desktop',
      lead: 'Better-TG-CLI incluye un servidor MCP, `telegram mcp`, que permite a un cliente de IA leer y buscar en tu propia cuenta de Telegram y, cuando apruebas cada envío, escribir en ella. Se ejecuta en tu equipo por stdio y habla con Telegram directamente; nada pasa por nuestros servidores.',
      sections: [
        { h2: '1. Instala la CLI', code: INSTALL, after: ['El paquete de npm es un único archivo sin dependencias en ejecución; Homebrew y Scoop instalan un binario independiente que no necesita Node.'] },
        { h2: '2. Inicia sesión una vez', code: LOGIN, after: ['Escaneas un código QR en Telegram desde el móvil. El código de acceso, la contraseña 2FA y la sesión nunca llegan al agente. La sesión se guarda en el Llavero de macOS, el Secret Service de Linux, DPAPI de Windows o 1Password.'] },
        { h2: '3. Añádelo a tu cliente', code: CLIENTS, after: [
          'Para Claude Desktop, descarga [better-tg-cli.mcpb](https://github.com/TheVilfer/better-tg-cli/releases/latest/download/better-tg-cli.mcpb) de la última versión y ábrelo: no necesita Node, npm ni Homebrew.',
          'Para Cursor (`.cursor/mcp.json`), Claude Desktop (`claude_desktop_config.json`) y otros clientes MCP, usa el formato JSON con la ruta completa que imprime `which telegram`, porque las apps gráficas pueden no ver el PATH de tu shell:',
        ] },
        { h2: 'Configuración JSON', code: `${JSON_CONFIG}\n\n# sin instalación global:\n${NPX_CONFIG}`, after: ['El servidor figura en el [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=better-tg-cli) oficial como `io.github.TheVilfer/better-tg-cli`.'] },
        { h2: 'Qué ofrece el servidor', list: [
          '`telegram_read`: comandos de solo lectura (bandeja, leer, buscar, hilos, temas de foros, comentarios de canales, contactos), así que los clientes pueden aprobarlo automáticamente.',
          '`telegram_write`: envíos, ediciones, reacciones, reenvíos, botones de bots. Está marcado como destructivo.',
          '`telegram_help`: una referencia con búsqueda de cada comando y opción.',
        ] },
        { h2: 'Cómo se aprueban las escrituras', p: [
          'Tras iniciar sesión, el perfil está en modo `ask`. Antes de cada escritura ves la acción exacta, y solo se ejecuta cuando dices que sí. Los clientes compatibles con MCP elicitation te preguntan en su propio diálogo, así que el modelo nunca toca la aprobación; los demás pasan un código de un solo uso ligado a ese texto exacto.',
          '`telegram write-access off` deja el perfil en solo lectura. Escribir sin preguntar (`telegram write-access on --for 1h`) requiere tu confirmación en un terminal o en un diálogo del sistema. Estos modos protegen de los errores de un agente; un agente que ejecuta comandos en tu equipo como tú aún podría leer la sesión, así que conecta esos agentes solo a chats de confianza. Los detalles están en [SECURITY.md](https://github.com/TheVilfer/better-tg-cli/blob/main/SECURITY.md).',
        ] },
        { h2: 'Agentes en la nube', p: ['Los agentes en la nube, como Grok Bot, no pueden iniciar un programa en tu equipo. Ejecuta `telegram mcp --http` con un token bearer y accede a él a través de un túnel; la sesión y el control de escritura se quedan en tu equipo. Los pasos están en el [README](https://github.com/TheVilfer/better-tg-cli/blob/main/README.es.md).'] },
      ],
    },
    faq: {
      title: 'Better-TG-CLI: preguntas sobre Telegram para agentes de IA',
      description: '¿Lo permite Telegram? ¿Cómo se evita que un agente envíe por su cuenta? ¿Dónde se guarda la sesión? Respuestas sobre Better-TG-CLI y sus claves de acceso.',
      h1: 'Better-TG-CLI: preguntas frecuentes',
      lead: 'Better-TG-CLI es un CLI y servidor MCP de Telegram de código abierto que los agentes de IA usan con tu propia cuenta. Estas son las preguntas más habituales.',
      items: [
        { q: '¿Qué es Better-TG-CLI?', a: 'Un cliente de Telegram no oficial y de código abierto (MIT) para tu propia cuenta, hecho para agentes de IA. Es un CLI (`telegram`, unos 60 comandos), un servidor MCP (`telegram mcp`) y un skill para Claude Code, Codex, Cursor, Claude Desktop y Gemini CLI. Usa MTProto, el protocolo de clientes de Telegram, en la capa actual de la API.' },
        { q: '¿Es un bot de Telegram?', a: 'No. Inicia sesión como tú, igual que Telegram Desktop, y ve exactamente lo que ves tú. Un bot no puede leer tus chats; esto sí.' },
        { q: '¿Telegram bloqueará mi cuenta?', a: 'Usar tu propia cuenta desde un cliente de terceros está permitido por los [términos de la API de Telegram](https://core.telegram.org/api/terms). Lo que hace que se limiten cuentas es un comportamiento que parece de bot: envíos masivos, entradas o invitaciones masivas, spam y cuentas nuevas que hacen mucho de golpe. Úsalo como usarías Telegram tú mismo; el skill indica a los agentes que eviten esos patrones.' },
        { q: '¿Puede un agente enviar mensajes por su cuenta?', a: 'No por diseño. Tras iniciar sesión, el perfil está en modo `ask`: antes de cada escritura el agente te muestra la acción exacta y solo la ejecuta cuando dices que sí. `telegram write-access off` lo deja en solo lectura. Esto depende de que el agente siga sus instrucciones: un agente con shell en tu usuario podría leer la sesión y actuar como tú.' },
        { q: '¿Necesito mis propias claves de API de Telegram?', a: 'No. Consigue una clave de acceso gratis en [better-tg-cli.com/login](/login?lang=es) (un correo, hasta 3 equipos), o crea tus propias claves en my.telegram.org y ejecuta `telegram auth`.' },
        { q: '¿Dónde se guarda mi sesión y quién ve mis mensajes?', a: 'La sesión se guarda en el Llavero de macOS, el Secret Service de Linux, DPAPI de Windows o 1Password. La CLI habla con Telegram directamente y no tiene analítica. Todo lo que lee tu agente también lo ve la empresa que está detrás de ese agente.' },
        { q: '¿Leer marca los mensajes como leídos?', a: 'No. `read`, `inbox` y `search` dejan los chats sin leer; solo `telegram mark-read` los marca.' },
        { q: '¿Puede leer comentarios de canales, hilos y temas de foros, y pulsar botones de bots?', a: 'Sí: `telegram read --thread` abre las respuestas o comentarios de una publicación, `telegram topics` lista los temas de un foro y `telegram read --topic` lee uno, y `telegram click` pulsa botones en los mensajes de bots.' },
        { q: '¿Funciona en Windows?', a: 'Sí, de forma experimental: `scoop install better-tg-cli` o npm. Los secretos se guardan con DPAPI de Windows.' },
        { q: '¿Puedo usarlo desde ChatGPT, Grok Bot u otro agente en la nube?', a: 'Los agentes en la nube no pueden iniciar un programa en tu equipo, así que ejecuta el servidor MCP por HTTP (`telegram mcp --http`) con un token bearer y accede a él a través de un túnel.' },
      ],
    },
    compare: {
      title: 'Servidores MCP de Telegram: Better-TG-CLI, telegram-mcp, tg-cli',
      description: 'Better-TG-CLI frente a chigwell/telegram-mcp, chaindead/telegram-mcp y WireCatLabs/tg-cli: qué incluye cada uno, lenguaje, biblioteca, dependencias, instalación.',
      h1: 'Comparación de servidores MCP de Telegram',
      lead: 'Varios proyectos de código abierto conectan agentes de IA con una cuenta personal de Telegram. Esta tabla compara lo que incluye cada uno, según su README y su manifiesto en noviembre de 2026.',
      rows: ['Qué incluye', 'Lenguaje', 'Biblioteca de Telegram', 'Dependencias en ejecución', 'Instalación'],
      cells: [
        ['CLI, servidor MCP, skill', 'servidor MCP', 'servidor MCP', 'CLI, servidor MCP, skill'],
        ['TypeScript (Node 20+ o un binario independiente)', 'Python', 'Go', 'TypeScript'],
        ['teleproto (fork de GramJS, layer 229)', 'Telethon', 'gotd/td', 'mtcute'],
        ['ninguna (un archivo)', 'paquetes de Python', 'un binario de Go', 'paquetes de npm'],
        ['Homebrew, Scoop, npm, binarios', 'pip, uvx, Docker', 'Homebrew, npx, go install', 'npm, bun'],
      ],
      note: 'Si algo está desactualizado, abre un issue en GitHub.',
      whenTitle: 'Cuándo encaja Better-TG-CLI',
      when: [
        'Quieres la misma herramienta como CLI para agentes con shell (Claude Code, Codex) y como servidor MCP para los demás.',
        'Quieres aprobar cada envío: el modo `ask` muestra el texto exacto y solo lo ejecuta cuando dices que sí.',
        'Quieres una salida que gaste pocos tokens: una línea compacta por elemento, JSON en una sola línea.',
        'Quieres un solo archivo sin dependencias en ejecución, o un binario independiente.',
      ],
    },
    cases: {
      title: 'Qué puede hacer un agente de IA en tu Telegram: 9 casos | Better-TG-CLI',
      description: 'Casos de uso de Claude Code, Codex, Cursor y Claude Desktop con Telegram: resumen de no leídos, búsqueda, comentarios, botones de bots, emojis propios, respuestas aprobadas.',
      h1: 'Qué puede hacer un agente de IA en tu Telegram',
      lead: 'Nueve cosas que la gente pide a Claude Code, Codex, Cursor o Claude Desktop con su propia cuenta de Telegram a través de Better-TG-CLI. Cada caso muestra la petición, los comandos que ejecuta el agente (los mismos argumentos por MCP) y qué conviene saber. Leer nunca marca los chats como leídos; cada envío espera tu «sí».',
      askLabel: 'Tú pides',
      runsLabel: 'El agente ejecuta',
      items: [
        { h2: 'Un resumen de lo que te perdiste', ask: '«¿Qué me perdí hoy en Telegram? Sin los chats silenciados, dime las tres cosas que debo responder.»', code: '', note: 'Empieza por los chats no leídos en lugar de leerlo todo y recorta los mensajes largos, así gasta pocos tokens. Los chats siguen sin leer hasta que los abres o ejecutas `telegram mark-read`.' },
        { h2: 'Encontrar un mensaje, enlace o archivo perdido', ask: '«Busca la factura en PDF que me enviaron el mes pasado» o «¿Cuál era la URL de staging en el chat de desarrollo?»', code: '', note: 'Búsqueda global en todos los chats o dentro de uno, filtrada por tipo (photo, url, document, voice, mentions) y fecha. `telegram download` guarda el archivo.' },
        { h2: 'Leer comentarios de canales, hilos y temas de foros', ask: '«Resume la discusión bajo el último post de @canal» o «¿Qué hay de nuevo en el tema Releases?»', code: '', note: 'La mayoría de las herramientas se quedan en el post. Los comentarios, los hilos de respuestas y los temas de foro se leen igual que un chat.' },
        { h2: 'Hablar con un bot y pulsar sus botones', ask: '«Pregunta a @somebot por el estado de mi pedido y recorre su menú.»', code: '', note: 'Las respuestas del bot llegan con sus botones; el agente pulsa uno por índice o texto y lee la respuesta. Pulsar un botón cuenta como escritura, así que en el modo `ask` lo apruebas tú.' },
        { h2: 'Crear un pack de emojis personalizados', ask: '«Convierte los iconos de ./emoji en un pack de emojis de Telegram llamado Team emoji.»', code: '', note: 'El agente sigue paso a paso al bot oficial @Stickers: envía comandos, pulsa el botón del tipo de pack, sube cada imagen como archivo y le asigna un emoji. También puede preparar las imágenes: los emojis estáticos son PNG o WEBP de 100×100. Cada mensaje al bot es una escritura, así que en el modo `ask` apruebas cada paso, o permites escribir un rato con `telegram write-access on --for 15m`. Crear un pack no requiere Telegram Premium; usar emojis personalizados en mensajes, sí.' },
        { h2: 'Borradores de respuesta: solo se envía lo que apruebas', ask: '«Responde a Anna que el jueves a las 3 me va bien y reacciona con 👍 al mensaje de Max.»', code: '', note: 'En el modo `ask` cada envío, edición, reacción o reenvío se te muestra tal cual y solo se ejecuta tras tu «sí». Los clientes con elicitation de MCP preguntan en su propio diálogo, así que el modelo nunca toca la aprobación.' },
        { h2: 'Exportar un chat a Markdown', ask: '«Guarda el chat Project X en mi carpeta de notas y mantenlo al día.»', code: '', note: 'Exportación incremental a Markdown: `--resume` descarga solo lo nuevo desde la última vez. Sirve para notas, para buscar desde el editor o como contexto para un agente de código.' },
        { h2: 'Vigilar un chat durante un rato', ask: '«Vigila el chat Support diez minutos y avísame si alguien informa de una caída.»', code: '', note: 'Un flujo en vivo de mensajes nuevos en JSON, siempre limitado por tiempo (`-t`) o cantidad (`-n`), para que el agente no se quede colgado.' },
        { h2: 'Estadísticas de canales y administración de grupos', ask: '«¿Qué tal funcionó mi último post?» o «¿Quién cambió ayer la configuración del grupo?»', code: '', note: 'Estadísticas del canal y de cada post, el registro de administración y la búsqueda de miembros. Cambiar permisos, expulsar o fijar son escrituras y pasan por la misma aprobación.' },
      ],
      outro: 'Para configurarlo, mira [Servidor MCP](/mcp); sobre seguridad e inicio de sesión, las [Preguntas](/faq). No lo uses para envíos masivos ni para unirte o invitar en masa: Telegram limita las cuentas que se comportan como bots, y el skill indica a los agentes que se nieguen.',
    },
  },
  ru: {
    nav: { home: 'Главная', mcp: 'MCP-сервер', faq: 'Вопросы', compare: 'Сравнение', cases: 'Сценарии', login: 'Ключ входа', onThisSite: 'На сайте' },
    mcp: {
      title: 'MCP-сервер Telegram для Claude Code и Cursor | Better-TG-CLI',
      description: 'Подключите Telegram к Claude Code, Cursor, Codex, Claude Desktop или Gemini CLI через открытый MCP-сервер Better-TG-CLI: установите, войдите и добавьте одну строку в клиент.',
      h1: 'MCP-сервер Telegram для Claude Code, Cursor, Codex и Claude Desktop',
      lead: 'В Better-TG-CLI есть MCP-сервер `telegram mcp`: через него ИИ-клиент читает и ищет в вашем собственном аккаунте Telegram, а после вашего подтверждения каждой отправки пишет в него. Сервер работает на вашем компьютере по stdio и общается с Telegram напрямую, через наши серверы ничего не идёт.',
      sections: [
        { h2: '1. Установите CLI', code: INSTALL, after: ['npm-пакет — это один файл без зависимостей при запуске; Homebrew и Scoop ставят отдельный бинарник, которому не нужен Node.'] },
        { h2: '2. Войдите один раз', code: LOGIN, after: ['Вы сканируете QR-код в Telegram на телефоне. Код входа, пароль 2FA и сессия до агента не доходят. Сессия хранится в «Связке ключей» macOS, Secret Service в Linux, DPAPI в Windows или в 1Password.'] },
        { h2: '3. Добавьте его в клиент', code: CLIENTS, after: [
          'Для Claude Desktop скачайте [better-tg-cli.mcpb](https://github.com/TheVilfer/better-tg-cli/releases/latest/download/better-tg-cli.mcpb) из последнего релиза и откройте его: Node, npm и Homebrew не нужны.',
          'Для Cursor (`.cursor/mcp.json`), Claude Desktop (`claude_desktop_config.json`) и других MCP-клиентов используйте JSON с полным путём из `which telegram`: графические приложения могут не видеть PATH вашей оболочки.',
        ] },
        { h2: 'Настройка в JSON', code: `${JSON_CONFIG}\n\n# без глобальной установки:\n${NPX_CONFIG}`, after: ['Сервер есть в официальном [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=better-tg-cli) под именем `io.github.TheVilfer/better-tg-cli`.'] },
        { h2: 'Что даёт сервер', list: [
          '`telegram_read`: команды только для чтения (входящие, чтение, поиск, треды, темы форумов, комментарии в каналах, контакты), поэтому клиенты могут одобрять его автоматически.',
          '`telegram_write`: отправка, правка, реакции, пересылка, кнопки ботов. Помечен как разрушающий.',
          '`telegram_help`: справочник с поиском по всем командам и флагам.',
        ] },
        { h2: 'Как подтверждается запись', p: [
          'После входа профиль в режиме `ask`. Перед каждой записью вы видите точное действие, и оно выполняется только после вашего «да». Клиенты с поддержкой MCP elicitation спрашивают вас в собственном окне, так что модель к подтверждению не прикасается; остальные передают одноразовый код, привязанный к этому точному тексту.',
          '`telegram write-access off` переводит профиль в режим только чтения. Запись без вопросов (`telegram write-access on --for 1h`) включается только вашим подтверждением в терминале или системном окне. Режимы защищают от ошибок агента; агент, который выполняет команды на вашем компьютере от вашего имени, всё равно может прочитать сессию, поэтому давайте таким агентам только те чаты, которым доверяете. Подробности в [SECURITY.md](https://github.com/TheVilfer/better-tg-cli/blob/main/SECURITY.md).',
        ] },
        { h2: 'Облачные агенты', p: ['Облачные агенты вроде Grok Bot не могут запустить программу на вашем компьютере. Запустите `telegram mcp --http` с bearer-токеном и откройте к нему доступ через туннель; сессия и защита записи остаются на вашей машине. Шаги описаны в [README](https://github.com/TheVilfer/better-tg-cli/blob/main/README.ru.md).'] },
      ],
    },
    faq: {
      title: 'Better-TG-CLI: частые вопросы о Telegram для ИИ-агентов',
      description: 'Ответы о Better-TG-CLI: разрешает ли это Telegram, как агенту не дают отправлять самому, где хранится сессия, ключи входа, Windows и облачные агенты.',
      h1: 'Better-TG-CLI: частые вопросы',
      lead: 'Better-TG-CLI — открытый CLI и MCP-сервер Telegram, через который ИИ-агенты работают с вашим собственным аккаунтом. Здесь ответы на самые частые вопросы.',
      items: [
        { q: 'Что такое Better-TG-CLI?', a: 'Неофициальный клиент Telegram с открытым кодом (MIT) для вашего собственного аккаунта, сделанный для ИИ-агентов. Это CLI (`telegram`, около 60 команд), MCP-сервер (`telegram mcp`) и скилл для Claude Code, Codex, Cursor, Claude Desktop и Gemini CLI. Он работает по MTProto, собственному клиентскому протоколу Telegram, на актуальном слое API.' },
        { q: 'Это бот Telegram?', a: 'Нет. Он входит от вашего имени, как Telegram Desktop, и видит ровно то же, что и вы. Бот не может читать ваши чаты, а он может.' },
        { q: 'Telegram заблокирует мой аккаунт?', a: 'Пользоваться своим аккаунтом из стороннего клиента разрешают [условия API Telegram](https://core.telegram.org/api/terms). Аккаунты ограничивают за поведение, похожее на бота: массовые рассылки, массовые вступления и приглашения, спам, новые аккаунты, которые сразу делают очень много. Пользуйтесь им так же, как пользовались бы Telegram сами; скилл учит агентов избегать таких действий.' },
        { q: 'Может ли агент отправлять сообщения сам?', a: 'Не по замыслу. После входа профиль в режиме `ask`: перед каждой записью агент показывает вам точное действие и выполняет его только после вашего «да». `telegram write-access off` включает режим только чтения. Это работает, пока агент следует инструкциям: агент с доступом к оболочке под вашим пользователем может прочитать сессию и действовать от вашего имени.' },
        { q: 'Нужны ли свои API-ключи Telegram?', a: 'Нет. Получите бесплатный ключ входа на [better-tg-cli.com/login](/login?lang=ru) (одна почта, до 3 компьютеров) или создайте свои ключи на my.telegram.org и запустите `telegram auth`.' },
        { q: 'Где хранится сессия и кто видит мои сообщения?', a: 'Сессия хранится в «Связке ключей» macOS, Secret Service в Linux, DPAPI в Windows или в 1Password. CLI общается с Telegram напрямую и не собирает аналитику. Всё, что читает агент, видит и компания, которая стоит за этим агентом.' },
        { q: 'Чтение помечает сообщения прочитанными?', a: 'Нет. `read`, `inbox` и `search` оставляют чаты непрочитанными; помечает только `telegram mark-read`.' },
        { q: 'Можно ли читать комментарии в каналах, треды и темы форумов и нажимать кнопки ботов?', a: 'Да: `telegram read --thread` открывает ответы или комментарии под постом, `telegram topics` показывает темы форума, а `telegram read --topic` читает одну из них; `telegram click` нажимает кнопки в сообщениях ботов.' },
        { q: 'Работает ли он в Windows?', a: 'Да, экспериментально: `scoop install better-tg-cli` или npm. Секреты хранятся с помощью DPAPI в Windows.' },
        { q: 'Можно ли пользоваться им из ChatGPT, Grok Bot или другого облачного агента?', a: 'Облачные агенты не могут запустить программу на вашем компьютере, поэтому запустите MCP-сервер по HTTP (`telegram mcp --http`) с bearer-токеном и откройте к нему доступ через туннель.' },
      ],
    },
    compare: {
      title: 'Сравнение MCP-серверов Telegram: Better-TG-CLI, telegram-mcp, tg-cli',
      description: 'Чем Better-TG-CLI отличается от chigwell/telegram-mcp, chaindead/telegram-mcp и WireCatLabs/tg-cli: что входит, язык, библиотека Telegram, зависимости и установка.',
      h1: 'Сравнение MCP-серверов Telegram',
      lead: 'Несколько проектов с открытым кодом подключают ИИ-агентов к личному аккаунту Telegram. В таблице сравнивается, что входит в каждый из них, по их README и манифестам на ноябрь 2026 года.',
      rows: ['Что внутри', 'Язык', 'Библиотека Telegram', 'Зависимости при запуске', 'Установка'],
      cells: [
        ['CLI, MCP-сервер, скилл', 'MCP-сервер', 'MCP-сервер', 'CLI, MCP-сервер, скилл'],
        ['TypeScript (Node 20+ или отдельный бинарник)', 'Python', 'Go', 'TypeScript'],
        ['teleproto (форк GramJS, layer 229)', 'Telethon', 'gotd/td', 'mtcute'],
        ['нет (один файл)', 'пакеты Python', 'один бинарник Go', 'пакеты npm'],
        ['Homebrew, Scoop, npm, бинарники', 'pip, uvx, Docker', 'Homebrew, npx, go install', 'npm, bun'],
      ],
      note: 'Если что-то устарело, откройте issue на GitHub.',
      whenTitle: 'Когда подходит Better-TG-CLI',
      when: [
        'Нужен один инструмент: CLI для агентов с доступом к оболочке (Claude Code, Codex) и MCP-сервер для остальных.',
        'Нужно подтверждать каждую отправку: режим `ask` показывает точный текст и выполняет действие только после вашего «да».',
        'Нужен вывод, который бережёт токены: одна компактная строка на элемент, JSON в одну строку.',
        'Нужен один файл без зависимостей при запуске или отдельный бинарник.',
      ],
    },
    cases: {
      title: 'Что ИИ-агент может делать в вашем Telegram: 9 сценариев | Better-TG-CLI',
      description: 'Сценарии для Claude Code, Codex, Cursor и Claude Desktop в Telegram: сводка непрочитанного, поиск, комментарии в каналах, кнопки ботов, кастомные эмодзи, ответы с подтверждением.',
      h1: 'Что ИИ-агент может делать в вашем Telegram',
      lead: 'Девять задач, которые люди дают Claude Code, Codex, Cursor или Claude Desktop в своём аккаунте Telegram через Better-TG-CLI. Для каждой показано, как звучит просьба, какие команды запускает агент (по MCP те же аргументы) и что важно знать. Чтение никогда не отмечает чаты прочитанными, а каждая отправка ждёт вашего «да».',
      askLabel: 'Вы просите',
      runsLabel: 'Агент запускает',
      items: [
        { h2: 'Сводка того, что вы пропустили', ask: '«Что я пропустил в телеге сегодня? Без чатов с выключенным звуком, назови три вещи, на которые надо ответить.»', code: '', note: 'Агент начинает с непрочитанных чатов, а не читает всё подряд, и обрезает длинные сообщения, поэтому тратит мало токенов. Чаты остаются непрочитанными, пока вы их не откроете или не запустите `telegram mark-read`.' },
        { h2: 'Найти потерянное сообщение, ссылку или файл', ask: '«Найди PDF со счётом, который мне присылали в прошлом месяце» или «Какой был адрес стейджинга в чате разработки?»', code: '', note: 'Поиск по всем чатам или внутри одного, с фильтром по типу (photo, url, document, voice, mentions) и дате. `telegram download` сохранит файл.' },
        { h2: 'Читать комментарии в каналах, ветки и темы форумов', ask: '«Перескажи обсуждение под последним постом в @channel» или «Что нового в теме Releases?»', code: '', note: 'Большинство инструментов видят только сам пост. Комментарии, ветки ответов и темы форумов читаются так же, как обычный чат.' },
        { h2: 'Поговорить с ботом и нажать его кнопки', ask: '«Спроси у @somebot статус заказа и пройди по его меню.»', code: '', note: 'Ответы бота приходят вместе с кнопками; агент нажимает нужную по номеру или тексту и читает ответ. Нажатие кнопки считается записью, поэтому в режиме `ask` его подтверждаете вы.' },
        { h2: 'Создать пак кастомных эмодзи', ask: '«Сделай из иконок в ./emoji пак эмодзи в Telegram под названием Team emoji.»', code: '', note: 'Агент проходит шаги официального бота @Stickers: отправляет команды, нажимает кнопку с типом пака, загружает каждую картинку файлом и назначает ей эмодзи. Картинки он тоже может подготовить сам: статичные эмодзи — это PNG или WEBP 100×100. Каждое сообщение боту — это запись, поэтому в режиме `ask` вы подтверждаете каждый шаг или разрешаете запись ненадолго: `telegram write-access on --for 15m`. Для создания пака Telegram Premium не нужен, а чтобы ставить кастомные эмодзи в сообщения — нужен.' },
        { h2: 'Черновики ответов: отправляется только то, что вы одобрили', ask: '«Ответь Ане, что четверг в 15:00 подходит, и поставь 👍 на сообщение Макса.»', code: '', note: 'В режиме `ask` каждая отправка, правка, реакция или пересылка показывается вам дословно и выполняется только после вашего «да». Клиенты с MCP elicitation спрашивают в своём окне, так что модель вообще не касается подтверждения.' },
        { h2: 'Выгрузить чат в Markdown', ask: '«Сохрани чат Project X в папку с заметками и обновляй его.»', code: '', note: 'Инкрементальная выгрузка в Markdown: с `--resume` скачивается только новое с прошлого запуска. Удобно для заметок, поиска в редакторе или как контекст для агента, который пишет код.' },
        { h2: 'Последить за чатом какое-то время', ask: '«Последи за чатом Support десять минут и скажи, если кто-то сообщит о падении.»', code: '', note: 'Поток новых сообщений в JSON, всегда ограниченный временем (`-t`) или количеством (`-n`), чтобы агент не зависал.' },
        { h2: 'Статистика канала и администрирование группы', ask: '«Как зашёл мой последний пост?» или «Кто вчера поменял настройки группы?»', code: '', note: 'Статистика канала и отдельных постов, журнал действий админов и поиск участников. Изменение прав, бан и закрепление — это записи, и они проходят то же подтверждение.' },
      ],
      outro: 'Как подключить — на странице [MCP-сервер](/mcp); про безопасность и вход — в [вопросах](/faq). Не используйте инструмент для массовых рассылок, массовых вступлений и приглашений: Telegram ограничивает аккаунты, которые ведут себя как боты, и скилл велит агентам отказываться.',
    },
  },
};

/** Escapes text, then turns `code` into <code> and [text](url) into links (local links keep the language). */
function inline(text: string, lang: Lang): string {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, href: string) => {
      const local = href.startsWith('/');
      const url = local && lang !== 'en' && !href.includes('lang=') ? `${href}${href.includes('?') ? '&' : '?'}lang=${lang}` : href;
      return `<a href="${url}"${local ? '' : ' rel="noopener"'}>${t}</a>`;
    });
}

const localHref = (path: string, lang: Lang) => (lang === 'en' ? path : `${path}?lang=${lang}`);

function nav(lang: Lang, current: string): string {
  const n = TEXTS[lang].nav;
  const items: [string, string][] = [['/', n.home], ['/mcp', n.mcp], ['/cases', n.cases], ['/faq', n.faq], ['/compare', n.compare], [LOGIN_PATH, n.login]];
  return `<nav class="site" aria-label="${escape(n.onThisSite)}">${items
    .map(([p, label]) => (p === current ? `<b aria-current="page">${escape(label)}</b>` : `<a href="${localHref(p, lang)}">${escape(label)}</a>`))
    .join('')}</nav>`;
}

function ld(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function body(path: DocPath, lang: Lang): { head: { title: string; description: string }; html: string; schema: unknown } {
  const t = TEXTS[lang];
  const url = pageUrl(path, lang);
  const about = { '@id': `${SITE}/#app` };
  if (path === '/faq') {
    const f = t.faq;
    return {
      head: f,
      html: `<h1>${escape(f.h1)}</h1><p class="lead">${inline(f.lead, lang)}</p>${f.items
        .map(i => `<section><h2>${escape(i.q)}</h2><p>${inline(i.a, lang)}</p></section>`)
        .join('')}`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url,
        inLanguage: lang,
        about,
        mainEntity: f.items.map(i => ({
          '@type': 'Question',
          name: i.q,
          acceptedAnswer: { '@type': 'Answer', text: i.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '') },
        })),
      },
    };
  }
  if (path === '/cases') {
    const c = t.cases;
    return {
      head: c,
      html: `<h1>${escape(c.h1)}</h1><p class="lead">${inline(c.lead, lang)}</p>${c.items
        .map((i, n) => `<section class="case"><h2>${escape(i.h2)}</h2><p class="ask"><span>${escape(c.askLabel)}</span>${escape(i.ask)}</p><p class="runs">${escape(c.runsLabel)}</p><pre><code>${escape(CASE_CODE[n])}</code></pre><p>${inline(i.note, lang)}</p></section>`)
        .join('')}<p class="outro">${inline(c.outro, lang)}</p>`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: c.h1,
        description: c.description,
        url,
        inLanguage: lang,
        about,
        mainEntity: { '@type': 'ItemList', itemListElement: c.items.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.h2 })) },
      },
    };
  }
  if (path === '/compare') {
    const c = t.compare;
    const head = `<tr><th></th>${RIVALS.map(r => `<th scope="col"><a href="${r.url}"${r.url === REPO ? '' : ' rel="noopener"'}>${escape(r.name)}</a></th>`).join('')}</tr>`;
    const rows = c.rows.map((r, i) => `<tr><th scope="row">${escape(r)}</th>${c.cells[i].map(v => `<td>${escape(v)}</td>`).join('')}</tr>`).join('');
    return {
      head: c,
      html: `<h1>${escape(c.h1)}</h1><p class="lead">${inline(c.lead, lang)}</p>
<div class="table"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>
<p class="note">${inline(c.note, lang)}</p>
<h2>${escape(c.whenTitle)}</h2><ul>${c.when.map(w => `<li>${inline(w, lang)}</li>`).join('')}</ul>`,
      schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: c.h1, url, inLanguage: lang, about },
    };
  }
  const m = t.mcp;
  return {
    head: m,
    html: `<h1>${escape(m.h1)}</h1><p class="lead">${inline(m.lead, lang)}</p>${m.sections
      .map(s => [
        `<h2>${escape(s.h2)}</h2>`,
        ...(s.p ?? []).map(p => `<p>${inline(p, lang)}</p>`),
        s.list ? `<ul>${s.list.map(l => `<li>${inline(l, lang)}</li>`).join('')}</ul>` : '',
        s.code ? `<pre><code>${escape(s.code)}</code></pre>` : '',
        ...(s.after ?? []).map(p => `<p>${inline(p, lang)}</p>`),
      ].join(''))
      .join('')}`,
    schema: { '@context': 'https://schema.org', '@type': 'TechArticle', headline: m.h1, description: m.description, url, inLanguage: lang, about, author: { '@id': `${SITE}/#author` } },
  };
}

export function docResponse(path: DocPath, lang: Lang, query: URLSearchParams): Response {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const t = DICT[lang];
  const { head, html, schema } = body(path, lang);
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
  const page = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(head.title)}</title>
<meta name="description" content="${escape(head.description)}">
${cardMeta(lang, head, path)}
<script type="application/ld+json" nonce="${nonce}">${ld(schema)}</script>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&display=swap">
<style nonce="${nonce}">
${TOKENS_CSS}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Geist,system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 16px 72px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.top>a{color:inherit;text-decoration:none}
.brand{display:flex;align-items:center;gap:10px;font-weight:400;letter-spacing:1px;font-size:15px}
.brand i{font-style:normal;color:var(--accent)}
.brand svg{width:22px;height:22px}
.langs,.site{display:flex;gap:14px;flex-wrap:wrap;font-size:14px}
.langs b,.site b{font-weight:500}
.langs a,.site a{color:var(--dim);text-decoration:none}
.langs a:hover,.site a:hover{color:var(--fg)}
.site{margin-bottom:48px;padding-bottom:14px;border-bottom:1px solid var(--line)}
h1{font-size:38px;line-height:1.1;letter-spacing:-1px;font-weight:600;margin:0 0 16px;text-wrap:balance}
.lead{color:var(--dim);font-size:18px;margin:0 0 32px;text-wrap:pretty}
h2{font-size:21px;letter-spacing:-.3px;font-weight:600;margin:40px 0 10px}
section h2{font-size:18px;margin-top:28px}
a{color:var(--accent)}
code{font:14px 'Geist Mono',ui-monospace,monospace;background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:1px 5px}
pre{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:14px 16px;overflow-x:auto;margin:12px 0}
pre code{border:0;padding:0;background:none;font-size:13.5px;line-height:1.6;white-space:pre}
ul{padding-left:20px}li+li{margin-top:6px}
.table{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
thead th{background:var(--panel);font-weight:600}
tbody th{font-weight:500;color:var(--dim);min-width:8.5em}
table{min-width:620px}
tr:last-child th,tr:last-child td{border-bottom:0}
.note{color:var(--dim);font-size:14px}
.case{margin-top:40px}
.case h2{font-size:21px;margin-top:0}
.ask{margin:8px 0 14px;padding:12px 16px;border-left:3px solid var(--accent);background:var(--panel);border-radius:0 10px 10px 0}
.ask span,.runs{display:block;font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:var(--dim);margin:0 0 4px}
.runs{margin:0}
.outro{margin-top:48px;color:var(--dim)}
footer{margin-top:56px;font-size:13px;color:var(--dim)}
footer .pages{margin-bottom:8px}
@media (max-width:480px){main{padding-top:28px}h1{font-size:30px;letter-spacing:-.6px}.lead{font-size:16px}}
</style></head><body><main>
<div class="top"><a href="${localHref('/', lang)}" aria-label="Better-TG-CLI">${BRAND}</a>${langLinks(lang, query, t, path)}</div>
${nav(lang, path)}
${html}
${footer(t.page, lang)}
</main></body></html>`;
  return new Response(page, {
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
