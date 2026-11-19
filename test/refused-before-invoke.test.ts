import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Write mode "on": the guard lets every write through, so only the hard refusal can stop a call.
const assertWriteEnabled = vi.hoisted(() => vi.fn());
const getClient = vi.hoisted(() => vi.fn(async () => ({})));
const invokeApi = vi.hoisted(() => vi.fn(async () => true));
vi.mock('../src/guard.js', async orig => ({ ...(await orig<typeof import('../src/guard.js')>()), assertWriteEnabled }));
vi.mock('../src/client.js', async orig => ({
  ...(await orig<typeof import('../src/client.js')>()),
  getClient,
  invokeApi,
  disconnectClient: async () => {},
}));
vi.mock('../src/audit.js', () => ({ auditLog: () => {} }));

import { apiCommand } from '../src/commands/api.js';
import { buildLeaf } from '../src/commands/generated.js';
import { methodClassName } from '../src/generated-registry.js';

const saved = { ...process.env };
let err: string[];
beforeEach(() => {
  err = [];
  vi.spyOn(console, 'error').mockImplementation(m => { err.push(String(m)); });
  vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error(`exit ${code}`); }) as never);
  assertWriteEnabled.mockClear();
  getClient.mockClear();
  invokeApi.mockClear();
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

// [class name, namespace, generated method, its flags, the same call as raw --params]
const CASES: [string, string, string, string[], Record<string, unknown>][] = [
  ['messages.SendPaidReaction', 'messages', 'send-paid-reaction', ['--peer', '@c', '--msg-id', '1', '--count', '5'], { peer: '@c', msgId: 1, count: 5 }],
  ['account.RegisterPasskey', 'account', 'register-passkey', [], {}],
  ['account.DeletePasskey', 'account', 'delete-passkey', ['--id', 'x'], { id: 'x' }],
  ['account.InitPasskeyRegistration', 'account', 'init-passkey-registration', [], {}],
];

describe.each([['terminal', {}], ['MCP', { TG_MCP: '1' }]])('refused before invoke in write mode "on" (%s)', (_where, env) => {
  beforeEach(() => { Object.assign(process.env, env); });

  it.each(CASES)('%s: the raw api form', async (className, _ns, _method, _args, params) => {
    await expect(apiCommand.parseAsync([className, '--params', JSON.stringify(params)], { from: 'user' })).rejects.toThrow('exit 1');
    expect(err.join('\n')).toMatch(/^Refused/m);
    expect(getClient).not.toHaveBeenCalled();
    expect(invokeApi).not.toHaveBeenCalled();
  });

  it.each(CASES)('%s: the generated command', async (className, ns, method, args) => {
    expect(methodClassName(ns, method)).toBe(className);
    const leaf = buildLeaf(ns, method, className, true);
    await expect(leaf.parseAsync(args, { from: 'user' })).rejects.toThrow('exit 1');
    expect(err.join('\n')).toMatch(/^Refused/m);
    expect(getClient).not.toHaveBeenCalled();
    expect(invokeApi).not.toHaveBeenCalled();
  });
});

it('control: an ordinary write runs in mode "on" (so the spies above would see a call)', async () => {
  await apiCommand.parseAsync(['contacts.Block', '--params', '{"id": "@x"}'], { from: 'user' });
  expect(assertWriteEnabled).toHaveBeenCalled();
  expect(invokeApi).toHaveBeenCalledTimes(1);
});
