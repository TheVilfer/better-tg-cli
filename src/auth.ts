import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions/index.js';
import { renderUnicodeCompact } from 'uqr';
import { clientParams } from './client-options.js';
import { loadConfig, saveConfig, setCredentials, setInviteCredentials, setSessionString } from './config.js';
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
export async function authenticate(
  invite?: { apiId: number; apiHash: string },
  testServers = false,
  qr = false,
): Promise<TelegramClient> {
  console.log(testServers ? '\nTelegram Authentication Setup (TEST servers)\n' : '\nTelegram Authentication Setup\n');

  const { apiId, apiHash } = invite ?? (await askOwnCredentials());

  console.log('\nConnecting to Telegram...');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, clientParams(testServers));

  const password = async () => await promptHidden('Enter your 2FA password (press Enter if none): ');
  if (qr) {
    await client.connect();
    let drawn = 0;
    await client.signInUserWithQrCode({ apiId, apiHash }, {
      qrCode: async ({ token }) => {
        const url = `tg://login?token=${Buffer.from(token).toString('base64url')}`;
        const art = renderQr(url);
        // Redraw in place: the token refreshes every 30 s
        if (drawn && process.stdout.isTTY) process.stdout.write(`\x1b[${drawn}A\x1b[J`);
        const text = `\nOn your phone: Telegram → Settings → Devices → Link Desktop Device, then scan:\n\n${art}\n(refreshes every 30 s; Ctrl-C to cancel)\n`;
        process.stdout.write(text);
        drawn = text.split('\n').length - 1;
      },
      password,
      onError: async (err) => { console.error('Error:', err.message); return true; },
    });
  } else await client.start({
    phoneNumber: async () => await prompt('Enter your phone number (with country code, e.g., +1234567890): '),
    // Hidden input: the 2FA password must not end up in terminal scrollback
    password,
    phoneCode: async () => await prompt('Enter the code you received: '),
    // Only asked for a phone with no account yet (typical for test-DC numbers)
    firstAndLastNames: async () => [(await prompt('New account. First name: ')) || 'Dev', (await prompt('Last name (optional): ')) || ''],
    onError: (err) => console.error('Error:', err),
  });

  // Save credentials only after a successful login
  if (invite) {
    setInviteCredentials(apiId);
  } else {
    setCredentials(apiId, apiHash);
  }
  // Only touch the flag when it is or was set, so ordinary configs stay unchanged
  if (testServers || loadConfig(() => {}).testServers) saveConfig({ testServers });
  setSessionString((client.session as StringSession).save());

  console.log('\nAuthentication successful! Session saved.');

  return client;
}

/** Terminal QR for a dark background (verified by decoding); TG_QR_INVERT=1 for light terminals. */
export function renderQr(data: string): string {
  return renderUnicodeCompact(data, { border: 2, invert: !!process.env.TG_QR_INVERT });
}

export async function checkAuth(client: TelegramClient): Promise<boolean> {
  try {
    await client.connect();
    return await client.isUserAuthorized();
  } catch {
    return false;
  }
}
