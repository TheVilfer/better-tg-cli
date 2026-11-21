import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/index.js";
import { renderUnicodeCompact } from "uqr";

import { clearApprovals } from "./approval.js";
import { clientParams } from "./client-options.js";
import {
  loadConfig,
  saveConfig,
  setCredentials,
  setInviteCredentials,
  setSessionString,
} from "./config.js";
import { clearDialogCache } from "./dialog-cache.js";
import { prompt, promptHidden } from "./prompt.js";
import { connectClient } from "./transport.js";

async function askOwnCredentials(): Promise<{
  apiId: number;
  apiHash: string;
}> {
  console.log("To get your API credentials:");
  console.log("1. Go to https://my.telegram.org/apps");
  console.log("2. Log in with your phone number");
  console.log("3. Create a new application (if you haven't already)");
  console.log("4. Copy the api_id and api_hash\n");

  const apiId = Number.parseInt(await prompt("Enter your API ID: "), 10);
  if (Number.isNaN(apiId)) {
    throw new Error("Invalid API ID");
  }

  const apiHash = await promptHidden("Enter your API Hash: ");
  if (!apiHash) {
    throw new Error("Invalid API Hash");
  }
  return { apiId, apiHash };
}

/**
 * Log in and save the session. With `invite` credentials (from the broker) only the
 * api_id is kept: the api_hash is used for this login and then forgotten.
 */
export async function authenticate(
  invite?: { apiId: number; apiHash: string },
  testServers = false,
  qr = false
): Promise<TelegramClient> {
  console.log(
    testServers
      ? "\nTelegram Authentication Setup (TEST servers)\n"
      : "\nTelegram Authentication Setup\n"
  );

  const { apiId, apiHash } = invite ?? (await askOwnCredentials());

  console.log("\nConnecting to Telegram...");

  const client = await connectClient(
    (t) =>
      new TelegramClient(
        new StringSession(""),
        apiId,
        apiHash,
        clientParams(testServers, t)
      )
  );

  const password = async () =>
    await promptHidden("Enter your 2FA password (press Enter if none): ");
  if (qr) {
    let drawn = 0;
    await client.signInUserWithQrCode(
      { apiId, apiHash },
      {
        qrCode: async ({ token }) => {
          const url = `tg://login?token=${Buffer.from(token).toString("base64url")}`;
          const art = renderQr(url);
          if (drawn && process.stdout.isTTY) {
            process.stdout.write(`\u001B[${drawn}A\u001B[J`);
          }
          const text = `\nOn your phone: Telegram → Settings → Devices → Link Desktop Device, then scan:\n\n${art}\n(refreshes every 30 s; Ctrl-C to cancel)\n`;
          process.stdout.write(text);
          drawn = text.split("\n").length - 1;
        },
        password,
        onError: async (err) => {
          console.error("Error:", err.message);
          return true;
        },
      }
    );
  } else {
    await client.start({
      phoneNumber: async () =>
        await prompt(
          "Enter your phone number (with country code, e.g., +1234567890): "
        ),
      password,
      phoneCode: async () => await prompt("Enter the code you received: "),
      firstAndLastNames: async () => [
        (await prompt("New account. First name: ")) || "Dev",
        (await prompt("Last name (optional): ")) || "",
      ],
      onError: (err) => console.error("Error:", err),
    });
  }

  saveLogin(
    (client.session as StringSession).save(),
    { apiId, apiHash },
    !!invite,
    testServers
  );

  console.log("\nAuthentication successful! Session saved.");

  return client;
}

/**
 * Save a finished login. Invite logins keep only the api_id: the api_hash was for this login and
 * is forgotten. Called only after Telegram accepted the login.
 */
export function saveLogin(
  session: string,
  creds: { apiId: number; apiHash: string },
  invite: boolean,
  testServers = false
): void {
  if (invite) {
    setInviteCredentials(creds.apiId);
  } else {
    setCredentials(creds.apiId, creds.apiHash);
  }
  if (testServers || loadConfig(() => {}).testServers) {
    saveConfig({ testServers });
  }
  setSessionString(session);
  clearApprovals();
  clearDialogCache();
}

export interface LoginUser {
  id: string;
  name: string;
  username?: string;
}

/** What `telegram onboard` needs from a login; the tests pass a fake. */
export interface LoginDriver {
  login(
    creds: { apiId: number; apiHash: string },
    io: {
      onQr(url: string): void;
      password(hint?: string): Promise<string>;
      onPasswordError(message: string): void;
      signal: AbortSignal;
    }
  ): Promise<{ session: string; user: LoginUser }>;
}

/** Known RPC errors carry a readable message ("The password … is invalid"); the code is in errorMessage. */
export function rpcCode(err: Error): string {
  return (err as Error & { errorMessage?: string }).errorMessage ?? err.message;
}

/** QR login on a fresh session; wrong 2FA passwords are asked again instead of failing. */
export function qrLoginDriver(testServers = false): LoginDriver {
  return {
    async login(creds, io) {
      const client = await connectClient(
        (t) =>
          new TelegramClient(
            new StringSession(""),
            creds.apiId,
            creds.apiHash,
            clientParams(testServers, t)
          )
      );
      let cause: string | undefined;
      try {
        const user = await client
          .signInUserWithQrCode(creds, {
            qrCode: async ({ token }) =>
              io.onQr(
                `tg://login?token=${Buffer.from(token).toString("base64url")}`
              ),
            password: async (hint?: string) => io.password(hint),
            onError: async (err: Error) => {
              const code = rpcCode(err);
              if (code === "PASSWORD_HASH_INVALID") {
                io.onPasswordError(code);
                return false;
              }
              cause = code;
              return true;
            },
            abortSignal: io.signal,
          } as Parameters<TelegramClient["signInUserWithQrCode"]>[1])
          .catch((error: unknown) => {
            if (
              cause &&
              error instanceof Error &&
              error.message === "AUTH_USER_CANCEL"
            ) {
              throw new Error(cause);
            }
            throw error;
          });
        const u = user as unknown as {
          id: { toString(): string };
          firstName?: string;
          lastName?: string;
          username?: string;
        };
        return {
          session: (client.session as StringSession).save(),
          user: {
            id: u.id.toString(),
            name: [u.firstName, u.lastName].filter(Boolean).join(" "),
            username: u.username,
          },
        };
      } finally {
        await client.disconnect().catch(() => {});
      }
    },
  };
}

/** Terminal QR for a dark background (verified by decoding); TG_QR_INVERT=1 for light terminals. */
export function renderQr(data: string): string {
  return renderUnicodeCompact(data, {
    border: 2,
    invert: !!process.env.TG_QR_INVERT,
  });
}
