import { definePlugin } from "@better-tg/plugin-sdk";
import type {
  Host,
  HostError,
  MinePage,
  MineType,
  OwnMessage,
} from "@better-tg/plugin-sdk";

/** The input of `summary`, as its schema in tg-plugin.json allows it. */
export interface SummaryInput {
  limit: number;
  types?: MineType[];
  cursor?: string;
}

/**
 * The output of `summary`: one page of counts; pass `cursor` and `limit = remaining` for the next one.
 * `retryAfterSeconds` is set when Telegram asked to slow down: the page holds what was read before
 * that, and the next run waits that long first.
 */
export interface Summary {
  count: number;
  chars: number;
  byType: Record<MineType, number>;
  samples: string[];
  cursor: string | null;
  remaining: number;
  done: boolean;
  retryAfterSeconds?: number;
}

const SAMPLE_CHARS = 80;
const DICTIONARY = "https://api.example.com/v1/define";

async function sampleCount(host: Host): Promise<number> {
  const value = await host.settings?.get?.("samples");
  return typeof value === "number" ? value : 0;
}

function floodPage(error: unknown): (MinePage & { wait: number }) | undefined {
  const e = error as Partial<HostError>;
  if (e?.code !== "flood_wait" || !e.partial || !e.cursor) {
    return undefined;
  }
  return {
    messages: e.partial.messages,
    count: e.partial.count,
    cursor: e.cursor,
    done: false,
    wait: e.retryAfterSeconds ?? 0,
  };
}

async function tally(
  input: SummaryInput,
  messages: OwnMessage[],
  host: Host
): Promise<
  Pick<Summary, "count" | "chars" | "byType" | "samples" | "remaining">
> {
  const byType: Record<MineType, number> = { private: 0, group: 0 };
  let chars = 0;
  for (const m of messages) {
    byType[m.chatType] += 1;
    chars += m.text.length;
  }
  const samples = messages
    .slice(0, await sampleCount(host))
    .map((m) => m.text.slice(0, SAMPLE_CHARS));
  return {
    count: messages.length,
    chars,
    byType,
    samples,
    remaining: Math.max(0, input.limit - messages.length),
  };
}

export const { commands } = definePlugin({
  commands: {
    async summary(input: SummaryInput, host: Host): Promise<Summary> {
      const mine = host.messages?.mine;
      if (!mine) {
        throw new Error("This plugin needs the messages:read-own permission");
      }
      let page: MinePage;
      try {
        page = await mine({
          limit: input.limit,
          types: input.types,
          cursor: input.cursor,
        });
      } catch (error) {
        const flood = floodPage(error);
        if (!flood) {
          throw error;
        }
        return {
          ...(await tally(input, flood.messages, host)),
          cursor: flood.cursor,
          done: false,
          retryAfterSeconds: flood.wait,
        };
      }
      return {
        ...(await tally(input, page.messages, host)),
        cursor: page.cursor,
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
