import { afterEach, describe, expect, it } from 'vitest';
import type { TelegramClient } from 'teleproto';
import { invokeApi, serializeApiResult, disconnectClient } from '../src/client.js';
import { resolveApiMethod, isApiReadMethod, apiRefusalReason } from '../src/api-methods.js';
import { apiMethodToken, planCall } from '../src/mcp.js';
import { setStrictChatResolution } from '../src/resolve-mode.js';
import { MockClient } from '../src/mock/client.js';
import { seedWorld, type MockWorld } from '../src/mock/world.js';

const mock = (world: MockWorld = seedWorld()) => new MockClient(world) as unknown as TelegramClient;

afterEach(async () => {
  await disconnectClient();
  setStrictChatResolution(false);
});

describe('api method resolution', () => {
  it('resolves namespaced and top-level requests, case-insensitively', () => {
    expect(resolveApiMethod('messages.GetHistory').className).toBe('messages.GetHistory');
    expect(resolveApiMethod('messages.gethistory').className).toBe('messages.GetHistory');
    expect(resolveApiMethod('MESSAGES.GetHistory').className).toBe('messages.GetHistory');
    expect(resolveApiMethod('help.GetConfig').className).toBe('help.GetConfig');
    expect(resolveApiMethod('InvokeWithLayer').className).toBe('InvokeWithLayer');
  });

  it('rejects non-requests and typos', () => {
    expect(() => resolveApiMethod('messages.Nope')).toThrow(/not a request/);
    expect(() => resolveApiMethod('nope.Thing')).toThrow(/Unknown namespace/);
    expect(() => resolveApiMethod('messages.Dialogs')).toThrow(/not a request/); // a constructor, not a method
    expect(() => resolveApiMethod('')).toThrow(/Specify a method/);
  });
});

describe('api read/write classification', () => {
  it('treats Get/Check/Search/Resolve as reads, everything else as a write', () => {
    for (const m of ['messages.GetHistory', 'help.GetConfig', 'contacts.Search', 'contacts.ResolveUsername', 'account.GetPassword', 'channels.GetAdminLog']) {
      expect(isApiReadMethod(m), m).toBe(true);
    }
    for (const m of ['messages.SendMessage', 'contacts.Block', 'channels.EditTitle', 'messages.DeleteMessages']) {
      expect(isApiReadMethod(m), m).toBe(false);
    }
  });

  it('forces known side-effecting Get* methods to writes', () => {
    expect(isApiReadMethod('messages.GetBotCallbackAnswer')).toBe(false);
  });
});

describe('api refusals', () => {
  it('refuses deletion, session termination, 2FA, location and paying', () => {
    expect(apiRefusalReason('account.DeleteAccount')).toMatch(/irreversible/);
    expect(apiRefusalReason('auth.LogOut')).toMatch(/session/);
    expect(apiRefusalReason('auth.ResetAuthorizations')).toMatch(/session/);
    expect(apiRefusalReason('account.UpdatePasswordSettings')).toMatch(/2FA/);
    expect(apiRefusalReason('channels.EditLocation')).toMatch(/location/);
    expect(apiRefusalReason('payments.SendStarsForm')).toMatch(/payment|Stars/);
  });

  it('allows read-only payments and ordinary methods', () => {
    expect(apiRefusalReason('payments.GetStarsStatus')).toBeNull();
    expect(apiRefusalReason('messages.GetHistory')).toBeNull();
    expect(apiRefusalReason('messages.SendMessage')).toBeNull();
  });
});

describe('api hardening: side-effecting reads reclassified', () => {
  it('treats view-increment and callback Get* methods as writes', () => {
    for (const m of ['messages.GetMessagesViews', 'messages.GetBotCallbackAnswer', 'ephemeral.GetCallbackAnswer']) {
      expect(isApiReadMethod(m), m).toBe(false);
    }
  });

  it('keeps genuinely read-only Get*/listing methods as reads', () => {
    for (const m of ['account.GetAuthorizations', 'account.GetWebAuthorizations', 'messages.GetExportedChatInvites', 'payments.GetStarsStatus', 'payments.CheckGiftCode', 'stories.GetStoryViewsList']) {
      expect(isApiReadMethod(m), m).toBe(true);
      expect(apiRefusalReason(m), m).toBeNull();
    }
  });
});

describe('api hardening: hard refusals', () => {
  it('refuses the entire auth namespace (login/session)', () => {
    for (const m of ['auth.CheckPassword', 'auth.AcceptLoginToken', 'auth.ExportAuthorization', 'auth.ImportAuthorization', 'auth.ExportLoginToken', 'auth.SignIn', 'auth.SendCode', 'auth.RecoverPassword', 'auth.BindTempAuthKey']) {
      expect(apiRefusalReason(m), m).toMatch(/login|session/i);
    }
  });

  it('refuses session/2FA/phone/takeout/passport account methods', () => {
    for (const m of ['account.DeleteAccount', 'account.SetAuthorizationTTL', 'account.ChangeAuthorizationSettings', 'account.GetTmpPassword', 'account.GetPasswordSettings', 'account.UpdatePasswordSettings', 'account.ChangePhone', 'account.SendChangePhoneCode', 'account.VerifyPhone', 'account.VerifyEmail', 'account.InitTakeoutSession', 'account.FinishTakeoutSession', 'account.AcceptAuthorization', 'account.SaveSecureValue', 'account.DeleteSecureValue', 'account.SetPrivacy']) {
      expect(apiRefusalReason(m), m).toBeTruthy();
    }
  });

  it('refuses location/phone sharing, url-auth login, ownership, and money tokens', () => {
    expect(apiRefusalReason('contacts.GetLocated')).toMatch(/geolocation|location/i);
    expect(apiRefusalReason('contacts.AcceptContact')).toMatch(/phone/i);
    expect(apiRefusalReason('messages.AcceptUrlAuth')).toMatch(/website|login/i);
    expect(apiRefusalReason('messages.RequestUrlAuth')).toBeTruthy();
    expect(apiRefusalReason('messages.CheckUrlAuthMatchCode')).toBeTruthy();
    expect(apiRefusalReason('messages.EditChatCreator')).toMatch(/ownership/i);
    expect(apiRefusalReason('payments.GetStarsRevenueWithdrawalUrl')).toMatch(/withdraw/i);
    expect(apiRefusalReason('payments.GetStarGiftWithdrawalUrl')).toBeTruthy();
    expect(apiRefusalReason('phone.GetGroupCallStreamRtmpUrl')).toMatch(/credential|key/i);
  });

  it('refuses sharing contact/geo media and phone-privacy exceptions by inspecting params', () => {
    expect(apiRefusalReason('messages.SendMedia', { media: { className: 'InputMediaGeoLive' } })).toMatch(/location|contact/i);
    expect(apiRefusalReason('messages.EditMessage', { media: { className: 'InputMediaContact' } })).toMatch(/contact|location/i);
    expect(apiRefusalReason('contacts.AddContact', { addPhonePrivacyException: true })).toMatch(/phone/i);
    // The same methods are fine without the sensitive payload.
    expect(apiRefusalReason('messages.SendMedia', { media: { className: 'InputMediaUploadedPhoto' } })).toBeNull();
    expect(apiRefusalReason('contacts.AddContact', { id: 'x' })).toBeNull();
  });
});

describe('MCP routing of the api command', () => {
  it('finds the method token past flags', () => {
    expect(apiMethodToken(['api', 'messages.GetHistory', '--params', '{}'])).toBe('messages.GetHistory');
    expect(apiMethodToken(['api', '--params', '{"x":1}', 'help.GetConfig'])).toBe('help.GetConfig');
    expect(apiMethodToken(['api', '--write', 'contacts.Block'])).toBe('contacts.Block');
    expect(apiMethodToken(['api'])).toBeUndefined();
  });

  it('read methods go to telegram_read, writes to telegram_write, refusals never run', () => {
    expect(planCall('telegram_read', { args: ['api', 'help.GetConfig'] })).toMatchObject({ readOnly: true });
    expect(planCall('telegram_read', { args: ['api', 'contacts.Block', '--params', '{}'] })).toMatch(/use telegram_write/);
    expect(planCall('telegram_write', { args: ['api', 'contacts.Block'] })).toMatchObject({ readOnly: false });
    expect(planCall('telegram_write', { args: ['api', 'help.GetConfig'] })).toMatch(/use telegram_read/);
    expect(planCall('telegram_read', { args: ['api', 'account.DeleteAccount'] })).toMatch(/irreversible/);
    expect(planCall('telegram_write', { args: ['api', 'payments.SendStarsForm'] })).toMatch(/payment|Stars/);
    expect(planCall('telegram_read', { args: ['api'] })).toMatch(/needs a method/);
    // Hardened refusals are rejected by the read tool even though some are named like reads.
    expect(planCall('telegram_read', { args: ['api', 'auth.CheckPassword'] })).toMatch(/login|session/i);
    expect(planCall('telegram_read', { args: ['api', 'contacts.GetLocated'] })).toMatch(/location|geolocation/i);
    expect(planCall('telegram_write', { args: ['api', 'account.SetPrivacy'] })).toMatch(/privacy/i);
    // A reclassified side-effecting read is a write, not a read.
    expect(planCall('telegram_read', { args: ['api', 'messages.GetMessagesViews'] })).toMatch(/use telegram_write/);
  });
});

describe('api end to end on the mock', () => {
  it('builds and invokes a read, resolving {_chat} peers', async () => {
    const result = await invokeApi(mock(), 'channels.GetFullChannel', { channel: { _chat: 'Team' } });
    const json = JSON.parse(serializeApiResult(result));
    expect(json.chats[0].title).toBe('Team');
    expect(json.chats[0].className).toBe('Channel');
  });

  it('serializes big integers as strings and reads contacts', async () => {
    const json = JSON.parse(serializeApiResult(await invokeApi(mock(), 'contacts.GetContacts', {})));
    expect(json.savedCount).toBe(3);
    expect(typeof json.users[0].id).toBe('string');
  });
});
