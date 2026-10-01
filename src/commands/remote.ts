import { Command } from 'commander';
import { deviceSecret, forgetDevice, relayCall, relayUrl } from '../remote.js';
import chalk from '../colors.js';

/**
 * `telegram remote`: this computer's side of the hosted relay. Apps such as claude.ai and ChatGPT
 * connect to `<relay>/mcp`; `telegram mcp --remote` must be running for them to reach this
 * computer. Each new app asks for a pairing code from here, and then for a confirmation here.
 */

function secretOrExit(create = false): string {
  const secret = deviceSecret({ create });
  if (secret) return secret;
  console.error(
    create
      ? chalk.red('No secret store for the device key (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).')
      : chalk.yellow('This computer isn\'t set up for the relay yet. Run `telegram remote pair` first.')
  );
  process.exit(1);
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error(chalk.red(`Relay error: ${e instanceof Error ? e.message : String(e)}`));
    process.exit(1);
  }
}

type Client = { id: string; name: string; domain: string | null; approvedAt: string };

const pairCommand = new Command('pair')
  .description('Get a one-time code (10 minutes) to connect an app such as claude.ai or ChatGPT')
  .option('--json', 'Print {code, expiresIn, url}')
  .action(async (options: { json?: boolean }) => {
    const secret = secretOrExit(true);
    const res = await call(() => relayCall<{ code: string; expiresIn: number; url: string }>(secret, '/device/pair', { method: 'POST' }));
    if (options.json) return console.log(JSON.stringify(res));
    console.log(`Pairing code: ${chalk.bold(res.code)}  (valid ${Math.round(res.expiresIn / 60)} minutes, one use)`);
    console.log('');
    console.log(`1. In the app, add a custom connector with the URL ${res.url}`);
    console.log('2. On the sign-in page, enter the code and press Allow.');
    console.log('3. Confirm in the dialog that appears on this computer.');
    console.log('');
    console.log(chalk.gray('`telegram mcp --remote` has to be running on this computer while the app uses Telegram.'));
  });

const clientsCommand = new Command('clients')
  .description('List the apps connected to this computer through the relay')
  .option('--json', 'Print JSON')
  .action(async (options: { json?: boolean }) => {
    const secret = secretOrExit();
    const { clients } = await call(() => relayCall<{ clients: Client[] }>(secret, '/device/clients'));
    if (options.json) return console.log(JSON.stringify(clients));
    // The relay lists grants from KV, which can lag a fresh approval by up to a minute
    if (!clients.length) return console.log(`No apps connected.${chalk.gray(' An app you just approved can take up to a minute to show up.')}`);
    for (const c of clients) {
      console.log(`${c.id}  ${c.name}${c.domain ? ` (${c.domain})` : chalk.gray(' (name not verified)')}  ${chalk.gray(c.approvedAt)}`);
    }
  });

const revokeCommand = new Command('revoke')
  .description('Disconnect one app (id from `telegram remote clients`) or every app (--all)')
  .argument('[id]', 'Client id')
  .option('--all', 'Disconnect every app')
  .action(async (id: string | undefined, options: { all?: boolean }) => {
    if (!id && !options.all) {
      console.error(chalk.red('Pass a client id from `telegram remote clients`, or --all.'));
      process.exit(2);
    }
    const secret = secretOrExit();
    const res = await call(() => relayCall<{ revoked: number }>(secret, '/device/revoke', { method: 'POST', body: options.all ? { all: true } : { id } }));
    console.log(`Disconnected ${res.revoked} app${res.revoked === 1 ? '' : 's'}.`);
  });

const resetCommand = new Command('reset')
  .description('Disconnect every app and forget this computer\'s device key (a new one is made on next use)')
  .action(async () => {
    const secret = deviceSecret();
    if (secret) {
      // Old grants route to the old device id, so they go first; a key that is gone can't revoke them
      await relayCall<{ revoked: number }>(secret, '/device/revoke', { method: 'POST', body: { all: true } }).catch(e => {
        if (!/404/.test(String(e))) {
          console.error(chalk.red(`Could not disconnect the apps: ${e instanceof Error ? e.message : String(e)}. The device key is kept; try again.`));
          process.exit(1);
        }
      });
      forgetDevice();
    }
    console.log('Every app is disconnected and the device key is gone. Running `telegram remote pair` again starts fresh.');
  });

export const remoteCommand = new Command('remote')
  .description(`Connect apps such as claude.ai and ChatGPT to this computer through the hosted relay (${relayUrl()})`)
  .addCommand(pairCommand)
  .addCommand(clientsCommand)
  .addCommand(revokeCommand)
  .addCommand(resetCommand);
