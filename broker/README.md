# Invite broker

A Cloudflare Worker that gives invited users the maintainer's `api_id`/`api_hash` at login time
(`telegram auth --invite`). Open-source users bring their own keys and never touch this.

- Endpoint: `POST /v1/credentials` with body `{"invite": "<token>"}`. It returns `{apiId, apiHash}`
  and `Cache-Control: no-store`.
- Errors: 403 for an unknown or revoked invite, 429 when an invite is used up, 400 for a malformed
  request.
- Invites live in KV (`INVITES`) under `invite:<sha256(token)>`. The raw token is never stored.
  Use counts are soft limits, because KV is eventually consistent.
- Secrets are `API_ID` and `API_HASH` (`wrangler secret put`). Logging is off, since request
  bodies carry invite tokens.
- There is no admin HTTP endpoint. Invites are managed locally through wrangler.
- Deployed at `https://tg-cli-broker.login-c2d.workers.dev` (Cloudflare account "Anything* team").

## Invites

```bash
cd broker
node scripts/invite.mjs create "Alice" --max-uses 3   # prints the token once; send it privately
node scripts/invite.mjs list                          # name, state, uses, last use
node scripts/invite.mjs revoke "Alice"                # or a hash prefix from `list`
```

Revoking an invite blocks new logins with it. It does **not** log out people who already signed
in, because their session belongs to their Telegram account. To stop everyone, rotate the app
keys: create a new app on my.telegram.org, then run `wrangler secret put API_ID` / `API_HASH`.
Existing sessions of the old app keep working until Telegram revokes them.

## Deploy

```bash
cd broker
npx wrangler deploy
printf '%s' "$API_ID" | npx wrangler secret put API_ID
printf '%s' "$API_HASH" | npx wrangler secret put API_HASH
```

CI never deploys this. Tests live in `../test/broker.test.ts`.

## Incident response

**Someone is abusing the app keys** (spam reports, a leaked invite, a flood of logins in
`invite.mjs list`). The goal is to stop new logins first and investigate afterwards.

1. **Stop handing out keys (seconds):** `node scripts/invite.mjs panic`. This deletes the
   `API_HASH` secret, so the worker answers `503 broker_not_configured` to every request before it
   reads KV. The change can take up to a minute to reach every edge.
2. **Revoke invites:** `node scripts/invite.mjs revoke <name>` for the culprit, or
   `node scripts/invite.mjs revoke-all`.
3. **Restore when it's safe:** `npx wrangler secret put API_HASH` and paste the hash from
   my.telegram.org. Check with an invalid token: the answer should be `403 invalid_invite`, not `503`.

**What this can't do.** People who already logged in through an invite keep a working session:
it lives on their machine, and only they (with `telegram logout`) or Telegram can end it. The
api_hash is never stored on their machines, so they can't log in again after a revoke. If Telegram
blocks the app's `api_id`, every invite session stops working. Then create a new app, put its keys
into the broker (`API_ID` and `API_HASH`), and hand out new invites.

**Rate limiting and logs.** `[[ratelimits]]` in `wrangler.toml` allows 5 requests per minute per
IP. Request logging stays off (`observability.enabled = false`) because PRIVACY.md promises it.
Watch abuse through the per-invite `uses` and `last` columns of `invite.mjs list` instead.
