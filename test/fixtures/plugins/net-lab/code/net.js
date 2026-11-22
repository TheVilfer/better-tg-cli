export const commands = {
  async fetch(input, host) {
    const out = [];
    for (let i = 0; i < (input.times ?? 1); i++) {
      try {
        out.push({ ok: true, response: await host.http.fetch(input.url, input.opts) });
      } catch (e) {
        out.push({ ok: false, error: { code: e.code, message: e.message, command: e.command ?? null } });
      }
    }
    return out.length === 1 ? out[0] : { all: out };
  },
  async 'fetch-raw'(input, host) {
    return { response: await host.http.fetch(input.url, input.opts) };
  },
  async size(input, host) {
    const r = await host.http.fetch(input.url, input.opts);
    return { status: r.status, body: r.body === undefined ? null : r.body.length, bodyBase64: r.bodyBase64 === undefined ? null : r.bodyBase64.length };
  },
  async setting(input, host) {
    return { value: await host.settings.get(input.key) };
  },
  async 'no-net'(input, host) {
    return { http: typeof host.http, keys: Object.keys(host) };
  },
};
