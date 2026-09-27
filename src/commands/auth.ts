import { Command } from 'commander';
import { authenticate } from '../auth.js';
import { fetchInviteCredentials } from '../broker.js';
import { getSessionString, isConfigured, saveConfig } from '../config.js';
import { promptHidden } from '../prompt.js';
import { readTextArg } from '../text.js';

/** Invite token from --invite <token|->, TG_INVITE, or a hidden prompt (keeps it out of argv). */
async function resolveInvite(value: string | true): Promise<string> {
  if (typeof value === 'string') return readTextArg(value).trim();
  if (process.env.TG_INVITE) return process.env.TG_INVITE.trim();
  return (await promptHidden('Paste your invite token: ')).trim();
}

export const authCommand = new Command('auth')
  .description('Log in with your own api_id/api_hash, or with an invite (--invite)')
  .option('--invite [token]', 'Log in with an invite instead of your own API keys (omit the token to be prompted; "-" reads stdin)')
  .option('--broker <url>', 'Invite service URL (default: built-in, or TG_BROKER_URL)')
  .option('--op-vault <vault>', 'Set 1Password vault for secret storage')
  .option('--test-dc', "Log in on Telegram's test servers (for development; use with TG_PROFILE)")
  .action(async (opts: { invite?: string | true; broker?: string; opVault?: string; testDc?: boolean }) => {
    // Save op vault config if provided (before auth, so secrets route there)
    if (opts.opVault) {
      saveConfig({ opVault: opts.opVault });
      console.log(`1Password vault set to: ${opts.opVault}`);
    }

    // Never overwrite a working login; after `telegram logout` there is no session and auth proceeds
    if (isConfigured() && getSessionString()) {
      console.log('Already logged in. Run "telegram check" to verify your session.');
      console.log('To log in as someone else, run "telegram logout" first.');
      return;
    }

    try {
      let invite: { apiId: number; apiHash: string } | undefined;
      if (opts.invite) {
        const token = await resolveInvite(opts.invite);
        if (!token) throw new Error('No invite token given');
        invite = await fetchInviteCredentials(token, opts.broker);
        console.log('Invite accepted.');
      }
      const client = await authenticate(invite, !!opts.testDc);
      await client.disconnect();
    } catch (error) {
      console.error('Authentication failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
