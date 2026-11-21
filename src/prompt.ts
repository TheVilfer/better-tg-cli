import { createInterface } from "node:readline";
import { Writable } from "node:stream";

// Questions go to stderr: stdout is the command's result (one JSON object with --json)

/** Prompt for a line of input (echoed to the terminal). */
export function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Prompt for a secret. The question is shown but typed characters are not echoed. */
export function promptHidden(question: string): Promise<string> {
  let muted = false;
  const mutedOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) {
        process.stderr.write(chunk, encoding);
      }
      callback();
    },
  });

  const rl = createInterface({
    input: process.stdin,
    output: mutedOutput,
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stderr.write("\n");
      resolve(answer.trim());
    });
    // The question above is written while unmuted; mute now so the
    // user's keystrokes are not echoed back to the terminal.
    muted = true;
  });
}
