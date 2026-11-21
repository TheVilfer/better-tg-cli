#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { dirname } from "node:path";

const cwd = dirname(import.meta.dirname);
const wrangler = (...args) =>
  execFileSync(
    "npx",
    [
      "--yes",
      "wrangler@latest",
      "kv",
      ...args,
      "--binding",
      "INVITES",
      "--remote",
    ],
    {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
const put = (key, value) => wrangler("key", "put", key, value);
const get = (key) => {
  try {
    return JSON.parse(wrangler("key", "get", key, "--text"));
  } catch {
    return null;
  }
};
const keys = () =>
  JSON.parse(wrangler("key", "list", "--prefix", "invite:")).map((k) => k.name);

const [cmd, name, ...rest] = process.argv.slice(2);

if (cmd === "create" && name) {
  const i = rest.indexOf("--max-uses");
  const maxUses = i === -1 ? 3 : Number.parseInt(rest[i + 1], 10);
  const token = `tgi_${randomBytes(32).toString("base64url")}`;
  const key = `invite:${createHash("sha256").update(token).digest("hex")}`;
  const record = {
    name,
    createdAt: new Date().toISOString(),
    uses: 0,
    maxUses,
  };
  put(key, JSON.stringify(record));
  if (get(key)?.name !== name) {
    throw new Error("Write did not read back from remote KV");
  }
  console.log(
    `Invite for "${name}" (max ${maxUses} logins). Shown once, send it privately:\n\n${token}\n`
  );
  console.log(
    `They run: telegram auth --login-key   (and paste the key when asked)`
  );
} else if (cmd === "list") {
  for (const key of keys()) {
    const r = get(key);
    if (!r) {
      continue;
    }
    const state = r.revoked
      ? "revoked"
      : r.uses >= r.maxUses
        ? "used up"
        : "active";
    console.log(
      `${r.source === "self-serve" ? "[page] " : ""}${r.name}\t${state}\tuses ${r.uses}/${r.maxUses}\tcreated ${r.createdAt.slice(0, 10)}\tlast ${r.lastUsedAt?.slice(0, 16) ?? "-"}\t${key.slice(7, 19)}`
    );
  }
} else if (cmd === "revoke" && name) {
  let n = 0;
  for (const key of keys()) {
    const r = get(key);
    if (r && (r.name === name || key.slice(7).startsWith(name)) && !r.revoked) {
      put(
        key,
        JSON.stringify({
          ...r,
          revoked: true,
          revokedAt: new Date().toISOString(),
        })
      );
      n++;
    }
  }
  console.log(
    n
      ? `Revoked ${n} invite(s) for "${name}".`
      : `No active invite matches "${name}".`
  );
} else if (cmd === "revoke-all") {
  const selfServe = [name, ...rest].includes("--self-serve");
  let n = 0;
  for (const key of keys()) {
    const r = get(key);
    if (r && !r.revoked && (!selfServe || r.source === "self-serve")) {
      put(
        key,
        JSON.stringify({
          ...r,
          revoked: true,
          revokedAt: new Date().toISOString(),
        })
      );
      n++;
    }
  }
  console.log(`Revoked ${n} active invite(s).`);
} else if (cmd === "signups" && ["on", "off", "status"].includes(name)) {
  if (name !== "status") {
    put("config:signups", name);
  }
  let state = "off";
  try {
    state = wrangler("key", "get", "config:signups", "--text").trim() || "off";
  } catch {}
  if (name !== "status" && state !== name) {
    throw new Error("Write did not read back from remote KV");
  }
  console.log(
    `Signup page: ${state === "on" ? "open" : "closed"}. Issued invites keep working either way.`
  );
} else if (cmd === "emails") {
  console.log("email,created_at");
  for (const { name: key } of JSON.parse(
    wrangler("key", "list", "--prefix", "email:")
  )) {
    const r = get(key);
    if (r) {
      console.log(`${r.email},${r.createdAt}`);
    }
  }
} else if (cmd === "panic") {
  execFileSync(
    "npx",
    ["--yes", "wrangler@latest", "secret", "delete", "API_HASH"],
    { cwd, input: "y\n", stdio: ["pipe", "inherit", "inherit"] }
  );
  console.log(
    "Broker disabled: it now answers 503 to every invite. Restore with: npx wrangler secret put API_HASH"
  );
} else {
  console.log(
    "Usage: invite.mjs create <name> [--max-uses N] | list | revoke <name|hash-prefix> | revoke-all [--self-serve] | signups on|off|status | emails | panic"
  );
  process.exit(1);
}
