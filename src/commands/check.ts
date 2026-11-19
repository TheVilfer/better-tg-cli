import { Command } from 'commander';
import { loginHint } from '../login-hint.js';
import { getClient, getMe, disconnectClient } from '../client.js';
import { isConfigured, loadConfig, secretFileConflicts, secretSource, type TgConfig } from '../config.js';
import { configDir, isMock, profile } from '../paths.js';
import { mockStatePath } from '../mock/world.js';
import { isSecretStoreAvailable } from '../secrets.js';
import { isOnePasswordAvailable } from '../onepassword.js';
import { isKeychainAvailable } from '../keychain.js';
import { isLibsecretAvailable } from '../libsecret.js';
import { isDpapiAvailable } from '../dpapi.js';
import chalk from '../colors.js';
import ora from '../spinner.js';

function getSecretBackendLabel(): string {
  if (isOnePasswordAvailable()) return '1Password';
  if (isKeychainAvailable()) return 'macOS Keychain';
  if (isLibsecretAvailable()) return 'Secret Service (libsecret)';
  if (isDpapiAvailable()) return 'Windows DPAPI';
  return 'config file (plaintext)';
}

/** Where the session of this snapshot actually came from, not just which store is reachable. */
function sessionStorageLabel(config: TgConfig): string {
  if (secretSource('sessionString', config) === 'file') {
    return 'config.json5 (plaintext file, used as is; it is not moved into the secret store)';
  }
  return getSecretBackendLabel();
}

export const checkCommand = new Command('check')
  .description('Verify session and credentials')
  .action(async () => {
    if (isMock()) {
      const me = await getMe(await getClient());
      console.log(chalk.green('Mock mode: no Telegram session is used'));
      console.log(`Logged in as: ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'no username'})`);
      console.log(`State file: ${mockStatePath()} (delete it to start over)`);
      await disconnectClient();
      return;
    }
    // One snapshot for the whole check: the conflicts, the session, the transport and the servers
    let config: TgConfig;
    let configured: boolean;
    let conflicts: string[];
    try {
      config = loadConfig(() => {});
      configured = isConfigured(config);
      conflicts = secretFileConflicts(config);
    } catch (error) {
      // e.g. the secret store could not be read
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
    if (!configured) {
      const p = profile();
      console.log(chalk.red(p
        ? `Profile "${p}" is not configured. Run: TG_PROFILE=${p} telegram onboard [--test-dc] (a person at their own terminal can use \`TG_PROFILE=${p} telegram auth --qr\` instead)`
        : `Not configured. ${loginHint()}`));
      process.exit(1);
    }

    // Before connecting: with a dead stored session this is the hint that the file holds another one
    for (const key of conflicts) {
      console.log(chalk.yellow(`config.json5 also holds a ${key} that differs from the secret store; the stored one is used.`));
    }

    const spinner = ora('Checking session...').start();

    try {
      const client = await getClient(config);
      const me = await getMe(client);

      spinner.succeed(chalk.green('Session valid'));
      console.log(`Logged in as: ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'no username'})`);
      console.log(`Session stored in: ${sessionStorageLabel(config)}`);
      if (profile()) console.log(`Profile: ${profile()} (${configDir()})`);
      if (config.testServers) console.log('Servers: TEST (not production)');

      await disconnectClient();
    } catch (error) {
      spinner.fail(chalk.red('Session invalid or expired'));
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      if (!message.includes(loginHint())) console.log(`\n${loginHint()}`);
      process.exit(1);
    }
  });
