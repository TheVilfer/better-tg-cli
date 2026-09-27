import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions/index.js';
import { setCredentials, setSessionString } from './config.js';
import { prompt, promptHidden } from './prompt.js';

export async function authenticate(): Promise<TelegramClient> {
  console.log('\nTelegram Authentication Setup\n');
  console.log('To get your API credentials:');
  console.log('1. Go to https://my.telegram.org/apps');
  console.log('2. Log in with your phone number');
  console.log('3. Create a new application (if you haven\'t already)');
  console.log('4. Copy the api_id and api_hash\n');

  const apiIdStr = await prompt('Enter your API ID: ');
  const apiId = parseInt(apiIdStr, 10);

  if (isNaN(apiId)) {
    throw new Error('Invalid API ID');
  }

  const apiHash = await promptHidden('Enter your API Hash: ');

  if (!apiHash) {
    throw new Error('Invalid API Hash');
  }

  // Save credentials
  setCredentials(apiId, apiHash);

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

  // Save session
  const sessionString = (client.session as StringSession).save();
  setSessionString(sessionString);

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
