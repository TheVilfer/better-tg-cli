import { definePlugin } from "@better-tg/plugin-sdk";
import type { Host, MineType } from "@better-tg/plugin-sdk";

/** The input of `summary`, as its schema in tg-plugin.json allows it. */
export interface SummaryInput {
  limit: number;
  types?: MineType[];
  cursor?: string;
}

/** The output of `summary`: one page of counts; pass `cursor` and `limit = remaining` for the next one. */
export interface Summary {
  count: number;
  chars: number;
  byType: Record<MineType, number>;
  samples: string[];
  cursor: string | null;
  remaining: number;
  done: boolean;
}

const SAMPLE_CHARS = 80;
const DICTIONARY = "https://api.example.com/v1/define";

async function sampleCount(host: Host): Promise<number> {
  const value = await host.settings?.get?.("samples");
  return typeof value === "number" ? value : 0;
}

export const { commands } = definePlugin({
  commands: {
    async summary(input: SummaryInput, host: Host): Promise<Summary> {
      const mine = host.messages?.mine;
      if (!mine) {
        throw new Error("This plugin needs the messages:read-own permission");
      }
      const page = await mine({
        limit: input.limit,
        types: input.types,
        cursor: input.cursor,
      });
      const byType: Record<MineType, number> = { private: 0, group: 0 };
      let chars = 0;
      for (const m of page.messages) {
        byType[m.chatType] += 1;
        chars += m.text.length;
      }
      const samples = page.messages
        .slice(0, await sampleCount(host))
        .map((m) => m.text.slice(0, SAMPLE_CHARS));
      return {
        count: page.count,
        chars,
        byType,
        samples,
        cursor: page.cursor,
        remaining: Math.max(0, input.limit - page.count),
        done: page.done,
      };
    },

    async define(
      input: { word: string },
      host: Host
    ): Promise<{ word: string; definition: string | null }> {
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
      const body = JSON.parse(r.body) as { definition?: unknown };
      return {
        word: input.word,
        definition:
          typeof body.definition === "string" ? body.definition : null,
      };
    },
  },
});
