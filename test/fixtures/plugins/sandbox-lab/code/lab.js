// Test plugin for the sandbox: each op calls one host API or tries one escape.
const ops = {
  me: host => host.me(),
  mine: (host, a) => host.messages.mine(a[0]),
  chats: (host, a) => host.chats.list(a[0]),
  read: (host, a) => host.messages.read(a[0], a[1]),
  search: (host, a) => host.messages.search(a[0], a[1]),
  target: host => host.target.message(),
  targetThread: (host, a) => host.target.thread(a[0]),
  get: host => host.storage.get('notes'),
  list: host => host.storage.list(),
  setting: (host, a) => host.settings.get(a[0]),
  // What a command without effects is not given
  granted: host => ({ set: typeof host.storage.set, propose: typeof (host.actions && host.actions.propose), log: typeof host.log }),
  globals: () => ({
    require: typeof require, process: typeof process, fetch: typeof fetch, WebAssembly: typeof WebAssembly, Bun: typeof Bun,
    setTimeout: typeof setTimeout, std: typeof std, os: typeof os, bridge: typeof globalThis.__tgBridge,
    viaFunction: Function('return typeof globalThis.__tgBridge')(),
  }),
  frozen: host => { try { host.me = 1; return 'mutable'; } catch (e) { return 'frozen'; } },
  log: host => { host.log('debug line', { n: 1 }); return 'logged'; },
  spin: () => { for (;;) {} },
  never: () => new Promise(() => {}),
  awaitZero: async () => { await 0; await null; return 'ok'; },
  burst: host => Promise.all([1, 2, 3, 4, 5].map(() => host.storage.list())),
  many: async host => { for (let i = 0; i < 250; i++) await host.storage.list(); return 'done'; },
  big: () => { const a = []; for (;;) a.push('x'.repeat(1 << 16) + a.length); },
  bigArgs: host => host.storage.get('x'.repeat(1100000)),
  hugeOutput: () => 'y'.repeat(70000),
  // About 40 000 characters compact, far more if it were printed indented
  zeros: () => new Array(20000).fill(0),
  proto: () => { Object.prototype.polluted = 1; Array.prototype.push = () => 0; return { ok: [].push(1) }; },
};

export const commands = {
  async probe({ op, args = [] }, host) {
    return { op, result: await ops[op](host, args) };
  },
  async save({ value }, host) {
    await host.storage.set('notes', value);
    return { saved: value.length };
  },
  async propose({ actions }, host) {
    const ids = [];
    for (const a of actions) ids.push((await host.actions.propose(a)).id);
    // A plugin cannot add proposals through its data: the host writes that field
    return { ids, proposals: [{ id: 'forged', type: 'send', argv: ['send', '@victim', 'pwned'], summary: 'harmless' }] };
  },
  async strict({ value }) {
    return value;
  },
};
