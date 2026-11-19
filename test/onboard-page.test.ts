import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import type { LoginDriver } from '../src/auth.js';
import { startOnboarding, type ModeResult, type OnboardSession } from '../src/onboard.js';
import { onboardPage, STRINGS } from '../src/onboard-page.js';
import type { WriteMode } from '../src/write-state.js';

/**
 * The onboarding page's own script, run in node:vm against a tiny fake DOM and the real local
 * server: what the person actually reads in each language, not only which strings are shipped.
 */

type Lang = keyof typeof STRINGS;
const LANGS = Object.keys(STRINGS) as Lang[];

class El {
  ownText = '';
  children: El[] = [];
  hidden: boolean;
  disabled = false;
  checked: boolean;
  value: string;
  placeholder = '';
  className = '';
  innerHTML = '';
  onclick?: () => void;
  onchange?: () => void;
  onkeydown?: (e: unknown) => void;
  dataset: Record<string, string> = {};
  constructor(public tag: string, public attrs: Record<string, string> = {}) {
    this.hidden = 'hidden' in attrs;
    this.checked = 'checked' in attrs;
    this.value = attrs.value ?? '';
    for (const [k, v] of Object.entries(attrs)) if (k.startsWith('data-')) this.dataset[k.slice(5)] = v;
  }
  get textContent(): string { return this.ownText + this.children.map(c => c.textContent).join(''); }
  set textContent(t: string) { this.ownText = t; this.children = []; }
  appendChild(c: El) { this.children.push(c); return c; }
  getAttribute(name: string) { return this.attrs[name] ?? null; }
}

/** Every opening tag of the page as an element; enough for the selectors the script uses. */
function fakeDocument(html: string) {
  const els: El[] = [];
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g)) {
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] ?? '';
    els.push(new El(m[1], attrs));
  }
  const radios = () => els.filter(e => e.tag === 'input' && e.attrs.name === 'mode');
  const document = {
    title: '',
    documentElement: { lang: '' },
    getElementById: (id: string) => els.find(e => e.attrs.id === id) ?? null,
    createElement: (tag: string) => new El(tag),
    querySelectorAll(sel: string) {
      if (sel === '[data-t]') return els.filter(e => 'data-t' in e.attrs);
      if (sel === '[data-ph]') return els.filter(e => 'data-ph' in e.attrs);
      if (sel === 'input[name=mode]') return radios();
      throw new Error(`selector not faked: ${sel}`);
    },
    querySelector(sel: string) {
      if (sel === 'input[name=mode]:checked') return radios().find(r => r.checked) ?? null;
      if (sel === 'h1') return els.find(e => e.tag === 'h1');
      if (sel === 'h1 + p') return els[els.findIndex(e => e.tag === 'h1') + 1];
      const v = /^input\[name=mode\]\[value="([^"]+)"\]$/.exec(sel);
      if (v) return radios().find(r => r.value === v[1]) ?? null;
      throw new Error(`selector not faked: ${sel}`);
    },
  };
  return { document, byId: (id: string) => document.getElementById(id)! };
}

/** Loads the page in one language. `fetchImpl` defaults to the real server, with the Origin a browser sends. */
function openPage(url: string, lang: string, fetchImpl?: typeof fetch) {
  const u = new URL(url);
  const html = onboardPage({ site: 'https://site.test', returnTo: `${url}cb` }).html;
  const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)![1];
  const { document, byId } = fakeDocument(html);
  const realFetch: typeof fetch = (input, init = {}) =>
    fetch(new URL(String(input), u.origin), init.method === 'POST' ? { ...init, headers: { ...init.headers as object, origin: u.origin } } : init);
  const ctx = vm.createContext({
    document,
    navigator: { languages: [lang] },
    location: { pathname: u.pathname, hash: '' },
    history: { replaceState() {} },
    fetch: fetchImpl ?? realFetch,
    setInterval: () => 1, // the test drives poll() itself
    clearInterval() {},
    console,
  });
  vm.runInContext(script, ctx);
  const run = (code: string) => vm.runInContext(code, ctx) as Promise<void>;
  const visible = () => ['invite', 'connecting', 'scan', 'password', 'mode', 'done', 'error'].filter(id => !byId(id).hidden);
  return {
    poll: () => run('poll()'),
    click: async (id: string) => { byId(id).onclick!(); await new Promise(r => setTimeout(r, 30)); },
    pick: (mode: WriteMode) => { for (const r of document.querySelectorAll('input[name=mode]')) r.checked = r.value === mode; },
    msg: () => ({ hidden: byId('msg').hidden, text: byId('msg').ownText, small: byId('msg').children.map(c => c.textContent).join('') }),
    byId,
    visible,
  };
}

const driver: LoginDriver = {
  async login(_creds, io) {
    io.onQr('tg://login?token=abc');
    await new Promise(r => setTimeout(r, 10));
    return { session: 'SESSION', user: { id: '1', name: 'Alice', username: 'alice' } };
  },
};

let session: OnboardSession | undefined;
afterEach(() => session?.close());

/** A server whose store refuses (`refuse`), or says ok but keeps the old value (`lie`). */
async function server(plan: { refuse?: boolean; lie?: boolean; modeOnly?: boolean } = {}) {
  let stored: WriteMode = 'read-only';
  session = await startOnboarding({
    driver,
    redeemInvite: async () => ({ apiId: 42, apiHash: 'h'.repeat(32) }),
    save: () => {},
    emit: () => {},
    site: 'https://site.test',
    modeOnly: plan.modeOnly,
    defaultMode: plan.modeOnly ? undefined : 'ask',
    currentMode: () => stored,
    applyMode: async (c): Promise<ModeResult> => {
      if (plan.refuse) return { ok: false, error: 'store_failed' };
      if (!plan.lie) stored = c.mode;
      return { ok: true };
    },
  });
  const origin = new URL(session.url).origin;
  const post = (route: string, body: unknown) =>
    fetch(session!.url + route, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) });
  const untilStep = async (step: string) => {
    for (let i = 0; i < 100; i++) {
      if ((await (await fetch(session!.url + 'state')).json()).step === step) return;
      await new Promise(r => setTimeout(r, 10));
    }
    throw new Error(`never reached ${step}`);
  };
  return { url: session.url, post, untilStep };
}

describe('every code the server sends has a text', () => {
  const source = readFileSync(new URL('../src/onboard.ts', import.meta.url), 'utf8');
  const codes = new Set([
    ...[...source.matchAll(/error: '([a-z_]+)'/g)].map(m => m[1]),
    ...[...source.matchAll(/state\.error = '([a-z_]+)'/g)].map(m => m[1]),
    ...[...(/error: ((?:'[a-z_]+'\s*\|?\s*)+)/.exec(source.slice(source.indexOf('export type ModeResult')))![1].matchAll(/'([a-z_]+)'/g))].map(m => m[1]),
  ]);

  it('finds the codes in src/onboard.ts', () => {
    for (const c of ['not_found', 'wrong_origin', 'not_waiting_for_mode', 'store_failed', 'needs_terminal', 'wrong_password']) expect(codes).toContain(c);
  });

  it.each(LANGS)('%s', lang => {
    const errors = STRINGS[lang].errors as Record<string, string>;
    for (const c of codes) expect(errors[c], `${lang}: ${c}`).toMatch(/\S/);
    // No leftover English in the other languages
    if (lang !== 'en') for (const c of codes) expect(errors[c], `${lang}: ${c}`).not.toBe((STRINGS.en.errors as Record<string, string>)[c]);
  });
});

describe.each(LANGS)('the page in %s', lang => {
  const L = STRINGS[lang];
  const E = L.errors;

  it('a store failure right after the login: the mode step, the reason and the mode really in effect', async () => {
    const s = await server({ refuse: true });
    const page = openPage(s.url, lang);
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    await page.poll();
    expect(page.visible()).toEqual(['mode']);
    expect(page.msg()).toEqual({ hidden: false, text: `${E.store_failed} ${L.inEffect.replace('{mode}', L.roName)}`, small: '' });
    // The radio shows what is saved (read-only), not the default that failed
    expect(page.byId('modego').hidden).toBe(false);
    expect((await (await fetch(s.url + 'state')).json())).toMatchObject({ step: 'mode', mode: 'read-only', error: 'store_failed' });
  });

  it('a store that says ok but keeps the old value is not reported as saved', async () => {
    const s = await server({ lie: true });
    const page = openPage(s.url, lang);
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    page.pick('on');
    await page.click('modego');
    expect(page.visible()).toEqual(['mode']);
    expect(page.msg().text).toBe(`${E.store_failed} ${L.inEffect.replace('{mode}', L.roName)}`);
  });

  it('done shows the saved mode', async () => {
    const s = await server();
    const page = openPage(s.url, lang);
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    page.pick('read-only');
    await page.click('modego');
    expect(page.visible()).toEqual(['done']);
    expect(page.byId('donetext').textContent).toBe(L.doneMode.replace('{user}', 'Alice (@alice)').replace('{mode}', L.roName));
    expect(page.msg().hidden).toBe(true);
  });

  it('a known code from a POST is translated, with no raw code on screen', async () => {
    const s = await server();
    const page = openPage(s.url, lang);
    await page.click('pwgo'); // no password was asked for
    expect(page.msg()).toEqual({ hidden: false, text: E.not_waiting_for_password, small: '' });
    page.byId('apiId').value = 'abc';
    await page.click('keys');
    expect(page.msg().text).toBe(E.bad_keys);
  });

  it('an unknown code gets the generic text and the code in small print', async () => {
    const s = await server();
    const page = openPage(s.url, lang, async (input, init) =>
      String(input).endsWith('invite') && init?.method === 'POST'
        ? new Response(JSON.stringify({ error: 'brand_new_code' }), { status: 418 })
        : fetch(new URL(String(input), new URL(s.url).origin), init));
    await page.click('keys');
    expect(page.msg()).toEqual({ hidden: false, text: L.failed, small: 'brand_new_code' });
  });

  it('a dropped connection says the command may have been stopped, keeps polling and recovers', async () => {
    const s = await server();
    let down = true;
    const page = openPage(s.url, lang, (input, init) =>
      down ? Promise.reject(new TypeError('Failed to fetch')) : fetch(new URL(String(input), new URL(s.url).origin), init));
    await page.poll();
    expect(page.msg()).toEqual({ hidden: false, text: L.gone, small: '' });
    expect(L.gone).toContain('telegram onboard');
    down = false;
    await page.poll(); // still polling: the message goes once the server answers
    expect(page.msg().hidden).toBe(true);
    expect(page.visible()).toEqual(['invite']);
  });

  it('write-access on a page: a drop names that command', async () => {
    const s = await server({ modeOnly: true });
    let down = false;
    const page = openPage(s.url, lang, (input, init) =>
      down ? Promise.reject(new TypeError('Failed to fetch')) : fetch(new URL(String(input), new URL(s.url).origin), init));
    await page.poll();
    down = true;
    await page.poll();
    expect(page.msg().text).toBe(L.goneMode);
    expect(L.goneMode).toContain('telegram write-access');
  });

  it('an HTTP error is not a drop: an old link says so and polling stops', async () => {
    const s = await server();
    const stale = s.url.replace(/\/s\/[^/]+\//, '/s/old-secret/');
    const page = openPage(stale, lang);
    await page.poll();
    expect(page.msg()).toEqual({ hidden: false, text: E.not_found, small: '' });
    expect(page.visible()).toEqual([]);
  });
});
