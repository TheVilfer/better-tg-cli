import { confirmByHuman } from './confirm.js';
import { describeWriteState, encodeWriteState, parseWriteState, type WriteMode } from './write-state.js';
import { deleteWriteValue, getWriteValue, hasHumanChannel, mayTrustUnconfirmedChoice, setWriteValue } from './write-store.js';
import type { ModeChoice, ModeResult } from './onboard.js';

/** The question in the macOS / Windows dialog or at the terminal (Russian, like the rest of them). */
export function modeQuestion(mode: Exclude<WriteMode, 'read-only'>, forSeconds?: number): string {
  const span = forSeconds ? ` на ${humanSpan(forSeconds)}` : ' без ограничения по времени';
  return mode === 'ask'
    ? `Разрешить Telegram CLI отправлять, редактировать и удалять сообщения от вашего аккаунта${span}, но только после вашего одобрения каждого действия?`
    : `Разрешить Telegram CLI отправлять, редактировать и удалять сообщения от вашего аккаунта${span} без вопросов?`;
}

function humanSpan(seconds: number): string {
  if (seconds % 604_800 === 0) return `${seconds / 604_800} нед.`;
  if (seconds % 86_400 === 0) return `${seconds / 86_400} дн.`;
  if (seconds % 3600 === 0) return `${seconds / 3600} ч`;
  return `${Math.round(seconds / 60)} мин`;
}

/**
 * Saves a write mode. Read-only needs nobody's permission. Anything else needs the person:
 * - `alreadyConfirmed`: the caller asked them already (`write-access` at a terminal or in a dialog);
 * - a terminal or an OS dialog: asked here, so a click on a page the agent can reach is not enough;
 * - neither, and no secret store: the click on the local page is taken as is, because there the
 *   mode is unprotected anyway (src/write-store.ts);
 * - neither, but a secret store: refused, the person runs `telegram write-access` in a terminal.
 */
export async function applyModeChoice(choice: ModeChoice, options: { alreadyConfirmed?: boolean } = {}): Promise<ModeResult> {
  if (choice.mode === 'read-only') {
    deleteWriteValue();
    return { ok: true };
  }
  if (!options.alreadyConfirmed) {
    if (hasHumanChannel()) {
      if (!(await confirmByHuman(modeQuestion(choice.mode, choice.forSeconds)))) return { ok: false, error: 'not_confirmed' };
    } else if (!mayTrustUnconfirmedChoice()) {
      return { ok: false, error: 'needs_terminal' };
    }
  }
  if (!setWriteValue(encodeWriteState(choice.forSeconds, Date.now(), choice.mode))) return { ok: false, error: 'store_failed' };
  return { ok: true, until: parseWriteState(getWriteValue()).until };
}

export function currentModeLine(): string {
  return describeWriteState(parseWriteState(getWriteValue()));
}
