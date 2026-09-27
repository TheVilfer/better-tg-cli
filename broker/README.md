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
