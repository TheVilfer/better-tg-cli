/** What search engines and AI crawlers read besides the pages: robots, sitemap, llms.txt, JSON-LD, IndexNow. */
import { LANGS, type Lang } from './i18n';

export const SITE = 'https://better-tg-cli.com';
const REPO = 'https://github.com/TheVilfer/better-tg-cli';
/** The indexable pages; each exists in every language at ?lang= (English at the bare URL) */
const PAGES = ['/', '/mcp', '/faq', '/compare', '/login'];

/**
 * IndexNow (Bing, Yandex and others): the key is public by design, served at /<key>.txt, and
 * scripts/indexnow.mjs submits the pages with it after a deploy.
 */
export const INDEXNOW_KEY = '6236b353d57727a820b99d9950bb2abe';

export const pageUrl = (path: string, lang: Lang) => (lang === 'en' ? `${SITE}${path}` : `${SITE}${path}?lang=${lang}`);
export const PAGE_URLS = PAGES.flatMap(path => LANGS.map(lang => pageUrl(path, lang)));

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /v1/\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

/** Every page in every language, each with its alternates (the same set as the pages' hreflang links). */
export function sitemapXml(): string {
  const xml = (s: string) => s.replace(/&/g, '&amp;');
  const alternates = (path: string) => [
    ...LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xml(pageUrl(path, l))}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(pageUrl(path, 'en'))}"/>`,
  ];
  const urls = PAGES.flatMap(path => LANGS.map(lang => [`  <url>`, `    <loc>${xml(pageUrl(path, lang))}</loc>`, ...alternates(path), `  </url>`].join('\n')));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/** https://llmstxt.org: a plain summary with links for language models. */
export const LLMS_TXT = `# Better-TG-CLI

> Better-TG-CLI is an open-source (MIT) Telegram client for your own account, made for AI agents and the command line. It is a CLI (\`telegram\`), an MCP server (\`telegram mcp\`) and an agent skill for Claude Code, Codex, Cursor, Claude Desktop, Gemini CLI and Grok. It talks to Telegram directly over MTProto (current API layer), so agents can read, search and send messages, read comments, threads and forum topics, and press bot buttons.

- After login the account is in mode "ask": the agent shows the exact action and sends only after the user says yes. Read-only is one command away (\`telegram write-access off\`), and writing without asking needs a person to confirm it in a terminal or a system dialog. The modes guard against an agent's mistakes, not against an agent that runs commands on the computer as the user.
- The session is kept in the macOS Keychain, the Linux Secret Service, Windows DPAPI or 1Password. Messages go only to Telegram.
- One file, zero runtime dependencies. Install: \`brew install thevilfer/tap/better-tg-cli\`, \`scoop install better-tg-cli\` or \`npm install -g better-tg-cli\`; the skill: \`npx skills add TheVilfer/better-tg-cli\`.
- Not affiliated with Telegram.

## Docs

- [README](${REPO}/blob/main/README.md): install, login, every way to connect an agent
- [Security](${REPO}/blob/main/SECURITY.md): write modes, what an agent can and cannot do
- [Privacy](${REPO}/blob/main/PRIVACY.md): what leaves your machine
- [Agent skill](${REPO}/blob/main/skills/better-tg-cli/SKILL.md): how an agent should use the CLI

## Pages

- [Telegram MCP server for Claude Code, Cursor, Codex and Claude Desktop](${SITE}/mcp): install, log in, connect a client
- [FAQ](${SITE}/faq): account safety, how sends are approved, where the session is stored
- [Telegram MCP servers compared](${SITE}/compare): Better-TG-CLI, chigwell/telegram-mcp, chaindead/telegram-mcp, WireCatLabs/tg-cli

## Links

- [GitHub](${REPO}) · [npm](https://www.npmjs.com/package/better-tg-cli) · [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=better-tg-cli) · [Releases](${REPO}/releases)
- [Free login key](${SITE}/login): log in without registering your own Telegram API app
`;

/** schema.org data for the landing page: the app, its source and its author. */
export function jsonLd(description: string, lang: Lang): string {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE}/#app`,
        name: 'Better-TG-CLI',
        alternateName: ['better-tg-cli', 'telegram CLI and MCP server for AI agents'],
        description,
        url: pageUrl('/', lang),
        inLanguage: lang,
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Telegram client, MCP server',
        operatingSystem: 'macOS, Linux, Windows',
        downloadUrl: `${REPO}/releases/latest`,
        installUrl: 'https://www.npmjs.com/package/better-tg-cli',
        image: `${SITE}/og.png`,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        license: 'https://opensource.org/licenses/MIT',
        author: { '@id': `${SITE}/#author` },
        sameAs: [REPO, 'https://www.npmjs.com/package/better-tg-cli'],
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': `${REPO}#source`,
        name: 'better-tg-cli',
        codeRepository: REPO,
        programmingLanguage: 'TypeScript',
        runtimePlatform: 'Node.js, Bun',
        license: 'https://opensource.org/licenses/MIT',
        targetProduct: { '@id': `${SITE}/#app` },
        author: { '@id': `${SITE}/#author` },
      },
      {
        '@type': 'Person',
        '@id': `${SITE}/#author`,
        name: 'Sergei Polin',
        url: 'https://github.com/TheVilfer',
        sameAs: ['https://github.com/TheVilfer', 'https://x.com/vilfer_dev'],
      },
    ],
  };
  // Inside <script>, "<" must not start "</script>"
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
