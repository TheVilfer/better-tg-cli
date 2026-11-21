import { execFile } from "node:child_process";
import { platform } from "node:os";
import { join } from "node:path";

import chalk from "./colors.js";
import { encodedCommand } from "./dpapi.js";
import { CliError, EXIT } from "./errors.js";
import { prompt } from "./prompt.js";

/**
 * Some decisions must be a human's, not something an agent can make on its own: a y/N prompt on a
 * real terminal, or a macOS / Windows dialog the user has to click. Both give up as "no".
 */
export async function confirmByHuman(what: string): Promise<boolean> {
  const os = platform();
  const hasTty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (hasTty) {
    const answer = await prompt(`${what} [y/N] `);
    return /^(y|yes|д|да)$/i.test(answer);
  }
  if (os === "win32") {
    return confirmOnWindows(what);
  }
  if (os !== "darwin") {
    console.error(
      chalk.red(
        "No terminal to confirm on. Run this command yourself in a terminal."
      )
    );
    return false;
  }
  const text = `${what}\n\nЕсли об этом просит агент, а вы не ожидали — нажмите «Отмена».`;
  const script =
    `display dialog ${JSON.stringify(text)} with title "Telegram CLI" ` +
    'buttons {"Отмена", "Разрешить"} default button "Отмена" cancel button "Отмена" ' +
    "with icon caution giving up after 120";
  const out = await run("/usr/bin/osascript", ["-e", script], 125_000);
  return (
    out !== null &&
    out.includes("button returned:Разрешить") &&
    !out.includes("gave up:true")
  );
}

/**
 * The Windows counterpart of the macOS dialog: a topmost Yes/No box with "No" as the default.
 * The script is fixed; the text reaches it on stdin as base64 of its UTF-8 (PowerShell 5.1 reads
 * stdin in the OEM codepage, and base64 has no quote of any kind), so a long plugin summary never
 * meets the 32 767-character limit of a command line. MessageBox has no timeout of its own, so the
 * spawn gives up after ~2 minutes and that counts as No.
 */
export function windowsConfirmScript(): string {
  return (
    "Add-Type -AssemblyName System.Windows.Forms;" +
    "$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()));" +
    // A hidden topmost owner keeps the box above the agent's window instead of behind it
    "$owner = New-Object System.Windows.Forms.Form; $owner.TopMost = $true; $owner.ShowInTaskbar = $false;" +
    "$r = [System.Windows.Forms.MessageBox]::Show($owner, $text, 'Telegram CLI', 'YesNo', 'Warning', 'Button2');" +
    "if ($r -eq 'Yes') { [Console]::Out.Write('ALLOW') } else { [Console]::Out.Write('DENY') }"
  );
}

/** What the dialog script reads on stdin. */
export const windowsConfirmInput = (text: string): string =>
  Buffer.from(text, "utf-8").toString("base64");

export type RunResult =
  | { ok: true; stdout: string }
  | { ok: false; timedOut: boolean; error: string };
export type Runner = (
  file: string,
  args: string[],
  input: string,
  timeout: number
) => Promise<RunResult>;

const dialogFailed = (why: string) =>
  new CliError(
    `Could not open the confirmation dialog (${why})`,
    "dialog_failed",
    EXIT.ERROR,
    {
      hint: "Run this command yourself in a terminal (PowerShell), where it asks y/N instead.",
    }
  );

/**
 * Asks in a Windows dialog: true for Yes; false for No or no answer within the timeout. A dialog
 * that could not be shown (PowerShell missing or blocked, an unexpected answer) throws dialog_failed
 * instead of passing for the user's No. `runner` is replaced in tests.
 */
export async function confirmOnWindows(
  what: string,
  runner: Runner = runWithInput
): Promise<boolean> {
  const text = `${what}\n\nЕсли об этом просит агент, а вы не ожидали — нажмите «Нет».`;
  const ps = join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe"
  );
  const r = await runner(
    ps,
    [
      "-NoProfile",
      "-NonInteractive",
      "-NoLogo",
      "-STA",
      "-EncodedCommand",
      encodedCommand(windowsConfirmScript()),
    ],
    windowsConfirmInput(text),
    125_000
  );
  if (!r.ok) {
    if (r.timedOut) {
      return false;
    }
    throw dialogFailed(r.error);
  }
  const out = r.stdout.trim();
  if (out === "ALLOW") {
    return true;
  }
  if (out === "DENY") {
    return false;
  }
  throw dialogFailed(`unexpected answer ${JSON.stringify(out.slice(0, 40))}`);
}

/** Runs a process with `input` on stdin: its stdout, or why it failed (a timeout is told apart). */
function runWithInput(
  file: string,
  args: string[],
  input: string,
  timeout: number
): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { encoding: "utf-8", timeout, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) {
          return resolve({ ok: true, stdout });
        }
        const timedOut =
          (error as { killed?: boolean }).killed === true &&
          (error as { signal?: string }).signal != null;
        resolve({
          ok: false,
          timedOut,
          error: (String(stderr).trim().split("\n")[0] || error.message).slice(
            0,
            200
          ),
        });
      }
    );
    child.stdin?.on("error", () => {});
    child.stdin?.end(input);
  });
}

/** stdout of a finished process, or null on a non-zero exit, a timeout or a spawn error (Cancel). */
function run(
  file: string,
  args: string[],
  timeout: number
): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      { encoding: "utf-8", timeout, windowsHide: true },
      (error, stdout) => resolve(error ? null : stdout)
    );
  });
}
