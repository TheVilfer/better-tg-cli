import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  actionValues,
  describeParsedAction,
  normalizedForm,
} from "./approval-action.js";
import type { ParsedAction, PeerInfo } from "./approval-action.js";
import { fileSnapshot, snapshotDigest } from "./file-snapshot.js";
import { configFile, isMock } from "./paths.js";
import { isSecretStoreAvailable, secretGet, secretSet } from "./secrets.js";

/**
 * Approvals for write mode "ask": each write runs only with an approval of that exact action.
 *
 * Without one, the guard records a pending approval (a hash of the command, never its text) and
 * prints the action with a short code. The agent shows it to the user and, after an explicit yes,
 * runs the same command again with TG_APPROVE=<code> (over MCP: the `approval` argument). Over MCP
 * with a client that supports elicitation, the server asks the user itself and mints the approval,
 * so the model never handles a code.
 *
 * A chat code is a speed bump, not proof that a human said yes: an agent can pass the code without
 * asking. Elicitation is the stronger path, which is why the MCP server refuses chat codes when it
 * can elicit.
 */

export type ApprovedVia = "chat" | "elicitation";

interface Pending {
  hash: string;
  expiresAt: number;
  via: ApprovedVia;
  session: string;
  mac: string;
}

function signingKey(): Buffer {
  if (!isMock() && isSecretStoreAvailable()) {
    let key = secretGet("approvalKey");
    if (!key) {
      key = randomBytes(32).toString("hex");
      if (!secretSet("approvalKey", key)) {
        throw new Error(
          "Could not store the approval signing key in the secret store"
        );
      }
    }
    return Buffer.from(key, "hex");
  }
  const file = configFile("approval-key");
  try {
    return Buffer.from(readFileSync(file, "utf-8").trim(), "hex");
  } catch {
    const key = randomBytes(32).toString("hex");
    writeFileSync(file, key, { encoding: "utf-8", mode: 0o600 });
    return Buffer.from(key, "hex");
  }
}

function sign(key: Buffer, code: string, p: Omit<Pending, "mac">): string {
  return createHmac("sha256", key)
    .update(JSON.stringify([code, p.hash, p.expiresAt, p.via, p.session]))
    .digest("hex");
}

function sessionFingerprint(key: Buffer, session: string | undefined): string {
  return createHmac("sha256", key)
    .update(`tg-approval-session\0${session ?? ""}`)
    .digest("hex");
}

/**
 * The session an approval was checked against in this process (undefined: none was used).
 * getClient() builds its client only from this same session, so a login as someone else between
 * the guard and the connection cannot carry the approved write to the new account.
 */
export const ANOTHER_ACCOUNT =
  "the approval was given while another account was logged in";

/** Why a code was not accepted, for the agent (JSON `rejected.reason`). */
export type RejectReason =
  | "unknown_or_expired"
  | "different_action"
  | "another_account"
  | "not_genuine";

/** What the agent should do about each reason, after the reason itself. */
export const REJECT_HINT: Record<RejectReason, string> = {
  unknown_or_expired:
    "a code works once and for 10 minutes; this one is unknown, used up or expired",
  different_action:
    "the command, recipient, text or file differs from what the user approved (only output flags such as --json may differ); a code is used up even when it does not match",
  another_account: "the profile is now logged in as someone else",
  not_genuine: "the approval record was not made by this CLI",
};
let approvedSession: string | undefined;

/** Whether this process used an approval for another session than the one it is about to connect with. */
export function approvedForAnotherSession(session: string): boolean {
  return approvedSession !== undefined && approvedSession !== session;
}

/** Drops every pending approval of this profile; logout and login call it, since codes belong to the old account. */
export function clearApprovals(): void {
  rmSync(storeDir(), { recursive: true, force: true });
}

export const APPROVAL_TTL_MS = 10 * 60_000;
/** Exit code of a write that is waiting for approval (distinct from errors, which exit 1). */
export const EXIT_NEEDS_APPROVAL = 3;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function storeDir(): string {
  return configFile("approvals");
}

function prune(now: number): void {
  try {
    for (const name of readdirSync(storeDir())) {
      try {
        const p = JSON.parse(
          readFileSync(join(storeDir(), name), "utf-8")
        ) as Pending;
        if (!(p.expiresAt > now)) {
          unlinkSync(join(storeDir(), name));
        }
      } catch {}
    }
  } catch {}
}

/**
 * What an approval covers: the arguments, the text on stdin (if the command reads "-"), and the contents of every file an argument names, as `x.pdf` or `--opt=x.pdf`, by its
 * real path (so a file can't be swapped or edited between the approval and the run).
 */
export function actionHash(argv: string[], stdin?: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({ argv, stdin: stdin ?? null, files: fileDigests(argv) })
    )
    .digest("hex");
}

/**
 * The hash an approval is bound to. A parsed action (the command commander ran) is hashed in its
 * normalized form, recipients as resolved IDs, so flag order and output-only flags don't matter;
 * the body on stdin is exact as sent (stdinBody), and every file it names is bound by content. Without a parsed
 * command it is the exact argv (actionHash).
 */
export function approvalHash(
  action: ParsedAction,
  peers: Map<string, PeerInfo>,
  stdin?: string,
  bound: unknown[] = []
): string {
  if (!action.parsed) {
    return actionHash(action.argv, stdin);
  }
  return createHash("sha256")
    .update(
      JSON.stringify({
        action: normalizedForm(action, peers),
        stdin: stdin ?? null,
        files: fileDigests(actionValues(action)),
        ...(bound.length ? { bound } : {}),
      })
    )
    .digest("hex");
}

function fileDigests(values: string[]): string[] {
  return values.map((arg) => {
    const candidates = [
      arg,
      ...(arg.startsWith("-") && arg.includes("=")
        ? [arg.slice(arg.indexOf("=") + 1)]
        : []),
    ];
    return candidates
      .map((c) => {
        try {
          return snapshotDigest(fileSnapshot(c));
        } catch {
          return "";
        }
      })
      .join("|");
  });
}

function newCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** The command takes text from stdin ("-" or --params=-), so the approval has to cover it too. */
export function readsStdin(argv: string[]): boolean {
  return argv.some((a) => a === "-" || a.endsWith("=-"));
}

/**
 * Set by the MCP server for a write it hands stdin to: the child's guard then hashes the stdin body,
 * as the server did when it asked the user. It can only add stdin to an approval, never drop it.
 */
export const STDIN_IN_APPROVAL_ENV = "TG_APPROVAL_STDIN";

/**
 * Records a pending approval for this action and returns its code. `account` is the stored session
 * as it was when the action was shown to the user (getSessionString() at that moment), never read
 * here: by now someone else may be logged in.
 */
export function createApproval(
  hash: string,
  account: string | undefined,
  via: ApprovedVia = "chat",
  now = Date.now()
): string {
  prune(now);
  if (!existsSync(storeDir())) {
    mkdirSync(storeDir(), { recursive: true, mode: 0o700 });
  }
  const key = signingKey();
  const session = sessionFingerprint(key, account);
  for (;;) {
    const code = newCode();
    const record = { hash, expiresAt: now + APPROVAL_TTL_MS, via, session };
    try {
      writeFileSync(
        join(storeDir(), `${code}.json`),
        JSON.stringify({ ...record, mac: sign(key, code, record) }),
        { encoding: "utf-8", mode: 0o600, flag: "wx" }
      );
      return code;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }
}

/**
 * Uses up an approval: it must exist, be unexpired, match this exact action and the account in
 * `session` (the stored session this process will connect with). Returns how it was approved, or
 * why not. A code is single-use even when it does not match (no guessing in a loop).
 */
export type ConsumeResult =
  | { ok: true; via: ApprovedVia }
  | { ok: false; reason: string; kind: RejectReason };

export function consumeApproval(
  code: string,
  hash: string,
  session: string | undefined,
  now = Date.now()
): ConsumeResult {
  approvedSession = undefined;
  const key = code.trim().toUpperCase();
  const unknown = {
    ok: false as const,
    reason: "unknown or expired approval code",
    kind: "unknown_or_expired" as const,
  };
  if (!/^[A-Z0-9]{6}$/.test(key)) {
    return unknown;
  }
  const file = join(storeDir(), `${key}.json`);
  let pending: Pending;
  try {
    pending = JSON.parse(readFileSync(file, "utf-8")) as Pending;
    unlinkSync(file);
  } catch {
    return unknown;
  }
  const signing = signingKey();
  const expected = Buffer.from(sign(signing, key, pending), "hex");
  const got = Buffer.from(
    typeof pending.mac === "string" ? pending.mac : "",
    "hex"
  );
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return {
      ok: false,
      reason: "the approval record is not genuine",
      kind: "not_genuine",
    };
  }
  if (!(pending.expiresAt > now)) {
    return unknown;
  }
  if (pending.session !== sessionFingerprint(signing, session)) {
    return { ok: false, reason: ANOTHER_ACCOUNT, kind: "another_account" };
  }
  if (pending.hash !== hash) {
    return {
      ok: false,
      reason: "the approval was for a different command or text",
      kind: "different_action",
    };
  }
  approvedSession = session ?? "";
  return { ok: true, via: pending.via };
}

/**
 * The action as the user should see it when only the raw argv is known (no parsed command): the
 * exact command, plus the whole stdin body if any (as sent, stdinBody). The approval covers every
 * byte of it, so the person sees every byte (no truncation).
 */
export function describeAction(argv: string[], stdin?: string): string {
  return describeParsedAction(
    { command: argv[0] ?? "", args: [], options: [], argv, parsed: false },
    new Map(),
    stdin
  );
}

/** The account an approval is bound to: the stored session, or a fixed one for the mock account (no secret store). */
export const MOCK_ACCOUNT = "mock-account";
