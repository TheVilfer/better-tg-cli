function definePlugin(plugin) {
  return plugin;
}

var SAMPLE_CHARS = 80;
var DICTIONARY = "https://api.example.com/v1/define";
async function sampleCount(host) {
  const value = await host.settings?.get?.("samples");
  return typeof value === "number" ? value : 0;
}
var { commands } = definePlugin({
  commands: {
    async summary(input, host) {
      const mine = host.messages?.mine;
      if (!mine) {
        throw new Error("This plugin needs the messages:read-own permission");
      }
      const page = await mine({
        limit: input.limit,
        types: input.types,
        cursor: input.cursor
      });
      const byType = { private: 0, group: 0 };
      let chars = 0;
      for (const m of page.messages) {
        byType[m.chatType] += 1;
        chars += m.text.length;
      }
      const samples = page.messages.slice(0, await sampleCount(host)).map((m) => m.text.slice(0, SAMPLE_CHARS));
      return {
        count: page.count,
        chars,
        byType,
        samples,
        cursor: page.cursor,
        remaining: Math.max(0, input.limit - page.count),
        done: page.done
      };
    },
    async define(input, host) {
      const fetch = host.http?.fetch;
      if (!fetch) {
        throw new Error("This command needs the network permission and effect");
      }
      const url = `${DICTIONARY}?word=${encodeURIComponent(input.word.toLowerCase())}`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.status === 404) {
        return { word: input.word, definition: null };
      }
      if (r.status !== 200 || r.body === undefined) {
        throw new Error(`The dictionary answered ${r.status}`);
      }
      const body = JSON.parse(r.body);
      return {
        word: input.word,
        definition: typeof body.definition === "string" ? body.definition : null
      };
    }
  }
});
export {
  commands
};
