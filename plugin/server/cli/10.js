  exports2.BotMethodInvalidError = BotMethodInvalidError;

  class ConnectionDeviceModelEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified device model is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_DEVICE_MODEL_EMPTY";
    }
  }
  exports2.ConnectionDeviceModelEmptyError = ConnectionDeviceModelEmptyError;

  class ConnectionLangPackInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified language pack is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_LANG_PACK_INVALID";
    }
  }
  exports2.ConnectionLangPackInvalidError = ConnectionLangPackInvalidError;

  class ConnectionNotInitedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Please initialize the connection using initConnection before making queries." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_NOT_INITED";
    }
  }
  exports2.ConnectionNotInitedError = ConnectionNotInitedError;

  class ConnectionSystemEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified system version is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_SYSTEM_EMPTY";
    }
  }
  exports2.ConnectionSystemEmptyError = ConnectionSystemEmptyError;

  class ConnectionSystemLangCodeEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified system language code is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_SYSTEM_LANG_CODE_EMPTY";
    }
  }
  exports2.ConnectionSystemLangCodeEmptyError = ConnectionSystemLangCodeEmptyError;

  class FileMigrateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const newDc = Number(args.capture || 0);
      const message = "The file currently being accessed is stored in DC " + newDc + ", please re-send the query to that DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.newDc = newDc;
    }
  }
  exports2.FileMigrateError = FileMigrateError;

  class FilePartMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "Part " + value + " of the file is missing from storage. Try repeating the method call to resave the part." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.FilePartMissingError = FilePartMissingError;

  class InputConstructorInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified TL constructor is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_CONSTRUCTOR_INVALID";
    }
  }
  exports2.InputConstructorInvalidError = InputConstructorInvalidError;

  class InputFetchErrorError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An error occurred while parsing the provided TL constructor." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_FETCH_ERROR";
    }
  }
  exports2.InputFetchErrorError = InputFetchErrorError;

  class InputFetchFailError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An error occurred while parsing the provided TL constructor." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_FETCH_FAIL";
    }
  }
  exports2.InputFetchFailError = InputFetchFailError;

  class InputLayerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified layer is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_LAYER_INVALID";
    }
  }
  exports2.InputLayerInvalidError = InputLayerInvalidError;

  class InputMethodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified method is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_METHOD_INVALID";
    }
  }
  exports2.InputMethodInvalidError = InputMethodInvalidError;

  class InputRequestTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The request payload is too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_REQUEST_TOO_LONG";
    }
  }
  exports2.InputRequestTooLongError = InputRequestTooLongError;

  class PeerFloodError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The current account is spamreported, you cannot execute this action, check @spambot for more info." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PEER_FLOOD";
    }
  }
  exports2.PeerFloodError = PeerFloodError;

  class StickersetNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed stickerset information is equal to the current information." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKERSET_NOT_MODIFIED";
    }
  }
  exports2.StickersetNotModifiedError = StickersetNotModifiedError;

  class AuthKeyUnregisteredError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The specified authorization key is not registered in the system (for example, a PFS temporary key has expired)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_KEY_UNREGISTERED";
    }
  }
  exports2.AuthKeyUnregisteredError = AuthKeyUnregisteredError;

  class AuthKeyInvalidError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The specified auth key is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_KEY_INVALID";
    }
  }
  exports2.AuthKeyInvalidError = AuthKeyInvalidError;

  class AuthKeyPermEmptyError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The method is unavailable for temporary authorization keys, not bound to a permanent authorization key." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_KEY_PERM_EMPTY";
    }
  }
  exports2.AuthKeyPermEmptyError = AuthKeyPermEmptyError;

  class SessionExpiredError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The session has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SESSION_EXPIRED";
    }
  }
  exports2.SessionExpiredError = SessionExpiredError;

  class SessionPasswordNeededError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "2FA is enabled, use a password to login." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SESSION_PASSWORD_NEEDED";
    }
  }
  exports2.SessionPasswordNeededError = SessionPasswordNeededError;

  class SessionRevokedError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The session was revoked by the user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SESSION_REVOKED";
    }
  }
  exports2.SessionRevokedError = SessionRevokedError;

  class UserDeactivatedError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The current account was deleted by the user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_DEACTIVATED";
    }
  }
  exports2.UserDeactivatedError = UserDeactivatedError;

  class UserDeactivatedBanError extends RPCBaseErrors_1.UnauthorizedError {
    constructor(args) {
      const message = "The current account was deleted and banned by Telegram's antispam system." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_DEACTIVATED_BAN";
    }
  }
  exports2.UserDeactivatedBanError = UserDeactivatedBanError;

  class AccessDeniedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The account was deactivated, or is a bot/service account." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ACCESS_DENIED";
    }
  }
  exports2.AccessDeniedError = AccessDeniedError;

  class AllowPaymentRequiredError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "This peer charges " + value + " [Telegram Stars](https://core.telegram.org/api/stars) per message, but the `allow_paid_stars` was not set or its value is smaller than " + value + "." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.AllowPaymentRequiredError = AllowPaymentRequiredError;

  class BotAccessForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The specified method *can* be used over a [business connection](https://core.telegram.org/api/bots/connected-business-bots) for some operations, but the specified query attempted an operation that is not allowed over a business connection." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_ACCESS_FORBIDDEN";
    }
  }
  exports2.BotAccessForbiddenError = BotAccessForbiddenError;

  class BotForumCreateForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Since the bot's user.bot_forum_can_manage_topics flag is **not** set, the user cannot create or modify bot forum topics." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_FORUM_CREATE_FORBIDDEN";
    }
  }
  exports2.BotForumCreateForbiddenError = BotForumCreateForbiddenError;

  class BotGuardNotSupportedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = 'This bot is not designated as a "join guard" bot. This method is only available to bots that mediate user joins to chats. .' + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_GUARD_NOT_SUPPORTED";
    }
  }
  exports2.BotGuardNotSupportedError = BotGuardNotSupportedError;

  class BotVerifierForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "This bot cannot assign [verification icons](https://core.telegram.org/api/bots/verification)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_VERIFIER_FORBIDDEN";
    }
  }
  exports2.BotVerifierForbiddenError = BotVerifierForbiddenError;

  class BroadcastForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Channel poll voters and reactions cannot be fetched to prevent deanonymization." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BROADCAST_FORBIDDEN";
    }
  }
  exports2.BroadcastForbiddenError = BroadcastForbiddenError;

  class ChannelPublicGroupNaError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "channel/supergroup not available." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_PUBLIC_GROUP_NA";
    }
  }
  exports2.ChannelPublicGroupNaError = ChannelPublicGroupNaError;

  class ChatActionForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You cannot execute this action." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ACTION_FORBIDDEN";
    }
  }
  exports2.ChatActionForbiddenError = ChatActionForbiddenError;

  class ChatAdminInviteRequiredError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You do not have the rights to do this." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ADMIN_INVITE_REQUIRED";
    }
  }
  exports2.ChatAdminInviteRequiredError = ChatAdminInviteRequiredError;

  class ChatGuestSendForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You join the discussion group before commenting, see [here &raquo;](https://core.telegram.org/api/discussion#requiring-users-to-join-the-group) for more info." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_GUEST_SEND_FORBIDDEN";
    }
  }
  exports2.ChatGuestSendForbiddenError = ChatGuestSendForbiddenError;

  class ChatSendAudiosForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send audio messages in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_AUDIOS_FORBIDDEN";
    }
  }
  exports2.ChatSendAudiosForbiddenError = ChatSendAudiosForbiddenError;

  class ChatSendDocsForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send documents in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_DOCS_FORBIDDEN";
    }
  }
  exports2.ChatSendDocsForbiddenError = ChatSendDocsForbiddenError;

  class ChatSendGameForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send a game to this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_GAME_FORBIDDEN";
    }
  }
  exports2.ChatSendGameForbiddenError = ChatSendGameForbiddenError;

  class ChatSendGifsForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send gifs in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_GIFS_FORBIDDEN";
    }
  }
  exports2.ChatSendGifsForbiddenError = ChatSendGifsForbiddenError;

  class ChatSendMediaForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send media in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_MEDIA_FORBIDDEN";
    }
  }
  exports2.ChatSendMediaForbiddenError = ChatSendMediaForbiddenError;

  class ChatSendPhotosForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send photos in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_PHOTOS_FORBIDDEN";
    }
  }
  exports2.ChatSendPhotosForbiddenError = ChatSendPhotosForbiddenError;

  class ChatSendPlainForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send non-media (text) messages in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_PLAIN_FORBIDDEN";
    }
  }
  exports2.ChatSendPlainForbiddenError = ChatSendPlainForbiddenError;

  class ChatSendPollForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send polls in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_POLL_FORBIDDEN";
    }
  }
  exports2.ChatSendPollForbiddenError = ChatSendPollForbiddenError;

  class ChatSendRoundvideosForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send round videos to this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_ROUNDVIDEOS_FORBIDDEN";
    }
  }
  exports2.ChatSendRoundvideosForbiddenError = ChatSendRoundvideosForbiddenError;

  class ChatSendStickersForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send stickers in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_STICKERS_FORBIDDEN";
    }
  }
  exports2.ChatSendStickersForbiddenError = ChatSendStickersForbiddenError;

  class ChatSendVideosForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send videos in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_VIDEOS_FORBIDDEN";
    }
  }
  exports2.ChatSendVideosForbiddenError = ChatSendVideosForbiddenError;

  class ChatSendVoicesForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send voice recordings in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_VOICES_FORBIDDEN";
    }
  }
  exports2.ChatSendVoicesForbiddenError = ChatSendVoicesForbiddenError;

  class ChatSendWebpageForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send webpage previews to this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_WEBPAGE_FORBIDDEN";
    }
  }
  exports2.ChatSendWebpageForbiddenError = ChatSendWebpageForbiddenError;

  class ChatTypeInvalidError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The specified user type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_TYPE_INVALID";
    }
  }
  exports2.ChatTypeInvalidError = ChatTypeInvalidError;

  class EditBotInviteForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Normal users can't edit invites that were created by bots." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EDIT_BOT_INVITE_FORBIDDEN";
    }
  }
  exports2.EditBotInviteForbiddenError = EditBotInviteForbiddenError;

  class GroupcallAlreadyStartedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The groupcall has already started, you can join directly using [phone.joinGroupCall](https://core.telegram.org/method/phone.joinGroupCall)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_ALREADY_STARTED";
    }
  }
  exports2.GroupcallAlreadyStartedError = GroupcallAlreadyStartedError;

  class GroupcallChangeForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You cannot change this group call setting." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_CHANGE_FORBIDDEN";
    }
  }
  exports2.GroupcallChangeForbiddenError = GroupcallChangeForbiddenError;

  class InlineBotRequiredError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Only the inline bot can edit message." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INLINE_BOT_REQUIRED";
    }
  }
  exports2.InlineBotRequiredError = InlineBotRequiredError;

  class MessageAuthorRequiredError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Message author required." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_AUTHOR_REQUIRED";
    }
  }
  exports2.MessageAuthorRequiredError = MessageAuthorRequiredError;

  class MessageDeleteForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't delete one of the messages you tried to delete, most likely because it is a service message." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_DELETE_FORBIDDEN";
    }
  }
  exports2.MessageDeleteForbiddenError = MessageDeleteForbiddenError;

  class PollVoteRequiredError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Cast a vote in the poll before calling this method." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_VOTE_REQUIRED";
    }
  }
  exports2.PollVoteRequiredError = PollVoteRequiredError;

  class PrivacyPremiumRequiredError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You need a [Telegram Premium subscription](https://core.telegram.org/api/premium) to send a message to this user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PRIVACY_PREMIUM_REQUIRED";
    }
  }
  exports2.PrivacyPremiumRequiredError = PrivacyPremiumRequiredError;

  class PublicChannelMissingError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can only export group call invite links for public chats or channels." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PUBLIC_CHANNEL_MISSING";
    }
  }
  exports2.PublicChannelMissingError = PublicChannelMissingError;

  class RightForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Your admin rights do not allow you to do this." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RIGHT_FORBIDDEN";
    }
  }
  exports2.RightForbiddenError = RightForbiddenError;

  class SensitiveChangeForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't change your sensitive content settings." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SENSITIVE_CHANGE_FORBIDDEN";
    }
  }
  exports2.SensitiveChangeForbiddenError = SensitiveChangeForbiddenError;

  class UserDeletedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You can't send this secret message because the other participant deleted their account." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_DELETED";
    }
  }
  exports2.UserDeletedError = UserDeletedError;

  class UserDisallowedStargiftsError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The recipient user has configured restrictions on which categories of star gifts they're willing to accept (unique, limited, or unlimited): the sender attempted to get a payment form for a gift that falls into a category the recipient has blocked." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_DISALLOWED_STARGIFTS";
    }
  }
  exports2.UserDisallowedStargiftsError = UserDisallowedStargiftsError;

  class UserPermissionDeniedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The user hasn't granted or has revoked the bot's access to change their emoji status using [bots.toggleUserEmojiStatusPermission](https://core.telegram.org/method/bots.toggleUserEmojiStatusPermission)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_PERMISSION_DENIED";
    }
  }
  exports2.UserPermissionDeniedError = UserPermissionDeniedError;

  class UserPrivacyRestrictedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "The user's privacy settings do not allow you to do this." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_PRIVACY_RESTRICTED";
    }
  }
  exports2.UserPrivacyRestrictedError = UserPrivacyRestrictedError;

  class UserRestrictedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You're spamreported, you can't create channels or chats." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_RESTRICTED";
    }
  }
  exports2.UserRestrictedError = UserRestrictedError;

  class YourPrivacyRestrictedError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "You cannot fetch the read date of this message because you have disallowed other users to do so for *your* messages; to fix, allow other users to see *your* exact last online date OR purchase a [Telegram Premium](https://core.telegram.org/api/premium) subscription." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "YOUR_PRIVACY_RESTRICTED";
    }
  }
  exports2.YourPrivacyRestrictedError = YourPrivacyRestrictedError;

  class ChatForbiddenError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "This chat is not available to the current user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_FORBIDDEN";
    }
  }
  exports2.ChatForbiddenError = ChatForbiddenError;

  class ApiGiftRestrictedUpdateAppError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Please update the app to access the gift API." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "API_GIFT_RESTRICTED_UPDATE_APP";
    }
  }
  exports2.ApiGiftRestrictedUpdateAppError = ApiGiftRestrictedUpdateAppError;

  class BusinessAddressActiveError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "The user is currently advertising a [Business Location](https://core.telegram.org/api/business#location), the location may only be changed (or removed) using [account.updateBusinessLocation &raquo;](https://core.telegram.org/method/account.updateBusinessLocation).  ." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUSINESS_ADDRESS_ACTIVE";
    }
  }
  exports2.BusinessAddressActiveError = BusinessAddressActiveError;

  class CallProtocolCompatLayerInvalidError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "The other side of the call does not support any of the VoIP protocols supported by the local client, as specified by the `protocol.layer` and `protocol.library_versions` fields." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_PROTOCOL_COMPAT_LAYER_INVALID";
    }
  }
  exports2.CallProtocolCompatLayerInvalidError = CallProtocolCompatLayerInvalidError;

  class EditMessageTempRestrictedError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Message editing is temporarily forbidden for this user due to regulatory restrictions." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EDIT_MESSAGE_TEMP_RESTRICTED";
    }
  }
  exports2.EditMessageTempRestrictedError = EditMessageTempRestrictedError;

  class FilerefUpgradeNeededError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "The client has to be updated in order to support [file references](https://core.telegram.org/api/file-references)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILEREF_UPGRADE_NEEDED";
    }
  }
  exports2.FilerefUpgradeNeededError = FilerefUpgradeNeededError;

  class FreshChangePhoneForbiddenError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "You can't change phone number right after logging in, please wait at least 24 hours." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FRESH_CHANGE_PHONE_FORBIDDEN";
    }
  }
  exports2.FreshChangePhoneForbiddenError = FreshChangePhoneForbiddenError;

  class FreshResetAuthorisationForbiddenError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "You can't logout other sessions if less than 24 hours have passed since you logged on the current session." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FRESH_RESET_AUTHORISATION_FORBIDDEN";
    }
  }
  exports2.FreshResetAuthorisationForbiddenError = FreshResetAuthorisationForbiddenError;

  class PaymentUnsupportedError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "A detailed description of the error will be received separately as described [here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PAYMENT_UNSUPPORTED";
    }
  }
  exports2.PaymentUnsupportedError = PaymentUnsupportedError;

  class PhonePasswordFloodError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "You have tried logging in too many times." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_PASSWORD_FLOOD";
    }
  }
  exports2.PhonePasswordFloodError = PhonePasswordFloodError;

  class PollCountryRestrictedError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Users from the current user's country cannot vote in this [country-restricted poll &raquo;](https://core.telegram.org/api/poll#country-restricted-polls)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_COUNTRY_RESTRICTED";
    }
  }
  exports2.PollCountryRestrictedError = PollCountryRestrictedError;

  class PollMemberRestrictedError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Only channel subscribers can vote in this poll." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_MEMBER_RESTRICTED";
    }
  }
  exports2.PollMemberRestrictedError = PollMemberRestrictedError;

  class PrecheckoutFailedError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Precheckout failed, a detailed and localized description for the error will be emitted via an [updateServiceNotification as specified here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PRECHECKOUT_FAILED";
    }
  }
  exports2.PrecheckoutFailedError = PrecheckoutFailedError;

  class PremiumCurrentlyUnavailableError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "You cannot currently purchase a Premium subscription." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PREMIUM_CURRENTLY_UNAVAILABLE";
    }
  }
  exports2.PremiumCurrentlyUnavailableError = PremiumCurrentlyUnavailableError;

  class PreviousChatImportActiveWaitMinError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "Import for this chat is already in progress, wait " + value + " minutes before starting a new one." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.PreviousChatImportActiveWaitMinError = PreviousChatImportActiveWaitMinError;

  class SendCodeUnavailableError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Returned when all available options for this type of number were already used (e.g. flash-call, then SMS, then this error might be returned to trigger a second resend)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEND_CODE_UNAVAILABLE";
    }
  }
  exports2.SendCodeUnavailableError = SendCodeUnavailableError;

  class StargiftExportInProgressError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "A gift export is in progress, a detailed and localized description for the error will be emitted via an [updateServiceNotification as specified here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_EXPORT_IN_PROGRESS";
    }
  }
  exports2.StargiftExportInProgressError = StargiftExportInProgressError;

  class StarsFormAmountMismatchError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "The form amount has changed, please fetch the new form using [payments.getPaymentForm](https://core.telegram.org/method/payments.getPaymentForm) and restart the process." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARS_FORM_AMOUNT_MISMATCH";
    }
  }
  exports2.StarsFormAmountMismatchError = StarsFormAmountMismatchError;

  class StickersetOwnerAnonymousError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Provided stickerset can't be installed as group stickerset to prevent admin deanonymization." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKERSET_OWNER_ANONYMOUS";
    }
  }
  exports2.StickersetOwnerAnonymousError = StickersetOwnerAnonymousError;

  class TranslationsDisabledError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Translations are unavailable, a detailed and localized description for the error will be emitted via an [updateServiceNotification as specified here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TRANSLATIONS_DISABLED";
    }
  }
  exports2.TranslationsDisabledError = TranslationsDisabledError;

  class UpdateAppToLoginError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Please update your client to login." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "UPDATE_APP_TO_LOGIN";
    }
  }
  exports2.UpdateAppToLoginError = UpdateAppToLoginError;

  class UserpicPrivacyRequiredError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "You need to disable privacy settings for your profile picture in order to make your geolocation public." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERPIC_PRIVACY_REQUIRED";
    }
  }
  exports2.UserpicPrivacyRequiredError = UserpicPrivacyRequiredError;

  class AuthKeyDuplicatedError extends RPCBaseErrors_1.AuthKeyError {
    constructor(args) {
      const message = "Concurrent usage of the current session from multiple connections was detected, the current session was invalidated by the server for security reasons!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_KEY_DUPLICATED";
    }
  }
  exports2.AuthKeyDuplicatedError = AuthKeyDuplicatedError;

  class TwoFaConfirmWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "Since this account is active and protected by a 2FA password, we will delete it in 1 week for security purposes. You can cancel this process at any time, you'll be able to reset your account in " + value + " seconds." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.TwoFaConfirmWaitError = TwoFaConfirmWaitError;

  class FloodWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const seconds = Number(args.capture || 0);
      const message = "Please wait " + seconds + " seconds before repeating the action." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.seconds = seconds;
    }
  }
  exports2.FloodWaitError = FloodWaitError;

  class FrozenMethodInvalidError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const message = "The current account is [frozen](https://core.telegram.org/api/auth#frozen-accounts), and thus cannot execute the specified action." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FROZEN_METHOD_INVALID";
    }
  }
  exports2.FrozenMethodInvalidError = FrozenMethodInvalidError;

  class PremiumSubActiveUntilError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "You already have a premium subscription active until unixtime " + value + " ." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.PremiumSubActiveUntilError = PremiumSubActiveUntilError;

  class SlowModeWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const seconds = Number(args.capture || 0);
      const message = "Slowmode is enabled in this chat: wait " + seconds + " seconds before sending another message to this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.seconds = seconds;
    }
  }
  exports2.SlowModeWaitError = SlowModeWaitError;

  class TakeoutInitDelayError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const seconds = Number(args.capture || 0);
      const message = "Sorry, for security reasons, you will be able to begin downloading your data in " + seconds + " seconds. We have notified all your devices about the export request to make sure it's authorized and to give you time to react if it's not." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.seconds = seconds;
    }
  }
  exports2.TakeoutInitDelayError = TakeoutInitDelayError;

  class AicomposeTimeoutError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "A timeout occurred while composing the message." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AICOMPOSE_TIMEOUT";
    }
  }
  exports2.AicomposeTimeoutError = AicomposeTimeoutError;

  class AuthKeyUnsynchronizedError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "Internal error, please repeat the method call." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "AUTH_KEY_UNSYNCHRONIZED";
    }
  }
  exports2.AuthKeyUnsynchronizedError = AuthKeyUnsynchronizedError;

  class AuthRestartError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "Internal error (debug info " + value + "), please repeat the method call." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.AuthRestartError = AuthRestartError;

  class CdnUploadTimeoutError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "A server-side timeout occurred while reuploading the file to the CDN DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CDN_UPLOAD_TIMEOUT";
    }
  }
  exports2.CdnUploadTimeoutError = CdnUploadTimeoutError;

  class ChatIdGenerateFailedError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "Failure while generating the chat ID." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ID_GENERATE_FAILED";
    }
  }
  exports2.ChatIdGenerateFailedError = ChatIdGenerateFailedError;

  class OauthRequestInvalidError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "The specified OAuth request is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "OAUTH_REQUEST_INVALID";
    }
  }
  exports2.OauthRequestInvalidError = OauthRequestInvalidError;

  class PersistentTimestampOutdatedError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "Channel internal replication issues, try again later (treat this like an RPC_CALL_FAIL)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PERSISTENT_TIMESTAMP_OUTDATED";
    }
  }
  exports2.PersistentTimestampOutdatedError = PersistentTimestampOutdatedError;

  class SendMediaInvalidError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "The specified media is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEND_MEDIA_INVALID";
    }
  }
  exports2.SendMediaInvalidError = SendMediaInvalidError;

  class SignInFailedError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "Failure while signing in." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SIGN_IN_FAILED";
    }
  }
  exports2.SignInFailedError = SignInFailedError;

  class TranslateReqFailedError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "Translation failed, please try again later." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TRANSLATE_REQ_FAILED";
    }
  }
  exports2.TranslateReqFailedError = TranslateReqFailedError;

  class TranslationTimeoutError extends RPCBaseErrors_1.ServerError {
    constructor(args) {
      const message = "A timeout occurred while translating the specified text." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TRANSLATION_TIMEOUT";
    }
  }
  exports2.TranslationTimeoutError = TranslationTimeoutError;

  class TimeoutError extends RPCBaseErrors_1.TimedOutError {
    constructor(args) {
      const message = "Timeout while fetching data." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "Timeout";
    }
  }
  exports2.TimeoutError = TimeoutError;

  class MsgWaitTimeoutError extends RPCBaseErrors_1.TimedOutError {
    constructor(args) {
      const message = "Spent too much time waiting for a previous query in the invokeAfterMsg request queue, aborting!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MSG_WAIT_TIMEOUT";
    }
  }
  exports2.MsgWaitTimeoutError = MsgWaitTimeoutError;

  class AnonymousReactionsDisabledError extends RPCBaseErrors_1.ForbiddenError {
    constructor(args) {
      const message = "Sorry, anonymous administrators cannot leave reactions or participate in polls." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ANONYMOUS_REACTIONS_DISABLED";
    }
  }
  exports2.AnonymousReactionsDisabledError = AnonymousReactionsDisabledError;

  class FloodTestPhoneWaitError extends RPCBaseErrors_1.FloodError {
    constructor(args) {
      const seconds = Number(args.capture || 0);
      const message = "A wait of " + seconds + " seconds is required in the test servers before repeating the action." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.seconds = seconds;
    }
  }
  exports2.FloodTestPhoneWaitError = FloodTestPhoneWaitError;
  exports2.rpcErrorsDict = new Map([
    ["ABOUT_TOO_LONG", AboutTooLongError],
    ["ACCESS_TOKEN_EXPIRED", AccessTokenExpiredError],
    ["ACCESS_TOKEN_INVALID", AccessTokenInvalidError],
    ["AD_EXPIRED", AdExpiredError],
    ["ADDRESS_INVALID", AddressInvalidError],
    ["ADMIN_ID_INVALID", AdminIdInvalidError],
    ["ADMIN_RANK_EMOJI_NOT_ALLOWED", AdminRankEmojiNotAllowedError],
    ["ADMIN_RANK_INVALID", AdminRankInvalidError],
    ["ADMIN_RIGHTS_EMPTY", AdminRightsEmptyError],
    ["ADMINS_TOO_MUCH", AdminsTooMuchError],
    ["AI_COMPOSE_TASK_MISSING", AiComposeTaskMissingError],
    ["AICOMPOSE_FLOOD_PREMIUM", AicomposeFloodPremiumError],
    ["AICOMPOSE_TONE_INVALID", AicomposeToneInvalidError],
    ["AICOMPOSE_TONE_TITLE_INVALID", AicomposeToneTitleInvalidError],
    ["ALBUM_PHOTOS_TOO_MANY", AlbumPhotosTooManyError],
    ["API_ID_INVALID", ApiIdInvalidError],
    ["API_ID_PUBLISHED_FLOOD", ApiIdPublishedFloodError],
    ["ARTICLE_TITLE_EMPTY", ArticleTitleEmptyError],
    ["AUDIO_CONTENT_URL_EMPTY", AudioContentUrlEmptyError],
    ["AUDIO_TITLE_EMPTY", AudioTitleEmptyError],
    ["AUTH_BYTES_INVALID", AuthBytesInvalidError],
    ["AUTH_TOKEN_ALREADY_ACCEPTED", AuthTokenAlreadyAcceptedError],
    ["AUTH_TOKEN_EXCEPTION", AuthTokenExceptionError],
    ["AUTH_TOKEN_EXPIRED", AuthTokenExpiredError],
    ["AUTH_TOKEN_INVALID", AuthTokenInvalidError],
    ["AUTH_TOKEN_INVALIDX", AuthTokenInvalidxError],
    ["AUTOARCHIVE_NOT_AVAILABLE", AutoarchiveNotAvailableError],
    ["BALANCE_TOO_LOW", BalanceTooLowError],
    ["BANK_CARD_NUMBER_INVALID", BankCardNumberInvalidError],
    ["BANNED_RIGHTS_INVALID", BannedRightsInvalidError],
    ["BIRTHDAY_ALREADY", BirthdayAlreadyError],
    ["BIRTHDAY_INVALID", BirthdayInvalidError],
    ["BOOST_NOT_MODIFIED", BoostNotModifiedError],
    ["BOOST_PEER_INVALID", BoostPeerInvalidError],
    ["BOOSTS_EMPTY", BoostsEmptyError],
    ["BOOSTS_REQUIRED", BoostsRequiredError],
    ["BOT_ALREADY_DISABLED", BotAlreadyDisabledError],
    ["BOT_APP_BOT_INVALID", BotAppBotInvalidError],
    ["BOT_APP_INVALID", BotAppInvalidError],
    ["BOT_APP_SHORTNAME_INVALID", BotAppShortnameInvalidError],
    ["BOT_BUSINESS_MISSING", BotBusinessMissingError],
    ["BOT_CHANNELS_NA", BotChannelsNaError],
    ["BOT_COMMAND_DESCRIPTION_INVALID", BotCommandDescriptionInvalidError],
    ["BOT_COMMAND_INVALID", BotCommandInvalidError],
    ["BOT_CREATE_LIMIT_EXCEEDED", BotCreateLimitExceededError],
    ["BOT_DOMAIN_INVALID", BotDomainInvalidError],
    ["BOT_FALLBACK_UNSUPPORTED", BotFallbackUnsupportedError],
    ["BOT_GAMES_DISABLED", BotGamesDisabledError],
    ["BOT_GROUPS_BLOCKED", BotGroupsBlockedError],
    ["BOT_ID_INVALID", BotIdInvalidError],
    ["BOT_INLINE_DISABLED", BotInlineDisabledError],
    ["BOT_INVALID", BotInvalidError],
    ["BOT_INVOICE_INVALID", BotInvoiceInvalidError],
    ["BOT_NOT_CONNECTED_YET", BotNotConnectedYetError],
    ["BOT_ONESIDE_NOT_AVAIL", BotOnesideNotAvailError],
    ["BOT_PAYMENTS_DISABLED", BotPaymentsDisabledError],
    ["BOT_RESPONSE_TIMEOUT", BotResponseTimeoutError],
    ["BOT_SCORE_NOT_MODIFIED", BotScoreNotModifiedError],
    ["BOT_WEBVIEW_DISABLED", BotWebviewDisabledError],
    ["BOTS_TOO_MUCH", BotsTooMuchError],
    ["BROADCAST_ID_INVALID", BroadcastIdInvalidError],
    ["BROADCAST_PUBLIC_VOTERS_FORBIDDEN", BroadcastPublicVotersForbiddenError],
    ["BROADCAST_REQUIRED", BroadcastRequiredError],
    ["BUSINESS_CONNECTION_INVALID", BusinessConnectionInvalidError],
    ["BUSINESS_CONNECTION_NOT_ALLOWED", BusinessConnectionNotAllowedError],
    ["BUSINESS_PEER_INVALID", BusinessPeerInvalidError],
    ["BUSINESS_PEER_USAGE_MISSING", BusinessPeerUsageMissingError],
    ["BUSINESS_RECIPIENTS_EMPTY", BusinessRecipientsEmptyError],
    ["BUSINESS_WORK_HOURS_EMPTY", BusinessWorkHoursEmptyError],
    ["BUSINESS_WORK_HOURS_PERIOD_INVALID", BusinessWorkHoursPeriodInvalidError],
    ["BUTTON_COPY_TEXT_INVALID", ButtonCopyTextInvalidError],
    ["BUTTON_DATA_INVALID", ButtonDataInvalidError],
    ["BUTTON_ID_INVALID", ButtonIdInvalidError],
    ["BUTTON_INVALID", ButtonInvalidError],
    ["BUTTON_POS_INVALID", ButtonPosInvalidError],
    ["BUTTON_TEXT_INVALID", ButtonTextInvalidError],
    ["BUTTON_TYPE_INVALID", ButtonTypeInvalidError],
    ["BUTTON_URL_INVALID", ButtonUrlInvalidError],
    ["BUTTON_USER_INVALID", ButtonUserInvalidError],
    ["BUTTON_USER_PRIVACY_RESTRICTED", ButtonUserPrivacyRestrictedError],
    ["CALL_ALREADY_ACCEPTED", CallAlreadyAcceptedError],
    ["CALL_ALREADY_DECLINED", CallAlreadyDeclinedError],
    ["CALL_NOT_ACTIVE", CallNotActiveError],
    ["CALL_OCCUPY_FAILED", CallOccupyFailedError],
    ["CALL_PEER_INVALID", CallPeerInvalidError],
    ["CALL_PROTOCOL_FLAGS_INVALID", CallProtocolFlagsInvalidError],
    ["CALL_PROTOCOL_LAYER_INVALID", CallProtocolLayerInvalidError],
    ["CDN_METHOD_INVALID", CdnMethodInvalidError],
    ["CHANNEL_FORUM_MISSING", ChannelForumMissingError],
    ["CHANNEL_ID_INVALID", ChannelIdInvalidError],
    ["CHANNEL_INVALID", ChannelInvalidError],
    ["CHANNEL_MONOFORUM_UNSUPPORTED", ChannelMonoforumUnsupportedError],
    ["CHANNEL_PARICIPANT_MISSING", ChannelParicipantMissingError],
    ["CHANNEL_PRIVATE", ChannelPrivateError],
    ["CHANNEL_TOO_BIG", ChannelTooBigError],
    ["CHANNEL_TOO_LARGE", ChannelTooLargeError],
    ["CHANNELS_ADMIN_LOCATED_TOO_MUCH", ChannelsAdminLocatedTooMuchError],
    ["CHANNELS_ADMIN_PUBLIC_TOO_MUCH", ChannelsAdminPublicTooMuchError],
    ["CHANNELS_TOO_MUCH", ChannelsTooMuchError],
    ["CHARGE_ALREADY_REFUNDED", ChargeAlreadyRefundedError],
    ["CHARGE_ID_EMPTY", ChargeIdEmptyError],
    ["CHARGE_ID_INVALID", ChargeIdInvalidError],
    ["CHAT_ABOUT_NOT_MODIFIED", ChatAboutNotModifiedError],
    ["CHAT_ABOUT_TOO_LONG", ChatAboutTooLongError],
    ["CHAT_ADMIN_REQUIRED", ChatAdminRequiredError],
    ["CHAT_DISCUSSION_UNALLOWED", ChatDiscussionUnallowedError],
    ["CHAT_FORWARDS_RESTRICTED", ChatForwardsRestrictedError],
    ["CHAT_ID_EMPTY", ChatIdEmptyError],
    ["CHAT_ID_INVALID", ChatIdInvalidError],
    ["CHAT_INVALID", ChatInvalidError],
    ["CHAT_INVITE_PERMANENT", ChatInvitePermanentError],
    ["CHAT_LINK_EXISTS", ChatLinkExistsError],
    ["CHAT_MEMBER_ADD_FAILED", ChatMemberAddFailedError],
    ["CHAT_NOT_MODIFIED", ChatNotModifiedError],
    ["CHAT_PUBLIC_REQUIRED", ChatPublicRequiredError],
    ["CHAT_RESTRICTED", ChatRestrictedError],
    ["CHAT_REVOKE_DATE_UNSUPPORTED", ChatRevokeDateUnsupportedError],
    ["CHAT_SEND_INLINE_FORBIDDEN", ChatSendInlineForbiddenError],
    ["CHAT_TITLE_EMPTY", ChatTitleEmptyError],
    ["CHAT_TOO_BIG", ChatTooBigError],
    ["CHAT_WRITE_FORBIDDEN", ChatWriteForbiddenError],
    ["CHATLINK_SLUG_EMPTY", ChatlinkSlugEmptyError],
    ["CHATLINK_SLUG_EXPIRED", ChatlinkSlugExpiredError],
    ["CHATLINKS_TOO_MUCH", ChatlinksTooMuchError],
    ["CHATLIST_EXCLUDE_INVALID", ChatlistExcludeInvalidError],
    ["CHATLISTS_TOO_MUCH", ChatlistsTooMuchError],
    ["CODE_EMPTY", CodeEmptyError],
    ["CODE_HASH_INVALID", CodeHashInvalidError],
    ["CODE_INVALID", CodeInvalidError],
    ["COLLECTIBLE_INVALID", CollectibleInvalidError],
    ["COLLECTIBLE_NOT_FOUND", CollectibleNotFoundError],
    ["COLLECTION_ID_INVALID", CollectionIdInvalidError],
    ["COLOR_INVALID", ColorInvalidError],
    ["CONNECTION_API_ID_INVALID", ConnectionApiIdInvalidError],
    ["CONNECTION_APP_VERSION_EMPTY", ConnectionAppVersionEmptyError],
    ["CONNECTION_ID_INVALID", ConnectionIdInvalidError],
    ["CONNECTION_LAYER_INVALID", ConnectionLayerInvalidError],
    ["CONTACT_ADD_MISSING", ContactAddMissingError],
    ["CONTACT_ID_INVALID", ContactIdInvalidError],
    ["CONTACT_MISSING", ContactMissingError],
    ["CONTACT_NAME_EMPTY", ContactNameEmptyError],
    ["CONTACT_REQ_MISSING", ContactReqMissingError],
    ["CREATE_CALL_FAILED", CreateCallFailedError],
    ["CREDENTIAL_INVALID", CredentialInvalidError],
    ["CURRENCY_TOTAL_AMOUNT_INVALID", CurrencyTotalAmountInvalidError],
    ["CUSTOM_REACTIONS_TOO_MANY", CustomReactionsTooManyError],
    ["DATA_HASH_SIZE_INVALID", DataHashSizeInvalidError],
    ["DATA_INVALID", DataInvalidError],
    ["DATA_JSON_INVALID", DataJsonInvalidError],
    ["DATA_TOO_LONG", DataTooLongError],
    ["DATE_EMPTY", DateEmptyError],
    ["DC_ID_INVALID", DcIdInvalidError],
    ["DH_G_A_INVALID", DhGAInvalidError],
    ["DOCUMENT_INVALID", DocumentInvalidError],
    ["EFFECT_CHAT_INVALID", EffectChatInvalidError],
    ["EFFECT_ID_INVALID", EffectIdInvalidError],
    ["EMAIL_HASH_EXPIRED", EmailHashExpiredError],
    ["EMAIL_INSTALL_MISSING", EmailInstallMissingError],
    ["EMAIL_INVALID", EmailInvalidError],
    ["EMAIL_NOT_ALLOWED", EmailNotAllowedError],
    ["EMAIL_NOT_SETUP", EmailNotSetupError],
    ["EMAIL_UNCONFIRMED", EmailUnconfirmedError],
    ["EMAIL_VERIFY_EXPIRED", EmailVerifyExpiredError],
    ["EMOJI_INVALID", EmojiInvalidError],
    ["EMOJI_MARKUP_INVALID", EmojiMarkupInvalidError],
    ["EMOJI_NOT_MODIFIED", EmojiNotModifiedError],
    ["EMOTICON_EMPTY", EmoticonEmptyError],
    ["EMOTICON_INVALID", EmoticonInvalidError],
    ["EMOTICON_STICKERPACK_MISSING", EmoticonStickerpackMissingError],
    ["ENCRYPTED_MESSAGE_INVALID", EncryptedMessageInvalidError],
    ["ENCRYPTION_ALREADY_ACCEPTED", EncryptionAlreadyAcceptedError],
    ["ENCRYPTION_ALREADY_DECLINED", EncryptionAlreadyDeclinedError],
    ["ENCRYPTION_DECLINED", EncryptionDeclinedError],
    ["ENCRYPTION_ID_INVALID", EncryptionIdInvalidError],
    ["ENTITIES_TOO_LONG", EntitiesTooLongError],
    ["ENTITY_BOUNDS_INVALID", EntityBoundsInvalidError],
    ["ENTITY_DATE_FORMAT_INVALID", EntityDateFormatInvalidError],
    ["ENTITY_DATE_INVALID", EntityDateInvalidError],
    ["ENTITY_DATE_TOO_LONG", EntityDateTooLongError],
    ["ENTITY_MENTION_USER_INVALID", EntityMentionUserInvalidError],
    ["ERROR_TEXT_EMPTY", ErrorTextEmptyError],
    ["EXPIRE_DATE_INVALID", ExpireDateInvalidError],
    ["EXPIRES_AT_INVALID", ExpiresAtInvalidError],
    ["EXPORT_CARD_INVALID", ExportCardInvalidError],
    ["EXTENDED_MEDIA_AMOUNT_INVALID", ExtendedMediaAmountInvalidError],
    ["EXTENDED_MEDIA_EMPTY", ExtendedMediaEmptyError],
    ["EXTENDED_MEDIA_INVALID", ExtendedMediaInvalidError],
    ["EXTENDED_MEDIA_PEER_INVALID", ExtendedMediaPeerInvalidError],
    ["EXTERNAL_URL_INVALID", ExternalUrlInvalidError],
    ["FILE_CONTENT_TYPE_INVALID", FileContentTypeInvalidError],
    ["FILE_EMTPY", FileEmtpyError],
    ["FILE_ID_INVALID", FileIdInvalidError],
    ["FILE_PART_EMPTY", FilePartEmptyError],
    ["FILE_PART_INVALID", FilePartInvalidError],
    ["FILE_PART_LENGTH_INVALID", FilePartLengthInvalidError],
    ["FILE_PART_SIZE_CHANGED", FilePartSizeChangedError],
    ["FILE_PART_SIZE_INVALID", FilePartSizeInvalidError],
    ["FILE_PART_TOO_BIG", FilePartTooBigError],
    ["FILE_PART_TOO_SMALL", FilePartTooSmallError],
    ["FILE_PARTS_INVALID", FilePartsInvalidError],
    ["FILE_REFERENCE_EMPTY", FileReferenceEmptyError],
    ["FILE_REFERENCE_EXPIRED", FileReferenceExpiredError],
    ["FILE_REFERENCE_INVALID", FileReferenceInvalidError],
    ["FILE_TITLE_EMPTY", FileTitleEmptyError],
    ["FILE_TOKEN_INVALID", FileTokenInvalidError],
    ["FILTER_ID_INVALID", FilterIdInvalidError],
    ["FILTER_INCLUDE_EMPTY", FilterIncludeEmptyError],
    ["FILTER_NOT_SUPPORTED", FilterNotSupportedError],
    ["FILTER_TITLE_EMPTY", FilterTitleEmptyError],
    ["FIRSTNAME_INVALID", FirstnameInvalidError],
    ["FOLDER_ID_EMPTY", FolderIdEmptyError],
    ["FOLDER_ID_INVALID", FolderIdInvalidError],
    ["FORM_EXPIRED", FormExpiredError],
    ["FORM_ID_EMPTY", FormIdEmptyError],
    ["FORM_SUBMIT_DUPLICATE", FormSubmitDuplicateError],
    ["FORM_UNSUPPORTED", FormUnsupportedError],
    ["FORUM_ENABLED", ForumEnabledError],
    ["FRESH_CHANGE_ADMINS_FORBIDDEN", FreshChangeAdminsForbiddenError],
    ["FROM_MESSAGE_BOT_DISABLED", FromMessageBotDisabledError],
    ["FROM_PEER_INVALID", FromPeerInvalidError],
    ["FROZEN_PARTICIPANT_MISSING", FrozenParticipantMissingError],
    ["GAME_BOT_INVALID", GameBotInvalidError],
    ["GENERAL_MODIFY_ICON_FORBIDDEN", GeneralModifyIconForbiddenError],
    ["GEO_POINT_INVALID", GeoPointInvalidError],
    ["GIF_CONTENT_TYPE_INVALID", GifContentTypeInvalidError],
    ["GIF_ID_INVALID", GifIdInvalidError],
    ["GIFT_MONTHS_INVALID", GiftMonthsInvalidError],
    ["GIFT_SLUG_EXPIRED", GiftSlugExpiredError],
    ["GIFT_SLUG_INVALID", GiftSlugInvalidError],
    ["GIFT_STARS_INVALID", GiftStarsInvalidError],
    ["GRAPH_EXPIRED_RELOAD", GraphExpiredReloadError],
    ["GRAPH_INVALID_RELOAD", GraphInvalidReloadError],
    ["GRAPH_OUTDATED_RELOAD", GraphOutdatedReloadError],
    ["GROUPCALL_ALREADY_DISCARDED", GroupcallAlreadyDiscardedError],
    ["GROUPCALL_FORBIDDEN", GroupcallForbiddenError],
    ["GROUPCALL_INVALID", GroupcallInvalidError],
    ["GROUPCALL_JOIN_MISSING", GroupcallJoinMissingError],
    ["GROUPCALL_NOT_MODIFIED", GroupcallNotModifiedError],
    ["GROUPCALL_SSRC_DUPLICATE_MUCH", GroupcallSsrcDuplicateMuchError],
    ["GROUPED_MEDIA_INVALID", GroupedMediaInvalidError],
    ["HASH_INVALID", HashInvalidError],
    ["HASH_SIZE_INVALID", HashSizeInvalidError],
    ["HASHTAG_INVALID", HashtagInvalidError],
    ["HIDE_REQUESTER_MISSING", HideRequesterMissingError],
    ["ID_EXPIRED", IdExpiredError],
    ["ID_INVALID", IdInvalidError],
    ["IMAGE_PROCESS_FAILED", ImageProcessFailedError],
    ["IMPORT_FILE_INVALID", ImportFileInvalidError],
    ["IMPORT_FORMAT_DATE_INVALID", ImportFormatDateInvalidError],
    ["IMPORT_FORMAT_UNRECOGNIZED", ImportFormatUnrecognizedError],
    ["IMPORT_ID_INVALID", ImportIdInvalidError],
    ["IMPORT_TOKEN_INVALID", ImportTokenInvalidError],
    ["INLINE_RESULT_EXPIRED", InlineResultExpiredError],
    ["INPUT_CHATLIST_INVALID", InputChatlistInvalidError],
    ["INPUT_FILE_INVALID", InputFileInvalidError],
    ["INPUT_FILTER_INVALID", InputFilterInvalidError],
    ["INPUT_PEERS_EMPTY", InputPeersEmptyError],
    ["INPUT_PURPOSE_INVALID", InputPurposeInvalidError],
    ["INPUT_STARS_AMOUNT_INVALID", InputStarsAmountInvalidError],
    ["INPUT_STARS_NANOS_INVALID", InputStarsNanosInvalidError],
    ["INPUT_TEXT_EMPTY", InputTextEmptyError],
    ["INPUT_TEXT_TOO_LONG", InputTextTooLongError],
    ["INPUT_USER_DEACTIVATED", InputUserDeactivatedError],
    ["INVITE_FORBIDDEN_WITH_JOINAS", InviteForbiddenWithJoinasError],
    ["INVITE_HASH_EMPTY", InviteHashEmptyError],
    ["INVITE_HASH_EXPIRED", InviteHashExpiredError],
    ["INVITE_HASH_INVALID", InviteHashInvalidError],
    ["INVITE_REQUEST_SENT", InviteRequestSentError],
    ["INVITE_REVOKED_MISSING", InviteRevokedMissingError],
    ["INVITE_SLUG_EMPTY", InviteSlugEmptyError],
    ["INVITE_SLUG_EXPIRED", InviteSlugExpiredError],
    ["INVITE_SLUG_INVALID", InviteSlugInvalidError],
    ["INVITES_TOO_MUCH", InvitesTooMuchError],
    ["INVOICE_INVALID", InvoiceInvalidError],
    ["INVOICE_PAYLOAD_INVALID", InvoicePayloadInvalidError],
    ["JOIN_AS_PEER_INVALID", JoinAsPeerInvalidError],
    ["LANG_CODE_INVALID", LangCodeInvalidError],
    ["LANG_CODE_NOT_SUPPORTED", LangCodeNotSupportedError],
    ["LANG_PACK_INVALID", LangPackInvalidError],
    ["LANGUAGE_INVALID", LanguageInvalidError],
    ["LASTNAME_INVALID", LastnameInvalidError],
    ["LIMIT_INVALID", LimitInvalidError],
    ["LIMIT_PER_POST_INVALID", LimitPerPostInvalidError],
    ["LINK_NOT_MODIFIED", LinkNotModifiedError],
    ["LOCATION_INVALID", LocationInvalidError],
    ["MANAGER_INVALID", ManagerInvalidError],
    ["MANAGER_PERMISSION_MISSING", ManagerPermissionMissingError],
    ["MAX_DATE_INVALID", MaxDateInvalidError],
    ["MAX_ID_INVALID", MaxIdInvalidError],
    ["MAX_QTS_INVALID", MaxQtsInvalidError],
    ["MD5_CHECKSUM_INVALID", Md5ChecksumInvalidError],
    ["MEDIA_ALREADY_PAID", MediaAlreadyPaidError],
    ["MEDIA_CAPTION_TOO_LONG", MediaCaptionTooLongError],
    ["MEDIA_EMPTY", MediaEmptyError],
    ["MEDIA_FILE_INVALID", MediaFileInvalidError],
    ["MEDIA_GROUPED_INVALID", MediaGroupedInvalidError],
    ["MEDIA_INVALID", MediaInvalidError],
    ["MEDIA_NEW_INVALID", MediaNewInvalidError],
    ["MEDIA_PREV_INVALID", MediaPrevInvalidError],
    ["MEDIA_TTL_INVALID", MediaTtlInvalidError],
    ["MEDIA_TYPE_INVALID", MediaTypeInvalidError],
    ["MEDIA_VIDEO_STORY_MISSING", MediaVideoStoryMissingError],
    ["MEGAGROUP_GEO_REQUIRED", MegagroupGeoRequiredError],
    ["MEGAGROUP_ID_INVALID", MegagroupIdInvalidError],
    ["MEGAGROUP_PREHISTORY_HIDDEN", MegagroupPrehistoryHiddenError],
    ["MEGAGROUP_REQUIRED", MegagroupRequiredError],
    ["MESSAGE_EDIT_TIME_EXPIRED", MessageEditTimeExpiredError],
    ["MESSAGE_EMPTY", MessageEmptyError],
    ["MESSAGE_ID_INVALID", MessageIdInvalidError],
    ["MESSAGE_IDS_EMPTY", MessageIdsEmptyError],
    ["MESSAGE_NOT_MODIFIED", MessageNotModifiedError],
    ["MESSAGE_NOT_READ_YET", MessageNotReadYetError],
    ["MESSAGE_POLL_CLOSED", MessagePollClosedError],
    ["MESSAGE_REQUIRED", MessageRequiredError],
    ["MESSAGE_TOO_LONG", MessageTooLongError],
    ["MESSAGE_TOO_OLD", MessageTooOldError],
    ["METHOD_INVALID", MethodInvalidError],
    ["MIN_DATE_INVALID", MinDateInvalidError],
    ["MONTH_INVALID", MonthInvalidError],
    ["MSG_ID_INVALID", MsgIdInvalidError],
    ["MSG_TOO_OLD", MsgTooOldError],
    ["MSG_VOICE_MISSING", MsgVoiceMissingError],
    ["MSG_VOICE_TOO_LONG", MsgVoiceTooLongError],
    ["MSG_WAIT_FAILED", MsgWaitError],
    ["MULTI_MEDIA_TOO_LONG", MultiMediaTooLongError],
    ["NAME_INVALID", NameInvalidError],
    ["NEED_ACTION_MISSING", NeedActionMissingError],
    ["NEW_SALT_INVALID", NewSaltInvalidError],
    ["NEW_SETTINGS_EMPTY", NewSettingsEmptyError],
    ["NEW_SETTINGS_INVALID", NewSettingsInvalidError],
    ["NEXT_OFFSET_INVALID", NextOffsetInvalidError],
    ["NO_PAYMENT_NEEDED", NoPaymentNeededError],
    ["NOGENERAL_HIDE_FORBIDDEN", NogeneralHideForbiddenError],
    ["NOT_ELIGIBLE", NotEligibleError],
    ["NOT_JOINED", NotJoinedError],
    ["OFFSET_INVALID", OffsetInvalidError],
    ["OFFSET_PEER_ID_INVALID", OffsetPeerIdInvalidError],
    ["OPTION_INVALID", OptionInvalidError],
    ["OPTIONS_TOO_MUCH", OptionsTooMuchError],
    ["ORDER_INVALID", OrderInvalidError],
    ["PACK_SHORT_NAME_INVALID", PackShortNameInvalidError],
    ["PACK_SHORT_NAME_OCCUPIED", PackShortNameOccupiedError],
    ["PACK_TITLE_INVALID", PackTitleInvalidError],
    ["PACK_TYPE_INVALID", PackTypeInvalidError],
    ["PARENT_PEER_INVALID", ParentPeerInvalidError],
    ["PARTICIPANT_ID_INVALID", ParticipantIdInvalidError],
    ["PARTICIPANT_JOIN_MISSING", ParticipantJoinMissingError],
    ["PARTICIPANT_VERSION_OUTDATED", ParticipantVersionOutdatedError],
    ["PARTICIPANTS_TOO_FEW", ParticipantsTooFewError],
    ["PASSKEY_ORIGIN_MISMATCH", PasskeyOriginMismatchError],
    ["PASSWORD_EMPTY", PasswordEmptyError],
    ["PASSWORD_HASH_INVALID", PasswordHashInvalidError],
    ["PASSWORD_MISSING", PasswordMissingError],
    ["PASSWORD_RECOVERY_EXPIRED", PasswordRecoveryExpiredError],
    ["PASSWORD_RECOVERY_NA", PasswordRecoveryNaError],
    ["PASSWORD_REQUIRED", PasswordRequiredError],
    ["PAYMENT_CREDENTIALS_INVALID", PaymentCredentialsInvalidError],
    ["PAYMENT_PROVIDER_INVALID", PaymentProviderInvalidError],
    ["PAYMENT_REQUIRED", PaymentRequiredError],
    ["PEER_HISTORY_EMPTY", PeerHistoryEmptyError],
    ["PEER_ID_INVALID", PeerIdInvalidError],
    ["PEER_ID_NOT_SUPPORTED", PeerIdNotSupportedError],
    ["PEER_TYPES_INVALID", PeerTypesInvalidError],
    ["PEERS_LIST_EMPTY", PeersListEmptyError],
    ["PERSISTENT_TIMESTAMP_EMPTY", PersistentTimestampEmptyError],
    ["PERSISTENT_TIMESTAMP_INVALID", PersistentTimestampInvalidError],
    ["PHONE_CODE_EMPTY", PhoneCodeEmptyError],
    ["PHONE_CODE_EXPIRED", PhoneCodeExpiredError],
    ["PHONE_CODE_HASH_EMPTY", PhoneCodeHashEmptyError],
    ["PHONE_CODE_INVALID", PhoneCodeInvalidError],
    ["PHONE_HASH_EXPIRED", PhoneHashExpiredError],
    ["PHONE_NOT_OCCUPIED", PhoneNotOccupiedError],
    ["PHONE_NUMBER_APP_SIGNUP_FORBIDDEN", PhoneNumberAppSignupForbiddenError],
    ["PHONE_NUMBER_BANNED", PhoneNumberBannedError],
    ["PHONE_NUMBER_FLOOD", PhoneNumberFloodError],
    ["PHONE_NUMBER_INVALID", PhoneNumberInvalidError],
    ["PHONE_NUMBER_OCCUPIED", PhoneNumberOccupiedError],
    ["PHONE_NUMBER_UNOCCUPIED", PhoneNumberUnoccupiedError],
    ["PHONE_PASSWORD_PROTECTED", PhonePasswordProtectedError],
    ["PHOTO_CONTENT_TYPE_INVALID", PhotoContentTypeInvalidError],
    ["PHOTO_CONTENT_URL_EMPTY", PhotoContentUrlEmptyError],
    ["PHOTO_CROP_FILE_MISSING", PhotoCropFileMissingError],
    ["PHOTO_CROP_SIZE_SMALL", PhotoCropSizeSmallError],
    ["PHOTO_EXT_INVALID", PhotoExtInvalidError],
    ["PHOTO_FILE_MISSING", PhotoFileMissingError],
    ["PHOTO_ID_INVALID", PhotoIdInvalidError],
    ["PHOTO_INVALID", PhotoInvalidError],
    ["PHOTO_INVALID_DIMENSIONS", PhotoInvalidDimensionsError],
    ["PHOTO_SAVE_FILE_INVALID", PhotoSaveFileInvalidError],
    ["PHOTO_THUMB_URL_EMPTY", PhotoThumbUrlEmptyError],
    ["PIN_RESTRICTED", PinRestrictedError],
    ["PINNED_DIALOGS_TOO_MUCH", PinnedDialogsTooMuchError],
    ["PINNED_TOO_MUCH", PinnedTooMuchError],
    ["PINNED_TOPIC_NOT_MODIFIED", PinnedTopicNotModifiedError],
    ["POLL_ANSWER_INVALID", PollAnswerInvalidError],
    ["POLL_ANSWERS_INVALID", PollAnswersInvalidError],
    ["POLL_OPTION_DUPLICATE", PollOptionDuplicateError],
    ["POLL_OPTION_INVALID", PollOptionInvalidError],
    ["POLL_QUESTION_INVALID", PollQuestionInvalidError],
    ["PREMIUM_ACCOUNT_REQUIRED", PremiumAccountRequiredError],
    ["PREMIUM_PURPOSE_INVALID", PremiumPurposeInvalidError],
    ["PRICING_CHAT_INVALID", PricingChatInvalidError],
    ["PRIVACY_KEY_INVALID", PrivacyKeyInvalidError],
    ["PRIVACY_TOO_LONG", PrivacyTooLongError],
    ["PRIVACY_VALUE_INVALID", PrivacyValueInvalidError],
    ["PUBLIC_BROADCAST_EXPECTED", PublicBroadcastExpectedError],
    ["PUBLIC_KEY_INVALID", PublicKeyInvalidError],
    ["PUBLIC_KEY_REQUIRED", PublicKeyRequiredError],
    ["PURPOSE_INVALID", PurposeInvalidError],
    ["QUERY_ID_EMPTY", QueryIdEmptyError],
    ["QUERY_ID_INVALID", QueryIdInvalidError],
    ["QUERY_TOO_SHORT", QueryTooShortError],
    ["QUICK_REPLIES_BOT_NOT_ALLOWED", QuickRepliesBotNotAllowedError],
    ["QUICK_REPLIES_TOO_MUCH", QuickRepliesTooMuchError],
    ["QUIZ_ANSWER_MISSING", QuizAnswerMissingError],
    ["QUIZ_CORRECT_ANSWER_INVALID", QuizCorrectAnswerInvalidError],
    ["QUIZ_CORRECT_ANSWERS_EMPTY", QuizCorrectAnswersEmptyError],
    ["QUIZ_CORRECT_ANSWERS_TOO_MUCH", QuizCorrectAnswersTooMuchError],
    ["QUIZ_MULTIPLE_INVALID", QuizMultipleInvalidError],
    ["QUOTE_TEXT_INVALID", QuoteTextInvalidError],
    ["RAISE_HAND_FORBIDDEN", RaiseHandForbiddenError],
    ["RANDOM_ID_DUPLICATE", RandomIdDuplicateError],
    ["RANDOM_ID_EMPTY", RandomIdEmptyError],
    ["RANDOM_ID_EXPIRED", RandomIdExpiredError],
    ["RANDOM_ID_INVALID", RandomIdInvalidError],
    ["RANDOM_LENGTH_INVALID", RandomLengthInvalidError],
    ["RANGES_INVALID", RangesInvalidError],
    ["REACTION_EMPTY", ReactionEmptyError],
    ["REACTION_INVALID", ReactionInvalidError],
    ["REACTIONS_COUNT_INVALID", ReactionsCountInvalidError],
    ["REACTIONS_TOO_MANY", ReactionsTooManyError],
    ["RECEIPT_EMPTY", ReceiptEmptyError],
    ["REPLY_MARKUP_BUY_EMPTY", ReplyMarkupBuyEmptyError],
    ["REPLY_MARKUP_GAME_EMPTY", ReplyMarkupGameEmptyError],
    ["REPLY_MARKUP_INVALID", ReplyMarkupInvalidError],
    ["REPLY_MARKUP_TOO_LONG", ReplyMarkupTooLongError],
    ["REPLY_MESSAGE_ID_INVALID", ReplyMessageIdInvalidError],
    ["REPLY_MESSAGES_TOO_MUCH", ReplyMessagesTooMuchError],
    ["REPLY_TO_INVALID", ReplyToInvalidError],
    ["REPLY_TO_MONOFORUM_PEER_INVALID", ReplyToMonoforumPeerInvalidError],
    ["REPLY_TO_USER_INVALID", ReplyToUserInvalidError],
    ["REQUEST_MSG_EXPIRED", RequestMsgExpiredError],
    ["REQUEST_TOKEN_INVALID", RequestTokenInvalidError],
    ["RESELL_STARS_TOO_FEW", ResellStarsTooFewError],
    ["RESELL_STARS_TOO_MUCH", ResellStarsTooMuchError],
    ["RESET_REQUEST_MISSING", ResetRequestMissingError],
    ["RESULT_ID_DUPLICATE", ResultIdDuplicateError],
    ["RESULT_ID_EMPTY", ResultIdEmptyError],
    ["RESULT_ID_INVALID", ResultIdInvalidError],
    ["RESULT_TYPE_INVALID", ResultTypeInvalidError],
    ["RESULTS_TOO_MUCH", ResultsTooMuchError],
    ["REVOTE_NOT_ALLOWED", RevoteNotAllowedError],
    ["RIGHTS_NOT_MODIFIED", RightsNotModifiedError],
    ["RINGTONE_INVALID", RingtoneInvalidError],
    ["RINGTONE_MIME_INVALID", RingtoneMimeInvalidError],
    ["RSA_DECRYPT_FAILED", RsaDecryptFailedError],
    ["SAVED_ID_EMPTY", SavedIdEmptyError],
    ["SCHEDULE_BOT_NOT_ALLOWED", ScheduleBotNotAllowedError],
    ["SCHEDULE_DATE_INVALID", ScheduleDateInvalidError],
    ["SCHEDULE_DATE_TOO_LATE", ScheduleDateTooLateError],
    ["SCHEDULE_STATUS_PRIVATE", ScheduleStatusPrivateError],
    ["SCHEDULE_TOO_MUCH", ScheduleTooMuchError],
    ["SCORE_INVALID", ScoreInvalidError],
    ["SEARCH_QUERY_EMPTY", SearchQueryEmptyError],
    ["SEARCH_WITH_LINK_NOT_SUPPORTED", SearchWithLinkNotSupportedError],
    ["SECONDS_INVALID", SecondsInvalidError],
    ["SECURE_SECRET_REQUIRED", SecureSecretRequiredError],
    ["SELF_DELETE_RESTRICTED", SelfDeleteRestrictedError],
    ["SEND_AS_PEER_INVALID", SendAsPeerInvalidError],
    ["SEND_MESSAGE_GAME_INVALID", SendMessageGameInvalidError],
    ["SEND_MESSAGE_MEDIA_INVALID", SendMessageMediaInvalidError],
    ["SEND_MESSAGE_TYPE_INVALID", SendMessageTypeInvalidError],
    ["SETTINGS_INVALID", SettingsInvalidError],
    ["SHA256_HASH_INVALID", Sha256HashInvalidError],
    ["SHORT_NAME_INVALID", ShortNameInvalidError],
    ["SHORT_NAME_OCCUPIED", ShortNameOccupiedError],
    ["SHORTCUT_INVALID", ShortcutInvalidError],
    ["SLOTS_EMPTY", SlotsEmptyError],
    ["SLOWMODE_MULTI_MSGS_DISABLED", SlowmodeMultiMsgsDisabledError],
    ["SLUG_INVALID", SlugInvalidError],
    ["SMS_CODE_CREATE_FAILED", SmsCodeCreateFailedError],
    ["SMSJOB_ID_INVALID", SmsjobIdInvalidError],
    ["SRP_A_INVALID", SrpAInvalidError],
    ["SRP_ID_INVALID", SrpIdInvalidError],
    ["SRP_PASSWORD_CHANGED", SrpPasswordChangedError],
    ["STARGIFT_ALREADY_CONVERTED", StargiftAlreadyConvertedError],
    ["STARGIFT_ALREADY_REFUNDED", StargiftAlreadyRefundedError],
    ["STARGIFT_ALREADY_UPGRADED", StargiftAlreadyUpgradedError],
    ["STARGIFT_ATTRIBUTE_INVALID", StargiftAttributeInvalidError],
    ["STARGIFT_INVALID", StargiftInvalidError],
    ["STARGIFT_MESSAGE_INVALID", StargiftMessageInvalidError],
    ["STARGIFT_NOT_FOUND", StargiftNotFoundError],
    ["STARGIFT_NOT_OWNER", StargiftNotOwnerError],
    ["STARGIFT_NOT_UNIQUE", StargiftNotUniqueError],
    ["STARGIFT_OBJECT_INVALID", StargiftObjectInvalidError],
    ["STARGIFT_OFFER_INVALID", StargiftOfferInvalidError],
    ["STARGIFT_OFFER_NOT_ALLOWED", StargiftOfferNotAllowedError],
    ["STARGIFT_OWNER_INVALID", StargiftOwnerInvalidError],
    ["STARGIFT_PEER_INVALID", StargiftPeerInvalidError],
    ["STARGIFT_RESELL_CURRENCY_NOT_ALLOWED", StargiftResellCurrencyNotAllowedError],
    ["STARGIFT_SLUG_INVALID", StargiftSlugInvalidError],
    ["STARGIFT_UPGRADE_UNAVAILABLE", StargiftUpgradeUnavailableError],
    ["STARGIFT_USAGE_LIMITED", StargiftUsageLimitedError],
    ["STARGIFT_USER_USAGE_LIMITED", StargiftUserUsageLimitedError],
    ["STARREF_AWAITING_END", StarrefAwaitingEndError],
    ["STARREF_EXPIRED", StarrefExpiredError],
    ["STARREF_HASH_REVOKED", StarrefHashRevokedError],
    ["STARREF_PERMILLE_INVALID", StarrefPermilleInvalidError],
    ["STARREF_PERMILLE_TOO_LOW", StarrefPermilleTooLowError],
    ["STARS_AMOUNT_INVALID", StarsAmountInvalidError],
    ["STARS_INVOICE_INVALID", StarsInvoiceInvalidError],
    ["STARS_PAYMENT_REQUIRED", StarsPaymentRequiredError],
    ["START_PARAM_EMPTY", StartParamEmptyError],
    ["START_PARAM_INVALID", StartParamInvalidError],
    ["START_PARAM_TOO_LONG", StartParamTooLongError],
    ["STICKER_DOCUMENT_INVALID", StickerDocumentInvalidError],
    ["STICKER_EMOJI_INVALID", StickerEmojiInvalidError],
    ["STICKER_FILE_INVALID", StickerFileInvalidError],
    ["STICKER_GIF_DIMENSIONS", StickerGifDimensionsError],
    ["STICKER_ID_INVALID", StickerIdInvalidError],
    ["STICKER_INVALID", StickerInvalidError],
    ["STICKER_MIME_INVALID", StickerMimeInvalidError],
    ["STICKER_PNG_DIMENSIONS", StickerPngDimensionsError],
    ["STICKER_PNG_NOPNG", StickerPngNopngError],
    ["STICKER_TGS_NODOC", StickerTgsNodocError],
    ["STICKER_TGS_NOTGS", StickerTgsNotgsError],
    ["STICKER_THUMB_PNG_NOPNG", StickerThumbPngNopngError],
    ["STICKER_THUMB_TGS_NOTGS", StickerThumbTgsNotgsError],
    ["STICKER_VIDEO_BIG", StickerVideoBigError],
    ["STICKER_VIDEO_NODOC", StickerVideoNodocError],
    ["STICKER_VIDEO_NOWEBM", StickerVideoNowebmError],
    ["STICKERPACK_STICKERS_TOO_MUCH", StickerpackStickersTooMuchError],
    ["STICKERS_EMPTY", StickersEmptyError],
    ["STICKERS_TOO_MUCH", StickersTooMuchError],
    ["STICKERSET_INVALID", StickersetInvalidError],
    ["STORIES_NEVER_CREATED", StoriesNeverCreatedError],
    ["STORIES_TOO_MUCH", StoriesTooMuchError],
    ["STORY_ID_EMPTY", StoryIdEmptyError],
    ["STORY_ID_INVALID", StoryIdInvalidError],
    ["STORY_NOT_MODIFIED", StoryNotModifiedError],
    ["STORY_PERIOD_INVALID", StoryPeriodInvalidError],
    ["SUBSCRIPTION_EXPORT_MISSING", SubscriptionExportMissingError],
    ["SUBSCRIPTION_ID_INVALID", SubscriptionIdInvalidError],
    ["SUBSCRIPTION_PERIOD_INVALID", SubscriptionPeriodInvalidError],
    ["SUGGESTED_POST_AMOUNT_INVALID", SuggestedPostAmountInvalidError],
    ["SUGGESTED_POST_PEER_INVALID", SuggestedPostPeerInvalidError],
    ["SWITCH_PM_TEXT_EMPTY", SwitchPmTextEmptyError],
    ["SWITCH_WEBVIEW_URL_INVALID", SwitchWebviewUrlInvalidError],
    ["TAKEOUT_INVALID", TakeoutInvalidError],
    ["TAKEOUT_REQUIRED", TakeoutRequiredError],
    ["TASK_ALREADY_EXISTS", TaskAlreadyExistsError],
    ["TEMP_AUTH_KEY_ALREADY_BOUND", TempAuthKeyAlreadyBoundError],
    ["TEMP_AUTH_KEY_EMPTY", TempAuthKeyEmptyError],
    ["TERMS_URL_INVALID", TermsUrlInvalidError],
    ["TEXTDRAFT_PEER_INVALID", TextdraftPeerInvalidError],
    ["THEME_FILE_INVALID", ThemeFileInvalidError],
    ["THEME_FORMAT_INVALID", ThemeFormatInvalidError],
    ["THEME_INVALID", ThemeInvalidError],
    ["THEME_MIME_INVALID", ThemeMimeInvalidError],
    ["THEME_PARAMS_INVALID", ThemeParamsInvalidError],
    ["THEME_SLUG_INVALID", ThemeSlugInvalidError],
    ["THEME_TITLE_INVALID", ThemeTitleInvalidError],
    ["TIMEZONE_INVALID", TimezoneInvalidError],
    ["TITLE_INVALID", TitleInvalidError],
    ["TMP_PASSWORD_DISABLED", TmpPasswordDisabledError],
    ["TMP_PASSWORD_INVALID", TmpPasswordInvalidError],
    ["TO_ID_INVALID", ToIdInvalidError],
    ["TO_LANG_INVALID", ToLangInvalidError],
    ["TODO_ITEM_DUPLICATE", TodoItemDuplicateError],
    ["TODO_ITEMS_EMPTY", TodoItemsEmptyError],
    ["TODO_ITEMS_TOO_MUCH", TodoItemsTooMuchError],
    ["TODO_NOT_MODIFIED", TodoNotModifiedError],
    ["TOKEN_EMPTY", TokenEmptyError],
    ["TOKEN_INVALID", TokenInvalidError],
    ["TOKEN_TYPE_INVALID", TokenTypeInvalidError],
    ["TOPIC_CLOSE_SEPARATELY", TopicCloseSeparatelyError],
    ["TOPIC_CLOSED", TopicClosedError],
    ["TOPIC_DELETED", TopicDeletedError],
    ["TOPIC_HIDE_SEPARATELY", TopicHideSeparatelyError],
    ["TOPIC_ID_INVALID", TopicIdInvalidError],
    ["TOPIC_NOT_MODIFIED", TopicNotModifiedError],
    ["TOPIC_TITLE_EMPTY", TopicTitleEmptyError],
    ["TOPICS_EMPTY", TopicsEmptyError],
    ["TRANSACTION_ID_INVALID", TransactionIdInvalidError],
    ["TRANSCRIPTION_FAILED", TranscriptionFailedError],
    ["TRANSLATE_REQ_QUOTA_EXCEEDED", TranslateReqQuotaExceededError],
    ["TTL_DAYS_INVALID", TtlDaysInvalidError],
    ["TTL_MEDIA_INVALID", TtlMediaInvalidError],
    ["TTL_PERIOD_INVALID", TtlPeriodInvalidError],
    ["TYPES_EMPTY", TypesEmptyError],
    ["UNSUPPORTED", UnsupportedError],
    ["UNTIL_DATE_INVALID", UntilDateInvalidError],
    ["URL_EXPIRED", UrlExpiredError],
    ["URL_INVALID", UrlInvalidError],
    ["USAGE_LIMIT_INVALID", UsageLimitInvalidError],
    ["USER_ADMIN_INVALID", UserAdminInvalidError],
    ["USER_ALREADY_INVITED", UserAlreadyInvitedError],
    ["USER_ALREADY_PARTICIPANT", UserAlreadyParticipantError],
    ["USER_BANNED_IN_CHANNEL", UserBannedInChannelError],
    ["USER_BLOCKED", UserBlockedError],
    ["USER_BOT", UserBotError],
    ["USER_BOT_INVALID", UserBotInvalidError],
    ["USER_BOT_REQUIRED", UserBotRequiredError],
    ["USER_BOT_TO_BOT_DISABLED", UserBotToBotDisabledError],
    ["USER_CHANNELS_TOO_MUCH", UserChannelsTooMuchError],
    ["USER_CREATOR", UserCreatorError],
    ["USER_GIFT_UNAVAILABLE", UserGiftUnavailableError],
    ["USER_ID_INVALID", UserIdInvalidError],
    ["USER_INVALID", UserInvalidError],
    ["USER_IS_BLOCKED", UserIsBlockedError],
    ["USER_IS_BOT", UserIsBotError],
    ["USER_KICKED", UserKickedError],
    ["USER_NOT_MUTUAL_CONTACT", UserNotMutualContactError],
    ["USER_NOT_PARTICIPANT", UserNotParticipantError],
    ["USER_PUBLIC_MISSING", UserPublicMissingError],
    ["USER_VOLUME_INVALID", UserVolumeInvalidError],
    ["USERNAME_INVALID", UsernameInvalidError],
    ["USERNAME_NOT_MODIFIED", UsernameNotModifiedError],
    ["USERNAME_NOT_OCCUPIED", UsernameNotOccupiedError],
    ["USERNAME_OCCUPIED", UsernameOccupiedError],
    ["USERNAME_PURCHASE_AVAILABLE", UsernamePurchaseAvailableError],
    ["USERNAME_SUFFIX_MISSING", UsernameSuffixMissingError],
    ["USERNAMES_ACTIVE_TOO_MUCH", UsernamesActiveTooMuchError],
    ["USERPIC_UPLOAD_REQUIRED", UserpicUploadRequiredError],
    ["USERS_TOO_FEW", UsersTooFewError],
    ["USERS_TOO_MUCH", UsersTooMuchError],
    ["VENUE_ID_INVALID", VenueIdInvalidError],
    ["VIDEO_CONTENT_TYPE_INVALID", VideoContentTypeInvalidError],
    ["VIDEO_DURATION_INVALID", VideoDurationInvalidError],
    ["VIDEO_FILE_INVALID", VideoFileInvalidError],
    ["VIDEO_PAUSE_FORBIDDEN", VideoPauseForbiddenError],
    ["VIDEO_STOP_FORBIDDEN", VideoStopForbiddenError],
    ["VIDEO_TITLE_EMPTY", VideoTitleEmptyError],
    ["VOICE_MESSAGES_FORBIDDEN", VoiceMessagesForbiddenError],
    ["WALLPAPER_FILE_INVALID", WallpaperFileInvalidError],
    ["WALLPAPER_INVALID", WallpaperInvalidError],
    ["WALLPAPER_MIME_INVALID", WallpaperMimeInvalidError],
    ["WALLPAPER_NOT_FOUND", WallpaperNotFoundError],
    ["WC_CONVERT_URL_INVALID", WcConvertUrlInvalidError],
    ["WEBAPP_REQ_ID_INVALID", WebappReqIdInvalidError],
    ["WEBAUTH_TOKEN_EXPIRED", WebauthTokenExpiredError],
    ["WEBDOCUMENT_INVALID", WebdocumentInvalidError],
    ["WEBDOCUMENT_MIME_INVALID", WebdocumentMimeInvalidError],
    ["WEBDOCUMENT_SIZE_TOO_BIG", WebdocumentSizeTooBigError],
    ["WEBDOCUMENT_URL_EMPTY", WebdocumentUrlEmptyError],
    ["WEBDOCUMENT_URL_INVALID", WebdocumentUrlInvalidError],
    ["WEBPAGE_CURL_FAILED", WebpageCurlFailedError],
    ["WEBPAGE_MEDIA_EMPTY", WebpageMediaEmptyError],
    ["WEBPAGE_NOT_FOUND", WebpageNotFoundError],
    ["WEBPAGE_URL_INVALID", WebpageUrlInvalidError],
    ["WEBPUSH_AUTH_INVALID", WebpushAuthInvalidError],
    ["WEBPUSH_KEY_INVALID", WebpushKeyInvalidError],
    ["WEBPUSH_TOKEN_INVALID", WebpushTokenInvalidError],
    ["YOU_BLOCKED_USER", YouBlockedUserError],
    ["BOT_METHOD_INVALID", BotMethodInvalidError],
    ["CONNECTION_DEVICE_MODEL_EMPTY", ConnectionDeviceModelEmptyError],
    ["CONNECTION_LANG_PACK_INVALID", ConnectionLangPackInvalidError],
    ["CONNECTION_NOT_INITED", ConnectionNotInitedError],
    ["CONNECTION_SYSTEM_EMPTY", ConnectionSystemEmptyError],
    ["CONNECTION_SYSTEM_LANG_CODE_EMPTY", ConnectionSystemLangCodeEmptyError],
    ["INPUT_CONSTRUCTOR_INVALID", InputConstructorInvalidError],
    ["INPUT_FETCH_ERROR", InputFetchErrorError],
    ["INPUT_FETCH_FAIL", InputFetchFailError],
    ["INPUT_LAYER_INVALID", InputLayerInvalidError],
    ["INPUT_METHOD_INVALID", InputMethodInvalidError],
    ["INPUT_REQUEST_TOO_LONG", InputRequestTooLongError],
    ["PEER_FLOOD", PeerFloodError],
    ["STICKERSET_NOT_MODIFIED", StickersetNotModifiedError],
    ["AUTH_KEY_UNREGISTERED", AuthKeyUnregisteredError],
    ["AUTH_KEY_INVALID", AuthKeyInvalidError],
    ["AUTH_KEY_PERM_EMPTY", AuthKeyPermEmptyError],
    ["SESSION_EXPIRED", SessionExpiredError],
    ["SESSION_PASSWORD_NEEDED", SessionPasswordNeededError],
    ["SESSION_REVOKED", SessionRevokedError],
    ["USER_DEACTIVATED", UserDeactivatedError],
    ["USER_DEACTIVATED_BAN", UserDeactivatedBanError],
    ["ACCESS_DENIED", AccessDeniedError],
    ["ALLOW_PAYMENT_REQUIRED", AllowPaymentRequiredError],
    ["BOT_ACCESS_FORBIDDEN", BotAccessForbiddenError],
    ["BOT_FORUM_CREATE_FORBIDDEN", BotForumCreateForbiddenError],
    ["BOT_GUARD_NOT_SUPPORTED", BotGuardNotSupportedError],
    ["BOT_VERIFIER_FORBIDDEN", BotVerifierForbiddenError],
    ["BROADCAST_FORBIDDEN", BroadcastForbiddenError],
    ["CHANNEL_PUBLIC_GROUP_NA", ChannelPublicGroupNaError],
    ["CHAT_ACTION_FORBIDDEN", ChatActionForbiddenError],
    ["CHAT_ADMIN_INVITE_REQUIRED", ChatAdminInviteRequiredError],
    ["CHAT_GUEST_SEND_FORBIDDEN", ChatGuestSendForbiddenError],
    ["CHAT_SEND_AUDIOS_FORBIDDEN", ChatSendAudiosForbiddenError],
    ["CHAT_SEND_DOCS_FORBIDDEN", ChatSendDocsForbiddenError],
    ["CHAT_SEND_GAME_FORBIDDEN", ChatSendGameForbiddenError],
    ["CHAT_SEND_GIFS_FORBIDDEN", ChatSendGifsForbiddenError],
    ["CHAT_SEND_MEDIA_FORBIDDEN", ChatSendMediaForbiddenError],
    ["CHAT_SEND_PHOTOS_FORBIDDEN", ChatSendPhotosForbiddenError],
    ["CHAT_SEND_PLAIN_FORBIDDEN", ChatSendPlainForbiddenError],
    ["CHAT_SEND_POLL_FORBIDDEN", ChatSendPollForbiddenError],
    ["CHAT_SEND_ROUNDVIDEOS_FORBIDDEN", ChatSendRoundvideosForbiddenError],
    ["CHAT_SEND_STICKERS_FORBIDDEN", ChatSendStickersForbiddenError],
    ["CHAT_SEND_VIDEOS_FORBIDDEN", ChatSendVideosForbiddenError],
    ["CHAT_SEND_VOICES_FORBIDDEN", ChatSendVoicesForbiddenError],
    ["CHAT_SEND_WEBPAGE_FORBIDDEN", ChatSendWebpageForbiddenError],
    ["CHAT_TYPE_INVALID", ChatTypeInvalidError],
    ["EDIT_BOT_INVITE_FORBIDDEN", EditBotInviteForbiddenError],
    ["GROUPCALL_ALREADY_STARTED", GroupcallAlreadyStartedError],
    ["GROUPCALL_CHANGE_FORBIDDEN", GroupcallChangeForbiddenError],
    ["INLINE_BOT_REQUIRED", InlineBotRequiredError],
    ["MESSAGE_AUTHOR_REQUIRED", MessageAuthorRequiredError],
    ["MESSAGE_DELETE_FORBIDDEN", MessageDeleteForbiddenError],
    ["POLL_VOTE_REQUIRED", PollVoteRequiredError],
    ["PRIVACY_PREMIUM_REQUIRED", PrivacyPremiumRequiredError],
    ["PUBLIC_CHANNEL_MISSING", PublicChannelMissingError],
    ["RIGHT_FORBIDDEN", RightForbiddenError],
    ["SENSITIVE_CHANGE_FORBIDDEN", SensitiveChangeForbiddenError],
    ["USER_DELETED", UserDeletedError],
    ["USER_DISALLOWED_STARGIFTS", UserDisallowedStargiftsError],
    ["USER_PERMISSION_DENIED", UserPermissionDeniedError],
    ["USER_PRIVACY_RESTRICTED", UserPrivacyRestrictedError],
    ["USER_RESTRICTED", UserRestrictedError],
    ["YOUR_PRIVACY_RESTRICTED", YourPrivacyRestrictedError],
    ["CHAT_FORBIDDEN", ChatForbiddenError],
    ["API_GIFT_RESTRICTED_UPDATE_APP", ApiGiftRestrictedUpdateAppError],
    ["BUSINESS_ADDRESS_ACTIVE", BusinessAddressActiveError],
    ["CALL_PROTOCOL_COMPAT_LAYER_INVALID", CallProtocolCompatLayerInvalidError],
    ["EDIT_MESSAGE_TEMP_RESTRICTED", EditMessageTempRestrictedError],
    ["FILEREF_UPGRADE_NEEDED", FilerefUpgradeNeededError],
    ["FRESH_CHANGE_PHONE_FORBIDDEN", FreshChangePhoneForbiddenError],
    ["FRESH_RESET_AUTHORISATION_FORBIDDEN", FreshResetAuthorisationForbiddenError],
    ["PAYMENT_UNSUPPORTED", PaymentUnsupportedError],
    ["PHONE_PASSWORD_FLOOD", PhonePasswordFloodError],
    ["POLL_COUNTRY_RESTRICTED", PollCountryRestrictedError],
    ["POLL_MEMBER_RESTRICTED", PollMemberRestrictedError],
    ["PRECHECKOUT_FAILED", PrecheckoutFailedError],
    ["PREMIUM_CURRENTLY_UNAVAILABLE", PremiumCurrentlyUnavailableError],
    ["SEND_CODE_UNAVAILABLE", SendCodeUnavailableError],
    ["STARGIFT_EXPORT_IN_PROGRESS", StargiftExportInProgressError],
    ["STARS_FORM_AMOUNT_MISMATCH", StarsFormAmountMismatchError],
    ["STICKERSET_OWNER_ANONYMOUS", StickersetOwnerAnonymousError],
    ["TRANSLATIONS_DISABLED", TranslationsDisabledError],
    ["UPDATE_APP_TO_LOGIN", UpdateAppToLoginError],
    ["USERPIC_PRIVACY_REQUIRED", UserpicPrivacyRequiredError],
    ["AUTH_KEY_DUPLICATED", AuthKeyDuplicatedError],
    ["FROZEN_METHOD_INVALID", FrozenMethodInvalidError],
    ["AICOMPOSE_TIMEOUT", AicomposeTimeoutError],
    ["AUTH_KEY_UNSYNCHRONIZED", AuthKeyUnsynchronizedError],
    ["AUTH_RESTART", AuthRestartError],
    ["CDN_UPLOAD_TIMEOUT", CdnUploadTimeoutError],
    ["CHAT_ID_GENERATE_FAILED", ChatIdGenerateFailedError],
    ["OAUTH_REQUEST_INVALID", OauthRequestInvalidError],
    ["PERSISTENT_TIMESTAMP_OUTDATED", PersistentTimestampOutdatedError],
    ["SEND_MEDIA_INVALID", SendMediaInvalidError],
    ["SIGN_IN_FAILED", SignInFailedError],
    ["TRANSLATE_REQ_FAILED", TranslateReqFailedError],
    ["TRANSLATION_TIMEOUT", TranslationTimeoutError],
    ["Timeout", TimeoutError],
    ["MSG_WAIT_TIMEOUT", MsgWaitTimeoutError],
    ["ANONYMOUS_REACTIONS_DISABLED", AnonymousReactionsDisabledError]
  ]);
  exports2.rpcErrorsRe = new Map([
    [/^NETWORK_MIGRATE_(\d+)$/, NetworkMigrateError],
    [/^PHONE_MIGRATE_(\d+)$/, PhoneMigrateError],
    [/^STATS_MIGRATE_(\d+)$/, StatsMigrateError],
    [/^USER_MIGRATE_(\d+)$/, UserMigrateError],
    [/^EMAIL_UNCONFIRMED_(\d+)$/, EmailUnconfirmedError],
    [/^FILE_REFERENCE_(\d+)_EMPTY$/, FileReferenceEmptyError],
    [/^FILE_REFERENCE_(\d+)_EXPIRED$/, FileReferenceExpiredError],
    [/^FILE_REFERENCE_(\d+)_INVALID$/, FileReferenceInvalidError],
    [/^PASSWORD_TOO_FRESH_(\d+)$/, PasswordTooFreshError],
    [/^SESSION_TOO_FRESH_(\d+)$/, SessionTooFreshError],
    [/^STARGIFT_RESELL_TOO_EARLY_(\d+)$/, StargiftResellTooEarlyError],
    [/^STARGIFT_TRANSFER_TOO_EARLY_(\d+)$/, StargiftTransferTooEarlyError],
    [/^STORY_LIVE_ALREADY_(\d+)$/, StoryLiveAlreadyError],
    [/^STORY_SEND_FLOOD_MONTHLY_(\d+)$/, StorySendFloodMonthlyError],
    [/^STORY_SEND_FLOOD_WEEKLY_(\d+)$/, StorySendFloodWeeklyError],
    [/^FILE_MIGRATE_(\d+)$/, FileMigrateError],
    [/^FILE_PART_(\d+)_MISSING$/, FilePartMissingError],
    [/^ALLOW_PAYMENT_REQUIRED_(\d+)$/, AllowPaymentRequiredError],
    [/^PREVIOUS_CHAT_IMPORT_ACTIVE_WAIT_(\d+)MIN$/, PreviousChatImportActiveWaitMinError],
    [/^2FA_CONFIRM_WAIT_(\d+)$/, TwoFaConfirmWaitError],
    [/^FLOOD_PREMIUM_WAIT_(\d+)$/, FloodWaitError],
    [/^FLOOD_WAIT_(\d+)$/, FloodWaitError],
    [/^PREMIUM_SUB_ACTIVE_UNTIL_(\d+)$/, PremiumSubActiveUntilError],
    [/^SLOWMODE_WAIT_(\d+)$/, SlowModeWaitError],
    [/^TAKEOUT_INIT_DELAY_(\d+)$/, TakeoutInitDelayError],
    [/^AUTH_RESTART_(\d+)$/, AuthRestartError],
    [/^FLOOD_TEST_PHONE_WAIT_(\d+)$/, FloodTestPhoneWaitError]
  ]);
  exports2.rpcErrorRe = exports2.rpcErrorsRe;
  exports2.baseErrors = new Map([
    [303, RPCBaseErrors_1.InvalidDCError],
    [400, RPCBaseErrors_1.BadRequestError],
    [401, RPCBaseErrors_1.UnauthorizedError],
    [403, RPCBaseErrors_1.ForbiddenError],
    [404, RPCBaseErrors_1.NotFoundError],
    [406, RPCBaseErrors_1.AuthKeyError],
    [420, RPCBaseErrors_1.FloodError],
    [500, RPCBaseErrors_1.ServerError],
    [503, RPCBaseErrors_1.TimedOutError]
  ]);
});

// node_modules/teleproto/errors/Common.js
var require_Common = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.BadMessageError = exports2.CdnFileTamperedError = exports2.SecurityError = exports2.InvalidBufferError = exports2.InvalidChecksumError = exports2.TypeNotFoundError = exports2.ReadCancelledError = undefined;

  class ReadCancelledError extends Error {
    constructor() {
      super("The read operation was cancelled.");
    }
  }
  exports2.ReadCancelledError = ReadCancelledError;

  class TypeNotFoundError extends Error {
    constructor(invalidConstructorId, remaining) {
      super(`Could not find a matching Constructor ID for the TLObject that was supposed to be
        read with ID ${invalidConstructorId}. Most likely, a TLObject was trying to be read when
         it should not be read. Remaining bytes: ${remaining.length}`);
      this.invalidConstructorId = invalidConstructorId;
      this.remaining = remaining;
    }
  }
  exports2.TypeNotFoundError = TypeNotFoundError;

  class InvalidChecksumError extends Error {
    constructor(checksum, validChecksum) {
      super(`Invalid checksum (${checksum} when ${validChecksum} was expected). This packet should be skipped.`);
      this.checksum = checksum;
      this.validChecksum = validChecksum;
    }
  }
  exports2.InvalidChecksumError = InvalidChecksumError;

  class InvalidBufferError extends Error {
    constructor(payload) {
      let code = undefined;
      if (payload.length === 4) {
        code = -payload.readInt32LE(0);
        super(`Invalid response buffer (HTTP code ${code})`);
      } else {
        super(`Invalid response buffer (too short ${payload})`);
      }
      this.code = code;
      this.payload = payload;
    }
  }
  exports2.InvalidBufferError = InvalidBufferError;

  class SecurityError extends Error {
    constructor(...args) {
      if (!args.length) {
        args = ["A security check failed."];
      }
      super(...args);
    }
  }
  exports2.SecurityError = SecurityError;

  class CdnFileTamperedError extends SecurityError {
    constructor() {
      super("The CDN file has been altered and its download cancelled.");
    }
  }
  exports2.CdnFileTamperedError = CdnFileTamperedError;

  class BadMessageError extends Error {
    static {
      this.ErrorMessages = {
        16: "msg_id too low (most likely, client time is wrong it would be worthwhile to " + "synchronize it using msg_id notifications and re-send the original message " + "with the “correct” msg_id or wrap it in a container with a new msg_id if the " + "original message had waited too long on the client to be transmitted).",
        17: "msg_id too high (similar to the previous case, the client time has to be " + "synchronized, and the message re-sent with the correct msg_id).",
        18: "Incorrect two lower order msg_id bits (the server expects client message msg_id " + "to be divisible by 4).",
        19: "Container msg_id is the same as msg_id of a previously received message " + "(this must never happen).",
        20: "Message too old, and it cannot be verified whether the server has received a " + "message with this msg_id or not.",
        32: "msg_seqno too low (the server has already received a message with a lower " + "msg_id but with either a higher or an equal and odd seqno).",
        33: "msg_seqno too high (similarly, there is a message with a higher msg_id but with " + "either a lower or an equal and odd seqno).",
        34: "An even msg_seqno expected (irrelevant message), but odd received.",
        35: "Odd msg_seqno expected (relevant message), but even received.",
        48: "Incorrect server salt (in this case, the bad_server_salt response is received with " + "the correct salt, and the message is to be re-sent with it).",
        64: "Invalid container."
      };
    }
    constructor(request, code) {
      let errorMessage2 = BadMessageError.ErrorMessages[code] || `Unknown error code (this should not happen): ${code}.`;
      errorMessage2 += `  Caused by ${request.className}`;
      super(errorMessage2);
      this.errorMessage = errorMessage2;
      this.code = code;
    }
  }
  exports2.BadMessageError = BadMessageError;
});

// node_modules/teleproto/errors/aliases.js
var require_aliases = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.FrozenError = exports2.FrozenParticipantError = exports2.FrozenMethodError = undefined;
  var RPCBaseErrors_1 = require_RPCBaseErrors();
  var RPCErrorList_1 = require_RPCErrorList();
  exports2.FrozenMethodError = RPCErrorList_1.FrozenMethodInvalidError;
  exports2.FrozenParticipantError = RPCErrorList_1.FrozenParticipantMissingError;
  exports2.FrozenError = RPCBaseErrors_1.FloodError;
});

// node_modules/teleproto/errors/index.js
var require_errors = __commonJS((exports2) => {
  var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p))
        __createBinding(exports3, m, p);
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.RPCMessageToError = RPCMessageToError;
  var RPCBaseErrors_1 = require_RPCBaseErrors();
  var RPCErrorList_1 = require_RPCErrorList();
  function RPCMessageToError(rpcError, request) {
    const message = rpcError.errorMessage;
    let error;
    const ExactCls = RPCErrorList_1.rpcErrorsDict.get(message);
    if (ExactCls) {
      error = new ExactCls({ request });
    } else {
      let matched = false;
      for (const [msgRegex, Cls] of RPCErrorList_1.rpcErrorsRe) {
        const m = message.match(msgRegex);
        if (m) {
          const capture = m.length >= 2 ? parseInt(m[1]) : null;
          error = new Cls({ request, capture });
          matched = true;
          break;
        }
      }
      if (!matched) {
        const BaseCls = RPCErrorList_1.baseErrors.get(Math.abs(rpcError.errorCode)) || RPCBaseErrors_1.RPCError;
        error = new BaseCls(message, request, rpcError.errorCode);
      }
    }
    error.errorMessage = message;
    return error;
  }
  __exportStar(require_Common(), exports2);
  __exportStar(require_RPCBaseErrors(), exports2);
  __exportStar(require_RPCErrorList(), exports2);
  __exportStar(require_aliases(), exports2);
});

// node_modules/teleproto/network/connection/TCPFull.js
var require_TCPFull = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ConnectionTCPFull = exports2.FullPacketCodec = undefined;
  var Connection_1 = require_Connection();
  var Helpers_1 = require_Helpers();
  var errors_1 = require_errors();

  class FullPacketCodec extends Connection_1.PacketCodec {
    constructor(connection) {
      super(connection);
      this._sendCounter = 0;
    }
    encodePacket(data) {
      const length = data.length + 12;
      const packet = Buffer.allocUnsafe(length);
      packet.writeInt32LE(length, 0);
      packet.writeInt32LE(this._sendCounter, 4);
      data.copy(packet, 8);
      packet.writeUInt32LE((0, Helpers_1.crc32)(packet.subarray(0, length - 4)), length - 4);
      this._sendCounter += 1;
      return packet;
    }
    async readPacket(reader) {
      const lenBuf = await reader.readExactly(4);
      if (lenBuf === undefined) {
        return Buffer.alloc(0);
      }
      const packetLen = lenBuf.readInt32LE(0);
      if (packetLen < 0) {
        throw new errors_1.InvalidBufferError(lenBuf);
      }
      const seqBuf = await reader.readExactly(4);
      let body = await reader.readExactly(packetLen - 8);
      const checksum = body.slice(-4).readUInt32LE(0);
      body = body.slice(0, -4);
      const validChecksum = (0, Helpers_1.crc32)(body, (0, Helpers_1.crc32)(seqBuf, (0, Helpers_1.crc32)(lenBuf)));
      if (!(validChecksum === checksum)) {
        throw new errors_1.InvalidChecksumError(checksum, validChecksum);
      }
      return body;
    }
  }
  exports2.FullPacketCodec = FullPacketCodec;

  class ConnectionTCPFull extends Connection_1.Connection {
    constructor() {
      super(...arguments);
      this.PacketCodecClass = FullPacketCodec;
    }
  }
  exports2.ConnectionTCPFull = ConnectionTCPFull;
});

// node_modules/teleproto/network/connection/TCPAbridged.js
var require_TCPAbridged = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ConnectionTCPAbridged = exports2.AbridgedPacketCodec = undefined;
  var Helpers_1 = require_Helpers();
  var Connection_1 = require_Connection();
  var errors_1 = require_errors();
  var big_integer_1 = __importDefault(require_BigInteger());
  var TRANSPORT_ERROR_HEAD = new Set([
    108,
    83,
    68
  ]);
  var TRANSPORT_ERROR_CODES = new Set([-404, -429, -444]);

  class AbridgedPacketCodec extends Connection_1.PacketCodec {
    static {
      this.tag = Buffer.from("ef", "hex");
    }
    static {
      this.obfuscateTag = Buffer.from("efefefef", "hex");
    }
    constructor(props) {
      super(props);
      this.tag = AbridgedPacketCodec.tag;
      this.obfuscateTag = AbridgedPacketCodec.obfuscateTag;
    }
    encodePacket(data) {
      let length = data.length >> 2;
      let temp;
      if (length < 127) {
        const b = Buffer.alloc(1);
        b.writeUInt8(length, 0);
        temp = b;
      } else {
        temp = Buffer.concat([
          Buffer.from("7f", "hex"),
          (0, Helpers_1.readBufferFromBigInt)((0, big_integer_1.default)(length), 3)
        ]);
      }
      return Buffer.concat([temp, data]);
    }
    async readPacket(reader) {
      const readData = await reader.readExactly(1);
      let length = readData[0];
      if (length >= 127) {
        length = Buffer.concat([
          await reader.readExactly(3),
          Buffer.alloc(1)
        ]).readInt32LE(0);
      } else if (TRANSPORT_ERROR_HEAD.has(length)) {
        const tail = await reader.readExactly(3);
        const candidate = Buffer.concat([Buffer.from([length]), tail]);
        if (TRANSPORT_ERROR_CODES.has(candidate.readInt32LE(0))) {
          throw new errors_1.InvalidBufferError(candidate);
        }
        const rest = await reader.readExactly((length << 2) - 3);
        return Buffer.concat([tail, rest]);
      }
      return reader.readExactly(length << 2);
    }
  }
  exports2.AbridgedPacketCodec = AbridgedPacketCodec;

  class ConnectionTCPAbridged extends Connection_1.Connection {
    constructor() {
      super(...arguments);
      this.PacketCodecClass = AbridgedPacketCodec;
    }
  }
  exports2.ConnectionTCPAbridged = ConnectionTCPAbridged;
});

// node_modules/teleproto/crypto/CTR.js
var require_CTR = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CTR = undefined;
  var cifrante_1 = require_cifrante_node();
  var Helpers_1 = require_Helpers();

  class CTR {
    constructor(key, iv) {
      if (!Buffer.isBuffer(key) || !Buffer.isBuffer(iv) || iv.length !== 16) {
        throw new Error("Key and iv need to be a buffer");
      }
      this.state = cifrante_1.aes.ctr(key).create({ iv });
    }
    encrypt(data) {
      return (0, Helpers_1.asBuffer)(this.state.update(data));
    }
  }
  exports2.CTR = CTR;
});

// node_modules/teleproto/network/connection/TCPObfuscated.js
var require_TCPObfuscated = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ConnectionTCPObfuscated = undefined;
  var Helpers_1 = require_Helpers();
  var Connection_1 = require_Connection();
  var TCPAbridged_1 = require_TCPAbridged();
  var CTR_1 = require_CTR();

  class ObfuscatedIO {
    constructor(connection) {
      this.header = undefined;
      this.connection = connection.socket;
      this._packetClass = connection.PacketCodecClass;
    }
    async initHeader() {
      const keywords = [
        Buffer.from("50567247", "hex"),
        Buffer.from("474554", "hex"),
        Buffer.from("504f5354", "hex"),
        Buffer.from("eeeeeeee", "hex")
      ];
      let random;
      while (true) {
        random = (0, Helpers_1.generateRandomBytes)(64);
        if (random[0] !== 239 && !random.slice(4, 8).equals(Buffer.alloc(4))) {
          let ok = true;
          for (const key of keywords) {
            if (key.equals(random.slice(0, 4))) {
              ok = false;
              break;
            }
          }
          if (ok) {
            break;
          }
        }
      }
      random = random.toJSON().data;
      const randomReversed = Buffer.from(random.slice(8, 56)).reverse();
      const encryptKey = Buffer.from(random.slice(8, 40));
      const encryptIv = Buffer.from(random.slice(40, 56));
      const decryptKey = Buffer.from(randomReversed.slice(0, 32));
      const decryptIv = Buffer.from(randomReversed.slice(32, 48));
      const encryptor = new CTR_1.CTR(encryptKey, encryptIv);
      const decryptor = new CTR_1.CTR(decryptKey, decryptIv);
      random = Buffer.concat([
        Buffer.from(random.slice(0, 56)),
        this._packetClass.obfuscateTag,
        Buffer.from(random.slice(60))
      ]);
      random = Buffer.concat([
        Buffer.from(random.slice(0, 56)),
        Buffer.from(encryptor.encrypt(random).slice(56, 64)),
        Buffer.from(random.slice(64))
      ]);
      this.header = random;
      this._encrypt = encryptor;
      this._decrypt = decryptor;
    }
    async read(n) {
      const data = await this.connection.readExactly(n);
      return this._decrypt.encrypt(data);
    }
    readExactly(n) {
      return this.read(n);
    }
    write(data) {
      this.connection.write(this._encrypt.encrypt(data));
    }
  }

  class ConnectionTCPObfuscated extends Connection_1.ObfuscatedConnection {
    constructor() {
      super(...arguments);
      this.ObfuscatedIO = ObfuscatedIO;
      this.PacketCodecClass = TCPAbridged_1.AbridgedPacketCodec;
    }
  }
  exports2.ConnectionTCPObfuscated = ConnectionTCPObfuscated;
});

// node_modules/teleproto/network/connection/TCPMTProxy.js
var require_TCPMTProxy = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.PaddedIntermediatePacketCodec = exports2.ConnectionTCPMTProxyAbridged = exports2.TCPMTProxy = undefined;
  var node_crypto_1 = require("node:crypto");
  var cifrante_1 = require_cifrante_node();
  var Connection_1 = require_Connection();
  var Common_1 = require_Common();
  var TCPAbridged_1 = require_TCPAbridged();
  var Helpers_1 = require_Helpers();
  var CTR_1 = require_CTR();
  var SECRET_LEN = 16;
  var PREFIX_FAKE_TLS = 238;
  var PREFIX_DD_PADDING = 221;
  function decodeSecret(input) {
    return /^[0-9a-f]+$/i.test(input) ? Buffer.from(input, "hex") : Buffer.from(input, "base64");
  }
  function parseProxySecret(input) {
    if (!input) {
      throw new Error("MTProxy: secret is required");
    }
    const raw = decodeSecret(input);
    if (raw.length > 1 + SECRET_LEN && raw[0] === PREFIX_FAKE_TLS) {
      return {
        key: Buffer.from(raw.subarray(1, 1 + SECRET_LEN)),
        fakeTlsDomain: raw.subarray(1 + SECRET_LEN).toString("utf8"),
        padded: true
      };
    }
    if (raw.length === 1 + SECRET_LEN && raw[0] === PREFIX_DD_PADDING) {
      return { key: Buffer.from(raw.subarray(1)), padded: true };
    }
    if (raw.length === SECRET_LEN) {
      return { key: raw };
    }
    throw new Error(`MTProxy: secret must be ${SECRET_LEN} bytes, ` + `${1 + SECRET_LEN} with 0xdd prefix, ` + `or 0xee + ${SECRET_LEN} bytes + domain — got ${raw.length} bytes`);
  }
  var OBF_HEADER_LEN = 64;
  var OBF_TAG_OFFSET = 56;
  var OBF_DC_OFFSET = 60;
  var FORBIDDEN_HEADER_PREFIXES = [
    Buffer.from("50567247", "hex"),
    Buffer.from("47455420", "hex"),
    Buffer.from("504f5354", "hex"),
    Buffer.from("48454144", "hex"),
    Buffer.from("4f505449", "hex"),
    Buffer.from("16030102", "hex"),
    Buffer.from("dddddddd", "hex"),
    Buffer.from("eeeeeeee", "hex")
  ];
  function pickObfuscationHeader() {
    while (true) {
      const candidate = (0, Helpers_1.generateRandomBytes)(OBF_HEADER_LEN);
      if (candidate[0] === 239)
        continue;
      if (candidate.subarray(4, 8).equals(Buffer.alloc(4)))
        continue;
      const head4 = candidate.subarray(0, 4);
      if (FORBIDDEN_HEADER_PREFIXES.some((p) => p.equals(head4)))
        continue;
      return candidate;
    }
  }

  class MTProxyIO {
    constructor(connection) {
      this.stream = connection.socket;
      this.packetCodec = connection.PacketCodecClass;
      this.secret = connection._secret;
      const dcId = connection._dcId;
      this.dcId = connection._testServers ? Math.sign(dcId) * (Math.abs(dcId) + 1e4) : dcId;
    }
    async initHeader() {
      if (this.secret.length !== SECRET_LEN) {
        throw new Error(`MTProxy: secret must be ${SECRET_LEN} bytes, got ${this.secret.length}`);
      }
      const header = pickObfuscationHeader();
      const reversed = Buffer.from(header.subarray(8, 56)).reverse();
      const encryptKey = await (0, Helpers_1.sha256)(Buffer.concat([header.subarray(8, 40), this.secret]));
      const encryptIv = Buffer.from(header.subarray(40, 56));
      const decryptKey = await (0, Helpers_1.sha256)(Buffer.concat([reversed.subarray(0, 32), this.secret]));
      const decryptIv = Buffer.from(reversed.subarray(32, 48));
      this.encryptor = new CTR_1.CTR(encryptKey, encryptIv);
      this.decryptor = new CTR_1.CTR(decryptKey, decryptIv);
      this.packetCodec.obfuscateTag.copy(header, OBF_TAG_OFFSET);
      header.writeInt16LE(this.dcId, OBF_DC_OFFSET);
      const encryptedTail = this.encryptor.encrypt(header).subarray(OBF_TAG_OFFSET, OBF_HEADER_LEN);
      encryptedTail.copy(header, OBF_TAG_OFFSET);
      this.header = header;
    }
    async read(n) {
      const data = await this.stream.readExactly(n);
      return this.decryptor.encrypt(data);
    }
    readExactly(n) {
      return this.read(n);
    }
    write(data) {
      this.stream.write(this.encryptor.encrypt(data));
    }
  }
  var TLS_RECORD_HEADER_LEN = 5;
  var TLS_RECORD_MAX_PAYLOAD = 16384;
  var TLS_RECORD_HANDSHAKE = 22;
  var TLS_RECORD_CHANGE_CIPHER_SPEC = 20;
  var TLS_RECORD_APPLICATION_DATA = 23;
  var TLS_APP_DATA_PREFIX = Buffer.from([23, 3, 3]);
  var FAKE_TLS_HELLO_SIZE = 517;
  var FAKE_TLS_HELLO_RANDOM_OFFSET = 11;
  var FAKE_TLS_HELLO_RANDOM_LEN = 32;
  var FAKE_TLS_FIXED_HEADER_SIZE = 114;
  var FAKE_TLS_RANDOM_TIMESTAMP_XOR_OFFSET = 28;
  var GREASE = 10;
  async function readTlsRecord(stream) {
    const hdr = await stream.readExactly(TLS_RECORD_HEADER_LEN);
    const type = hdr[0];
    const len = hdr.readUInt16BE(3);
    const payload = await stream.readExactly(len);
    return { type, payload };
  }
  function tlsRecordTypeName(type) {
    switch (type) {
      case TLS_RECORD_HANDSHAKE:
        return "Handshake";
      case TLS_RECORD_CHANGE_CIPHER_SPEC:
        return "ChangeCipherSpec";
      case TLS_RECORD_APPLICATION_DATA:
        return "ApplicationData";
      default:
        return `0x${type.toString(16).padStart(2, "0")}`;
    }
  }
  function tlsExtension(type, body) {
    const content = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const out = Buffer.alloc(4 + content.length);
    out.writeUInt16BE(type, 0);
    out.writeUInt16BE(content.length, 2);
    content.copy(out, 4);
    return out;
  }
  function sniExtension(domain) {
    const dom = Buffer.from(domain, "utf8");
    const body = Buffer.alloc(5 + dom.length);
    body.writeUInt16BE(dom.length + 3, 0);
    body.writeUInt8(0, 2);
    body.writeUInt16BE(dom.length, 3);
    dom.copy(body, 5);
    return tlsExtension(0, body);
  }
  function keyShareExtension() {
    const x25519Pub = (0, Helpers_1.generateRandomBytes)(32);
    const entries = Buffer.concat([
      Buffer.from([GREASE, GREASE, 0, 1, 0]),
      Buffer.from([0, 29, 0, 32]),
      x25519Pub
    ]);
    const body = Buffer.alloc(2 + entries.length);
    body.writeUInt16BE(entries.length, 0);
    entries.copy(body, 2);
    return tlsExtension(51, body);
  }
  var STATIC_EXTENSIONS = [
    tlsExtension(2570, []),
    tlsExtension(23, []),
    tlsExtension(65281, [0]),
    tlsExtension(10, [
      0,
      8,
      GREASE,
      GREASE,
      0,
      29,
      0,
      23,
      0,
      24
    ]),
    tlsExtension(11, [1, 0]),
    tlsExtension(35, []),
    tlsExtension(16, [
      0,
      12,
      2,
      104,
      50,
      8,
      104,
      116,
      116,
      112,
      47,
      49,
      46,
      49
    ]),
    tlsExtension(5, [1, 0, 0, 0, 0]),
    tlsExtension(13, [
      0,
      16,
      4,
      3,
      8,
      4,
      4,
      1,
      5,
      3,
      8,
      5,
      5,
      1,
      8,
      6,
      6,
      1
    ]),
    tlsExtension(18, []),
    tlsExtension(45, [1, 1]),
    tlsExtension(43, [6, GREASE, GREASE, 3, 4, 3, 3]),
    tlsExtension(27, [2, 0, 2]),
    tlsExtension(2570, [0])
  ];
  var STATIC_EXTENSIONS_LEN = STATIC_EXTENSIONS.reduce((s, e) => s + e.length, 0);
  var CIPHER_SUITES = Buffer.from([
    GREASE,
    GREASE,
    19,
    1,
    19,
    2,
    19,
    3,
    192,
    43,
    192,
    47,
    192,
    44,
    192,
    48,
    204,
    169,
    204,
    168,
    192,
    19,
    192,
    20,
    0,
    156,
    0,
    157,
    0,
    47,
    0,
    53
  ]);
  function buildClientHello(domain, sessionId) {
    const sni = sniExtension(domain);
    const keyShare = keyShareExtension();
    let extensionsLen = STATIC_EXTENSIONS_LEN + sni.length + keyShare.length;
    const paddingPayloadLen = FAKE_TLS_HELLO_SIZE - FAKE_TLS_FIXED_HEADER_SIZE - extensionsLen - 4;
    if (paddingPayloadLen < 0) {
      throw new Error(`FakeTLS: domain too long (${domain.length} bytes); ClientHello overflows by ${-paddingPayloadLen} bytes`);
    }
    const padding = tlsExtension(21, Buffer.alloc(paddingPayloadLen));
    extensionsLen += padding.length;
    const KEY_SHARE_INSERT_AFTER = 11;
    const extensions = [
      STATIC_EXTENSIONS[0],
      sni,
      ...STATIC_EXTENSIONS.slice(1, KEY_SHARE_INSERT_AFTER + 1),
      keyShare,
      ...STATIC_EXTENSIONS.slice(KEY_SHARE_INSERT_AFTER + 1),
      padding
    ];
    const hello = Buffer.concat([
      Buffer.from([22, 3, 1, 2, 0]),
      Buffer.from([1, 0, 1, 252]),
      Buffer.from([3, 3]),
      Buffer.alloc(FAKE_TLS_HELLO_RANDOM_LEN),
      Buffer.from([sessionId.length]),
      sessionId,
      Buffer.from([
        CIPHER_SUITES.length >> 8 & 255,
        CIPHER_SUITES.length & 255
      ]),
      CIPHER_SUITES,
      Buffer.from([1, 0]),
      Buffer.from([extensionsLen >> 8 & 255, extensionsLen & 255]),
      ...extensions
    ]);
    if (hello.length !== FAKE_TLS_HELLO_SIZE) {
      throw new Error(`FakeTLS: ClientHello size mismatch — got ${hello.length}, expected ${FAKE_TLS_HELLO_SIZE}`);
    }
    return hello;
  }

  class FakeTlsSocket {
    constructor(inner, secret, domain) {
      this.clientRandom = Buffer.alloc(0);
      this.readBuf = Buffer.alloc(0);
      if (secret.length !== SECRET_LEN) {
        throw new Error(`FakeTLS: secret must be ${SECRET_LEN} bytes, got ${secret.length}`);
      }
      this.inner = inner;
      this.secret = secret;
      this.domain = domain;
    }
    async handshake() {
      const hello = this.sendClientHello();
      this.inner.write(hello);
      await this.readAndVerifyServerHandshake();
    }
    write(data) {
      for (let off = 0;off < data.length; off += TLS_RECORD_MAX_PAYLOAD) {
        const chunkLen = Math.min(TLS_RECORD_MAX_PAYLOAD, data.length - off);
        const hdr = Buffer.alloc(TLS_RECORD_HEADER_LEN);
        TLS_APP_DATA_PREFIX.copy(hdr, 0);
        hdr.writeUInt16BE(chunkLen, 3);
        this.inner.write(Buffer.concat([hdr, data.subarray(off, off + chunkLen)]));
      }
    }
    async readExactly(n) {
      while (this.readBuf.length < n) {
        const { type, payload } = await readTlsRecord(this.inner);
        if (type !== TLS_RECORD_APPLICATION_DATA)
          continue;
        this.readBuf = Buffer.concat([this.readBuf, payload]);
      }
      const out = Buffer.from(this.readBuf.subarray(0, n));
      this.readBuf = this.readBuf.subarray(n);
      return out;
    }
    async close() {
      await this.inner.close();
    }
    sendClientHello() {
      const sessionId = (0, Helpers_1.generateRandomBytes)(32);
      const hello = buildClientHello(this.domain, sessionId);
      const stamp = (0, Helpers_1.asBuffer)(cifrante_1.hmac.sha256.sync(this.secret, hello));
      const now = Math.floor(Date.now() / 1000) >>> 0;
      const lastWord = (stamp.readUInt32LE(FAKE_TLS_RANDOM_TIMESTAMP_XOR_OFFSET) ^ now) >>> 0;
      stamp.writeUInt32LE(lastWord, FAKE_TLS_RANDOM_TIMESTAMP_XOR_OFFSET);
      stamp.copy(hello, FAKE_TLS_HELLO_RANDOM_OFFSET);
      this.clientRandom = stamp;
      return hello;
    }
    async readAndVerifyServerHandshake() {
      const expectedTypes = [
        TLS_RECORD_HANDSHAKE,
        TLS_RECORD_CHANGE_CIPHER_SPEC,
        TLS_RECORD_APPLICATION_DATA
      ];
      const chunks = [];
      let serverRandomOffset = -1;
      let offset = 0;
      for (let i = 0;i < expectedTypes.length; i++) {
        const { type, payload } = await readTlsRecord(this.inner);
        if (type !== expectedTypes[i]) {
          throw new Error(`FakeTLS: expected ${tlsRecordTypeName(expectedTypes[i])} at record ${i}, got ${tlsRecordTypeName(type)}`);
        }
        if (i === 0) {
          serverRandomOffset = offset + FAKE_TLS_HELLO_RANDOM_OFFSET;
        }
        const hdr = Buffer.alloc(TLS_RECORD_HEADER_LEN);
        hdr[0] = type;
        hdr[1] = 3;
        hdr[2] = 3;
        hdr.writeUInt16BE(payload.length, 3);
        chunks.push(hdr, payload);
        offset += TLS_RECORD_HEADER_LEN + payload.length;
      }
      const serverResp = Buffer.concat(chunks);
      const serverRandom = Buffer.from(serverResp.subarray(serverRandomOffset, serverRandomOffset + FAKE_TLS_HELLO_RANDOM_LEN));
      serverResp.fill(0, serverRandomOffset, serverRandomOffset + FAKE_TLS_HELLO_RANDOM_LEN);
      const expected = (0, Helpers_1.asBuffer)(cifrante_1.hmac.sha256.sync.create(this.secret).update(this.clientRandom).update(serverResp).digest());
      if (!expected.equals(serverRandom)) {
        throw new Error("FakeTLS: server HMAC verification failed");
      }
    }
  }

  class TCPMTProxy extends Connection_1.ObfuscatedConnection {
    constructor({ dcId, loggers, proxy, socket, testServers, keepAliveInterval }) {
      if (!("MTProxy" in proxy)) {
        throw new Error("This connection only supports MTProxies");
      }
      super({
        ip: proxy.ip,
        port: proxy.port,
        dcId,
        loggers,
        socket,
        proxy,
        testServers,
        keepAliveInterval
      });
      this.ObfuscatedIO = MTProxyIO;
      const parsed = parseProxySecret(proxy.secret);
      this._secret = parsed.key;
      this._fakeTlsDomain = parsed.fakeTlsDomain;
      this._padded = !!parsed.padded;
    }
    async _initConn() {
      if (this._fakeTlsDomain) {
        const tls = new FakeTlsSocket(this.socket, this._secret, this._fakeTlsDomain);
        await tls.handshake();
        this.socket = tls;
      }
      await super._initConn();
    }
  }
  exports2.TCPMTProxy = TCPMTProxy;

  class ConnectionTCPMTProxyAbridged extends TCPMTProxy {
    constructor() {
      super(...arguments);
      this.PacketCodecClass = this._padded ? PaddedIntermediatePacketCodec : TCPAbridged_1.AbridgedPacketCodec;
    }
  }
  exports2.ConnectionTCPMTProxyAbridged = ConnectionTCPMTProxyAbridged;

  class PaddedIntermediatePacketCodec extends Connection_1.PacketCodec {
    static {
      this.tag = Buffer.from("dddddddd", "hex");
    }
    static {
      this.obfuscateTag = PaddedIntermediatePacketCodec.tag;
    }
    encodePacket(data) {
      const padding = (0, node_crypto_1.randomInt)(16);
      const packet = Buffer.allocUnsafe(4 + data.length + padding);
      packet.writeUInt32LE(data.length + padding, 0);
      data.copy(packet, 4);
      if (padding)
        (0, Helpers_1.generateRandomBytes)(padding).copy(packet, 4 + data.length);
      return packet;
    }
    async readPacket(reader) {
      const header = await reader.readExactly(4);
      const length = header.readInt32LE(0);
      if (length < 0)
        throw new Common_1.InvalidBufferError(header);
      if (length < 4 || length > (1 << 24) + 15) {
        throw new Error(`Invalid padded intermediate packet length: ${length}`);
      }
      const body = await reader.readExactly(length);
      if (length < 20) {
        if (body.readInt32LE(0) < 0)
          throw new Common_1.InvalidBufferError(body.subarray(0, 4));
        throw new Error("Invalid padded intermediate payload");
      }
      if (body.readBigUInt64LE(0) === BigInt(0)) {
        const end = 20 + body.readUInt32LE(16);
        if (end > length) {
          throw new Error("Invalid unencrypted MTProto payload length");
        }
        return body.subarray(0, end);
      }
      if (length < 40)
        throw new Error("Invalid encrypted MTProto payload length");
      return body.subarray(0, length - (length - 24) % 16);
    }
  }
  exports2.PaddedIntermediatePacketCodec = PaddedIntermediatePacketCodec;
});

// node_modules/teleproto/network/connection/webProxy/protocol.js
var require_protocol = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MAX_ITEMS = exports2.MAX_STREAM_QUEUE = exports2.MAX_QUEUE = exports2.CHUNK = exports2.MAX_PAYLOAD = exports2.MAX_BATCH = exports2.WINDOW = undefined;
  exports2.configure = configure;
  exports2.frame = frame;
  exports2.parseFrames = parseFrames;
  exports2.token = token;
  var cifrante_1 = require_cifrante_node();
  var Helpers_1 = require_Helpers();
  var node_net_1 = require("node:net");
  exports2.WINDOW = 4 * 1024 * 1024;
  exports2.MAX_BATCH = 2 * 1024 * 1024;
  exports2.MAX_PAYLOAD = 1024 * 1024;
  exports2.CHUNK = 64 * 1024;
  exports2.MAX_QUEUE = 32 * 1024 * 1024;
  exports2.MAX_STREAM_QUEUE = 8 * 1024 * 1024;
  exports2.MAX_ITEMS = 8192;
  function configure(options) {
    const input = options.server.replace(/^https:\/\//i, "");
    const slash = input.indexOf("/");
    const hostInput = slash < 0 ? input : input.slice(0, slash);
    const path2 = slash < 0 ? "" : input.slice(slash + 1);
    if (!hostInput || /[\s:@?#%\\]/.test(hostInput) || slash >= 0 && (!path2 || path2.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9_-]*(\/[A-Za-z0-9][A-Za-z0-9_-]*)*$/.test(path2))) {
      throw new Error("WEB proxy requires a hostname and optional canonical base path");
    }
    const host = new URL(`https://${hostInput}`).hostname;
    if ((0, node_net_1.isIP)(host) || host.length > 253 || !host.includes(".") || !host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
      throw new Error("WEB proxy requires a DNS hostname");
    }
    const encoded = options.secret;
    let secret;
    if (/^(?:[a-fA-F0-9]{2})+$/.test(encoded))
      secret = Buffer.from(encoded, "hex");
    else if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(encoded)) {
      secret = Buffer.from(encoded, "base64");
      if (secret.toString("base64url") !== encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")) {
        throw new Error("Invalid WEB proxy secret encoding");
      }
    } else
      throw new Error("Invalid WEB proxy secret encoding");
    if (secret.length >= 17 && secret[0] === 112)
      secret = secret.subarray(1);
    if (secret.length !== 16 && !(secret.length === 17 && secret[0] === 221)) {
      throw new Error("WEB proxy requires a plain or dd secret; fake TLS secrets are unsupported");
    }
    const connectTimeoutMs = options.connectTimeoutMs ?? 30000;
    const requestTimeoutMs = options.requestTimeoutMs ?? 90000;
    const maxStreams = options.maxStreams ?? 32;
    for (const value of [connectTimeoutMs, requestTimeoutMs, maxStreams]) {
      if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647)
        throw new Error("Invalid WEB proxy limit");
    }
    if (maxStreams > 256)
      throw new Error("WEB proxy maxStreams cannot exceed 256");
    const context = path2 ? `tdesktop-web-proxy-bridge-v2
${host}
${path2}` : `tdesktop-web-proxy-bridge-v1
${host}`;
    const capability = (0, Helpers_1.asBuffer)(cifrante_1.hmac.sha256.sync(secret, context)).toString("base64url");
    return {
      host,
      base: `https://${host}/${path2 ? path2 + "/" : ""}`,
      secret: secret.toString("hex"),
      capability,
      connectTimeoutMs,
      requestTimeoutMs,
      maxStreams,
      webSocket: options.webSocket
    };
  }
  function frame(type, id, payload = Buffer.alloc(0)) {
    const result = Buffer.allocUnsafe(8 + payload.length);
    result[0] = type;
    result.writeUIntBE(id, 1, 3);
    result.writeUInt32BE(payload.length, 4);
    payload.copy(result, 8);
    return result;
  }
  function parseFrames(data) {
    if (!data.length || data.length > exports2.MAX_BATCH)
      throw new Error("Invalid WEB proxy batch size");
    const frames = [];
    for (let offset = 0;offset < data.length; ) {
      if (data.length - offset < 8 || frames.length >= 4096)
        throw new Error("Invalid WEB proxy frame batch");
      const type = data[offset], id = data.readUIntBE(offset + 1, 3), size = data.readUInt32BE(offset + 4);
      const end = offset + 8 + size;
      if (size > exports2.MAX_PAYLOAD || end > data.length)
        throw new Error("Invalid WEB proxy frame length");
      frames.push({ type, id, payload: data.subarray(offset + 8, end) });
      offset = end;
    }
    return frames;
  }
  function token(value) {
    if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value) || Buffer.from(value, "base64url").toString("base64url") !== value) {
      throw new Error("Invalid WEB proxy token");
    }
    return value;
  }
});

// node_modules/teleproto/network/connection/webProxy/transport.js
var require_transport = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createWebProxySocket = createWebProxySocket;
  var node_events_1 = require("node:events");
  var promises_1 = require("node:timers/promises");
  var protocol_1 = require_protocol();
  var closedError = () => new Error("WEB proxy connection closed");

  class ByteQueue {
    constructor() {
      this.chunks = [];
      this.head = 0;
      this.offset = 0;
      this.bytes = 0;
    }
    get items() {
      return this.chunks.length - this.head;
    }
    push(data) {
      this.chunks.push(data);
      this.bytes += data.length;
    }
    take(count) {
      count = Math.min(count, this.bytes);
      const out = Buffer.allocUnsafe(count);
      let written = 0;
      while (written < count) {
        const chunk = this.chunks[this.head];
        const n = Math.min(count - written, chunk.length - this.offset);
        chunk.copy(out, written, this.offset, this.offset + n);
        written += n;
        this.offset += n;
        if (this.offset === chunk.length) {
          this.chunks[this.head++] = Buffer.alloc(0);
          this.offset = 0;
        }
      }
      this.bytes -= count;
      if (this.head >= 128 || !this.bytes) {
        this.chunks = this.chunks.slice(this.head);
        this.head = 0;
      }
      return out;
    }
    clear() {
      this.chunks = [];
      this.head = 0;
      this.offset = 0;
      this.bytes = 0;
    }
  }

  class RelayTransport {
    constructor(config) {
      this.config = config;
      this.streams = new Map;
      this.controller = new AbortController;
      this.lanes = new Map;
      this.closed = false;
      this.outgoing = 0;
      this.incoming = 0;
      this.incomingItems = 0;
      this.nextId = 1;
      this.batchLimit = protocol_1.MAX_BATCH;
      this.tombstones = new Set;
      this.pumpQueued = false;
      (0, node_events_1.setMaxListeners)(config.maxStreams * 3 + 16, this.controller.signal);
    }
    async open(stream) {
      if (this.closed)
        throw closedError();
      const closingLanes = [...this.lanes.keys()].filter((id) => id !== 0 && !this.streams.has(id)).length;
      if (this.streams.size + closingLanes >= this.config.maxStreams || this.nextId > 16777215)
        throw new Error("WEB proxy stream limit reached");
      stream.id = this.nextId++;
      this.streams.set(stream.id, stream);
      try {
        await (this.startTask ??= this.start());
        if (this.closed || stream.closed)
          throw closedError();
        const lane = this.getLane(this.isLanes() ? stream.id : 0);
        this.enqueue(lane, (0, protocol_1.frame)(1, stream.id));
        stream.opened = true;
      } catch (error) {
        await stream.close();
        throw error;
      }
    }
    async start() {
      const timer = setTimeout(() => this.fail(new Error("WEB proxy startup timed out")), this.config.connectTimeoutMs);
      try {
        const page = await this.request(`?bridge=${this.config.capability}`, "GET", undefined, undefined, {}, protocol_1.MAX_BATCH);
        if (page.status !== 200)
          throw new Error("WEB proxy bootstrap rejected");
        const html = page.body.toString("utf8");
        const bootstrap = (0, protocol_1.token)(/\bbootstrap\s*=\s*"([A-Za-z0-9_-]+)"/.exec(html)?.[1] ?? null);
        const mode = /\bcarrierMode\s*=\s*"([a-z-]+)"/.exec(html)?.[1];
        const limit = Number(/\bbatchLimit\s*=\s*(\d+)/.exec(html)?.[1]);
        if (!["https", "https-lanes", "websocket", "websocket-lanes"].includes(mode ?? "") || !Number.isSafeInteger(limit) || limit < 64 || limit > protocol_1.MAX_BATCH) {
          throw new Error("Unsupported WEB proxy bootstrap format");
        }
        this.mode = mode;
        this.batchLimit = limit;
        const response = await this.request("api/v1/session", "POST", bootstrap, (0, protocol_1.frame)(16, 0, Buffer.from([1])), {}, 64);
        if (response.status !== 200)
          throw new Error("WEB proxy session rejected");
        this.sessionToken = (0, protocol_1.token)(response.headers.get("X-Session-Token"));
        if (response.headers.get("X-Carrier-Mode") !== mode)
          throw new Error("WEB proxy carrier mismatch");
        const welcome = (0, protocol_1.parseFrames)(response.body);
        if (welcome.length !== 1 || welcome[0].type !== 17 || welcome[0].id !== 0 || welcome[0].payload.length || response.headers.get("X-Down-Cursor") !== "0")
          throw new Error("Invalid WEB proxy welcome");
        if (this.closed)
          throw closedError();
        const lane = this.getLane(0);
        if (mode === "websocket")
          await this.openWebSocket(lane);
        else if (mode === "https" || mode === "https-lanes")
          this.poll(lane);
        this.watchdog = setInterval(() => {
          const now = Date.now();
          for (const entry of this.lanes.values()) {
            if ((entry.bytes || entry.socket?.bufferedAmount) && now - entry.progress > this.config.requestTimeoutMs) {
              this.fail(new Error("WEB proxy carrier stalled"));
              return;
            }
          }
          for (const stream of this.streams.values()) {
            if (stream.outgoing.bytes && now - stream.progress > this.config.requestTimeoutMs) {
              this.fail(new Error("WEB proxy stream stalled"));
              return;
            }
          }
        }, 1000);
        this.watchdog.unref?.();
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error("WEB proxy startup failed"));
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    isLanes() {
      return this.mode === "https-lanes" || this.mode === "websocket-lanes";
    }
    getLane(id) {
      let lane = this.lanes.get(id);
      if (!lane) {
        lane = {
          id,
          frames: [],
          bytes: 0,
          running: false,
          polling: false,
          ready: false,
          closed: false,
          sequence: 1,
          cursor: "0",
          progress: Date.now(),
          controller: new AbortController
        };
        this.lanes.set(id, lane);
      }
      return lane;
    }
    budget(extra = 0) {
      let bytes = this.outgoing + extra, items = 0;
      for (const lane of this.lanes.values()) {
        bytes += lane.bytes + (lane.socket?.bufferedAmount ?? 0);
        items += lane.frames.length;
      }
      for (const stream of this.streams.values())
        items += stream.outgoing.items;
      return bytes + items * 256 <= protocol_1.MAX_QUEUE && items < protocol_1.MAX_ITEMS;
    }
    enqueue(lane, data) {
      if (this.closed || lane.closed)
        throw closedError();
      if (!this.budget(data.length + 256)) {
        this.fail(new Error("WEB proxy send queue exceeded"));
        throw closedError();
      }
      if (!lane.bytes)
        lane.progress = Date.now();
      lane.frames.push(data);
      lane.bytes += data.length;
      queueMicrotask(() => this.sendLane(lane));
    }
    wake() {
      if (this.pumpQueued || this.closed)
        return;
      this.pumpQueued = true;
      setImmediate(() => {
        this.pumpQueued = false;
        if (this.closed)
          return;
        try {
          let frames = 0, again = true;
          while (again && frames < 128) {
            again = false;
            for (const stream of this.streams.values()) {
              if (!stream.opened || stream.closed)
                continue;
              const lane = this.getLane(this.isLanes() ? stream.id : 0);
              if (stream.grant) {
                const value = Buffer.allocUnsafe(4);
                value.writeUInt32BE(stream.grant);
                stream.receiveCredit += stream.grant;
                stream.grant = 0;
                this.enqueue(lane, (0, protocol_1.frame)(4, stream.id, value));
                frames++;
              }
              if (!stream.outgoing.bytes || !stream.sendCredit || lane.bytes >= this.batchLimit)
                continue;
              if ((lane.socket?.bufferedAmount ?? 0) >= this.batchLimit) {
                this.waitWebSocket();
                continue;
              }
              const data = stream.outgoing.take(Math.min(protocol_1.CHUNK, this.batchLimit - 8, stream.sendCredit));
              this.outgoing -= data.length;
              stream.sendCredit -= data.length;
              stream.progress = Date.now();
              this.enqueue(lane, (0, protocol_1.frame)(2, stream.id, data));
              frames++;
              again = true;
            }
          }
          if (again)
            this.wake();
        } catch (error) {
          this.fail(error instanceof Error ? error : closedError());
        }
      });
    }
    batch(lane) {
      let size = 0, count = 0;
      while (count < lane.frames.length && count < 4096 && size + lane.frames[count].length <= this.batchLimit)
        size += lane.frames[count++].length;
      if (!count)
        throw new Error("WEB proxy frame exceeds carrier batch limit");
      return Buffer.concat(lane.frames.splice(0, count), size);
    }
    sendLane(lane) {
      if (this.closed || lane.closed || lane.running || !lane.frames.length)
        return;
      lane.running = true;
      (async () => {
        const websocket = this.mode === "websocket" || this.mode === "websocket-lanes";
        if (websocket && !lane.ready)
          await this.openWebSocket(lane);
        while (!this.closed && !lane.closed && lane.frames.length) {
          if (websocket && lane.socket.bufferedAmount >= this.batchLimit) {
            this.waitWebSocket();
            break;
          }
          const data = this.batch(lane);
          if (websocket)
            lane.socket.send(data);
          else {
            const sequence = String(lane.sequence);
            const headers = { "X-Up-Seq": sequence };
            if (this.isLanes())
              headers["X-Lane-ID"] = String(lane.id);
            const response = await this.request("api/v1/up", "POST", this.sessionToken, data, headers, 64, lane.controller.signal);
            if (response.status !== 204 || response.headers.get("X-Up-Ack") !== sequence)
              throw new Error("WEB proxy uplink rejected");
            lane.sequence++;
            if (!Number.isSafeInteger(lane.sequence))
              throw new Error("WEB proxy sequence exhausted");
            if (this.isLanes() && lane.id && !lane.polling)
              this.poll(lane);
          }
          lane.bytes -= data.length;
          lane.progress = Date.now();
          this.wake();
          if (this.mode === "websocket-lanes" && !this.streams.has(lane.id) && !lane.frames.length) {
            this.finishLane(lane);
            return;
          }
        }
      })().catch((error) => {
        if (!lane.closed)
          this.fail(error instanceof Error ? error : closedError());
      }).finally(() => {
        lane.running = false;
      });
    }
    waitWebSocket() {
      if (this.wsTimer || this.closed)
        return;
      this.wsTimer = setTimeout(() => {
        this.wsTimer = undefined;
        for (const lane of this.lanes.values())
          this.sendLane(lane);
        this.wake();
      }, 10);
    }
    poll(lane) {
      if (lane.polling || lane.closed || this.closed)
        return;
      lane.polling = true;
      (async () => {
        while (!this.closed && !lane.closed) {
          const headers = { "X-Down-Cursor": lane.cursor };
          if (this.isLanes())
            headers["X-Lane-ID"] = String(lane.id);
          const response = await this.request("api/v1/down", "POST", this.sessionToken, undefined, headers, protocol_1.MAX_BATCH, lane.controller.signal);
          if (this.closed || lane.closed)
            return;
          const cursor = response.headers.get("X-Down-Cursor");
          if (response.status === 204) {
            if (response.body.length || cursor !== lane.cursor)
              throw new Error("Invalid WEB proxy idle cursor");
          } else if (response.status === 200) {
            if (!cursor || !/^(0|[1-9]\d*)$/.test(cursor) || BigInt(cursor) !== BigInt(lane.cursor) + BigInt(1))
              throw new Error("Invalid WEB proxy downlink cursor");
            this.receive(response.body, this.isLanes() ? lane.id : undefined);
            lane.cursor = cursor;
          } else
            throw new Error("WEB proxy downlink rejected");
          if (response.headers.get("X-Lane-Closed") === "1") {
            if (!this.isLanes() || !lane.id || response.body.length || this.streams.has(lane.id))
              throw new Error("Invalid WEB proxy lane closure");
            this.finishLane(lane);
            return;
          }
          if (response.status === 204)
            await (0, promises_1.setTimeout)(10, undefined, { signal: lane.controller.signal });
        }
      })().catch((error) => {
        if (!lane.closed)
          this.fail(error instanceof Error ? error : closedError());
      });
    }
    async openWebSocket(lane) {
      const Ctor = this.config.webSocket ?? globalThis.WebSocket;
      if (!Ctor)
        throw new Error("WEB proxy websocket profiles require Node.js 22+ or proxy.webSocket");
      const protocol = this.mode === "websocket-lanes" ? `tproxy-lane-v1.${this.sessionToken}.${lane.id}` : `tproxy-v1.${this.sessionToken}`;
      const socket = new Ctor(this.config.base.replace(/^https:/, "wss:") + "api/v1/ws", protocol);
      socket.binaryType = "arraybuffer";
      lane.socket = socket;
      await new Promise((resolve, reject) => {
        const abort = () => {
          cleanup();
          reject(closedError());
        };
        this.controller.signal.addEventListener("abort", abort, { once: true });
        lane.controller.signal.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("WEB proxy WebSocket timed out"));
          socket.close();
        }, this.config.connectTimeoutMs);
        const cleanup = () => {
          clearTimeout(timer);
          this.controller.signal.removeEventListener("abort", abort);
          lane.controller.signal.removeEventListener("abort", abort);
        };
        socket.onopen = () => {
          cleanup();
          if (this.closed || lane.closed || socket.protocol !== protocol) {
            socket.close();
            reject(new Error("WEB proxy WebSocket handshake rejected"));
            return;
          }
          lane.ready = true;
          resolve();
        };
        socket.onmessage = (event) => {
          try {
            if (this.closed || lane.closed)
              return;
            if (!lane.ready || typeof event.data === "string" || !(event.data instanceof ArrayBuffer))
              throw new Error("Invalid WEB proxy WebSocket message");
            this.receive(Buffer.from(event.data), this.isLanes() ? lane.id : undefined);
          } catch (error) {
            this.fail(error instanceof Error ? error : closedError());
          }
        };
        const failed = () => {
          cleanup();
          reject(new Error("WEB proxy WebSocket disconnected"));
          if (this.closed || lane.closed)
            return;
          if (this.mode === "websocket-lanes" && lane.ready)
            this.drop(lane.id, closedError(), false);
          else
            this.fail(closedError());
        };
        socket.onerror = failed;
        socket.onclose = failed;
      });
    }
    receive(data, laneId) {
      for (const entry of (0, protocol_1.parseFrames)(data)) {
        const { type, id, payload } = entry;
        if (laneId !== undefined && id !== laneId)
          throw new Error("Cross-lane WEB proxy frame");
        if (type === 5 && id === 0 && this.mode !== "websocket-lanes") {
          if (payload.length + 8 > this.batchLimit)
            throw new Error("Oversized WEB proxy ping");
          this.enqueue(this.getLane(0), (0, protocol_1.frame)(6, 0, payload));
          continue;
        }
        if (type === 31 && id === 0)
          throw new Error("WEB proxy relay ended the session");
        if (!id || ![2, 3, 4].includes(type) || type === 2 && !payload.length || type === 3 && payload.length || type === 4 && (payload.length !== 4 || !payload.readUInt32BE()))
          throw new Error("Invalid WEB proxy stream frame");
        const stream = this.streams.get(id);
        if (!stream) {
          if (this.tombstones.has(id))
            continue;
          throw new Error("Unknown WEB proxy stream");
        }
        if (!stream.opened)
          throw new Error("WEB proxy data before stream open");
        if (type === 3) {
          this.drop(id, closedError(), false);
          continue;
        }
        if (type === 4) {
          stream.sendCredit += payload.readUInt32BE();
          if (stream.sendCredit > protocol_1.WINDOW)
            throw new Error("WEB proxy send credit overflow");
          this.wake();
        } else {
          if (payload.length > stream.receiveCredit || stream.incoming.items >= 1024 || this.incoming + payload.length + (this.incomingItems + 1) * 256 > protocol_1.MAX_QUEUE)
            throw new Error("WEB proxy receive window exceeded");
          stream.receiveCredit -= payload.length;
          this.incoming += payload.length;
          this.incomingItems++;
          stream.incoming.push(Buffer.from(payload));
          stream.notify();
        }
      }
    }
    drop(id, error, sendClose) {
      const stream = this.streams.get(id);
      if (!stream)
        return;
      this.streams.delete(id);
      this.outgoing -= stream.outgoing.bytes;
      this.incoming -= stream.incoming.bytes;
      this.incomingItems -= stream.incoming.items;
      stream.end(error);
      this.tombstones.add(id);
      if (this.tombstones.size > 4096)
        this.tombstones.delete(this.tombstones.values().next().value);
      const lane = this.lanes.get(this.isLanes() ? id : 0);
      if (!this.closed && lane) {
        lane.frames = lane.frames.filter((data) => {
          if (data.readUIntBE(1, 3) !== id || data[0] === 1)
            return true;
          lane.bytes -= data.length;
          return false;
        });
        if (sendClose && stream.opened) {
          try {
            this.enqueue(lane, (0, protocol_1.frame)(3, id));
          } catch {}
        }
        if (this.mode === "websocket-lanes" && !sendClose)
          this.finishLane(lane);
      }
      if (!this.streams.size)
        this.close();
    }
    finishLane(lane) {
      lane.closed = true;
      lane.controller.abort();
      lane.frames = [];
      lane.bytes = 0;
      if (lane.socket) {
        lane.socket.onopen = lane.socket.onmessage = lane.socket.onclose = lane.socket.onerror = null;
        lane.socket.close();
      }
      this.lanes.delete(lane.id);
    }
    fail(error) {
      if (this.closed)
        return;
      this.closed = true;
      for (const stream of this.streams.values())
        stream.end(error);
      this.streams.clear();
      this.outgoing = 0;
      this.incoming = 0;
      this.incomingItems = 0;
      this.close();
    }
    close() {
      if (this.closeTask)
        return this.closeTask;
      this.closed = true;
      this.controller.abort();
      if (this.watchdog)
        clearInterval(this.watchdog);
      if (this.wsTimer)
        clearTimeout(this.wsTimer);
      for (const lane of this.lanes.values())
        this.finishLane(lane);
      for (const stream of this.streams.values())
        stream.end(closedError());
      this.streams.clear();
      this.tombstones.clear();
      const bearer = this.sessionToken;
      this.sessionToken = undefined;
      this.closeTask = (async () => {
        if (!bearer)
          return;
        const controller = new AbortController;
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
          const response = await fetch(this.config.base + "api/v1/session", {
            method: "DELETE",
            redirect: "error",
            credentials: "omit",
            headers: { Authorization: `Bearer ${bearer}` },
            signal: controller.signal
          });
          await response.body?.cancel();
        } catch {} finally {
          clearTimeout(timeout);
        }
      })();
      return this.closeTask;
    }
    async request(path2, method, bearer, body, headers = {}, limit = protocol_1.MAX_BATCH, signal) {
      const deadline = Date.now() + this.config.requestTimeoutMs;
      let attempts = 0;
      while (!this.closed && !signal?.aborted) {
        const controller = new AbortController;
        const abort = () => controller.abort();
        this.controller.signal.addEventListener("abort", abort, { once: true });
        signal?.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(abort, Math.max(1, deadline - Date.now()));
        let wait = Math.min(250 * 2 ** attempts, 5000);
        try {
          const response = await fetch(this.config.base + path2, {
            method,
            redirect: "error",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
            headers: { ...headers, ...bearer ? { Authorization: `Bearer ${bearer}` } : {}, ...body ? { "Content-Type": "application/octet-stream" } : {} },
            body: body ? new Uint8Array(body) : undefined
          });
          if (response.status === 503) {
            const retry = response.headers.get("Retry-After");
            if (retry) {
              const seconds = Number(retry);
              wait = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
            }
            if (!Number.isFinite(wait))
              wait = 1000;
            wait = Math.max(250, Math.min(wait, 30000));
            await response.body?.cancel();
          } else {
            const reader = response.body?.getReader();
            const chunks = [];
            let size = 0;
            if (reader) {
              try {
                while (true) {
                  const item = await reader.read();
                  if (item.done)
                    break;
                  size += item.value.byteLength;
                  if (size > limit || chunks.length >= 4096) {
                    controller.abort();
                    throw new Error("WEB proxy response exceeds limit");
                  }
                  chunks.push(Buffer.from(item.value));
                }
              } finally {
                reader.releaseLock();
              }
            }
            return { status: response.status, headers: response.headers, body: Buffer.concat(chunks, size) };
          }
        } catch {
          if (this.closed || signal?.aborted)
            throw closedError();
          if (++attempts >= 5)
            throw new Error("WEB proxy HTTP request failed");
        } finally {
          clearTimeout(timer);
          this.controller.signal.removeEventListener("abort", abort);
          signal?.removeEventListener("abort", abort);
        }
        if (Date.now() + wait >= deadline)
          throw new Error("WEB proxy HTTP retry deadline exceeded");
        await (0, promises_1.setTimeout)(wait, undefined, { signal: this.controller.signal });
      }
      throw closedError();
    }
  }

  class RelaySocket {
    constructor(transport) {
      this.transport = transport;
      this.incoming = new ByteQueue;
      this.outgoing = new ByteQueue;
      this.id = 0;
      this.closed = false;
      this.opened = false;
      this.sendCredit = protocol_1.WINDOW;
      this.receiveCredit = protocol_1.WINDOW;
      this.grant = 0;
      this.progress = Date.now();
      this.reading = false;
    }
    async connect(_port, _ip, _testServers) {
      if (this.closed || this.id)
        throw new Error("WEB proxy socket cannot be reused");
      await this.transport.open(this);
    }
    notify() {
      this.wakeRead?.();
      this.wakeRead = undefined;
    }
    end(error) {
      this.closed = true;
      this.error = error;
      this.incoming.clear();
      this.outgoing.clear();
      this.notify();
    }
    async read(n) {
      if (!Number.isSafeInteger(n) || n < 0)
        throw new RangeError("Invalid WEB proxy read size");
      if (this.reading)
        throw new Error("Concurrent WEB proxy reads are unsupported");
      this.reading = true;
      try {
        if (this.closed)
          throw this.error ?? closedError();
        if (!n)
          return Buffer.alloc(0);
        while (!this.incoming.bytes && !this.closed)
          await new Promise((resolve) => {
            this.wakeRead = resolve;
          });
        if (this.closed)
          throw this.error ?? closedError();
        const items = this.incoming.items;
        const data = this.incoming.take(n);
        this.transport.incoming -= data.length;
        this.transport.incomingItems -= items - this.incoming.items;
        this.grant += data.length;
        this.transport.wake();
        return data;
      } finally {
        this.reading = false;
      }
    }
    async readExactly(n) {
      if (!Number.isSafeInteger(n) || n < 0 || n > 64 * 1024 * 1024)
        throw new RangeError("Invalid WEB proxy read size");
      const out = Buffer.allocUnsafe(n);
      for (let offset = 0;offset < n; ) {
        const part = await this.read(n - offset);
        part.copy(out, offset);
        offset += part.length;
      }
      return out;
    }
    async readAll() {
      return this.read(protocol_1.MAX_QUEUE);
    }
    write(data) {
      if (this.closed || !this.opened)
        throw this.error ?? closedError();
      if (!data.length)
        return;
      if (this.outgoing.bytes + data.length > protocol_1.MAX_STREAM_QUEUE || this.outgoing.items >= 1024 || !this.transport.budget(data.length + 256)) {
        this.transport.drop(this.id, new Error("WEB proxy stream send queue exceeded"), true);
        throw closedError();
      }
      if (!this.outgoing.bytes)
        this.progress = Date.now();
      this.outgoing.push(Buffer.from(data));
      this.transport.outgoing += data.length;
      this.transport.wake();
    }
    async close() {
      if (!this.closed) {
        if (this.id)
          this.transport.drop(this.id, closedError(), true);
        else
          this.end(closedError());
      }
      if (!this.transport.streams.size)
        await this.transport.close();
    }
  }
  function createWebProxySocket(options) {
    const config = (0, protocol_1.configure)(options);
    let transport;

    class WebProxySocket extends RelaySocket {
      constructor() {
        if (!transport || transport.closed)
          transport = new RelayTransport(config);
        super(transport);
      }
    }
    return { socket: WebProxySocket, host: config.host, secret: config.secret };
  }
});

// node_modules/teleproto/network/connection/WebProxy.js
var require_WebProxy = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ConnectionWebProxy = exports2.createWebProxySocket = undefined;
  var TCPMTProxy_1 = require_TCPMTProxy();
  var transport_1 = require_transport();
  Object.defineProperty(exports2, "createWebProxySocket", { enumerable: true, get: function() {
    return transport_1.createWebProxySocket;
  } });

  class ConnectionWebProxy extends TCPMTProxy_1.ConnectionTCPMTProxyAbridged {
    async connect() {
      try {
        await super.connect();
      } catch (error) {
        await this.socket.close();
        throw error;
      }
    }
    async disconnect() {
      this._connected = false;
      await this.socket.close();
    }
  }
  exports2.ConnectionWebProxy = ConnectionWebProxy;
});

// node_modules/teleproto/network/connection/index.js
var require_connection = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ConnectionWebProxy = exports2.ConnectionTCPObfuscated = exports2.ConnectionTCPAbridged = exports2.ConnectionTCPFull = exports2.Connection = undefined;
  var Connection_1 = require_Connection();
  Object.defineProperty(exports2, "Connection", { enumerable: true, get: function() {
    return Connection_1.Connection;
  } });
  var TCPFull_1 = require_TCPFull();
  Object.defineProperty(exports2, "ConnectionTCPFull", { enumerable: true, get: function() {
    return TCPFull_1.ConnectionTCPFull;
  } });
  var TCPAbridged_1 = require_TCPAbridged();
  Object.defineProperty(exports2, "ConnectionTCPAbridged", { enumerable: true, get: function() {
    return TCPAbridged_1.ConnectionTCPAbridged;
  } });
  var TCPObfuscated_1 = require_TCPObfuscated();
  Object.defineProperty(exports2, "ConnectionTCPObfuscated", { enumerable: true, get: function() {
    return TCPObfuscated_1.ConnectionTCPObfuscated;
  } });
  var WebProxy_1 = require_WebProxy();
  Object.defineProperty(exports2, "ConnectionWebProxy", { enumerable: true, get: function() {
    return WebProxy_1.ConnectionWebProxy;
  } });
});

// node_modules/teleproto/sessions/Abstract.js
var require_Abstract = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Session = undefined;

  class Session {
    constructor() {
      this.__testServers = false;
    }
    get testServers() {
      return this.__testServers;
    }
    set testServers(value) {
      this.__testServers = value;
    }
  }
  exports2.Session = Session;
});

// stub:mime-stub
var require_mime_stub = __commonJS((exports2) => {
  var M = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", heic: "image/heic", tif: "image/tiff", tiff: "image/tiff", svg: "image/svg+xml", mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", wav: "audio/wav", flac: "audio/x-flac", aac: "audio/x-aac", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo", pdf: "application/pdf", zip: "application/zip", json: "application/json", txt: "text/plain", md: "text/markdown", csv: "text/csv", html: "text/html", xml: "application/xml", rtf: "application/rtf", doc: "application/msword", xls: "application/vnd.ms-excel", ppt: "application/vnd.ms-powerpoint", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet", odp: "application/vnd.oasis.opendocument.presentation", epub: "application/epub+zip", gz: "application/gzip", "7z": "application/x-7z-compressed", rar: "application/vnd.rar", apk: "application/vnd.android.package-archive" };
  var E = {};
  for (const k in M)
    if (!(M[k] in E))
      E[M[k]] = k;
  exports2.default = exports2;
  exports2.getType = function(p) {
    var m = /\.([^./\\]+)$/.exec(String(p).toLowerCase());
    return m && M[m[1]] || null;
  };
  exports2.getExtension = function(t) {
    var k = String(t || "").split(";")[0].trim().toLowerCase();
    return E[k] || null;
  };
});

// node_modules/teleproto/Utils.js
var require_Utils = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getFileInfo = getFileInfo;
  exports2.chunks = chunks;
  exports2.getInputPeer = getInputPeer;
  exports2._photoSizeByteCount = _photoSizeByteCount;
  exports2._getEntityPair = _getEntityPair;
  exports2.getInnerText = getInnerText;
  exports2.getInputChannel = getInputChannel;
  exports2.getInputUser = getInputUser;
  exports2.getInputMessage = getInputMessage;
  exports2.getInputChatPhoto = getInputChatPhoto;
  exports2.strippedPhotoToJpg = strippedPhotoToJpg;
  exports2.getInputPhoto = getInputPhoto;
  exports2.getInputDocument = getInputDocument;
  exports2.isAudio = isAudio;
  exports2.isImage = isImage;
  exports2.getExtension = getExtension;
  exports2.getAttributes = getAttributes;
  exports2.getInputGeo = getInputGeo;
  exports2.getInputMedia = getInputMedia;
  exports2.getAppropriatedPartSize = getAppropriatedPartSize;
  exports2.getPeer = getPeer;
  exports2.getPeerId = getPeerId;
  exports2.resolveId = resolveId;
  exports2.getMessageId = getMessageId;
  exports2.parsePhone = parsePhone;
  exports2.parseID = parseID;
  exports2.resolveInviteLink = resolveInviteLink;
  exports2.parseUsername = parseUsername;
  exports2.rtrim = rtrim;
  exports2.getDisplayName = getDisplayName;
  exports2.isGif = isGif;
  exports2.encodeWaveform = encodeWaveform;
  exports2.decodeWaveform = decodeWaveform;
  exports2.splitText = splitText;
  exports2.getInputDialog = getInputDialog;
  exports2.resolveBotFileId = resolveBotFileId;
  exports2.packBotFileId = packBotFileId;
  var big_integer_1 = __importDefault(require_BigInteger());
  var mime_1 = __importDefault(require_mime_stub());
  var Helpers_1 = require_Helpers();
  var api_1 = require_api2();
  function getFileInfo(fileLocation) {
    if (!fileLocation || !fileLocation.SUBCLASS_OF_ID) {
      _raiseCastFail(fileLocation, "InputFileLocation");
    }
    if (fileLocation.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputFileLocation")) {
      return {
        dcId: undefined,
        location: fileLocation,
        size: undefined
      };
    }
    let location = fileLocation;
    if (location instanceof api_1.Api.Message) {
      location = location.media;
    }
    if (location instanceof api_1.Api.MessageMediaDocument) {
      location = location.document;
    } else if (location instanceof api_1.Api.MessageMediaPhoto) {
      location = location.photo;
    }
    if (location instanceof api_1.Api.Document) {
      return {
        dcId: location.dcId,
        location: new api_1.Api.InputDocumentFileLocation({
          id: location.id,
          accessHash: location.accessHash,
          fileReference: location.fileReference,
          thumbSize: ""
        }),
        size: location.size
      };
    } else if (location instanceof api_1.Api.Photo) {
      return {
        dcId: location.dcId,
        location: new api_1.Api.InputPhotoFileLocation({
          id: location.id,
          accessHash: location.accessHash,
          fileReference: location.fileReference,
          thumbSize: location.sizes[location.sizes.length - 1].type
        }),
        size: (0, big_integer_1.default)(_photoSizeByteCount(location.sizes[location.sizes.length - 1]) || 0)
      };
    }
    _raiseCastFail(fileLocation, "InputFileLocation");
  }
  function* chunks(arr, size = 100) {
    for (let i = 0;i < arr.length; i += size) {
      yield arr.slice(i, i + size);
    }
  }
  var USERNAME_RE = new RegExp("@|(?:https?:\\/\\/)?(?:www\\.)?" + "(?:telegram\\.(?:me|dog)|t\\.me)\\/(@|joinchat\\/)?", "i");
  var JPEG_HEADER = Buffer.from("ffd8ffe000104a46494600010100000100010000ffdb004300281c1e231e19282321232d2b28303c64413c37373c7b585d4964918099968f808c8aa0b4e6c3a0aadaad8a8cc8ffcbdaeef5ffffff9bc1fffffffaffe6fdfff8ffdb0043012b2d2d3c353c76414176f8a58ca5f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8ffc00011080000000003012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00", "hex");
  var JPEG_FOOTER = Buffer.from("ffd9", "hex");
  var TG_JOIN_RE = new RegExp("tg:\\/\\/(join)\\?invite=", "i");
  var VALID_USERNAME_RE = new RegExp("^([a-z]((?!__)[\\w\\d]){2,30}[a-z\\d]|gif|vid|" + "pic|bing|wiki|imdb|bold|vote|like|coub)$", "i");
  function _raiseCastFail(entity, target) {
    let toWrite = entity;
    if (typeof entity === "object" && "className" in entity) {
      toWrite = entity.className;
    }
    throw new Error(`Cannot cast ${toWrite} to any kind of ${target}`);
  }
  function getInputPeer(entity, allowSelf = true, checkHash = true) {
    if (entity.SUBCLASS_OF_ID === undefined) {
      if (allowSelf && "inputEntity" in entity) {
        return entity.inputEntity;
      } else if ("entity" in entity) {
        return getInputPeer(entity.entity);
      } else {
        _raiseCastFail(entity, "InputPeer");
      }
    }
    if (entity.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputPeer")) {
      return entity;
    }
    if (entity instanceof api_1.Api.User) {
      if (entity.self && allowSelf) {
        return new api_1.Api.InputPeerSelf;
      } else if (entity.accessHash !== undefined && !entity.min || !checkHash) {
        return new api_1.Api.InputPeerUser({
          userId: entity.id,
          accessHash: entity.accessHash || (0, big_integer_1.default)(0)
        });
      } else {
        throw new Error("User without accessHash or min cannot be input");
      }
    }
    if (entity instanceof api_1.Api.Chat || entity instanceof api_1.Api.ChatEmpty || entity instanceof api_1.Api.ChatForbidden) {
      return new api_1.Api.InputPeerChat({ chatId: entity.id });
    }
    if (entity instanceof api_1.Api.Channel || entity instanceof api_1.Api.Community) {
      if (entity.accessHash !== undefined && !entity.min || !checkHash) {
        return new api_1.Api.InputPeerChannel({
          channelId: entity.id,
          accessHash: entity.accessHash || (0, big_integer_1.default)(0)
        });
      } else {
        throw new TypeError("Channel without accessHash or min info cannot be input");
      }
    }
    if (entity instanceof api_1.Api.ChannelForbidden || entity instanceof api_1.Api.CommunityForbidden) {
      return new api_1.Api.InputPeerChannel({
        channelId: entity.id,
        accessHash: entity.accessHash || (0, big_integer_1.default)(0)
      });
    }
    if (entity instanceof api_1.Api.InputUser) {
      return new api_1.Api.InputPeerUser({
        userId: entity.userId,
        accessHash: entity.accessHash
      });
    }
    if (entity instanceof api_1.Api.InputChannel) {
      return new api_1.Api.InputPeerChannel({
        channelId: entity.channelId,
        accessHash: entity.accessHash
      });
    }
    if (entity instanceof api_1.Api.UserEmpty) {
      return new api_1.Api.InputPeerEmpty;
    }
    if (entity instanceof api_1.Api.UserFull) {
      return getInputPeer(entity.id);
    }
    if (entity instanceof api_1.Api.ChatFull) {
      return new api_1.Api.InputPeerChat({ chatId: entity.id });
    }
    if (entity instanceof api_1.Api.PeerChat) {
      return new api_1.Api.InputPeerChat({
        chatId: entity.chatId
      });
    }
    _raiseCastFail(entity, "InputPeer");
  }
  function _photoSizeByteCount(size) {
    if (size instanceof api_1.Api.PhotoSize) {
      return size.size;
    } else if (size instanceof api_1.Api.PhotoStrippedSize) {
      if (size.bytes.length < 3 || size.bytes[0] != 1) {
        return size.bytes.length;
      }
      return size.bytes.length + 622;
    } else if (size instanceof api_1.Api.PhotoCachedSize) {
      return size.bytes.length;
    } else if (size instanceof api_1.Api.PhotoSizeEmpty) {
      return 0;
    } else if (size instanceof api_1.Api.PhotoSizeProgressive) {
      return size.sizes[size.sizes.length - 1];
    } else {
      return;
    }
  }
  function _getEntityPair(entityId, entities, cache, getInputPeerFunction = getInputPeer) {
    const entity = entities.get(entityId);
    let inputEntity;
    try {
      inputEntity = cache.get(entityId);
    } catch (e) {
      try {
        inputEntity = getInputPeerFunction(entity);
      } catch (e2) {}
    }
    return [entity, inputEntity];
  }
  function getInnerText(text, entities) {
    const result = [];
    entities.forEach(function(value, key) {
      const start = value.offset;
      const end = value.offset + value.length;
      result.push(text.slice(start, end));
    });
    return result;
  }
  function getInputChannel(entity) {
    if (typeof entity === "string" || typeof entity == "number" || typeof entity == "bigint" || big_integer_1.default.isInstance(entity)) {
      _raiseCastFail(entity, "InputChannel");
    }
    if (entity.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(entity, "InputChannel");
    }
    if (entity.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputChannel")) {
      return entity;
    }
    if (entity instanceof api_1.Api.Channel || entity instanceof api_1.Api.ChannelForbidden || entity instanceof api_1.Api.Community || entity instanceof api_1.Api.CommunityForbidden) {
      return new api_1.Api.InputChannel({
        channelId: entity.id,
        accessHash: entity.accessHash || big_integer_1.default.zero
      });
    }
    if (entity instanceof api_1.Api.InputPeerChannel) {
      return new api_1.Api.InputChannel({
        channelId: entity.channelId,
        accessHash: entity.accessHash
      });
    }
    if (entity instanceof api_1.Api.InputPeerChannelFromMessage) {
      return new api_1.Api.InputChannelFromMessage({
        peer: entity.peer,
        msgId: entity.msgId,
        channelId: entity.channelId
      });
    }
    _raiseCastFail(entity, "InputChannel");
  }
  function getInputUser(entity) {
    if (typeof entity === "string" || typeof entity == "number" || typeof entity == "bigint" || big_integer_1.default.isInstance(entity)) {
      _raiseCastFail(entity, "InputUser");
    }
    if (entity.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(entity, "InputUser");
    }
    if (entity.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputUser")) {
      return entity;
    }
    if (entity instanceof api_1.Api.User) {
      if (entity.self) {
        return new api_1.Api.InputUserSelf;
      } else {
        return new api_1.Api.InputUser({
          userId: entity.id,
          accessHash: entity.accessHash || big_integer_1.default.zero
        });
      }
    }
    if (entity instanceof api_1.Api.InputPeerSelf) {
      return new api_1.Api.InputUserSelf;
    }
    if (entity instanceof api_1.Api.UserEmpty || entity instanceof api_1.Api.InputPeerEmpty) {
      return new api_1.Api.InputUserEmpty;
    }
    if (entity instanceof api_1.Api.UserFull) {
      return getInputUser(entity);
    }
    if (entity instanceof api_1.Api.InputPeerUser) {
      return new api_1.Api.InputUser({
        userId: entity.userId,
        accessHash: entity.accessHash
      });
    }
    if (entity instanceof api_1.Api.InputPeerUserFromMessage) {
      return new api_1.Api.InputUserFromMessage({
        userId: entity.userId,
        peer: entity.peer,
        msgId: entity.msgId
      });
    }
    _raiseCastFail(entity, "InputUser");
  }
  function getInputMessage(message) {
    if (typeof message === "number") {
      return new api_1.Api.InputMessageID({ id: message });
    }
    if (message === undefined || message.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(message, "InputMessage");
    }
    if (message.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputMessage")) {
      return message;
    } else if (message.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("Message")) {
      return new api_1.Api.InputMessageID({ id: message.id });
    }
    _raiseCastFail(message, "InputMessage");
  }
  function getInputChatPhoto(photo) {
    if (photo === undefined || photo.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(photo, "InputChatPhoto");
    }
    if (photo.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputChatPhoto")) {
      return photo;
    } else if (photo.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputFile")) {
      return new api_1.Api.InputChatUploadedPhoto({
        file: photo
      });
    }
    photo = getInputPhoto(photo);
    if (photo instanceof api_1.Api.InputPhoto) {
      return new api_1.Api.InputChatPhoto({
        id: photo
      });
    } else if (photo instanceof api_1.Api.InputPhotoEmpty) {
      return new api_1.Api.InputChatPhotoEmpty;
    }
    _raiseCastFail(photo, "InputChatPhoto");
  }
  function strippedPhotoToJpg(stripped) {
    if (stripped.length < 3 || stripped[0] !== 1) {
      return stripped;
    }
    const header = Buffer.from(JPEG_HEADER);
    header[164] = stripped[1];
    header[166] = stripped[2];
    return Buffer.concat([header, stripped.slice(3), JPEG_FOOTER]);
  }
  function getInputPhoto(photo) {
    if (photo.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(photo, "InputPhoto");
    }
    if (photo.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputPhoto")) {
      return photo;
    }
    if (photo instanceof api_1.Api.Message) {
      photo = photo.media;
    }
    if (photo instanceof api_1.Api.photos.Photo || photo instanceof api_1.Api.MessageMediaPhoto) {
      photo = photo.photo;
    }
    if (photo instanceof api_1.Api.Photo) {
      return new api_1.Api.InputPhoto({
        id: photo.id,
        accessHash: photo.accessHash,
        fileReference: photo.fileReference
      });
    }
    if (photo instanceof api_1.Api.PhotoEmpty) {
      return new api_1.Api.InputPhotoEmpty;
    }
    if (photo instanceof api_1.Api.messages.ChatFull) {
      photo = photo.fullChat;
    }
    if (photo instanceof api_1.Api.ChannelFull) {
      return getInputPhoto(photo.chatPhoto);
    } else {
      if (photo instanceof api_1.Api.UserFull) {
        return getInputPhoto(photo.profilePhoto);
      } else {
        if (photo instanceof api_1.Api.Channel || photo instanceof api_1.Api.Chat || photo instanceof api_1.Api.User || photo instanceof api_1.Api.Community) {
          return getInputPhoto(photo.photo);
        }
      }
    }
    if (photo instanceof api_1.Api.UserEmpty || photo instanceof api_1.Api.ChatEmpty || photo instanceof api_1.Api.ChatForbidden || photo instanceof api_1.Api.ChannelForbidden || photo instanceof api_1.Api.CommunityForbidden) {
      return new api_1.Api.InputPhotoEmpty;
    }
    _raiseCastFail(photo, "InputPhoto");
  }
  function getInputDocument(document) {
    if (document.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(document, "InputDocument");
    }
    if (document.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputDocument")) {
      return document;
    }
    if (document instanceof api_1.Api.Document) {
      return new api_1.Api.InputDocument({
        id: document.id,
        accessHash: document.accessHash,
        fileReference: document.fileReference
      });
    }
    if (document instanceof api_1.Api.DocumentEmpty) {
      return new api_1.Api.InputDocumentEmpty;
    }
    if (document instanceof api_1.Api.MessageMediaDocument) {
      return getInputDocument(document.document);
    }
    if (document instanceof api_1.Api.Message) {
      return getInputDocument(document.media);
    }
    _raiseCastFail(document, "InputDocument");
  }
  function isAudio(file) {
    const ext = _getExtension(file);
    if (!ext) {
      const metadata = _getMetadata(file);
      return (metadata.get("mimeType") || "").startsWith("audio/");
    } else {
      file = "a" + ext;
      return (mime_1.default.getType(file) || "").startsWith("audio/");
    }
  }
  function isImage(file) {
    const ext = _getExtension(file).toLowerCase();
    return ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg");
  }
  function getExtension(media) {
    try {
      getInputPhoto(media);
      return ".jpg";
    } catch (e) {}
    if (media instanceof api_1.Api.UserProfilePhoto || media instanceof api_1.Api.ChatPhoto) {
      return ".jpg";
    }
    if (media instanceof api_1.Api.MessageMediaDocument) {
      media = media.document;
    }
    if (media instanceof api_1.Api.Document || media instanceof api_1.Api.WebDocument || media instanceof api_1.Api.WebDocumentNoProxy) {
      if (media.mimeType === "application/octet-stream") {
        return "";
      } else {
        return mime_1.default.getExtension(media.mimeType) || "";
      }
    }
    return "";
  }
  function _getExtension(file) {
    if (typeof file === "string") {
      return "." + file.split(".").pop();
    } else if ("name" in file) {
      return _getExtension(file.name);
    } else {
      return getExtension(file);
    }
  }
  function _getMetadata(file) {
    return new Map;
  }
  function isVideo(file) {
    const ext = _getExtension(file);
    if (!ext) {
      const metadata = _getMetadata(file);
      if (metadata.has("mimeType")) {
        return metadata.get("mimeType")?.startsWith("video/") || false;
      } else {
        return false;
      }
    } else {
      file = "a" + ext;
      return (mime_1.default.getType(file) || "").startsWith("video/");
    }
  }
  function getAttributes(file, { attributes = null, mimeType = undefined, forceDocument = false, voiceNote = false, videoNote = false, supportsStreaming = false, thumb = null }) {
    const name = typeof file == "string" ? file : ("name" in file) ? file.name || "unnamed" : "unnamed";
    if (mimeType === undefined) {
      mimeType = mime_1.default.getType(name) || "application/octet-stream";
    }
    const attrObj = new Map;
    attrObj.set(api_1.Api.DocumentAttributeFilename, new api_1.Api.DocumentAttributeFilename({
      fileName: name.split(/[\\/]/).pop() || ""
    }));
    if (isAudio(file)) {
      const m = _getMetadata(file);
      attrObj.set(api_1.Api.DocumentAttributeAudio, new api_1.Api.DocumentAttributeAudio({
        voice: voiceNote,
        title: m.has("title") ? m.get("title") : undefined,
        performer: m.has("author") ? m.get("author") : undefined,
        duration: Number.parseInt(m.get("duration") ?? "0")
      }));
    }
    if (!forceDocument && isVideo(file)) {
      let doc;
      if (thumb) {
        const t_m = _getMetadata(thumb);
        const width = Number.parseInt(t_m?.get("width") || "1");
        const height = Number.parseInt(t_m?.get("height") || "1");
        doc = new api_1.Api.DocumentAttributeVideo({
          duration: 0,
          h: height,
          w: width,
          roundMessage: videoNote,
          supportsStreaming
        });
      } else {
        const m = _getMetadata(file);
        doc = new api_1.Api.DocumentAttributeVideo({
          roundMessage: videoNote,
          w: Number.parseInt(m.get("width") ?? "1"),
          h: Number.parseInt(m.get("height") ?? "1"),
          duration: Number.parseInt(m.get("duration") ?? "0"),
          supportsStreaming
        });
      }
      attrObj.set(api_1.Api.DocumentAttributeVideo, doc);
    }
    if (videoNote) {
      if (attrObj.has(api_1.Api.DocumentAttributeAudio)) {
        attrObj.get(api_1.Api.DocumentAttributeAudio).voice = true;
      } else {
        attrObj.set(api_1.Api.DocumentAttributeAudio, new api_1.Api.DocumentAttributeAudio({
          duration: 0,
          voice: true
        }));
      }
    }
    if (attributes) {
      for (const a of attributes) {
        attrObj.set(a.constructor, a);
      }
    }
    return {
      attrs: Array.from(attrObj.values()),
      mimeType
    };
  }
  function getInputGeo(geo) {
    if (geo === undefined || geo.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(geo, "InputGeoPoint");
    }
    if (geo.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputGeoPoint")) {
      return geo;
    }
    if (geo instanceof api_1.Api.GeoPoint) {
      return new api_1.Api.InputGeoPoint({ lat: geo.lat, long: geo.long });
    }
    if (geo instanceof api_1.Api.GeoPointEmpty) {
      return new api_1.Api.InputGeoPointEmpty;
    }
    if (geo instanceof api_1.Api.MessageMediaGeo) {
      return getInputGeo(geo.geo);
    }
    if (geo instanceof api_1.Api.Message) {
      return getInputGeo(geo.media);
    }
    _raiseCastFail(geo, "InputGeoPoint");
  }
  function getInputMedia(media, { isPhoto = false, attributes = undefined, forceDocument = false, voiceNote = false, videoNote = false, supportsStreaming = false, spoiler = undefined, ttlSeconds = undefined, videoCover = undefined, videoTimestamp = undefined, nosoundVideo = undefined } = {}) {
    if (media.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(media, "InputMedia");
    }
    if (media.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputMedia")) {
      return media;
    } else {
      if (media.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputPhoto")) {
        return new api_1.Api.InputMediaPhoto({
          id: media,
          spoiler,
          ttlSeconds
        });
      } else {
        if (media.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputDocument")) {
          return new api_1.Api.InputMediaDocument({
            id: media,
            spoiler,
            ttlSeconds,
            videoCover,
            videoTimestamp
          });
        }
      }
    }
    if (media instanceof api_1.Api.MessageMediaPhoto) {
      return new api_1.Api.InputMediaPhoto({
        id: getInputPhoto(media.photo),
        spoiler,
        ttlSeconds: ttlSeconds ?? media.ttlSeconds
      });
    }
    if (media instanceof api_1.Api.Photo || media instanceof api_1.Api.photos.Photo || media instanceof api_1.Api.PhotoEmpty) {
      return new api_1.Api.InputMediaPhoto({
        id: getInputPhoto(media),
        spoiler,
        ttlSeconds
      });
    }
    if (media instanceof api_1.Api.MessageMediaDocument) {
      return new api_1.Api.InputMediaDocument({
        id: getInputDocument(media.document),
        spoiler,
        ttlSeconds: ttlSeconds ?? media.ttlSeconds,
        videoCover,
        videoTimestamp
      });
    }
    if (media instanceof api_1.Api.Document || media instanceof api_1.Api.DocumentEmpty) {
      return new api_1.Api.InputMediaDocument({
        id: getInputDocument(media),
        spoiler,
        ttlSeconds,
        videoCover,
        videoTimestamp
      });
    }
    if (media instanceof api_1.Api.InputFile || media instanceof api_1.Api.InputFileBig) {
      if (isPhoto) {
        return new api_1.Api.InputMediaUploadedPhoto({
          file: media,
          spoiler,
          ttlSeconds
        });
      } else {
        const { attrs, mimeType } = getAttributes(media, {
          attributes,
          forceDocument,
          voiceNote,
          videoNote,
          supportsStreaming
        });
        return new api_1.Api.InputMediaUploadedDocument({
          file: media,
          mimeType,
          attributes: attrs,
          forceFile: forceDocument,
          spoiler,
          ttlSeconds,
          videoCover,
          videoTimestamp,
          nosoundVideo
        });
      }
    }
    if (media instanceof api_1.Api.MessageMediaGame) {
      return new api_1.Api.InputMediaGame({
        id: new api_1.Api.InputGameID({
          id: media.game.id,
          accessHash: media.game.accessHash
        })
      });
    }
    if (media instanceof api_1.Api.MessageMediaContact) {
      return new api_1.Api.InputMediaContact({
        phoneNumber: media.phoneNumber,
        firstName: media.firstName,
        lastName: media.lastName,
        vcard: ""
      });
    }
    if (media instanceof api_1.Api.MessageMediaGeo) {
      return new api_1.Api.InputMediaGeoPoint({ geoPoint: getInputGeo(media.geo) });
    }
    if (media instanceof api_1.Api.MessageMediaVenue) {
      return new api_1.Api.InputMediaVenue({
        geoPoint: getInputGeo(media.geo),
        title: media.title,
        address: media.address,
        provider: media.provider,
        venueId: media.venueId,
        venueType: ""
      });
    }
    if (media instanceof api_1.Api.MessageMediaDice) {
      return new api_1.Api.InputMediaDice({
        emoticon: media.emoticon
      });
    }
    if (media instanceof api_1.Api.MessageMediaEmpty || media instanceof api_1.Api.MessageMediaUnsupported || media instanceof api_1.Api.ChatPhotoEmpty || media instanceof api_1.Api.UserProfilePhotoEmpty || media instanceof api_1.Api.ChatPhoto || media instanceof api_1.Api.UserProfilePhoto) {
      return new api_1.Api.InputMediaEmpty;
    }
    if (media instanceof api_1.Api.Message) {
      return getInputMedia(media.media, { isPhoto });
    }
    if (media instanceof api_1.Api.MessageMediaPoll) {
      let correctAnswers;
      if (media.poll.quiz) {
        if (!media.results.results) {
          throw new Error("Cannot cast unanswered quiz to any kind of InputMedia.");
        }
        correctAnswers = [];
        for (const r of media.results.results) {
          if (r.correct) {
            correctAnswers.push(r.option);
          }
        }
      } else {
        correctAnswers = undefined;
      }
      const pollWithInputAnswers = new api_1.Api.Poll({
        id: media.poll.id,
        question: media.poll.question,
        answers: media.poll.answers.map((a) => {
          if (!(a instanceof api_1.Api.PollAnswer))
            return a;
          return new api_1.Api.PollAnswer({
            text: a.text,
            option: a.option,
            media: a.media ? getInputMedia(a.media) : undefined,
            addedBy: a.addedBy,
            date: a.date
          });
        }),
        closed: media.poll.closed,
        publicVoters: media.poll.publicVoters,
        multipleChoice: media.poll.multipleChoice,
        quiz: media.poll.quiz,
        openAnswers: media.poll.openAnswers,
        revotingDisabled: media.poll.revotingDisabled,
        shuffleAnswers: media.poll.shuffleAnswers,
        hideResultsUntilClose: media.poll.hideResultsUntilClose,
        creator: media.poll.creator,
        closePeriod: media.poll.closePeriod,
        closeDate: media.poll.closeDate,
        hash: media.poll.hash
      });
      return new api_1.Api.InputMediaPoll({
        poll: pollWithInputAnswers,
        correctAnswers,
        solution: media.results.solution,
        solutionEntities: media.results.solutionEntities,
        attachedMedia: media.attachedMedia ? getInputMedia(media.attachedMedia) : undefined,
        solutionMedia: media.results.solutionMedia ? getInputMedia(media.results.solutionMedia) : undefined
      });
    }
    if (media instanceof api_1.Api.Poll) {
      return new api_1.Api.InputMediaPoll({
        poll: media
      });
    }
    _raiseCastFail(media, "InputMedia");
  }
  function getAppropriatedPartSize(fileSize) {
    if (fileSize.lesser(104857600)) {
      return 128;
    }
    if (fileSize.lesser(786432000)) {
      return 256;
    }
    return 512;
  }
  function getPeer(peer) {
    if (!peer) {
      _raiseCastFail(peer, "undefined");
    }
    if (typeof peer === "string") {
      _raiseCastFail(peer, "peer");
    }
    if (typeof peer == "number" || typeof peer == "bigint") {
      peer = (0, Helpers_1.returnBigInt)(peer);
    }
    try {
      if (big_integer_1.default.isInstance(peer)) {
        const res = resolveId(peer);
        if (res[1] === api_1.Api.PeerChannel) {
          return new api_1.Api.PeerChannel({ channelId: res[0] });
        } else if (res[1] === api_1.Api.PeerChat) {
          return new api_1.Api.PeerChat({ chatId: res[0] });
        } else {
          return new api_1.Api.PeerUser({ userId: res[0] });
        }
      }
      if (peer.SUBCLASS_OF_ID === undefined) {
        throw new Error;
      }
      if (peer.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("Peer")) {
        return peer;
      } else if (peer instanceof api_1.Api.contacts.ResolvedPeer || peer instanceof api_1.Api.InputNotifyPeer || peer instanceof api_1.Api.TopPeer || peer instanceof api_1.Api.Dialog || peer instanceof api_1.Api.DialogPeer) {
        return peer.peer;
      } else if (peer instanceof api_1.Api.ChannelFull || peer instanceof api_1.Api.CommunityFull) {
        return new api_1.Api.PeerChannel({ channelId: peer.id });
      } else if (peer instanceof api_1.Api.DialogCommunity || peer instanceof api_1.Api.DialogPeerCommunity || peer instanceof api_1.Api.NotifyCommunity) {
        return new api_1.Api.PeerChannel({ channelId: peer.communityId });
      } else if (peer instanceof api_1.Api.InputDialogPeerCommunity || peer instanceof api_1.Api.InputNotifyCommunity) {
        return getPeer(peer.community);
      }
      if (peer.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("ChatParticipant") || peer.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("ChannelParticipant")) {
        if ("userId" in peer) {
          return new api_1.Api.PeerUser({ userId: peer.userId });
        }
      }
      peer = getInputPeer(peer, false, false);
      if (peer instanceof api_1.Api.InputPeerUser) {
        return new api_1.Api.PeerUser({ userId: peer.userId });
      } else if (peer instanceof api_1.Api.InputPeerChat) {
        return new api_1.Api.PeerChat({ chatId: peer.chatId });
      } else if (peer instanceof api_1.Api.InputPeerChannel) {
        return new api_1.Api.PeerChannel({ channelId: peer.channelId });
      }
    } catch (e) {}
    _raiseCastFail(peer, "peer");
  }
  function getPeerId(peer, addMark = true) {
    if (typeof peer == "string" && parseID(peer)) {
      peer = (0, Helpers_1.returnBigInt)(peer);
    }
    if (big_integer_1.default.isInstance(peer)) {
      return addMark ? peer.toString() : resolveId(peer)[0].toString();
    }
    if (peer instanceof api_1.Api.InputPeerSelf) {
      _raiseCastFail(peer, "int (you might want to use client.get_peer_id)");
    }
    try {
      peer = getPeer(peer);
    } catch (e) {
      _raiseCastFail(peer, "int");
    }
    if (peer instanceof api_1.Api.PeerUser) {
      return peer.userId.toString();
    } else if (peer instanceof api_1.Api.PeerChat) {
      peer.chatId = resolveId((0, Helpers_1.returnBigInt)(peer.chatId))[0];
      return addMark ? peer.chatId.negate().toString() : peer.chatId.toString();
    } else if (typeof peer == "object" && "channelId" in peer) {
      peer.channelId = resolveId((0, Helpers_1.returnBigInt)(peer.channelId))[0];
      if (!addMark) {
        return peer.channelId.toString();
      }
      return "-100" + peer.channelId.toString();
    }
    _raiseCastFail(peer, "int");
  }
  function resolveId(markedId) {
    if (markedId.greaterOrEquals(big_integer_1.default.zero)) {
      return [markedId, api_1.Api.PeerUser];
    }
    const m = markedId.toString().match(/-100([^0]\d*)/);
    if (m) {
      return [(0, big_integer_1.default)(m[1]), api_1.Api.PeerChannel];
    }
    return [markedId.negate(), api_1.Api.PeerChat];
  }
  function getMessageId(message) {
    if (!message) {
      return;
    } else if (typeof message === "number") {
      return message;
    } else if (message.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("Message") || "id" in message) {
      return message.id;
    } else {
      throw new Error(`Invalid message type: ${message.constructor.name}`);
    }
  }
  function parsePhone(phone) {
    phone = phone.toString().replace(/[()\s-]/gm, "");
    if (phone.startsWith("+") && phone.split("+").length - 1 == 1) {
      return !isNaN(Number(phone)) ? phone.replace("+", "") : undefined;
    }
  }
  function parseID(id) {
    const isValid = /^(-?[0-9][0-9]*)$/.test(id);
    return isValid ? (0, big_integer_1.default)(id) : undefined;
  }
  function resolveInviteLink(link) {
    if (!link) {
      return;
    }
    link = link.trim();
    const tmeMatch = link.match(/(?:https?:\/\/)?(?:www\.)?(?:telegram\.(?:me|dog)|t\.me)\/(?:joinchat\/|\+)([a-zA-Z0-9_-]+)/i);
    if (tmeMatch) {
      return tmeMatch[1];
    }
    const tgMatch = link.match(/tg:\/\/join\?invite=([a-zA-Z0-9_-]+)/i);
    if (tgMatch) {
      return tgMatch[1];
    }
    return;
  }
  function parseUsername(username) {
    username = username.trim();
    const m = username.match(USERNAME_RE) || username.match(TG_JOIN_RE);
    if (m) {
      username = username.replace(m[0], "");
      if (m[1]) {
        return {
          username,
          isInvite: true
        };
      } else {
        username = rtrim(username, "/");
      }
    }
    if (username.match(VALID_USERNAME_RE)) {
      return {
        username: username.toLowerCase(),
        isInvite: false
      };
    } else {
      return {
        username: undefined,
        isInvite: false
      };
    }
  }
  function rtrim(s, mask) {
    while (~mask.indexOf(s[s.length - 1])) {
      s = s.slice(0, -1);
    }
    return s;
  }
  function getDisplayName(entity) {
    if (entity instanceof api_1.Api.User) {
      if (entity.lastName && entity.firstName) {
        return `${entity.firstName} ${entity.lastName}`;
      } else if (entity.firstName) {
        return entity.firstName;
      } else if (entity.lastName) {
        return entity.lastName;
      } else {
        return "";
      }
    } else if (entity instanceof api_1.Api.Chat || entity instanceof api_1.Api.Channel || entity instanceof api_1.Api.Community || entity instanceof api_1.Api.CommunityForbidden) {
      return entity.title;
    }
    return "";
  }
  function isGif(file) {
    const ext = _getExtension(file).toLowerCase();
    if (ext === ".gif") {
      return true;
    }
    const metadata = _getMetadata(file);
    return (metadata.get("mimeType") || "") === "image/gif";
  }
  function encodeWaveform(waveform) {
    const bitCount = waveform.length * 5;
    const byteCount = Math.floor((bitCount + 7) / 8);
    const result = Buffer.alloc(byteCount);
    let bitPos = 0;
    for (const value of waveform) {
      const bytePos = Math.floor(bitPos / 8);
      const shift = bitPos % 8;
      result[bytePos] |= (value & 31) << shift;
      if (shift > 3 && bytePos + 1 < byteCount) {
        result[bytePos + 1] |= (value & 31) >> 8 - shift;
      }
      bitPos += 5;
    }
    return result;
  }
  function decodeWaveform(waveform, valueCount) {
    if (!waveform || waveform.length === 0) {
      return [];
    }
    const bitCount = waveform.length * 8;
    const count = valueCount ?? Math.floor(bitCount / 5);
    const result = [];
    let bitPos = 0;
    for (let i = 0;i < count; i++) {
      const bytePos = Math.floor(bitPos / 8);
      const shift = bitPos % 8;
      let value = waveform[bytePos] >> shift & 31;
      if (shift > 3 && bytePos + 1 < waveform.length) {
        value |= waveform[bytePos + 1] << 8 - shift & 31;
      }
      result.push(value);
      bitPos += 5;
    }
    return result;
  }
  function splitText(text, entities = [], limit = 4096) {
    if (text.length <= limit) {
      return [[text, entities]];
    }
    const result = [];
    let offset = 0;
    while (offset < text.length) {
      let end = Math.min(offset + limit, text.length);
      if (end < text.length) {
        const newlinePos = text.lastIndexOf(`
`, end);
        const spacePos = text.lastIndexOf(" ", end);
        if (newlinePos > offset + limit / 2) {
          end = newlinePos + 1;
        } else if (spacePos > offset + limit / 2) {
          end = spacePos + 1;
        }
      }
      const chunk = text.slice(offset, end);
      const chunkEntities = [];
      for (const entity of entities) {
        const entityEnd = entity.offset + entity.length;
        if (entityEnd <= offset) {
          continue;
        }
        if (entity.offset >= end) {
          continue;
        }
        const newOffset = Math.max(0, entity.offset - offset);
        const newLength = Math.min(entity.length, end - offset - newOffset, entityEnd - offset - newOffset);
        if (newLength > 0) {
          const clonedEntity = Object.assign(Object.create(Object.getPrototypeOf(entity)), entity, { offset: newOffset, length: newLength });
          chunkEntities.push(clonedEntity);
        }
      }
      result.push([chunk, chunkEntities]);
      offset = end;
    }
    return result;
  }
  function getInputDialog(dialog) {
    if (dialog.inputDialog)
      return dialog.inputDialog;
    if (dialog.SUBCLASS_OF_ID === undefined) {
      _raiseCastFail(dialog, "InputDialogPeer");
    }
    if (dialog.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputDialogPeer")) {
      return dialog;
    }
    if (dialog instanceof api_1.Api.Community || dialog instanceof api_1.Api.CommunityForbidden) {
      return new api_1.Api.InputDialogPeerCommunity({
        community: getInputChannel(getInputPeer(dialog))
      });
    }
    if (dialog.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputPeer")) {
      return new api_1.Api.InputDialogPeer({ peer: dialog });
    }
    try {
      return new api_1.Api.InputDialogPeer({ peer: getInputPeer(dialog) });
    } catch (e) {
      _raiseCastFail(dialog, "InputDialogPeer");
    }
  }
  var FILE_REFERENCE_FLAG = 16777216;
  var WEB_LOCATION_FLAG = 33554432;
  var BotFileType;
  (function(BotFileType2) {
    BotFileType2[BotFileType2["Thumbnail"] = 0] = "Thumbnail";
    BotFileType2[BotFileType2["ProfilePhoto"] = 1] = "ProfilePhoto";
    BotFileType2[BotFileType2["Photo"] = 2] = "Photo";
    BotFileType2[BotFileType2["Voice"] = 3] = "Voice";
    BotFileType2[BotFileType2["Video"] = 4] = "Video";
    BotFileType2[BotFileType2["Document"] = 5] = "Document";
    BotFileType2[BotFileType2["Encrypted"] = 6] = "Encrypted";
    BotFileType2[BotFileType2["Temp"] = 7] = "Temp";
    BotFileType2[BotFileType2["Sticker"] = 8] = "Sticker";
    BotFileType2[BotFileType2["Audio"] = 9] = "Audio";
    BotFileType2[BotFileType2["Animation"] = 10] = "Animation";
    BotFileType2[BotFileType2["EncryptedThumbnail"] = 11] = "EncryptedThumbnail";
    BotFileType2[BotFileType2["Wallpaper"] = 12] = "Wallpaper";
    BotFileType2[BotFileType2["VideoNote"] = 13] = "VideoNote";
    BotFileType2[BotFileType2["SecureRaw"] = 14] = "SecureRaw";
    BotFileType2[BotFileType2["Secure"] = 15] = "Secure";
    BotFileType2[BotFileType2["Background"] = 16] = "Background";
    BotFileType2[BotFileType2["DocumentAsFile"] = 17] = "DocumentAsFile";
  })(BotFileType || (BotFileType = {}));
  function _rleDecodeFileId(data) {
    const result = [];
    let i = 0;
    while (i < data.length) {
      if (data[i] === 0 && i + 1 < data.length) {
        const count = data[i + 1];
        for (let j = 0;j < count; j++) {
          result.push(0);
        }
        i += 2;
      } else {
        result.push(data[i]);
        i += 1;
      }
    }
    return Buffer.from(result);
  }
  function _rleEncodeFileId(data) {
    const result = [];
    let i = 0;
    while (i < data.length) {
      if (data[i] === 0) {
        let count = 0;
        while (i < data.length && data[i] === 0 && count < 255) {
          count++;
          i++;
        }
        result.push(0, count);
      } else {
        result.push(data[i]);
        i++;
      }
    }
    return Buffer.from(result);
  }
  function resolveBotFileId(fileId) {
    try {
      const data = Buffer.from(fileId.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      if (data.length < 8) {
        return;
      }
      const decoded = _rleDecodeFileId(data);
      if (!decoded || decoded.length < 8) {
        return;
      }
      let offset = 0;
      const fileType = decoded.readUInt32LE(offset);
      offset += 4;
      offset += 4;
      const hasFileReference = (fileType & FILE_REFERENCE_FLAG) !== 0;
      const hasWebLocation = (fileType & WEB_LOCATION_FLAG) !== 0;
      const actualFileType = fileType & 16777215;
      if (hasWebLocation) {
        return;
      }
      let fileReference = Buffer.alloc(0);
      if (hasFileReference && offset < decoded.length) {
        const refLength = decoded[offset];
        offset += 1;
        if (offset + refLength <= decoded.length) {
          fileReference = Buffer.from(decoded.subarray(offset, offset + refLength));
          offset += refLength;
        }
      }
      if (offset + 16 > decoded.length) {
        return;
      }
      const id = decoded.readBigInt64LE(offset);
      offset += 8;
      const accessHash = decoded.readBigInt64LE(offset);
      if (actualFileType === BotFileType.Photo || actualFileType === BotFileType.ProfilePhoto) {
        return new api_1.Api.InputPhoto({
          id: (0, big_integer_1.default)(id.toString()),
          accessHash: (0, big_integer_1.default)(accessHash.toString()),
          fileReference
        });
      } else {
        return new api_1.Api.InputDocument({
          id: (0, big_integer_1.default)(id.toString()),
          accessHash: (0, big_integer_1.default)(accessHash.toString()),
          fileReference
        });
      }
    } catch (e) {
      return;
    }
  }
  function packBotFileId(media) {
    try {
      let id;
      let accessHash;
      let fileReference = Buffer.alloc(0);
      let fileType;
      let dcId = 0;
      if (media instanceof api_1.Api.Document) {
        id = media.id;
        accessHash = media.accessHash;
        fileReference = Buffer.from(media.fileReference);
        dcId = media.dcId;
        if (media.mimeType === "audio/ogg") {
          fileType = BotFileType.Voice;
        } else if (media.mimeType?.startsWith("audio/")) {
          fileType = BotFileType.Audio;
        } else if (media.mimeType?.startsWith("video/")) {
          const isVideoNote = media.attributes?.some((a) => a instanceof api_1.Api.DocumentAttributeVideo && a.roundMessage);
          fileType = isVideoNote ? BotFileType.VideoNote : BotFileType.Video;
        } else if (media.mimeType === "application/x-tgsticker" || media.mimeType === "image/webp") {
          fileType = BotFileType.Sticker;
        } else if (media.mimeType === "video/mp4" || media.mimeType === "image/gif") {
          fileType = BotFileType.Animation;
        } else {
          fileType = BotFileType.Document;
        }
      } else if (media instanceof api_1.Api.Photo) {
        id = media.id;
        accessHash = media.accessHash;
        fileReference = Buffer.from(media.fileReference);
        dcId = media.dcId;
        fileType = BotFileType.Photo;
      } else if (media instanceof api_1.Api.InputDocument) {
        id = media.id;
        accessHash = media.accessHash;
        fileReference = media.fileReference ? Buffer.from(media.fileReference) : Buffer.alloc(0);
        fileType = BotFileType.Document;
      } else if (media instanceof api_1.Api.InputPhoto) {
        id = media.id;
        accessHash = media.accessHash;
        fileReference = media.fileReference ? Buffer.from(media.fileReference) : Buffer.alloc(0);
        fileType = BotFileType.Photo;
      } else {
        return;
      }
      const hasFileRef = fileReference.length > 0;
      const typeWithFlags = fileType | (hasFileRef ? FILE_REFERENCE_FLAG : 0);
      const bufferSize = 4 + 4 + (hasFileRef ? 1 + fileReference.length : 0) + 8 + 8;
      const buffer = Buffer.alloc(bufferSize);
      let offset = 0;
      buffer.writeUInt32LE(typeWithFlags, offset);
      offset += 4;
      buffer.writeUInt32LE(dcId, offset);
      offset += 4;
      if (hasFileRef) {
        buffer.writeUInt8(fileReference.length, offset);
        offset += 1;
        fileReference.copy(buffer, offset);
        offset += fileReference.length;
      }
      buffer.writeBigInt64LE(BigInt(id.toString()), offset);
      offset += 8;
      buffer.writeBigInt64LE(BigInt(accessHash.toString()), offset);
      const encoded = _rleEncodeFileId(buffer);
      return encoded.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) {
      return;
    }
  }
});

// node_modules/teleproto/sessions/Memory.js
var require_Memory = __commonJS((exports2) => {
  var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports2 && exports2.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MemorySession = undefined;
  var Abstract_1 = require_Abstract();
  var tl_1 = require_tl();
  var big_integer_1 = __importDefault(require_BigInteger());
  var Utils_1 = require_Utils();
  var Helpers_1 = require_Helpers();
  var utils = __importStar(require_Utils());

  class MemorySession extends Abstract_1.Session {
    constructor() {
      super();
      this._dcAuthKeys = new Map;
      this._serverAddress = undefined;
      this._dcId = 0;
      this._port = undefined;
      this._takeoutId = undefined;
      this._entities = new Map;
      this._updateStates = {};
    }
    setDC(dcId, serverAddress, port) {
      dcId |= 0;
      if (dcId !== this._dcId) {
        if (this._dcId && this._authKey) {
          this._dcAuthKeys.set(this._dcId, this._authKey);
        }
        this._authKey = this._dcAuthKeys.get(dcId);
        this._dcAuthKeys.delete(dcId);
      }
      this._dcId = dcId;
      this._serverAddress = serverAddress;
      this._port = port;
    }
    get dcId() {
      return this._dcId;
    }
    get serverAddress() {
      return this._serverAddress;
    }
    get port() {
      return this._port;
    }
    get authKey() {
      return this._authKey;
    }
    set authKey(value) {
      this._authKey = value;
    }
    get takeoutId() {
      return this._takeoutId;
    }
    set takeoutId(value) {
      this._takeoutId = value;
    }
    getAuthKey(dcId) {
      if (dcId === undefined || dcId === this.dcId) {
        return this.authKey;
      }
      return this._dcAuthKeys.get(dcId);
    }
    setAuthKey(authKey, dcId) {
      if (dcId === undefined || dcId === this.dcId) {
        this.authKey = authKey;
        return;
      }
      if (authKey) {
        this._dcAuthKeys.set(dcId, authKey);
      } else {
        this._dcAuthKeys.delete(dcId);
      }
    }
    close() {}
    save() {}
    async load() {}
    delete() {
      this._authKey = undefined;
      this._dcId = 0;
      this._serverAddress = undefined;
      this._port = undefined;
      this._dcAuthKeys.clear();
      this._entities.clear();
      this._updateStates = {};
    }
    _entityValuesToRow(id, hash, username, phone, name) {
      return [id, hash, username, phone, name];
    }
    _entityToRow(e) {
      if (!(e.classType === "constructor")) {
        return;
      }
      let p;
      let markedId;
      try {
        p = (0, Utils_1.getInputPeer)(e, false);
        markedId = (0, Utils_1.getPeerId)(p);
      } catch (e2) {
        return;
      }
      let pHash;
      if (p instanceof tl_1.Api.InputPeerUser || p instanceof tl_1.Api.InputPeerChannel) {
        pHash = p.accessHash;
      } else if (p instanceof tl_1.Api.InputPeerChat) {
        pHash = big_integer_1.default.zero;
      } else {
        return;
      }
      let username = e.username;
      if (username) {
        username = username.toLowerCase();
      }
      const phone = e.phone;
      const name = (0, Utils_1.getDisplayName)(e);
      return this._entityValuesToRow(markedId, pHash, username, phone, name);
    }
    _entitiesToRows(tlo) {
      let entities = [];
      if (!(tlo.classType === "constructor") && (0, Helpers_1.isArrayLike)(tlo)) {
        entities = tlo;
      } else {
        if (typeof tlo === "object") {
          if ("user" in tlo) {
            entities.push(tlo.user);
          }
          if ("chat" in tlo) {
            entities.push(tlo.chat);
          }
          if ("channel" in tlo) {
            entities.push(tlo.channel);
          }
          if ("chats" in tlo && (0, Helpers_1.isArrayLike)(tlo.chats)) {
            entities = entities.concat(tlo.chats);
          }
          if ("users" in tlo && (0, Helpers_1.isArrayLike)(tlo.users)) {
            entities = entities.concat(tlo.users);
          }
        }
      }
      const rows = [];
      for (const e of entities) {
        const row = this._entityToRow(e);
        if (row) {
          rows.push(row);
        }
      }
      return rows;
    }
    processEntities(tlo) {
      const entitiesSet = this._entitiesToRows(tlo);
      for (const e of entitiesSet) {
        this._entities.set(e[0].toString(), e);
      }
    }
    getEntityRowsByPhone(phone) {
      for (const e of this._entities.values()) {
        if (e[3] === phone) {
          return [e[0], e[1]];
        }
      }
    }
    getEntityRowsByUsername(username) {
      for (const e of this._entities.values()) {
        if (e[2] === username) {
          return [e[0], e[1]];
        }
      }
    }
    getEntityRowsByName(name) {
      for (const e of this._entities.values()) {
        if (e[4] === name) {
          return [e[0], e[1]];
        }
      }
    }
    getEntityRowsById(id, exact = true) {
      if (exact) {
        const row = this._entities.get(id.toString());
        if (row)
          return [row[0], row[1]];
      } else {
        const ids = [
          utils.getPeerId(new tl_1.Api.PeerUser({ userId: (0, Helpers_1.returnBigInt)(id) })),
          utils.getPeerId(new tl_1.Api.PeerChat({ chatId: (0, Helpers_1.returnBigInt)(id) })),
          utils.getPeerId(new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(id) }))
        ];
        for (const e of this._entities.values()) {
          if (ids.includes(e[0])) {
            return [e[0], e[1]];
          }
        }
      }
    }
    getInputEntity(key) {
      let exact;
      if (typeof key === "object" && !big_integer_1.default.isInstance(key) && key.SUBCLASS_OF_ID) {
        if (key.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputPeer") || key.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputUser") || key.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputChannel")) {
          return key;
        }
        try {
          return utils.getInputPeer(key);
        } catch {
          key = utils.getPeerId(key);
          exact = true;
        }
      } else {
        if (typeof key === "object") {
          key = utils.getPeerId(key);
          exact = true;
        } else {
          exact = false;
        }
      }
      if (big_integer_1.default.isInstance(key) || typeof key == "bigint" || typeof key == "number") {
        key = key.toString();
      }
      let result = undefined;
      if (typeof key === "string") {
        const phone = utils.parsePhone(key);
        if (phone) {
          result = this.getEntityRowsByPhone(phone);
        } else {
          const { username, isInvite } = utils.parseUsername(key);
          if (username && !isInvite) {
            result = this.getEntityRowsByUsername(username);
          }
        }
        if (!result) {
          const id = utils.parseID(key);
          if (id) {
            result = this.getEntityRowsById(id, exact);
          }
        }
        if (!result) {
          result = this.getEntityRowsByName(key);
        }
      }
      if (result) {
        let entityId = result[0];
        const entityHash = (0, big_integer_1.default)(result[1]);
        const resolved = utils.resolveId((0, Helpers_1.returnBigInt)(entityId));
        entityId = resolved[0];
        const kind = resolved[1];
        if (kind === tl_1.Api.PeerUser) {
          return new tl_1.Api.InputPeerUser({
            userId: entityId,
            accessHash: entityHash
          });
        } else if (kind === tl_1.Api.PeerChat) {
          return new tl_1.Api.InputPeerChat({ chatId: entityId });
        } else if (kind === tl_1.Api.PeerChannel) {
          return new tl_1.Api.InputPeerChannel({
            channelId: entityId,
            accessHash: entityHash
          });
        }
      } else {
        throw new Error("Could not find input entity with key " + key);
      }
      throw new Error("Could not find input entity with key " + key);
    }
  }
  exports2.MemorySession = MemorySession;
});

// node_modules/teleproto/extensions/Logger.js
var require_Logger = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Logger = exports2.LogLevel = undefined;
  var LogLevel;
  (function(LogLevel2) {
    LogLevel2["NONE"] = "none";
    LogLevel2["ERROR"] = "error";
    LogLevel2["WARN"] = "warn";
    LogLevel2["INFO"] = "info";
    LogLevel2["DEBUG"] = "debug";
  })(LogLevel || (exports2.LogLevel = LogLevel = {}));
  var SEVERITY = {
    none: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
  };
  var COLOR = {
    error: "\x1B[31m",
    warn: "\x1B[35m",
    info: "\x1B[33m",
    debug: "\x1B[36m"
  };
  var RESET = "\x1B[0m";

  class Logger {
    constructor(level = LogLevel.INFO) {
      this.messageFormat = "[%t] [%l] - [%m]";
      this.tzOffset = new Date().getTimezoneOffset() * 60000;
      this._logLevel = level;
    }
    canSend(level) {
      return SEVERITY[this._logLevel] >= SEVERITY[level];
    }
    error(message, error) {
      this._log(LogLevel.ERROR, message, error);
    }
    warn(message, error) {
      this._log(LogLevel.WARN, message, error);
    }
    info(message, error) {
      this._log(LogLevel.INFO, message, error);
    }
    debug(message, error) {
      this._log(LogLevel.DEBUG, message, error);
    }
    format(message, level) {
      return this.messageFormat.replace("%t", this.getDateTime()).replace("%l", level.toUpperCase()).replace("%m", message);
    }
    getDateTime() {
      return new Date(Date.now() - this.tzOffset).toISOString().slice(0, -1);
    }
    get logLevel() {
      return this._logLevel;
    }
    setLevel(level) {
      this._logLevel = level;
    }
    static setLevel(level) {
      console.log("Logger.setLevel is deprecated, it will has no effect. Please, use client.setLogLevel instead.");
    }
    _log(level, message, error) {
      if (this.canSend(level)) {
        this.log(level, message, error);
      }
    }
    log(level, message, error) {
      if (this.handler) {
        this.handler({
          level,
          message,
          error,
          date: new Date(Date.now() - this.tzOffset)
        });
        return;
      }
      console.log((COLOR[level] ?? "") + this.format(message, level) + RESET);
      if (error !== undefined) {
        console.error(error);
      }
    }
  }
  exports2.Logger = Logger;
});

// node_modules/teleproto/extensions/BinaryWriter.js
var require_BinaryWriter = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.BinaryWriter = undefined;

  class BinaryWriter {
    constructor(stream) {
      this._buffers = [stream];
    }
    write(buffer) {
      this._buffers.push(buffer);
    }
    getValue() {
      return Buffer.concat(this._buffers);
    }
  }
  exports2.BinaryWriter = BinaryWriter;
});

// node_modules/teleproto/tl/core/TLMessage.js
var require_TLMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.TLMessage = undefined;

  class TLMessage {
    static {
      this.SIZE_OVERHEAD = 12;
    }
    static {
      this.classType = "constructor";
    }
    constructor(msgId, seqNo, obj) {
      this.msgId = msgId;
      this.seqNo = seqNo;
      this.obj = obj;
      this.classType = "constructor";
    }
  }
  exports2.TLMessage = TLMessage;
});

// node_modules/teleproto/tl/core/GZIPPacked.js
var require_GZIPPacked = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.GZIPPacked = undefined;
  var helpers_1 = require_helpers();
  var zlib_1 = require("zlib");

  class GZIPPacked {
    static {
      this.CONSTRUCTOR_ID = 812830625;
    }
    static {
      this.classType = "constructor";
    }
    constructor(data) {
      this.data = data;
      this.CONSTRUCTOR_ID = 812830625;
      this.classType = "constructor";
    }
    static async gzipIfSmaller(contentRelated, data) {
      if (contentRelated && data.length > 512) {
        const gzipped = await new GZIPPacked(data).toBytes();
        if (gzipped.length < data.length) {
          return gzipped;
        }
      }
      return data;
    }
    static gzip(input) {
      return Buffer.from(input);
    }
    static ungzip(input) {
      return (0, zlib_1.unzipSync)(input);
    }
    async toBytes() {
      const g = Buffer.alloc(4);
      g.writeUInt32LE(GZIPPacked.CONSTRUCTOR_ID, 0);
      return Buffer.concat([
        g,
        (0, helpers_1.serializeBytes)(await GZIPPacked.gzip(this.data))
      ]);
    }
    static async read(reader) {
      const constructor = reader.readInt(false);
      if (constructor !== GZIPPacked.CONSTRUCTOR_ID) {
        throw new Error("not equal");
      }
      return GZIPPacked.gzip(reader.tgReadBytes());
    }
    static async fromReader(reader) {
      const data = reader.tgReadBytes();
      return new GZIPPacked(await GZIPPacked.ungzip(data));
    }
  }
  exports2.GZIPPacked = GZIPPacked;
});

// node_modules/teleproto/tl/core/RPCResult.js
var require_RPCResult = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.RPCResult = undefined;
  var api_1 = require_api2();
  var GZIPPacked_1 = require_GZIPPacked();

  class RPCResult {
    static {
      this.CONSTRUCTOR_ID = 4082920705;
    }
    static {
      this.classType = "constructor";
    }
    constructor(reqMsgId, body, error) {
      this.CONSTRUCTOR_ID = 4082920705;
      this.reqMsgId = reqMsgId;
      this.body = body;
      this.error = error;
      this.classType = "constructor";
    }
    static async fromReader(reader) {
      const msgId = reader.readLong();
      const innerCode = reader.readInt(false);
      if (innerCode === api_1.Api.RpcError.CONSTRUCTOR_ID) {
        return new RPCResult(msgId, undefined, api_1.Api.RpcError.fromReader(reader));
      }
      if (innerCode === GZIPPacked_1.GZIPPacked.CONSTRUCTOR_ID) {
        return new RPCResult(msgId, (await GZIPPacked_1.GZIPPacked.fromReader(reader)).data);
      }
      reader.seek(-4);
      return new RPCResult(msgId, reader.read(), undefined);
    }
  }
  exports2.RPCResult = RPCResult;
});

// node_modules/teleproto/tl/core/MessageContainer.js
var require_MessageContainer = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MessageContainer = undefined;
  var TLMessage_1 = require_TLMessage();

  class MessageContainer {
    static {
      this.CONSTRUCTOR_ID = 1945237724;
    }
    static {
      this.classType = "constructor";
    }
    static {
      this.MAXIMUM_SIZE = 1044456 - 8;
    }
    static {
      this.MAXIMUM_LENGTH = 100;
    }
    constructor(messages) {
      this.CONSTRUCTOR_ID = 1945237724;
      this.messages = messages;
      this.classType = "constructor";
    }
    static async fromReader(reader) {
      const messages = [];
      const length = reader.readInt();
      for (let x = 0;x < length; x++) {
        const msgId = reader.readLong();
        const seqNo = reader.readInt();
        const length2 = reader.readInt();
        const before = reader.tellPosition();
        const obj = reader.tgReadObject();
        reader.setPosition(before + length2);
        const tlMessage = new TLMessage_1.TLMessage(msgId, seqNo, obj);
        messages.push(tlMessage);
      }
      return new MessageContainer(messages);
    }
  }
  exports2.MessageContainer = MessageContainer;
});

// node_modules/teleproto/tl/core/index.js
var require_core = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.GZIPPacked = exports2.MessageContainer = exports2.TLMessage = exports2.RPCResult = exports2.coreObjects = undefined;
  var TLMessage_1 = require_TLMessage();
  Object.defineProperty(exports2, "TLMessage", { enumerable: true, get: function() {
    return TLMessage_1.TLMessage;
  } });
  var RPCResult_1 = require_RPCResult();
  Object.defineProperty(exports2, "RPCResult", { enumerable: true, get: function() {
    return RPCResult_1.RPCResult;
  } });
  var MessageContainer_1 = require_MessageContainer();
  Object.defineProperty(exports2, "MessageContainer", { enumerable: true, get: function() {
    return MessageContainer_1.MessageContainer;
  } });
  var GZIPPacked_1 = require_GZIPPacked();
  Object.defineProperty(exports2, "GZIPPacked", { enumerable: true, get: function() {
    return GZIPPacked_1.GZIPPacked;
  } });
  exports2.coreObjects = new Map([
    [RPCResult_1.RPCResult.CONSTRUCTOR_ID, RPCResult_1.RPCResult],
    [GZIPPacked_1.GZIPPacked.CONSTRUCTOR_ID, GZIPPacked_1.GZIPPacked],
    [MessageContainer_1.MessageContainer.CONSTRUCTOR_ID, MessageContainer_1.MessageContainer]
  ]);
});

// node_modules/teleproto/extensions/BinaryReader.js
var require_BinaryReader = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.BinaryReader = undefined;
  var errors_1 = require_errors();
  var core_1 = require_core();
  var registry_1 = require_registry();
  var Helpers_1 = require_Helpers();

  class BinaryReader {
    constructor(data) {
      this.stream = data;
      this._last = undefined;
      this.offset = 0;
    }
    readByte() {
      return this.read(1)[0];
    }
    readInt(signed = true) {
      let res;
      if (signed) {
        res = this.stream.readInt32LE(this.offset);
      } else {
        res = this.stream.readUInt32LE(this.offset);
      }
      this.offset += 4;
      return res;
    }
    readLong(signed = true) {
      return this.readLargeInt(64, signed);
    }
    readFloat() {
      return this.read(4).readFloatLE(0);
    }
    readDouble() {
      return this.read(8).readDoubleLE(0);
    }
    readLargeInt(bits, signed = true) {
      const buffer = this.read(Math.floor(bits / 8));
      return (0, Helpers_1.readBigIntFromBuffer)(buffer, true, signed);
    }
    read(length = -1, checkLength = true) {
      if (length === -1) {
        length = this.stream.length - this.offset;
      }
      const result = this.stream.slice(this.offset, this.offset + length);
      this.offset += length;
      if (checkLength && result.length !== length) {
        throw Error(`No more data left to read (need ${length}, got ${result.length}: ${result}); last read ${this._last}`);
      }
      this._last = result;
      return result;
    }
    getBuffer() {
      return this.stream;
    }
    tgReadBytes() {
      const firstByte = this.readByte();
      let padding;
      let length;
      if (firstByte === 254) {
        length = this.readByte() | this.readByte() << 8 | this.readByte() << 16;
        padding = length % 4;
      } else {
        length = firstByte;
        padding = (length + 1) % 4;
      }
      const data = this.read(length);
      if (padding > 0) {
        padding = 4 - padding;
        this.read(padding);
      }
      return data;
    }
    tgReadString() {
      return this.tgReadBytes().toString("utf-8");
    }
    tgReadBool() {
      const value = this.readInt(false);
      if (value === 2574415285) {
        return true;
      } else if (value === 3162085175) {
        return false;
      } else {
        throw new Error(`Invalid boolean code ${value.toString(16)}`);
      }
    }
    tgReadDate() {
      const value = this.readInt();
      return new Date(value * 1000);
    }
    tgReadObject() {
      const constructorId = this.readInt(false);
      let clazz = registry_1.tlobjects[constructorId];
      if (clazz === undefined) {
        const value = constructorId;
        if (value === 2574415285) {
          return true;
        } else if (value === 3162085175) {
          return false;
        } else if (value === 481674261) {
          const temp = [];
          const length = this.readInt();
          for (let i = 0;i < length; i++) {
            temp.push(this.tgReadObject());
          }
          return temp;
        }
        clazz = core_1.coreObjects.get(constructorId);
        if (clazz === undefined) {
          this.seek(-4);
          const pos = this.tellPosition();
          const error = new errors_1.TypeNotFoundError(constructorId, this.read());
          this.setPosition(pos);
          throw error;
        }
      }
      return clazz.fromReader(this);
    }
    tgReadVector() {
      if (this.readInt(false) !== 481674261) {
        throw new Error("Invalid constructor code, vector was expected");
      }
      const count = this.readInt();
      const temp = [];
      for (let i = 0;i < count; i++) {
        temp.push(this.tgReadObject());
      }
      return temp;
    }
    tellPosition() {
      return this.offset;
    }
    setPosition(position) {
      this.offset = position;
    }
    seek(offset) {
      this.offset += offset;
    }
  }
  exports2.BinaryReader = BinaryReader;
});

// stub:socks-stub
var require_socks_stub = __commonJS((exports2) => {
  exports2.SocksClient = { createConnection() {
    throw new Error("SOCKS proxies are not supported in this build");
  } };
});

// node_modules/teleproto/extensions/PromisedNetSockets.js
var require_PromisedNetSockets = __commonJS((exports2) => {
  var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports2 && exports2.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.PromisedNetSockets = undefined;
  var net = __importStar(require("node:net"));
  var socks_1 = require_socks_stub();

  class NetSocketClosedError extends Error {
    constructor() {
      super("NetSocket was closed");
      this.name = "NetSocketClosedError";
    }
  }
  var DEFAULT_KEEP_ALIVE_INTERVAL = 30000;

  class PromisedNetSockets {
    constructor(proxy, keepAliveInterval) {
      this.lastDataAt = 0;
      this.client = undefined;
      this.closed = true;
      this.chunks = [];
      this.headOffset = 0;
      this.available = 0;
      this.keepAliveInterval = keepAliveInterval ?? DEFAULT_KEEP_ALIVE_INTERVAL;
      if (proxy) {
        if ("WEB" in proxy)
          throw new Error("WEB proxy requires ConnectionWebProxy");
        if (!("MTProxy" in proxy)) {
          if (!proxy.ip || !proxy.port || !proxy.socksType) {
            throw new Error(`Invalid sockets params: ip=${proxy.ip}, port=${proxy.port}, socksType=${proxy.socksType}`);
          }
          this.proxy = proxy;
        }
      }
    }
    async readExactly(number) {
      const parts = [];
      let need = number;
      while (need > 0) {
        const part = await this.read(need);
        parts.push(part);
        need -= part.length;
      }
      return parts.length === 1 ? parts[0] : Buffer.concat(parts);
    }
    async read(number) {
      if (this.closed) {
        throw new NetSocketClosedError;
      }
      await this.canRead;
      if (this.closed) {
        throw new NetSocketClosedError;
      }
      const toReturn = this._consume(Math.min(number, this.available));
      if (this.available === 0) {
        this.canRead = new Promise((resolve) => {
          this.resolveRead = resolve;
        });
      }
      return toReturn;
    }
    async readAll() {
      if (this.closed || !await this.canRead) {
        throw new NetSocketClosedError;
      }
      const toReturn = this._consume(this.available);
      this.canRead = new Promise((resolve) => {
        this.resolveRead = resolve;
      });
      return toReturn;
    }
    _consume(n) {
      if (n <= 0) {
        return Buffer.alloc(0);
      }
      const head = this.chunks[0];
      if (head && head.length - this.headOffset >= n) {
        const out2 = head.subarray(this.headOffset, this.headOffset + n);
        this.headOffset += n;
        this.available -= n;
        if (this.headOffset === head.length) {
          this.chunks.shift();
          this.headOffset = 0;
        }
        return out2;
      }
      const out = Buffer.alloc(n);
      let written = 0;
      while (written < n) {
        const chunk = this.chunks[0];
        const take = Math.min(chunk.length - this.headOffset, n - written);
        chunk.copy(out, written, this.headOffset, this.headOffset + take);
        written += take;
        this.headOffset += take;
        if (this.headOffset === chunk.length) {
          this.chunks.shift();
          this.headOffset = 0;
        }
      }
      this.available -= n;
      return out;
    }
    async connect(port, ip) {
      this.chunks = [];
      this.headOffset = 0;
      this.available = 0;
      let connected = false;
      if (this.proxy) {
        const info = await socks_1.SocksClient.createConnection({
          proxy: {
            host: this.proxy.ip,
            port: this.proxy.port,
            type: this.proxy.socksType,
            userId: this.proxy.username,
            password: this.proxy.password
          },
          command: "connect",
          timeout: (this.proxy.timeout || 5) * 1000,
          destination: {
            host: ip,
            port
          }
        });
        this.client = info.socket;
        connected = true;
      } else {
        this.client = new net.Socket;
      }
      this.canRead = new Promise((resolve) => {
        this.resolveRead = resolve;
      });
      this.closed = false;
      return new Promise((resolve, reject) => {
        if (this.client) {
          const tune = (socket) => {
            socket.setNoDelay(true);
            socket.setKeepAlive(this.keepAliveInterval > 0, Math.max(0, this.keepAliveInterval));
          };
          if (connected) {
            tune(this.client);
            this.receive();
            resolve(this);
          } else {
            this.client.connect(port, ip, () => {
              tune(this.client);
              this.receive();
              resolve(this);
            });
          }
          this.client.on("error", reject);
          this.client.on("close", () => {
            if (this.client && this.client.destroyed) {
              if (this.resolveRead) {
                this.resolveRead(false);
              }
              this.closed = true;
            }
          });
        }
      });
    }
    write(data) {
      if (this.closed) {
        throw new NetSocketClosedError;
      }
      if (this.client) {
        this.client.write(data);
      }
    }
    async close() {
      const socket = this.client;
      this.closed = true;
      if (!socket)
        return;
      const closed = new Promise((resolve) => {
        if (socket.destroyed)
          resolve();
        else
          socket.once("close", () => resolve());
      });
      socket.destroy();
      socket.unref();
      await closed;
    }
    async receive() {
      if (this.client) {
        this.client.on("data", (chunk) => {
          this.lastDataAt = Date.now();
          this.chunks.push(chunk);
          this.available += chunk.length;
          if (this.resolveRead) {
            this.resolveRead(true);
          }
        });
      }
    }
    toString() {
      return "PromisedNetSocket";
    }
  }
  exports2.PromisedNetSockets = PromisedNetSockets;
});

// node_modules/teleproto/extensions/PromisedWebSockets.js
var require_PromisedWebSockets = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.PromisedWebSockets = undefined;
  var closeError = new Error("WebSocket was closed");

  class PromisedWebSockets {
    static {
      this.isWebSocket = true;
    }
    constructor(proxy, _keepAliveInterval) {
      this.lastDataAt = 0;
      this.client = undefined;
      this.closed = true;
      this.chunks = [];
      this.headOffset = 0;
      this.available = 0;
      if (proxy && !("MTProxy" in proxy)) {
        throw new Error("Socks proxies are not supported over the WebSocket transport");
      }
    }
    async readExactly(number) {
      const parts = [];
      let need = number;
      while (need > 0) {
        const part = await this.read(need);
        parts.push(part);
        need -= part.length;
      }
      return parts.length === 1 ? parts[0] : Buffer.concat(parts);
    }
    async read(number) {
      if (this.closed) {
        throw closeError;
      }
      await this.canRead;
      if (this.closed) {
        throw closeError;
      }
      const toReturn = this._consume(Math.min(number, this.available));
      if (this.available === 0) {
        this.canRead = new Promise((resolve) => {
          this.resolveRead = resolve;
        });
      }
      return toReturn;
    }
    async readAll() {
      if (this.closed || !await this.canRead) {
        throw closeError;
      }
      const toReturn = this._consume(this.available);
      this.canRead = new Promise((resolve) => {
        this.resolveRead = resolve;
      });
      return toReturn;
    }
    _consume(n) {
      if (n <= 0) {
        return Buffer.alloc(0);
      }
      const head = this.chunks[0];
      if (head && head.length - this.headOffset >= n) {
        const out2 = head.subarray(this.headOffset, this.headOffset + n);
        this.headOffset += n;
        this.available -= n;
        if (this.headOffset === head.length) {
          this.chunks.shift();
          this.headOffset = 0;
        }
        return out2;
      }
      const out = Buffer.alloc(n);
      let written = 0;
      while (written < n) {
        const chunk = this.chunks[0];
        const take = Math.min(chunk.length - this.headOffset, n - written);
        chunk.copy(out, written, this.headOffset, this.headOffset + take);
        written += take;
        this.headOffset += take;
        if (this.headOffset === chunk.length) {
          this.chunks.shift();
          this.headOffset = 0;
        }
      }
      this.available -= n;
      return out;
    }
    async connect(port, ip, testServers = false) {
      const impl = PromisedWebSockets.webSocketImpl ?? globalThis.WebSocket;
      if (!impl) {
        throw new Error("No WebSocket implementation found: run on Node.js 22+ or a browser, " + 'or set PromisedWebSockets.webSocketImpl (e.g. require("ws").WebSocket)');
      }
      this.chunks = [];
      this.headOffset = 0;
      this.available = 0;
      const scheme = port === 443 ? "wss" : "ws";
      const url = `${scheme}://${ip}:${port}/apiws${testServers ? "_test" : ""}`;
      const socket = new impl(url, "binary");
      socket.binaryType = "arraybuffer";
      this.client = socket;
      this.canRead = new Promise((resolve) => {
        this.resolveRead = resolve;
      });
      this.closed = false;
      socket.onmessage = (ev) => {
        this.lastDataAt = Date.now();
        const chunk = typeof ev.data === "string" ? Buffer.from(ev.data) : Buffer.from(new Uint8Array(ev.data));
        this.chunks.push(chunk);
        this.available += chunk.length;
        if (this.resolveRead) {
          this.resolveRead(true);
        }
      };
      await new Promise((resolve, reject) => {
        socket.onopen = () => resolve();
        socket.onerror = () => {
          this.closed = true;
          if (this.resolveRead) {
            this.resolveRead(false);
          }
          reject(new Error(`WebSocket connection to ${url} failed`));
        };
        socket.onclose = () => {
          this.closed = true;
          if (this.resolveRead) {
            this.resolveRead(false);
          }
          reject(closeError);
        };
      });
      return this;
    }
    write(data) {
      if (this.closed) {
        throw closeError;
      }
      if (this.client) {
        this.client.send(data);
      }
    }
    async close() {
      const socket = this.client;
      this.closed = true;
      this.client = undefined;
      if (socket) {
        socket.close();
      }
    }
    toString() {
      return "PromisedWebSockets";
    }
  }
  exports2.PromisedWebSockets = PromisedWebSockets;
});

// node_modules/teleproto/network/packing.js
var require_packing = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.packRequestBatch = packRequestBatch;
  var BinaryWriter_1 = require_BinaryWriter();
  var core_1 = require_core();
  var SOLO_REQUESTS = new Set([
    "upload.GetFile",
    "upload.GetCdnFile",
    "upload.GetWebFile",
    "upload.SaveFilePart",
    "upload.SaveBigFilePart"
  ]);
  async function packRequestBatch(state, queued, log) {
    let buffer = new BinaryWriter_1.BinaryWriter(Buffer.alloc(0));
    const batch = [];
    let size = 0;
    while (queued.length && batch.length < core_1.MessageContainer.MAXIMUM_LENGTH) {
      const request = queued.shift();
      if (request.cancelled)
        continue;
      const solo = SOLO_REQUESTS.has(request.request.className);
      if (solo && batch.length) {
        queued.unshift(request);
        break;
      }
      size += request.data.length + core_1.TLMessage.SIZE_OVERHEAD;
      if (size <= core_1.MessageContainer.MAXIMUM_SIZE) {
        request.msgId = await state.writeDataAsMessage(buffer, request.data, request.request.classType === "request", request.after?.msgId, request.forcedMsgId);
        log.debug(`Assigned msgId = ${request.msgId} to ${request.request.className || request.request.constructor.name}`);
        batch.push(request);
        if (solo)
          break;
        continue;
      }
      if (batch.length) {
        queued.unshift(request);
        break;
      }
      log.warn(`Message payload for ${request.request.className || request.request.constructor.name} is too long ${request.data.length} and cannot be sent`);
      request.reject(new Error("Request payload is too big"));
      size = 0;
    }
    if (!batch.length) {
      return null;
    }
    let data = buffer.getValue();
    if (batch.length > 1) {
      const header = Buffer.alloc(8);
      header.writeUInt32LE(core_1.MessageContainer.CONSTRUCTOR_ID, 0);
      header.writeInt32LE(batch.length, 4);
      const containerBody = Buffer.concat([header, data]);
      buffer = new BinaryWriter_1.BinaryWriter(Buffer.alloc(0));
      const containerId = await state.writeDataAsMessage(buffer, containerBody, false);
      for (const request of batch) {
        request.containerId = containerId;
      }
      data = buffer.getValue();
    }
    return { batch, data };
  }
});

// node_modules/teleproto/extensions/MessagePacker.js
var require_MessagePacker = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MessagePacker = undefined;
  var packing_1 = require_packing();
  var USE_INVOKE_AFTER_WITH = new Set([
    "messages.SendMessage",
    "messages.SendMedia",
    "messages.SendMultiMedia",
    "messages.ForwardMessages",
    "messages.SendInlineBotResult"
  ]);

  class MessagePacker {
    constructor(state, logger) {
      this._state = state;
      this._queue = [];
      this._pendingStates = [];
      this._ready = new Promise((resolve) => {
        this.setReady = resolve;
      });
      this._log = logger;
    }
    values() {
      return this._queue;
    }
    get length() {
      return this._queue.length + this._pendingStates.length;
    }
    append(state, setReady = true, atStart = false) {
      if (state && USE_INVOKE_AFTER_WITH.has(state.request.className)) {
        if (atStart) {
          for (let i = 0;i < this._queue.length; i++) {
            if (USE_INVOKE_AFTER_WITH.has(this._queue[i]?.request.className)) {
              this._queue[i].after = state;
              break;
            }
          }
        } else {
          for (let i = this._queue.length - 1;i >= 0; i--) {
            if (USE_INVOKE_AFTER_WITH.has(this._queue[i]?.request.className)) {
              state.after = this._queue[i];
              break;
            }
          }
        }
      }
      if (atStart) {
        this._queue.unshift(state);
      } else {
        this._queue.push(state);
      }
      if (setReady && this.setReady) {
        this.setReady(true);
      }
      if (state && state.request.CONSTRUCTOR_ID !== 1658238041) {
        this._pendingStates.push(state);
        state.promise.catch((err) => {}).finally(() => {
          this._pendingStates = this._pendingStates.filter((s) => s !== state);
        });
      }
    }
    prepend(states) {
      states.reverse().forEach((state) => {
        this.append(state, false, true);
      });
      if (this.setReady) {
        this.setReady(true);
      }
    }
    extend(states) {
      states.forEach((state) => {
        this.append(state, false);
      });
      if (this.setReady) {
        this.setReady(true);
      }
    }
    clear() {
      this._queue = [];
      this.append(undefined);
    }
    async wait() {
      if (!this._queue.length) {
        this._ready = new Promise((resolve) => {
          this.setReady = resolve;
        });
        await this._ready;
      }
    }
    async get() {
      if (!this._queue[this._queue.length - 1]) {
        this._queue = this._queue.filter(Boolean);
        return;
      }
      this._queue = this._queue.filter(Boolean);
      return (0, packing_1.packRequestBatch)(this._state, this._queue, this._log);
    }
  }
  exports2.MessagePacker = MessagePacker;
});

// node_modules/teleproto/extensions/AsyncQueue.js
var require_AsyncQueue = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.AsyncQueue = undefined;

  class AsyncQueue {
    constructor() {
      this._queue = [];
      this.canPush = true;
      this.resolvePush = (value) => {};
      this.resolveGet = (value) => {};
      this.canGet = new Promise((resolve) => {
        this.resolveGet = resolve;
      });
    }
    async push(value) {
      await this.canPush;
      this._queue.push(value);
      this.resolveGet(true);
      this.canPush = new Promise((resolve) => {
        this.resolvePush = resolve;
      });
    }
    async pop() {
      await this.canGet;
      const returned = this._queue.pop();
      this.resolvePush(true);
      this.canGet = new Promise((resolve) => {
        this.resolveGet = resolve;
      });
      return returned;
    }
  }
  exports2.AsyncQueue = AsyncQueue;
});

// node_modules/teleproto/extensions/index.js
var require_extensions = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.AsyncQueue = exports2.MessagePacker = exports2.PromisedWebSockets = exports2.PromisedNetSockets = exports2.BinaryReader = exports2.BinaryWriter = exports2.Logger = undefined;
  var Logger_1 = require_Logger();
  Object.defineProperty(exports2, "Logger", { enumerable: true, get: function() {
    return Logger_1.Logger;
  } });
  var BinaryWriter_1 = require_BinaryWriter();
  Object.defineProperty(exports2, "BinaryWriter", { enumerable: true, get: function() {
    return BinaryWriter_1.BinaryWriter;
  } });
  var BinaryReader_1 = require_BinaryReader();
  Object.defineProperty(exports2, "BinaryReader", { enumerable: true, get: function() {
    return BinaryReader_1.BinaryReader;
  } });
