import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import type { LoginDriver } from '../src/auth.js';
import { startOnboarding, type ModeResult, type OnboardSession, type SavedMode } from '../src/onboard.js';
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
  onclick?: () => unknown;
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

/**
 * Loads the page in one language. `fetchImpl` defaults to the real server, with the Origin a browser
 * sends. `html`: the page as the server sent it, instead of one rendered here.
 */
function openPage(url: string, lang: string, fetchImpl?: typeof fetch, html = onboardPage({ site: 'https://site.test', returnTo: `${url}cb` }).html) {
  const u = new URL(url);
  const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)![1];
  const { document, byId } = fakeDocument(html);
  const realFetch: typeof fetch = (input, init = {}) =>
    fetch(new URL(String(input), u.origin), init.method === 'POST' ? { ...init, headers: { ...init.headers as object, origin: u.origin } } : init);
  let stateCalls = 0;
  const counted: typeof fetch = (input, init) => {
    if (String(input).endsWith('state')) stateCalls++;
    return (fetchImpl ?? realFetch)(input, init);
  };
  // The test fires the timer itself (tick); clearInterval really stops it
  let interval: (() => unknown) | undefined;
  const ctx = vm.createContext({
    document,
    navigator: { languages: [lang] },
    location: { pathname: u.pathname, hash: '' },
    history: { replaceState() {} },
    fetch: counted,
    setInterval: (fn: () => unknown) => { interval = fn; return 1; },
    clearInterval: () => { interval = undefined; },
    console,
  });
  vm.runInContext(script, ctx);
  const run = (code: string) => vm.runInContext(code, ctx) as Promise<void>;
  const visible = () => ['invite', 'connecting', 'scan', 'password', 'mode', 'done', 'error'].filter(id => !byId(id).hidden);
  return {
    poll: () => run('poll()'),
    /** One timer tick, as the browser would fire it; false once the page stopped polling */
    tick: async () => { if (!interval) return false; await interval(); return true; },
    stateCalls: () => stateCalls,
    checked: () => document.querySelector('input[name=mode]:checked')?.value,
    // The handlers return act()'s promise: wait for it, not for a fixed time
    click: async (id: string) => { await byId(id).onclick!(); },
    pick: (mode: WriteMode) => { for (const r of document.querySelectorAll('input[name=mode]')) r.checked = r.value === mode; },
    msg: () => ({ hidden: byId('msg').hidden, text: byId('msg').ownText, small: byId('msg').children.map(c => c.textContent).join('') }),
    byId,
    visible,
    heading: () => document.querySelector('h1')!.textContent,
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
async function server(plan: { refuse?: boolean; lie?: boolean; modeOnly?: boolean; modeWaitMs?: number } = {}) {
  let stored: SavedMode = { mode: 'read-only' };
  session = await startOnboarding({
    driver,
    redeemInvite: async () => ({ apiId: 42, apiHash: 'h'.repeat(32) }),
    save: () => {},
    emit: () => {},
    site: 'https://site.test',
    modeOnly: plan.modeOnly,
    defaultMode: plan.modeOnly ? undefined : 'ask',
    currentMode: () => stored,
    modeWaitMs: plan.modeWaitMs,
    applyMode: async (c): Promise<ModeResult> => {
      if (plan.refuse) return { ok: false, error: 'store_failed' };
      if (!plan.lie) stored = { mode: c.mode };
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

describe('the hints name a command that does what they say', () => {
  it.each(LANGS)('%s', lang => {
    const L = STRINGS[lang] as unknown as Record<string, unknown>;
    const texts = [...Object.values(L), ...Object.values(L.errors as object)].filter((t): t is string => typeof t === 'string');
    // `telegram write-access` alone only prints the status: a hint to change the mode says which one,
    // and the status is named only as such ("with nothing after it")
    const status = /telegram write-access (with nothing after it|sin nada más|без аргументов)/;
    for (const t of texts) for (const m of t.matchAll(/telegram write-access(?! (ask|on|off)\b)(?! (with nothing after it|sin nada más|без аргументов))/g)) expect.fail(`${lang}: "${t.slice(Math.max(0, m.index! - 30), m.index! + 40)}"`);
    // Where the mode may have changed out of sight, the hint says how to see it
    for (const k of ['goneSaved', 'goneMode', 'notSentMode']) expect(L[k], `${lang}: ${k}`).toMatch(status);
    // Only the hint before the login sends the person back to onboard
    for (const k of ['goneSaved', 'goneMode']) expect(L[k], `${lang}: ${k}`).not.toMatch(/telegram onboard (again|de nuevo|ещё|заново)|vuelva a ejecutar telegram onboard|запустить telegram onboard/);
    expect((L.errors as Record<string, string>).internal).not.toContain('telegram onboard');
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
    expect(page.checked()).toBe('read-only');
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
    const calls = page.stateCalls();
    expect(await page.tick()).toBe(false); // the timer is cleared
    expect(page.stateCalls()).toBe(calls);
  });

  /** A 200 whose body breaks off midway, as when the connection drops after the headers */
  const cutOff = () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"step":')); c.error(new TypeError('network error')); } }), { status: 200 });

  it('a state answer cut off after the headers counts as a drop: polling goes on and recovers', async () => {
    const s = await server();
    let cut = true;
    const page = openPage(s.url, lang, (input, init) =>
      cut ? Promise.resolve(cutOff()) : fetch(new URL(String(input), new URL(s.url).origin), init));
    await page.poll();
    expect(page.msg()).toEqual({ hidden: false, text: L.gone, small: '' });
    cut = false;
    expect(await page.tick()).toBe(true); // still polling
    expect(page.msg().hidden).toBe(true);
    expect(page.visible()).toEqual(['invite']);
  });

  it('a whole 200 that is not JSON is not the state: polling stops', async () => {
    const s = await server();
    const page = openPage(s.url, lang, async () => new Response('<html>proxy</html>', { status: 200 }));
    await page.poll();
    expect(page.msg()).toEqual({ hidden: false, text: L.failed, small: 'HTTP 200' });
    expect(await page.tick()).toBe(false);
  });

  it('a click lost on the way: the drop line goes once the server answers, and it says to try again', async () => {
    const s = await server();
    const real = (input: RequestInfo | URL, init?: RequestInit) => fetch(new URL(String(input), new URL(s.url).origin), init);
    const page = openPage(s.url, lang, (input, init) =>
      init?.method === 'POST' ? Promise.reject(new TypeError('Failed to fetch')) : real(input, init));
    await page.poll();
    await page.click('use');
    expect(page.msg().text).not.toBe(L.gone);
    expect(page.msg()).toEqual({ hidden: false, text: L.notSent, small: '' });
    expect(page.visible()).toEqual(['invite']);
  });

  it('a click lost in a longer drop still says to try again once the server is back', async () => {
    // The POST and the poll right after it both fail; a later poll gets through
    const s = await server();
    let down = false;
    const page = openPage(s.url, lang, (input, init) =>
      down ? Promise.reject(new TypeError('Failed to fetch')) : fetch(new URL(String(input), new URL(s.url).origin), init));
    await page.poll();
    down = true;
    await page.click('use');
    expect(page.msg().text).toBe(L.gone);
    await page.tick();
    expect(page.msg().text).toBe(L.gone);
    down = false;
    await page.tick();
    expect(page.msg()).toEqual({ hidden: false, text: L.notSent, small: '' });
  });

  it('a POST error body cut short shows the generic text and the status, not a raw code alone', async () => {
    const s = await server();
    const page = openPage(s.url, lang, async (input, init) =>
      init?.method === 'POST'
        ? new Response(new ReadableStream({ start(c) { c.error(new TypeError('network error')); } }), { status: 409 })
        : fetch(new URL(String(input), new URL(s.url).origin), init));
    await page.click('keys');
    expect(page.msg()).toEqual({ hidden: false, text: L.failed, small: 'HTTP 409' });
  });

  it('done clears the error of the step before it', async () => {
    // The store refuses, nobody picks, the step times out: "done" with read-only and no stale "in effect: …" line
    const s = await server({ refuse: true, modeWaitMs: 400 });
    const page = openPage(s.url, lang);
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    await page.poll();
    expect(page.msg().text).toContain(E.store_failed);
    await s.untilStep('done');
    await page.tick();
    expect(page.visible()).toEqual(['done']);
    expect(page.byId('donetext').textContent).toBe(L.doneMode.replace('{user}', 'Alice (@alice)').replace('{mode}', L.roName));
    expect(page.msg().hidden).toBe(true);
  });

  it('a drop after the login says the login is saved and names write-access, not onboard', async () => {
    const s = await server();
    let down = false;
    const page = openPage(s.url, lang, (input, init) =>
      down ? Promise.reject(new TypeError('Failed to fetch')) : fetch(new URL(String(input), new URL(s.url).origin), init));
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    await page.poll();
    down = true;
    await page.tick();
    expect(page.msg().text).toBe(L.goneSaved);
    expect(L.goneSaved).not.toContain('telegram onboard again');
    expect(L.goneSaved).toMatch(/telegram write-access ask, on/);
  });
  it('a click on the mode lost on the way does not claim it never arrived: the result is unknown', async () => {
    // The server may have taken it (and be showing a dialog); the page says how to check
    const s = await server();
    const real = (input: RequestInfo | URL, init?: RequestInit) => fetch(new URL(String(input), new URL(s.url).origin), init);
    const page = openPage(s.url, lang, (input, init) =>
      init?.method === 'POST' && String(input).endsWith('mode') ? Promise.reject(new TypeError('Failed to fetch')) : real(input, init));
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    await page.poll();
    page.pick('on');
    await page.click('modego');
    expect(page.visible()).toEqual(['mode']);
    expect(page.msg()).toEqual({ hidden: false, text: L.notSentMode, small: '' });
    expect(L.notSentMode).not.toBe(L.notSent);
  });

  it('after done, a late answer to a click changes nothing', async () => {
    // The GET sees "done" and stops polling; the POST that did it loses its answer afterwards
    const s = await server();
    const real = (input: RequestInfo | URL, init?: RequestInit) => fetch(new URL(String(input), new URL(s.url).origin), init);
    let lose!: () => void;
    const page = openPage(s.url, lang, (input, init) => {
      if (init?.method !== 'POST') return real(input, init);
      const origin = new URL(s.url).origin; // a browser sends it on every POST
      return real(input, { ...init, headers: { ...init.headers as object, origin } }).then(() => new Promise<Response>((_, reject) => { lose = () => reject(new TypeError('Failed to fetch')); }));
    });
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    await page.poll();
    page.pick('read-only');
    const clicked = page.click('modego');
    await s.untilStep('done');
    while (!lose) await new Promise(r => setTimeout(r, 5));
    expect(await page.tick()).toBe(true);
    expect(page.visible()).toEqual(['done']);
    lose();
    await clicked;
    expect(page.visible()).toEqual(['done']);
    expect(page.msg().hidden).toBe(true);
  });

  it('after done, a poll sent before it and answered late does not bring the old step back', async () => {
    const s = await server();
    const origin = new URL(s.url).origin;
    let hold = false, release!: () => void;
    const page = openPage(s.url, lang, async (input, init) => {
      const res = await fetch(new URL(String(input), origin), init?.method === 'POST' ? { ...init, headers: { ...init.headers as object, origin } } : init);
      if (!hold || init?.method === 'POST') return res;
      hold = false;
      const body = await res.text(); // the "mode" state, as it was when the poll was sent
      return new Promise<Response>(r => { release = () => r(new Response(body, { status: 200 })); });
    });
    await s.post('invite', { invite: 'tok' });
    await s.untilStep('mode');
    await page.poll();
    hold = true;
    const late = page.tick();
    while (!release) await new Promise(r => setTimeout(r, 5));
    page.pick('read-only');
    await page.click('modego');
    expect(page.visible()).toEqual(['done']);
    release();
    await late;
    expect(page.visible()).toEqual(['done']);
  });

  it('write-access on a page: a drop on the very first poll already names that command', async () => {
    // The page the server sends knows it is write-access alone before any /state answer
    const s = await server({ modeOnly: true });
    const html = await (await fetch(s.url)).text();
    const page = openPage(s.url, lang, () => Promise.reject(new TypeError('Failed to fetch')), html);
    await page.poll();
    expect(page.msg().text).toBe(L.goneMode);
    expect(page.heading()).toBe(L.modeTitle); // not the login heading
  });

  it('a 404 whose body is cut short is still an old link: polling stops', async () => {
    const s = await server();
    const page = openPage(s.url, lang, async () =>
      new Response(new ReadableStream({ start(c) { c.error(new TypeError('network error')); } }), { status: 404 }));
    await page.poll();
    expect(page.msg()).toEqual({ hidden: false, text: E.not_found, small: '' });
    expect(await page.tick()).toBe(false);
  });
  /** A fetch whose answers the test hands out by hand, in any order */
  const manual = () => {
    const pending: { route: string; method: string; answer: (r: Response | Error) => void }[] = [];
    const fetchImpl: typeof fetch = (input, init) => new Promise<Response>((resolve, reject) => {
      pending.push({ route: String(input).split('/').pop()!, method: init?.method ?? 'GET', answer: r => r instanceof Error ? reject(r) : resolve(r) });
    });
    const next = async (route: string) => {
      for (let i = 0; i < 100; i++) {
        const k = pending.findIndex(p => p.route === route);
        if (k >= 0) return pending.splice(k, 1)[0];
        await new Promise(r => setTimeout(r, 1));
      }
      throw new Error(`no ${route} request`);
    };
    return { fetchImpl, next };
  };
  const settle = () => new Promise(r => setTimeout(r, 5));
  const state = (s: object) => new Response(JSON.stringify(s), { status: 200 });

  it('a password POST whose answer is lost after the page moved on to the mode says nothing about the mode', async () => {
    const f = manual();
    const page = openPage('http://127.0.0.1:1/s/x/', lang, f.fetchImpl);
    // The poll the page sends as it loads
    (await f.next('state')).answer(state({ step: 'password', hint: 'h' }));
    await settle();
    expect(page.visible()).toEqual(['password']);
    const clicked = page.click('pwgo');
    const pw = await f.next('password');
    // The server took the password: the next poll shows the mode step
    const tick = page.tick();
    (await f.next('state')).answer(state({ step: 'mode', mode: 'ask' }));
    await tick;
    expect(page.visible()).toEqual(['mode']);
    // Only now the answer to the password POST is lost
    pw.answer(new TypeError('Failed to fetch'));
    (await f.next('state')).answer(state({ step: 'mode', mode: 'ask' })); // act() polls after it
    await clicked;
    expect(page.visible()).toEqual(['mode']);
    expect(page.msg().hidden).toBe(true);
  });

  for (const late of ['a dropped connection', 'a body cut short'] as const) {
    it(`after an old link stopped polling, ${late} on a poll still on its way keeps the old-link text`, async () => {
      const f = manual();
      const page = openPage('http://127.0.0.1:1/s/x/', lang, f.fetchImpl);
      // The poll the page sends as it loads, and a timer tick while it is still on its way
      const ra = await f.next('state');
      const b = page.tick();
      const rb = await f.next('state');
      ra.answer(new Response(new ReadableStream({ start(c) { c.error(new TypeError('network error')); } }), { status: 404 }));
      await settle();
      expect(page.msg()).toEqual({ hidden: false, text: E.not_found, small: '' });
      rb.answer(late === 'a dropped connection' ? new TypeError('Failed to fetch') : cutOff());
      await b;
      expect(page.msg()).toEqual({ hidden: false, text: E.not_found, small: '' });
      expect(await page.tick()).toBe(false);
    });
  }
});
