/**
 * What the MCP server never hands the model, whatever command produced it: redeemable value that is
 * spotted by its shape alone. A Premium gift link (`t.me/giftcode/<slug>`, `telegram.me/…`,
 * `tg://giftcode?slug=<slug>`) redeems the gift for whoever opens it, so its slug is the code.
 * The MCP server masks them on every result; src/client.ts does it too for every raw and curated
 * output under TG_MCP or TG_READ_ONLY. Login codes need to know who sent the message, so only
 * src/client.ts hides those.
 */

export const GIFT_CODE_HIDDEN = '[gift code hidden]';

const GIFT_LINK = /((?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.(?:me|dog)\/giftcode\/|tg:\/\/giftcode\?(?:[^\s"'<>&]*&)*slug=)[A-Za-z0-9_-]+/gi;

/** Text with the slug of every gift-code link replaced, in plain text, JSON and URLs alike. */
export function maskGiftCodes(text: string): string {
  return text.replace(GIFT_LINK, `$1${GIFT_CODE_HIDDEN}`);
}
