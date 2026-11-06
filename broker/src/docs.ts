/**
 * Answer-first pages for search engines and AI assistants: /mcp (connect an MCP client), /faq,
 * /compare and /cases (what people ask an agent to do in Telegram). Each one answers one need, in the three languages of the site, as plain HTML with a nonce
 * CSP and JSON-LD. Texts follow the README; keep them in step when the behaviour changes.
 */

import { escape } from './guide';
import { DICT, type Lang } from './i18n';
import { cardMeta, footer, header, SHELL_CSS, TOKENS_CSS } from './page';
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
/** One use case, for people: what it gives you, what you need, and a prompt to give your agent. */
interface Case {
  h2: string;
  story: string;
  needs: string[];
  prompt: string;
}
interface Cases {
  title: string;
  description: string;
  h1: string;
  lead: string;
  setupTitle: string;
  setup: string[];
  needLabel: string;
  promptLabel: string;
  items: Case[];
  outro: string;
}
interface Texts {
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

const TEXTS: Record<Lang, Texts> = {
  en: {
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
      title: 'What an AI agent can do in your Telegram: 9 use cases | Better-TG-CLI',
      description: 'Real tasks for Claude, Codex or Cursor in your own Telegram: catch up on chats, find lost files, read comments, talk to bots, make an emoji pack. With prompts to copy.',
      h1: 'What an AI agent can do in your Telegram',
      lead: 'Nine everyday tasks you can hand to Claude Code, Codex, Cursor or Claude Desktop once Better-TG-CLI connects it to your own Telegram account. For each one: what you get, what you need, and a prompt you can copy as is. The agent reads freely, but nothing is sent until you say yes.',
      setupTitle: 'Before you start (once, about five minutes)',
      setup: ['Install Better-TG-CLI: `brew install thevilfer/tap/better-tg-cli` on macOS or Linux, Scoop on Windows, or npm. Details on [MCP server setup](/mcp).', 'Log in: run `telegram onboard` and scan the QR code with Telegram on your phone. You need no API keys of your own, and the agent never sees your login code or password.', 'Connect your agent: in Claude Code it is one line, `claude mcp add telegram -- telegram mcp`; for Codex, Cursor and Claude Desktop see [MCP server setup](/mcp).'],
      needLabel: 'What you need',
      promptLabel: 'Prompt to copy',
      items: [
        { h2: 'Catch up on what you missed', story: 'You come back to dozens of unread chats. The agent goes through the unread ones, skips muted chats, and tells you who is waiting for your answer and what matters, most urgent first. It only reads: every chat stays unread, so you still see it in Telegram.', needs: ['Only the setup above.'], prompt: 'Check my Telegram: what did I miss since yesterday? Skip muted chats. List who is waiting for an answer from me and about what, most urgent first.' },
        { h2: 'Find a lost message, link or file', story: 'You remember roughly what it was, but not which chat or when. The agent searches all your chats by words, type (file, link, photo, voice message) and date, shows you the message, and can save the file to your computer.', needs: ['Only the setup above.'], prompt: 'Find the PDF invoice someone sent me in Telegram last month and save it to my Downloads folder.' },
        { h2: 'Read channel comments and busy forum topics', story: 'A post with hundreds of comments, or a forum topic that moved on while you were away. The agent reads the whole discussion and sums it up: the main opinions, the questions people ask, and anything addressed to you.', needs: ['A channel or group you can open in Telegram yourself.'], prompt: 'Read the comments under the latest post in @channel and sum them up: main opinions, questions people ask, and anything I should reply to.' },
        { h2: 'Talk to a bot and go through its menus', story: 'Delivery, banking, support and booking bots often hide answers behind several menus of buttons. The agent writes to the bot, presses the buttons it needs and tells you the result.', needs: ['Every message and button press is shown to you first and runs after your yes (this is the default after login).'], prompt: 'Open @somebot, find my order status through its menu and tell me what it says. Ask me before each button you press.' },
        { h2: 'Make a custom emoji pack', story: 'You have a logo or a set of icons and want them as Telegram emoji. The agent prepares each image in the right size (100×100 px), creates the pack through Telegram’s official @Stickers bot, gives each icon a matching emoji and sends you the link to add the pack.', needs: ['A folder with your images (PNG, SVG or similar).', 'The pack takes a dozen steps with the bot. You can approve each one, or let the agent write without asking for 15 minutes: `telegram write-access on --for 15m` (you confirm that yourself).', 'Creating a pack is free. To use custom emoji in your messages you need Telegram Premium.'], prompt: 'Make a Telegram custom emoji pack called “Team emoji” from the images in the emoji folder: resize each to 100×100 PNG, create the pack with @Stickers, choose a fitting emoji for each image, and send me the link when it is done.' },
        { h2: 'Answer messages, sending only what you approve', story: 'The agent drafts replies in your words: confirms a meeting, answers a question, reacts to a message. Before anything is sent you see the exact chat and text, and it goes out only after your yes.', needs: ['Only the setup above: approval before each send is the default.'], prompt: 'Draft replies to everyone who is waiting for an answer from me today. Show me each one, and send only those I approve.' },
        { h2: 'Keep a chat as notes', story: 'An important project or study chat, saved as Markdown files in your notes (Obsidian, a folder, a repository). Next time the agent adds only the new messages. A coding agent can then use the discussion as context.', needs: ['A folder for the notes.'], prompt: 'Save the “Project X” chat from Telegram to ~/notes/project-x as Markdown. When I ask again, add only the new messages.' },
        { h2: 'Keep an eye on a chat for a while', story: 'You are waiting for news: a release, an incident, a reply in a busy group. The agent watches the chat for the time you set and tells you as soon as something relevant appears.', needs: ['Keep the agent’s session open for that time.'], prompt: 'Watch the “Support” chat in Telegram for the next 15 minutes and tell me right away if anyone reports an outage.' },
        { h2: 'Channel stats and group admin', story: 'For channel owners: how a post did compared with earlier ones, views, reactions, forwards. For group admins: who changed the settings, finding a member, muting a spammer.', needs: ['You own or administer the channel or group. Telegram shows statistics only for larger channels and groups.', 'Muting, banning or pinning is shown to you first and runs after your yes.'], prompt: 'How did my last post in @mychannel do compared with the five before it? Views, reactions and forwards, in a short table.' },
      ],
      outro: 'Have a task that is not here? Ask your agent in your own words: it knows the whole tool. Please don’t use it for bulk messaging or mass invites: Telegram limits accounts that behave like bots, and the agent is told to refuse. Questions about safety and login are answered in the [FAQ](/faq).',
    },
  },
  es: {
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
      description: 'Tareas reales para Claude, Codex o Cursor en tu propio Telegram: ponerte al día, encontrar archivos, leer comentarios, hablar con bots, crear emojis. Con prompts para copiar.',
      h1: 'Qué puede hacer un agente de IA en tu Telegram',
      lead: 'Nueve tareas cotidianas que puedes dar a Claude Code, Codex, Cursor o Claude Desktop cuando Better-TG-CLI lo conecta a tu propia cuenta de Telegram. Para cada una: qué consigues, qué necesitas y un prompt que puedes copiar tal cual. El agente lee libremente, pero no se envía nada sin tu «sí».',
      setupTitle: 'Antes de empezar (una vez, unos cinco minutos)',
      setup: ['Instala Better-TG-CLI: `brew install thevilfer/tap/better-tg-cli` en macOS o Linux, Scoop en Windows, o npm. Detalles en [Servidor MCP](/mcp).', 'Inicia sesión: ejecuta `telegram onboard` y escanea el código QR con Telegram en el móvil. No necesitas claves de API propias, y el agente nunca ve tu código ni tu contraseña.', 'Conecta tu agente: en Claude Code es una línea, `claude mcp add telegram -- telegram mcp`; para Codex, Cursor y Claude Desktop mira [Servidor MCP](/mcp).'],
      needLabel: 'Qué necesitas',
      promptLabel: 'Prompt para copiar',
      items: [
        { h2: 'Ponerte al día con lo que te perdiste', story: 'Vuelves y tienes decenas de chats sin leer. El agente repasa los no leídos, salta los silenciados y te dice quién espera tu respuesta y qué importa, lo más urgente primero. Solo lee: los chats siguen sin leer y los ves igual en Telegram.', needs: ['Solo lo de arriba.'], prompt: 'Revisa mi Telegram: ¿qué me perdí desde ayer? Sin los chats silenciados. Dime quién espera una respuesta mía y sobre qué, lo más urgente primero.' },
        { h2: 'Encontrar un mensaje, enlace o archivo perdido', story: 'Recuerdas más o menos qué era, pero no en qué chat ni cuándo. El agente busca en todos tus chats por palabras, tipo (archivo, enlace, foto, mensaje de voz) y fecha, te muestra el mensaje y puede guardar el archivo en tu equipo.', needs: ['Solo lo de arriba.'], prompt: 'Busca en Telegram la factura en PDF que me enviaron el mes pasado y guárdala en mi carpeta de Descargas.' },
        { h2: 'Leer comentarios de canales y temas de foro', story: 'Un post con cientos de comentarios, o un tema de foro que avanzó mientras no estabas. El agente lee toda la discusión y la resume: las opiniones principales, las preguntas y lo que va dirigido a ti.', needs: ['Un canal o grupo que puedas abrir tú en Telegram.'], prompt: 'Lee los comentarios bajo el último post de @canal y resúmelos: opiniones principales, preguntas de la gente y lo que debería responder yo.' },
        { h2: 'Hablar con un bot y recorrer sus menús', story: 'Los bots de reparto, bancos, soporte o reservas suelen esconder la respuesta tras varios menús de botones. El agente escribe al bot, pulsa los botones necesarios y te cuenta el resultado.', needs: ['Cada mensaje y cada botón se te muestra antes y se ejecuta tras tu «sí» (es lo predeterminado tras iniciar sesión).'], prompt: 'Abre @somebot, busca el estado de mi pedido en su menú y dime qué pone. Pregúntame antes de pulsar cada botón.' },
        { h2: 'Crear un pack de emojis personalizados', story: 'Tienes un logo o un juego de iconos y los quieres como emojis de Telegram. El agente prepara cada imagen al tamaño correcto (100×100 px), crea el pack con el bot oficial @Stickers, asigna a cada icono un emoji adecuado y te envía el enlace para añadirlo.', needs: ['Una carpeta con tus imágenes (PNG, SVG o similar).', 'El pack lleva una docena de pasos con el bot. Puedes aprobar cada uno o dejar que el agente escriba sin preguntar durante 15 minutos: `telegram write-access on --for 15m` (lo confirmas tú).', 'Crear un pack es gratis. Para usar emojis personalizados en tus mensajes necesitas Telegram Premium.'], prompt: 'Crea un pack de emojis personalizados de Telegram llamado «Team emoji» con las imágenes de la carpeta emoji: pasa cada una a PNG de 100×100, crea el pack con @Stickers, elige un emoji adecuado para cada imagen y envíame el enlace al terminar.' },
        { h2: 'Responder mensajes enviando solo lo que apruebas', story: 'El agente redacta respuestas con tus palabras: confirma una reunión, contesta una pregunta, reacciona a un mensaje. Antes de enviar nada ves el chat y el texto exactos, y solo sale tras tu «sí».', needs: ['Solo lo de arriba: la aprobación antes de cada envío es lo predeterminado.'], prompt: 'Redacta respuestas para todos los que esperan una respuesta mía hoy. Enséñame cada una y envía solo las que apruebe.' },
        { h2: 'Guardar un chat como notas', story: 'Un chat importante de un proyecto o de estudio, guardado como archivos Markdown en tus notas (Obsidian, una carpeta, un repositorio). La próxima vez el agente añade solo los mensajes nuevos. Un agente de código puede usar después la conversación como contexto.', needs: ['Una carpeta para las notas.'], prompt: 'Guarda el chat «Project X» de Telegram en ~/notes/project-x como Markdown. Cuando te lo vuelva a pedir, añade solo los mensajes nuevos.' },
        { h2: 'Vigilar un chat durante un rato', story: 'Esperas una noticia: un lanzamiento, una incidencia, una respuesta en un grupo con mucho movimiento. El agente vigila el chat el tiempo que le digas y te avisa en cuanto aparece algo relevante.', needs: ['Mantén abierta la sesión del agente durante ese tiempo.'], prompt: 'Vigila el chat «Support» de Telegram durante los próximos 15 minutos y avísame en cuanto alguien informe de una caída.' },
        { h2: 'Estadísticas de canal y administración de grupos', story: 'Para dueños de canales: cómo funcionó un post frente a los anteriores, vistas, reacciones, reenvíos. Para administradores: quién cambió la configuración, encontrar a un miembro, silenciar a un spammer.', needs: ['Eres dueño o administrador del canal o grupo. Telegram muestra estadísticas solo de canales y grupos grandes.', 'Silenciar, expulsar o fijar se te muestra antes y se ejecuta tras tu «sí».'], prompt: '¿Qué tal funcionó mi último post en @micanal frente a los cinco anteriores? Vistas, reacciones y reenvíos, en una tabla corta.' },
      ],
      outro: '¿Tu tarea no está aquí? Pídesela al agente con tus palabras: conoce toda la herramienta. No lo uses para envíos masivos ni invitaciones en masa: Telegram limita las cuentas que se comportan como bots, y el agente tiene instrucciones de negarse. Las dudas sobre seguridad e inicio de sesión están en las [Preguntas](/faq).',
    },
  },
  ru: {
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
      description: 'Реальные задачи для Claude, Codex или Cursor в вашем Telegram: разобрать непрочитанное, найти файл, прочитать комментарии, пройти бота, сделать эмодзи. С готовыми промптами.',
      h1: 'Что ИИ-агент может делать в вашем Telegram',
      lead: 'Девять обычных задач, которые можно поручить Claude Code, Codex, Cursor или Claude Desktop, когда Better-TG-CLI подключает их к вашему аккаунту Telegram. Для каждой: что вы получите, что для этого нужно и промпт, который можно скопировать как есть. Читать агент может свободно, а отправить без вашего «да» — ничего.',
      setupTitle: 'Перед началом (один раз, минут пять)',
      setup: ['Установите Better-TG-CLI: `brew install thevilfer/tap/better-tg-cli` на macOS или Linux, Scoop на Windows или npm. Подробности — на странице [MCP-сервер](/mcp).', 'Войдите: запустите `telegram onboard` и отсканируйте QR-код в Telegram на телефоне. Свои API-ключи не нужны, а код входа и пароль агент не видит.', 'Подключите агента: в Claude Code это одна строка, `claude mcp add telegram -- telegram mcp`; для Codex, Cursor и Claude Desktop — на странице [MCP-сервер](/mcp).'],
      needLabel: 'Что понадобится',
      promptLabel: 'Промпт, который можно скопировать',
      items: [
        { h2: 'Разобрать, что вы пропустили', story: 'Возвращаетесь, а там десятки непрочитанных чатов. Агент проходит по непрочитанному, пропускает чаты с выключенным звуком и говорит, кто ждёт вашего ответа и что важно, самое срочное — первым. Он только читает: чаты остаются непрочитанными, и в Telegram вы их увидите как обычно.', needs: ['Только то, что выше.'], prompt: 'Проверь мой Telegram: что я пропустил со вчерашнего дня? Чаты без звука пропусти. Перечисли, кто ждёт от меня ответа и по какому поводу, самое срочное — первым.' },
        { h2: 'Найти потерянное сообщение, ссылку или файл', story: 'Вы примерно помните, что это было, но не помните, в каком чате и когда. Агент ищет по всем чатам по словам, типу (файл, ссылка, фото, голосовое) и дате, показывает сообщение и может сохранить файл на компьютер.', needs: ['Только то, что выше.'], prompt: 'Найди в Telegram PDF со счётом, который мне присылали в прошлом месяце, и сохрани его в папку «Загрузки».' },
        { h2: 'Прочитать комментарии в канале и активные темы форума', story: 'Пост с сотнями комментариев или тема форума, где всё ушло вперёд, пока вас не было. Агент читает обсуждение целиком и пересказывает: основные мнения, вопросы людей и то, что адресовано вам.', needs: ['Канал или группа, которые вы сами можете открыть в Telegram.'], prompt: 'Прочитай комментарии под последним постом в @channel и перескажи: основные мнения, какие вопросы задают и на что мне стоит ответить.' },
        { h2: 'Поговорить с ботом и пройти его меню', story: 'У ботов доставки, банков, поддержки и бронирования ответ часто спрятан за несколькими меню с кнопками. Агент пишет боту, нажимает нужные кнопки и сообщает вам результат.', needs: ['Каждое сообщение и нажатие кнопки сначала показывается вам и выполняется после вашего «да» (так настроено сразу после входа).'], prompt: 'Открой @somebot, узнай через его меню статус моего заказа и скажи, что он ответил. Перед каждой кнопкой спрашивай меня.' },
        { h2: 'Сделать пак кастомных эмодзи', story: 'У вас есть логотип или набор иконок, и хочется, чтобы они стали эмодзи в Telegram. Агент приводит каждую картинку к нужному размеру (100×100 px), создаёт пак через официального бота @Stickers, подбирает каждой иконке эмодзи и присылает ссылку, по которой пак можно добавить.', needs: ['Папка с картинками (PNG, SVG или похожие).', 'Пак — это десяток шагов с ботом. Можно подтверждать каждый или разрешить агенту писать без вопросов на 15 минут: `telegram write-access on --for 15m` (это подтверждаете вы сами).', 'Создать пак можно бесплатно. Чтобы ставить кастомные эмодзи в свои сообщения, нужен Telegram Premium.'], prompt: 'Сделай пак кастомных эмодзи в Telegram под названием «Team emoji» из картинок в папке emoji: приведи каждую к PNG 100×100, создай пак через @Stickers, подбери каждой картинке подходящий эмодзи и пришли мне ссылку, когда закончишь.' },
        { h2: 'Ответить на сообщения, отправив только то, что вы одобрили', story: 'Агент пишет черновики ответов вашими словами: подтвердить встречу, ответить на вопрос, поставить реакцию. Перед отправкой вы видите точный чат и текст, и уходит только то, на что вы сказали «да».', needs: ['Только то, что выше: подтверждение перед каждой отправкой включено по умолчанию.'], prompt: 'Подготовь ответы всем, кто сегодня ждёт от меня ответа. Покажи каждый и отправь только те, что я одобрю.' },
        { h2: 'Сохранить чат в заметки', story: 'Важный рабочий или учебный чат сохраняется файлами Markdown в ваши заметки (Obsidian, папка, репозиторий). В следующий раз агент добавит только новые сообщения. Потом агент, который пишет код, может опираться на это обсуждение.', needs: ['Папка для заметок.'], prompt: 'Сохрани чат «Project X» из Telegram в ~/notes/project-x в формате Markdown. Когда попрошу снова — добавь только новые сообщения.' },
        { h2: 'Последить за чатом какое-то время', story: 'Вы ждёте новостей: релиза, инцидента, ответа в шумной группе. Агент следит за чатом столько, сколько вы скажете, и сообщает, как только появится что-то по теме.', needs: ['Сессия агента должна быть открыта всё это время.'], prompt: 'Последи за чатом «Support» в Telegram следующие 15 минут и сразу скажи, если кто-то сообщит о падении.' },
        { h2: 'Статистика канала и управление группой', story: 'Владельцу канала: как зашёл пост по сравнению с прошлыми, просмотры, реакции, пересылки. Админу группы: кто поменял настройки, найти участника, заглушить спамера.', needs: ['Вы владелец или админ канала или группы. Статистику Telegram показывает только для достаточно крупных каналов и групп.', 'Ограничение, бан или закрепление сначала показываются вам и выполняются после вашего «да».'], prompt: 'Как зашёл мой последний пост в @mychannel по сравнению с пятью предыдущими? Просмотры, реакции и пересылки — короткой таблицей.' },
      ],
      outro: 'Вашей задачи здесь нет? Попросите агента своими словами: он знает инструмент целиком. Не используйте его для массовых рассылок и приглашений: Telegram ограничивает аккаунты, которые ведут себя как боты, и агенту велено отказываться. Вопросы о безопасности и входе — в разделе [вопросов](/faq).',
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
      html: `<h1>${escape(c.h1)}</h1><p class="lead">${inline(c.lead, lang)}</p>
<div class="setup"><h2>${escape(c.setupTitle)}</h2><ol>${c.setup.map(x => `<li>${inline(x, lang)}</li>`).join('')}</ol></div>${c.items
        .map(i => `<section class="case"><h2>${escape(i.h2)}</h2><p>${inline(i.story, lang)}</p><h3>${escape(c.needLabel)}</h3><ul>${i.needs.map(x => `<li>${inline(x, lang)}</li>`).join('')}</ul><h3>${escape(c.promptLabel)}</h3><blockquote class="prompt">${escape(i.prompt)}</blockquote></section>`)
        .join('')}<p class="outro">${inline(c.outro, lang)}</p>`,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: c.h1,
        description: c.description,
        url,
        inLanguage: lang,
        about,
        mainEntity: { '@type': 'ItemList', itemListElement: c.items.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.h2, description: i.story.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '') })) },
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
${SHELL_CSS}
h2{font-size:21px;letter-spacing:-.3px;font-weight:600;margin:40px 0 10px}
section h2{font-size:18px;margin-top:28px}
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
.setup{margin:0 0 8px;padding:4px 20px 8px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
.setup h2{font-size:17px;margin:16px 0 6px}
.setup ol{padding-left:20px;margin:0 0 8px}
.case{margin-top:48px}
.case h2{font-size:22px;margin:0 0 8px}
.case h3{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:var(--dim);font-weight:500;margin:18px 0 6px}
.case ul{margin:0}
.prompt{margin:0;padding:14px 18px;border-left:3px solid var(--accent);background:var(--panel);border-radius:0 10px 10px 0;font-size:16px}
.outro{margin-top:48px;color:var(--dim)}
</style></head><body><main>
${header(lang, query, path)}
${html}
${footer(lang, query, path)}
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
