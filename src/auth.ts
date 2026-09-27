import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions/index.js';
import { setCredentials, setInviteCredentials, setSessionString } from './config.js';
import { prompt, promptHidden } from './prompt.js';

async function askOwnCredentials(): Promise<{ apiId: number; apiHash: string }> {
  console.log('To get your API credentials:');
  console.log('1. Go to https://my.telegram.org/apps');
  console.log('2. Log in with your phone number');
  console.log('3. Create a new application (if you haven\'t already)');
  console.log('4. Copy the api_id and api_hash\n');

  const apiId = parseInt(await prompt('Enter your API ID: '), 10);
  if (isNaN(apiId)) {
    throw new Error('Invalid API ID');
  }

  const apiHash = await promptHidden('Enter your API Hash: ');
  if (!apiHash) {
    throw new Error('Invalid API Hash');
  }
  return { apiId, apiHash };
}

/**
 * Log in and save the session. With `invite` credentials (from the broker) only the
 * api_id is kept: the api_hash is used for this login and then forgotten.
 */
export async function authenticate(invite?: { apiId: number; apiHash: string }): Promise<TelegramClient> {
  console.log('\nTelegram Authentication Setup\n');

  const { apiId, apiHash } = invite ?? (await askOwnCredentials());

  console.log('\nConnecting to Telegram...');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await prompt('Enter your phone number (with country code, e.g., +1234567890): '),
    // Hidden input: the 2FA password must not end up in terminal scrollback
    password: async () => await promptHidden('Enter your 2FA password (press Enter if none): '),
    phoneCode: async () => await prompt('Enter the code you received: '),
    onError: (err) => console.error('Error:', err),
  });

  // Save credentials only after a successful login
  if (invite) {
    setInviteCredentials(apiId);
  } else {
    setCredentials(apiId, apiHash);
  }
  setSessionString((client.session as StringSession).save());

  console.log('\nAuthentication successful! Session saved.');

  return client;
}

export async function checkAuth(client: TelegramClient): Promise<boolean> {
  try {
    await client.connect();
    return await client.isUserAuthorized();
  } catch {
    return false;
  }
}
