/**
 * What the MCP server never hands the model, whatever command produced it (docs/api-coverage.md §5):
 * redeemable gift codes and Telegram login codes. One function, maskForModel(), decides it for every
 * output path, at one of three levels:
 *
 * - `chat`: content read from chats. Only gift links: a Premium gift link (`t.me/giftcode/<slug>`,
 *   `telegram.me/…`, `tg://giftcode?slug=<slug>`) redeems the gift for whoever opens it, so its slug
 *   is the code. Ordinary chat content stays readable.
 * - `echo`: what the server says about a call: approval descriptions, the result of a write, errors.
 *   Gift links, then a login code spelled out after a "code:" label.
 * - `service`: a message of the login-code service accounts (777000, 489000; src/client.ts knows the
 *   sender). Additionally every run of letters and digits that holds a digit and is four characters
 *   or longer, and digit groups joined by runs of spaces, tabs or dashes.
 *
 * Gift links always go first: the login-code mask would take the "tg" of
 * "Gift code: tg://giftcode?slug=…" and leave a slug the gift mask no longer recognizes.
 * Chat IDs, message IDs and approval codes are never masked: they carry no "code:" label, and JSON
 * keys and numbers are never rewritten (maskOutput, maskDeep).
 */

export const GIFT_CODE_HIDDEN = "[gift code hidden]";

export const LOGIN_CODE_HIDDEN = "[login code hidden]";

export type MaskLevel = "chat" | "echo" | "service";

/**
 * A gift slug as a client writes it: slug characters (`[A-Za-z0-9_-]`, percent-encoding `%53` too).
 * It ends at the first other character, so punctuation and whatever follows it
 * ("…/SAMPLE_ONLY,thanks") stay. One class, one pass, nothing given back.
 */
const SLUG = "[A-Za-z0-9_%-]+";

/**
 * A gift link up to its code: the slug after `/giftcode/`, or the query of `tg://giftcode?` (its
 * `slug=` value is hidden by SLUG_PARAM). The query ends at whitespace, a quote, a bracket, a
 * backslash (JSON escapes) or `|`. The host is t.me, telegram.me or telegram.dog (with an optional
 * `www.`) as a whole name: no host character before it, so `support.me` or `shop.t.me` is not one.
 */
const GIFT_LINK = new RegExp(
  String.raw`((?<![A-Za-z0-9_.-])(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.(?:me|dog))\/giftcode\/)(${SLUG})|(tg:(?:\/\/)?giftcode\/?\?)([^\s"'<>()[\]{}\\|]*)`,
  "gi"
);

/** A `slug` parameter in a query (`&amp;` of HTML too): its value as SLUG reads it. */
const SLUG_PARAM = new RegExp(String.raw`(^|[?&;])(slug=)(${SLUG})`, "gi");

/** Text with the code of every gift link replaced (the whole slug, percent-encoding included). */
export function maskGiftCodes(text: string): string {
  return text.replaceAll(
    GIFT_LINK,
    (_all, path?: string, _slug?: string, tg?: string, query?: string) => {
      if (path !== undefined) {
        return path + GIFT_CODE_HIDDEN;
      }
      return (
        tg! +
        query!.replaceAll(
          SLUG_PARAM,
          (_m, lead: string, key: string) => lead + key + GIFT_CODE_HIDDEN
        )
      );
    }
  );
}

const DASHES = "\\-\u2010\u2011\u2012\u2013\u2014\u2015\u2212";
const SEPARATORS = ":\uFF1A\uFE55\uA789\u2236";

/**
 * Between the colon and the code: whitespace, the "| " of an approval description, or whitespace
 * already escaped by someone else (`\n`, `\u{a}`, `\u000a`, `\x0a`, a JSON-quoted `\\n`), as in an
 * error that quotes an argument. Each alternative starts with a different character: no rescans.
 */
const GAP = String.raw`(?:[\s|]|\\+(?:[nrtv]|u\{[0-9A-Fa-f]{1,6}\}|u[0-9A-Fa-f]{4}|x[0-9A-Fa-f]{2}))*`;

/**
 * Russian puts the rest of the label after "код" (`Код для входа в Telegram:`, `Код подтверждения:`).
 */
const RU_LABEL_WORDS =
  "(?:[ \\t\\u00a0]+(?:для|входа|вход|в|telegram|подтверждения|авторизации)){0,4}";

/**
 * The words that may stand right before "code"/"код" in a login-code label ("Your login code:",
 * "Telegram verification code:", "Ваш код:"). Any other word there makes it no label: "Promo code:",
 * "exit code:" stay. No word at all ("Code:", "| Code:") is a label too.
 */
const LABEL_WORDS =
  "(?:login|log-in|sign-in|verification|confirmation|auth|authentication|authorization|security|access|telegram|your|ваш|твой|проверочный)";
const SPACE = "[ \\t\\u00a0]";
const LABEL_LEAD = `(?<=(?:^|[^\\p{L}\\p{N}_ \\t\\u00a0-])${SPACE}*|(?<![\\p{L}\\p{N}_-])${LABEL_WORDS}${SPACE}+)`;

/**
 * A login code spelled out after a "code:" label (`Login code: 52813`, `Код для входа в Telegram: 52813`).
 * The label is the word "code" right before the colon, spaces allowed (`:`, the fullwidth `：`, the
 * small `﹕`, `꞉`, `∶`); "код" may have the Russian label words between. Nothing else may stand
 * between ("See code review, message ID: 42" is no label), and the word before "code", if any, is
 * one of LABEL_WORDS (not the "code" of "Decode", nor "Promo code:"). A placeholder this
 * mask left ("[login code hidden]") has no colon after "code", so masking twice changes nothing,
 * while a real label in brackets ("[Login code: 52813]") is masked. The code may sit on the next
 * line, behind the "| " an approval description puts before every line of a text, and is masked
 * whole when split into groups by dashes (ASCII or typographic) or into digit groups by spaces. A
 * URL scheme there ("code: tg://…") is not a code. The $1 group is the lead-in.
 */
export const LOGIN_CODE_PHRASE = new RegExp(
  // The lookahead first: it fails at once where no "code"/"код" starts, so the lookbehind (which
  // walks back over spaces) runs only there, not at every position of a long run of spaces
  `((?=code|код)${LABEL_LEAD}(?:code|код${RU_LABEL_WORDS})${SPACE}*[${SEPARATORS}]${GAP})` +
    `(?![A-Za-z0-9_]*:\\/\\/)[A-Za-z0-9_]+(?:[${DASHES}][A-Za-z0-9_]+|[ \\t\\u00a0]+[0-9][A-Za-z0-9_]*)*`,
  "giu"
);

/** Text with every login code spelled out after a "code:" label hidden (the lead-in stays). */
export function maskLoginCodePhrases(text: string): string {
  return text.replaceAll(LOGIN_CODE_PHRASE, `$1${LOGIN_CODE_HIDDEN}`);
}

/**
 * In a service message: a token with a digit, 4+ characters (dashes inside count), or digit groups
 * joined by runs of spaces, tabs or dashes ("52  813", "52\t813").
 */
const SERVICE_CODE = new RegExp(
  `(?<![A-Za-z0-9_${DASHES}])(?:(?=[A-Za-z0-9_${DASHES}]*\\d)[A-Za-z0-9_${DASHES}]{4,}|\\d+(?:[ \\t\\u00a0${DASHES}]+\\d+)+)(?![A-Za-z0-9_${DASHES}])`,
  "g"
);

/** The one masking of text that reaches the model; see the top of this file for the levels. */
export function maskForModel(text: string, level: MaskLevel): string {
  const gifts = maskGiftCodes(text);
  if (level === "chat") {
    return gifts;
  }
  const phrases = maskLoginCodePhrases(gifts);
  return level === "service"
    ? phrases.replaceAll(SERVICE_CODE, LOGIN_CODE_HIDDEN)
    : phrases;
}

/** Every string in `value` (at any depth) masked; keys, numbers and other values stay as they are. */
export function maskDeep<T>(value: T, level: MaskLevel): T {
  if (typeof value === "string") {
    return maskForModel(value, level) as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => maskDeep(v, level)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, maskDeep(v, level)])
    ) as T;
  }
  return value;
}

/** A JSON string literal, and whether a colon follows it (a key). Linear: the alternatives never overlap. */
const JSON_STRING = /"(?:[^"\\]|\\.)*"(\s*:)?/g;

/** One JSON text with each string value masked as decoded text; keys, numbers and layout stay byte for byte. */
function maskJsonText(json: string, level: MaskLevel): string {
  return json.replaceAll(JSON_STRING, (literal, colon?: string) => {
    if (colon) {
      return literal;
    }
    let decoded: string;
    try {
      decoded = JSON.parse(literal) as string;
    } catch {
      return maskForModel(literal, level);
    }
    const masked = maskForModel(decoded, level);
    return masked === decoded ? literal : JSON.stringify(masked);
  });
}

function parsesAsJson(text: string): boolean {
  const t = text.trim();
  if (!/^[[{]/.test(t)) {
    return false;
  }
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/**
 * A whole output for the model, masked at `level`: a JSON document (a --json result or error) and
 * each JSON line in it (JSON Lines, a guard line) have their string values masked after decoding, so
 * an escaped line break cannot split a code from its label and numbers keep their exact form; the
 * plain-text stretches between them are masked as text.
 */
export function maskOutput(text: string, level: MaskLevel): string {
  if (parsesAsJson(text)) {
    return maskJsonText(text, level);
  }
  const lines = text.split("\n");
  const out: string[] = [];
  let plain: string[] = [];
  const flush = () => {
    if (plain.length) {
      out.push(maskForModel(plain.join("\n"), level));
    }
    plain = [];
  };
  for (const line of lines) {
    if (parsesAsJson(line)) {
      flush();
      out.push(maskJsonText(line, level));
    } else {
      plain.push(line);
    }
  }
  flush();
  return out.join("\n");
}

/**
 * Whether a value the model sent holds something MCP output never repeats: a gift link's code, or a
 * login code after "code:". Such input is not echoed back (an approval's retry arguments). The same
 * parsing as the masks, so whatever they would hide counts.
 */
export function holdsMaskedValue(text: string): boolean {
  return maskForModel(text, "echo") !== text;
}
