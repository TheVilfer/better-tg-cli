// Fetches the official human descriptions for every TL method from core.telegram.org/method/<ns.method>
// once, and writes a compact committed data file (scripts/data/tl-docs-layer229.json) with a short
// description, per-parameter descriptions and the top "Possible errors" for each method. The CLI
// embeds this (scripts/gen-tl-commands.mjs → src/generated/tl-docs.ts) to render rich `--help`; it is
// NEVER fetched at runtime.
//
//   node scripts/fetch-tl-docs.mjs            fetch (cached) + rebuild the data file
//   node scripts/fetch-tl-docs.mjs --no-fetch rebuild the data file from the cache only
//
// Polite: ~4 concurrent, a small delay, a couple of retries, a naming User-Agent, and raw HTML cached
// under .tl-docs-cache/ (gitignored) so reruns are cheap. The docs site is a layer or two behind the
// bundled schema, so methods new in the current layer 404 or have no description — those get a clear
// fallback line pointing at the (future) docs URL.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(root, '.tl-docs-cache');
const OUT = join(root, 'scripts/data/tl-docs-layer229.json');
const SCHEMA_LAYER = 229;
const UA = 'better-tg-cli docs fetch (+https://github.com/TheVilfer/better-tg-cli)';
const CONCURRENCY = 4;
const DELAY_MS = 120;
const MAX_DESC = 240;
const MAX_PARAM = 150;
const MAX_ERRORS = 4;

const noFetch = process.argv.includes('--no-fetch');

/** lowerCamel method part for the docs URL: "GetHistory" → "getHistory", "InvokeWithLayer" → "invokeWithLayer". */
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Every TL method: { className, ns, name, urlPath }. */
function methods() {
  const defs = require('teleproto/tl/generated/api-definitions.js');
  return defs.filter((d) => d.isFunction).map((d) => {
    const ns = d.namespace ?? '';
    const className = ns ? `${ns}.${d.name}` : d.name;
    const urlPath = ns ? `${ns}.${lowerFirst(d.name)}` : lowerFirst(d.name);
    return { className, ns, name: d.name, urlPath };
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cacheFile = (urlPath) => join(CACHE, `${urlPath}.html`);

async function fetchOne(urlPath) {
  const file = cacheFile(urlPath);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  if (noFetch) return '';
  const url = `https://core.telegram.org/method/${urlPath}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
      if (res.status === 404) { writeFileSync(file, ''); return ''; } // no page: cache the miss
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      writeFileSync(file, html);
      return html;
    } catch (e) {
      if (attempt === 2) { console.error(`  ${urlPath}: ${e.message} (giving up)`); return ''; }
      await sleep(500 * (attempt + 1));
    }
  }
  return '';
}

// ---- tiny HTML helpers (no deps) --------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»' };
// Plain text for terminal help: drop tags until none are left (one pass can leave a tag behind,
// e.g. `<scr<b>ipt>`), then decode entities exactly once, last, so decoded `<`/`>` stay text.
function stripHtml(s) {
  let text = s.replace(/<\/(p|div|tr|td|th|li|h[1-6])>/gi, ' ');
  for (let prev = ''; prev !== text; ) {
    prev = text;
    text = text.replace(/<[^>]*>/g, '');
  }
  return text
    .replace(/[<>]/g, '')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? (/^#\d+$/.test(e) ? String.fromCodePoint(+e.slice(1)) : m))
    .replace(/\s+/g, ' ')
    .trim();
}
function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '')).trim() + (stop > max * 0.5 ? '' : '…');
}
function tableAfter(html, heading) {
  const h = new RegExp(`${heading}</h[0-9]>\\s*(<table[\\s\\S]*?</table>)`, 'i').exec(html);
  if (!h) return [];
  // Only <td> cells, so the <th> header row (Name|Type|Description) yields nothing and is dropped.
  return [...h[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((r) => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripHtml(c[1])))
    .filter((cells) => cells.length >= 2);
}

/** Normalised param key so snake_case docs match camelCase schema names (offset_id ↔ offsetId). */
const normParam = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function parsePage(html) {
  const body = /<div id="dev_page_content">([\s\S]*?)<\/div>\s*(?:<div|<script|<footer|$)/i.exec(html);
  const content = body ? body[1] : html;
  // Description: the first <p> before the first table/section heading.
  const beforeTable = content.split(/<h[0-9]|<table/i)[0];
  const firstP = /<p>([\s\S]*?)<\/p>/i.exec(beforeTable);
  const description = firstP ? clip(stripHtml(firstP[1]), MAX_DESC) : '';

  const params = {};
  for (const row of tableAfter(content, 'Parameters')) {
    const [name, , ...rest] = row;
    const desc = row.length >= 3 ? row[2] : rest.join(' ');
    if (name && desc) params[normParam(name)] = clip(desc, MAX_PARAM);
  }

  const errors = [];
  for (const row of tableAfter(content, 'Possible errors')) {
    if (errors.length >= MAX_ERRORS) break;
    const [code, name, desc] = row;
    if (name) errors.push([code || '', name, clip(desc || '', 90)]);
  }

  return { description, params, errors };
}

// ---- run --------------------------------------------------------------------------------------

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(dirname(OUT), { recursive: true });
  const all = methods();
  const queue = [...all];
  const out = {};
  let done = 0;
  let official = 0;

  async function worker() {
    while (queue.length) {
      const m = queue.shift();
      const html = await fetchOne(m.urlPath);
      const parsed = html ? parsePage(html) : { description: '', params: {}, errors: [] };
      const entry = {};
      if (parsed.description) { entry.d = parsed.description; official++; }
      else entry.d = `No official description (may be new in layer ${SCHEMA_LAYER}). See https://core.telegram.org/method/${m.urlPath}`;
      if (Object.keys(parsed.params).length) entry.p = parsed.params;
      if (parsed.errors.length) entry.e = parsed.errors;
      out[m.className] = entry;
      done++;
      if (done % 100 === 0) console.error(`  …${done}/${all.length}`);
      if (!noFetch) await sleep(DELAY_MS);
    }
  }
  console.error(`${noFetch ? 'Rebuilding from cache' : 'Fetching'} docs for ${all.length} methods…`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const data = {
    source: 'https://core.telegram.org/method/<namespace>.<lowerCamelMethod>',
    schemaLayer: SCHEMA_LAYER,
    fetched: new Date().toISOString().slice(0, 10),
    counts: { total: all.length, official, fallback: all.length - official },
    methods: Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]])),
  };
  writeFileSync(OUT, JSON.stringify(data) + '\n');
  console.error(`Wrote ${OUT}: ${all.length} methods, ${official} with an official description, ${all.length - official} fallback.`);
  console.error(`Cache: ${readdirSync(CACHE).length} files in ${CACHE} (gitignored).`);
}

main();
