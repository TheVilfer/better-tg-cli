/**
 * Invite-only credential broker (Cloudflare Worker in ./broker). Open-source users
 * bring their own api_id/api_hash; invited users get the maintainer's app keys here.
 */
export const DEFAULT_BROKER_URL = 'https://tg-cli-broker.login-c2d.workers.dev';

const ERRORS: Record<string, string> = {
  invalid_invite: 'This invite is not valid. Check that you pasted the whole token.',
  invite_revoked: 'This invite was revoked. Ask for a new one.',
  invite_used_up: 'This invite has been used the maximum number of times. Ask for a new one.',
  broker_not_configured: 'The invite service is not configured yet. Try again later.',
};

export async function fetchInviteCredentials(
  invite: string,
  brokerUrl = process.env.TG_BROKER_URL || DEFAULT_BROKER_URL,
  fetchImpl: typeof fetch = fetch
): Promise<{ apiId: number; apiHash: string }> {
  let res: Response;
  try {
    res = await fetchImpl(`${brokerUrl.replace(/\/$/, '')}/v1/credentials`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ invite: invite.trim() }),
    });
  } catch (error) {
    throw new Error(`Could not reach the invite service (${brokerUrl}): ${error instanceof Error ? error.message : error}`);
  }

  const body = (await res.json().catch(() => ({}))) as { apiId?: number; apiHash?: string; error?: string };
  if (!res.ok) {
    throw new Error(ERRORS[body.error ?? ''] ?? `Invite service error (HTTP ${res.status}).`);
  }
  if (!body.apiId || !body.apiHash) throw new Error('Invite service returned an unexpected response.');
  return { apiId: body.apiId, apiHash: body.apiHash };
}
