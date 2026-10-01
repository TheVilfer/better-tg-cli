# Remote MCP relay

A Cloudflare Worker at `https://mcp.better-tg-cli.com` that lets apps which connect to MCP servers
by URL and OAuth (claude.ai, ChatGPT, Le Chat and others) reach `telegram mcp --remote` on the
user's own computer. The Telegram session, the write guard and the audit log stay on that
computer; the relay only passes requests through. Design and plan: issue #17.

```
claude.ai / ChatGPT ──OAuth 2.1 + PKCE──▶ /mcp (this Worker)
                                             │ Durable Object per device
                                             ▼
                     telegram mcp --remote ◀─ outbound WebSocket from the user's computer
```

## How a client gets access

1. The app opens `/authorize`. The page shows the app's name, its verified domain (Client ID
   Metadata Documents) or "not verified" (dynamic registration), and where the access goes.
2. The person types a pairing code from their terminal (`telegram remote pair`, 8 characters,
   10 minutes, one use). A wrong code doesn't reach the device; checks are rate-limited per IP.
3. The relay asks the device over its WebSocket. The person at that computer confirms in a terminal
   prompt or an OS dialog, the same mechanism as `write-access`, which an agent can't answer.
   Only then does the relay complete the authorization. The browser alone is never enough.
4. The grant's user is the device, and its props are `{ deviceId }`.

Tokens: access tokens live 1 hour, refresh tokens rotate and lapse after 30 idle days. The
device lists and revokes its clients with `GET /device/clients` and `POST /device/revoke`.

## Devices

A device is whoever holds its secret (`tgrd_` + 32 random bytes, kept in the OS secret store on
the computer). The device id is a hash of the secret, so the relay keeps no device records.
The secret travels only in the `Authorization` header of `/device/*` calls and the WebSocket
handshake, never in a URL, and it is separate from any OAuth credential.

One WebSocket per device: a new connection replaces the old one. While no device is connected,
`/mcp` answers with a readable "your computer is offline" result instead of a transport error.

## What the relay sees and stores

- Requests and replies pass through in plaintext: TLS ends at the Worker, and end-to-end
  encryption to a cloud model isn't possible. The relay doesn't log or store them
  (`observability` is off), and this code is the code that runs.
- KV (`OAUTH_KV`): OAuth clients and grants (tokens only as hashes, props encrypted by
  `@cloudflare/workers-oauth-provider`), grant metadata (app name and domain, approval time) and
  pending consent records (hashed keys, 10 minutes).
- `PairingCodes`, one Durable Object: pairing codes by hash, so a code works seconds after it is
  minted from any location and taking it is atomic. Expired codes are swept by an alarm.
- `DeviceRelay`, one Durable Object per device: only the live WebSocket.

## Develop

```sh
cd relay
npm ci
npm test          # workerd via wrangler's test harness: OAuth, pairing, consent, relay, revoke
npm run typecheck
npx wrangler dev  # local, https URLs as in production ([dev] upstream_protocol)
```

Deploy (maintainer): create the KV namespace (`npx wrangler kv namespace create OAUTH_KV`), put its
id in `wrangler.toml`, then `npx wrangler deploy`. The custom domain `mcp.better-tg-cli.com` is
created on the first deploy.
