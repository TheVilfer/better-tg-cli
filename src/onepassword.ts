import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { configFile, secretPrefix } from './paths.js';

let opAvailableCache: boolean | null = null;
let opBinaryPath: string | null = null;
let resolvedVault: string | null = null;

function getOpBinary(): string | null {
  if (opBinaryPath !== null) return opBinaryPath;
  try {
    // `where` lists every match on Windows; take the first
    opBinaryPath = execSync(process.platform === 'win32' ? 'where op' : 'which op', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    }).trim().split(/\r?\n/)[0];
  } catch {
    opBinaryPath = '';
  }
  return opBinaryPath || null;
}

function resolveVault(): string | null {
  if (resolvedVault !== null) return resolvedVault;

  // Env var takes precedence
  const envVault = process.env.TG_OP_VAULT;
  if (envVault) {
    resolvedVault = envVault;
    return resolvedVault;
  }

  // Fall back to config file (read directly to avoid circular dep with config.ts)
  try {
    const configPath = configFile('config.json5');
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf8');
      // Use dynamic import to avoid bundling JSON5 parse at module level
      // Simple extraction: look for opVault field
      const match = raw.match(/["']?opVault["']?\s*:\s*["']([^"']+)["']/);
      if (match) {
        resolvedVault = match[1];
        return resolvedVault;
      }
    }
  } catch {
    // Config unreadable — no vault
  }

  resolvedVault = '';
  return null;
}

function getToken(): string | undefined {
  return process.env.OP_SERVICE_ACCOUNT_TOKEN;
}

function itemName(key: string): string {
  return `${secretPrefix()}-${key}`;
}

export function isOnePasswordAvailable(): boolean {
  if (opAvailableCache !== null) return opAvailableCache;

  const token = getToken();
  if (!token || !token.startsWith('ops_')) {
    opAvailableCache = false;
    return false;
  }

  const binary = getOpBinary();
  if (!binary) {
    opAvailableCache = false;
    return false;
  }

  const vault = resolveVault();
  if (!vault) {
    opAvailableCache = false;
    return false;
  }

  try {
    execFileSync(binary, ['whoami'], {
      encoding: 'utf8',
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token },
    });
    opAvailableCache = true;
  } catch {
    opAvailableCache = false;
  }

  return opAvailableCache;
}

export function opGet(key: string): string | null {
  if (!isOnePasswordAvailable()) return null;
  const binary = getOpBinary()!;
  const vault = resolveVault()!;
  const token = getToken()!;

  try {
    const result = execFileSync(binary, [
      'read', `op://${vault}/${itemName(key)}/credential`,
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      env: { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token },
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

interface OpField { id?: string; label?: string; type?: string; value?: string }

/**
 * Stores the secret through stdin as an item JSON template, never as a `credential=<value>`
 * argument: a process's arguments are visible to every user on the machine (`ps`).
 */
export function opSet(key: string, value: string): boolean {
  if (!isOnePasswordAvailable()) return false;
  const binary = getOpBinary()!;
  const vault = resolveVault()!;
  const token = getToken()!;
  const name = itemName(key);
  const run = (args: string[], input?: string): string => execFileSync(binary, args, {
    input,
    encoding: 'utf8',
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'ignore'],
    windowsHide: true,
    env: { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token },
  });

  try {
    let item: { fields?: OpField[] } | null = null;
    try {
      item = JSON.parse(run(['item', 'get', name, '--vault', vault, '--format', 'json']));
    } catch {
      // Item doesn't exist
    }

    if (item) {
      const fields = item.fields ?? [];
      const field = fields.find(f => f.id === 'credential' || f.label === 'credential');
      if (field) field.value = value;
      else fields.push({ id: 'credential', label: 'credential', type: 'CONCEALED', value });
      item.fields = fields;
      run(['item', 'edit', name, '--vault', vault], JSON.stringify(item));
    } else {
      const template = {
        title: name,
        category: 'API_CREDENTIAL',
        fields: [{ id: 'credential', label: 'credential', type: 'CONCEALED', value }],
      };
      run(['item', 'create', '--vault', vault, '-'], JSON.stringify(template));
    }
    return true;
  } catch {
    return false;
  }
}

export function opDelete(key: string): boolean {
  if (!isOnePasswordAvailable()) return false;
  const binary = getOpBinary()!;
  const vault = resolveVault()!;
  const token = getToken()!;

  try {
    execFileSync(binary, [
      'item', 'delete', itemName(key), '--vault', vault,
    ], {
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token },
    });
    return true;
  } catch {
    return false;
  }
}
