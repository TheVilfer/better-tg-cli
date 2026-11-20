/**
 * What the MCP server never hands the model, whatever command produced it: redeemable value that is
 * spotted by its shape alone. A Premium gift link (`t.me/giftcode/<slug>`, `telegram.me/…`,
 * `tg://giftcode?slug=<slug>`) redeems the gift for whoever opens it, so its slug is the code.
 * The MCP server masks them on every result; src/client.ts does it too for every raw and curated
 * output under TG_MCP or TG_READ_ONLY. Login codes need to know who sent the message, so only
 * src/client.ts hides those.
 */

export const GIFT_CODE_HIDDEN = '[gift code hidden]';

export const LOGIN_CODE_HIDDEN = '[login code hidden]';

const GIFT_LINK = /((?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.(?:me|dog)\/giftcode\/|tg:\/\/giftcode\?(?:[^\s"'<>&]*&)*slug=)[A-Za-z0-9_-]+/gi;

/** Text with the slug of every gift-code link replaced, in plain text, JSON and URLs alike. */
export function maskGiftCodes(text: string): string {
  return text.replace(GIFT_LINK, `$1${GIFT_CODE_HIDDEN}`);
}

/**
 * A login code spelled out after "code:" (`Login code: 52813`, `Код для входа в Telegram: 52813`), the
 * form src/client.ts hides in a message of a login service. The $1 group is the lead-in.
 */
export const LOGIN_CODE_PHRASE = /((?:code|код)[^\n:：]{0,40}[:：]\s*)[A-Za-z0-9_-]+/giu;

/**
 * Whether a value the model sent holds something MCP output never repeats: a gift link's slug, or a
 * login code after "code:". Such input is not echoed back (an approval's retry arguments).
 */
/** Text with every login code spelled out after "code:" hidden (the lead-in stays). */
export function maskLoginCodePhrases(text: string): string {
  return text.replace(LOGIN_CODE_PHRASE, `$1${LOGIN_CODE_HIDDEN}`);
}

/**
 * Every string in `value` (at any depth) with gift links and recognized login codes masked. Walks the
 * strings, so a JSON number or key is never rewritten.
 */
export function maskSensitiveDeep<T>(value: T): T {
  if (typeof value === 'string') return maskGiftCodes(maskLoginCodePhrases(value)) as T;
  if (Array.isArray(value)) return value.map(maskSensitiveDeep) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskSensitiveDeep(v)])) as T;
  }
  return value;
}

export function holdsMaskedValue(text: string): boolean {
  return maskGiftCodes(text) !== text || new RegExp(LOGIN_CODE_PHRASE.source, LOGIN_CODE_PHRASE.flags).test(text);
}
