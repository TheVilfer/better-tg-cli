  class ButtonTextInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified button text is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_TEXT_INVALID";
    }
  }
  exports2.ButtonTextInvalidError = ButtonTextInvalidError;

  class ButtonTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The type of one or more of the buttons you provided is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_TYPE_INVALID";
    }
  }
  exports2.ButtonTypeInvalidError = ButtonTypeInvalidError;

  class ButtonUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Button URL invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_URL_INVALID";
    }
  }
  exports2.ButtonUrlInvalidError = ButtonUrlInvalidError;

  class ButtonUserInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The `user_id` passed to inputKeyboardButtonUserProfile is invalid!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_USER_INVALID";
    }
  }
  exports2.ButtonUserInvalidError = ButtonUserInvalidError;

  class ButtonUserPrivacyRestrictedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The privacy setting of the user specified in a [inputKeyboardButtonUserProfile](https://core.telegram.org/constructor/inputKeyboardButtonUserProfile) button do not allow creating such a button." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BUTTON_USER_PRIVACY_RESTRICTED";
    }
  }
  exports2.ButtonUserPrivacyRestrictedError = ButtonUserPrivacyRestrictedError;

  class CallAlreadyAcceptedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The call was already accepted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_ALREADY_ACCEPTED";
    }
  }
  exports2.CallAlreadyAcceptedError = CallAlreadyAcceptedError;

  class CallAlreadyDeclinedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The call was already declined." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_ALREADY_DECLINED";
    }
  }
  exports2.CallAlreadyDeclinedError = CallAlreadyDeclinedError;

  class CallNotActiveError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified call is not active." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_NOT_ACTIVE";
    }
  }
  exports2.CallNotActiveError = CallNotActiveError;

  class CallOccupyFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The call failed because the user is already making another call." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_OCCUPY_FAILED";
    }
  }
  exports2.CallOccupyFailedError = CallOccupyFailedError;

  class CallPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided call peer object is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_PEER_INVALID";
    }
  }
  exports2.CallPeerInvalidError = CallPeerInvalidError;

  class CallProtocolFlagsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Call protocol flags invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_PROTOCOL_FLAGS_INVALID";
    }
  }
  exports2.CallProtocolFlagsInvalidError = CallProtocolFlagsInvalidError;

  class CallProtocolLayerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified protocol layer version range is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CALL_PROTOCOL_LAYER_INVALID";
    }
  }
  exports2.CallProtocolLayerInvalidError = CallProtocolLayerInvalidError;

  class CdnMethodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't call this method in a CDN DC." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CDN_METHOD_INVALID";
    }
  }
  exports2.CdnMethodInvalidError = CdnMethodInvalidError;

  class ChannelForumMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This supergroup is not a forum." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_FORUM_MISSING";
    }
  }
  exports2.ChannelForumMissingError = ChannelForumMissingError;

  class ChannelIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified supergroup ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_ID_INVALID";
    }
  }
  exports2.ChannelIdInvalidError = ChannelIdInvalidError;

  class ChannelInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided channel is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_INVALID";
    }
  }
  exports2.ChannelInvalidError = ChannelInvalidError;

  class ChannelMonoforumUnsupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "[Monoforums](https://core.telegram.org/api/channel#monoforums) do not support this feature." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_MONOFORUM_UNSUPPORTED";
    }
  }
  exports2.ChannelMonoforumUnsupportedError = ChannelMonoforumUnsupportedError;

  class ChannelParicipantMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The current user is not in the channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_PARICIPANT_MISSING";
    }
  }
  exports2.ChannelParicipantMissingError = ChannelParicipantMissingError;

  class ChannelPrivateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You haven't joined this channel/supergroup." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_PRIVATE";
    }
  }
  exports2.ChannelPrivateError = ChannelPrivateError;

  class ChannelTooBigError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This channel has too many participants (>1000) to be deleted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_TOO_BIG";
    }
  }
  exports2.ChannelTooBigError = ChannelTooBigError;

  class ChannelTooLargeError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Channel is too large to be deleted; this error is issued when trying to delete channels with more than 1000 members (subject to change)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNEL_TOO_LARGE";
    }
  }
  exports2.ChannelTooLargeError = ChannelTooLargeError;

  class ChannelsAdminLocatedTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The user has reached the limit of public geogroups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNELS_ADMIN_LOCATED_TOO_MUCH";
    }
  }
  exports2.ChannelsAdminLocatedTooMuchError = ChannelsAdminLocatedTooMuchError;

  class ChannelsAdminPublicTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You're admin of too many public channels, make some channels private to change the username of this channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNELS_ADMIN_PUBLIC_TOO_MUCH";
    }
  }
  exports2.ChannelsAdminPublicTooMuchError = ChannelsAdminPublicTooMuchError;

  class ChannelsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You have joined too many channels/supergroups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHANNELS_TOO_MUCH";
    }
  }
  exports2.ChannelsTooMuchError = ChannelsTooMuchError;

  class ChargeAlreadyRefundedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The transaction was already refunded." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHARGE_ALREADY_REFUNDED";
    }
  }
  exports2.ChargeAlreadyRefundedError = ChargeAlreadyRefundedError;

  class ChargeIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified charge_id is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHARGE_ID_EMPTY";
    }
  }
  exports2.ChargeIdEmptyError = ChargeIdEmptyError;

  class ChargeIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified charge_id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHARGE_ID_INVALID";
    }
  }
  exports2.ChargeIdInvalidError = ChargeIdInvalidError;

  class ChatAboutNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "About text has not changed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ABOUT_NOT_MODIFIED";
    }
  }
  exports2.ChatAboutNotModifiedError = ChatAboutNotModifiedError;

  class ChatAboutTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Chat about too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ABOUT_TOO_LONG";
    }
  }
  exports2.ChatAboutTooLongError = ChatAboutTooLongError;

  class ChatAdminRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You must be an admin in this chat to do this." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ADMIN_REQUIRED";
    }
  }
  exports2.ChatAdminRequiredError = ChatAdminRequiredError;

  class ChatDiscussionUnallowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't enable forum topics in a discussion group linked to a channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_DISCUSSION_UNALLOWED";
    }
  }
  exports2.ChatDiscussionUnallowedError = ChatDiscussionUnallowedError;

  class ChatForwardsRestrictedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't forward messages from a protected chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_FORWARDS_RESTRICTED";
    }
  }
  exports2.ChatForwardsRestrictedError = ChatForwardsRestrictedError;

  class ChatIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided chat ID is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ID_EMPTY";
    }
  }
  exports2.ChatIdEmptyError = ChatIdEmptyError;

  class ChatIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided chat id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_ID_INVALID";
    }
  }
  exports2.ChatIdInvalidError = ChatIdInvalidError;

  class ChatInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_INVALID";
    }
  }
  exports2.ChatInvalidError = ChatInvalidError;

  class ChatInvitePermanentError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't set an expiration date on permanent invite links." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_INVITE_PERMANENT";
    }
  }
  exports2.ChatInvitePermanentError = ChatInvitePermanentError;

  class ChatLinkExistsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The chat is public, you can't hide the history to new users." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_LINK_EXISTS";
    }
  }
  exports2.ChatLinkExistsError = ChatLinkExistsError;

  class ChatMemberAddFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Could not add participants." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_MEMBER_ADD_FAILED";
    }
  }
  exports2.ChatMemberAddFailedError = ChatMemberAddFailedError;

  class ChatNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No changes were made to chat information because the new information you passed is identical to the current information." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_NOT_MODIFIED";
    }
  }
  exports2.ChatNotModifiedError = ChatNotModifiedError;

  class ChatPublicRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can only enable join requests in public groups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_PUBLIC_REQUIRED";
    }
  }
  exports2.ChatPublicRequiredError = ChatPublicRequiredError;

  class ChatRestrictedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't send messages in this chat, you were restricted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_RESTRICTED";
    }
  }
  exports2.ChatRestrictedError = ChatRestrictedError;

  class ChatRevokeDateUnsupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "`min_date` and `max_date` are not available for using with non-user peers." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_REVOKE_DATE_UNSUPPORTED";
    }
  }
  exports2.ChatRevokeDateUnsupportedError = ChatRevokeDateUnsupportedError;

  class ChatSendInlineForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't send inline messages in this group." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_SEND_INLINE_FORBIDDEN";
    }
  }
  exports2.ChatSendInlineForbiddenError = ChatSendInlineForbiddenError;

  class ChatTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No chat title provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_TITLE_EMPTY";
    }
  }
  exports2.ChatTitleEmptyError = ChatTitleEmptyError;

  class ChatTooBigError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This method is not available for groups with more than `chat_read_mark_size_threshold` members, [see client configuration &raquo;](https://core.telegram.org/api/config#client-configuration)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_TOO_BIG";
    }
  }
  exports2.ChatTooBigError = ChatTooBigError;

  class ChatWriteForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't write in this chat." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHAT_WRITE_FORBIDDEN";
    }
  }
  exports2.ChatWriteForbiddenError = ChatWriteForbiddenError;

  class ChatlinkSlugEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified slug is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHATLINK_SLUG_EMPTY";
    }
  }
  exports2.ChatlinkSlugEmptyError = ChatlinkSlugEmptyError;

  class ChatlinkSlugExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified [business chat link](https://core.telegram.org/api/business#business-chat-links) has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHATLINK_SLUG_EXPIRED";
    }
  }
  exports2.ChatlinkSlugExpiredError = ChatlinkSlugExpiredError;

  class ChatlinksTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many [business chat links](https://core.telegram.org/api/business#business-chat-links) were created, please delete some older links." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHATLINKS_TOO_MUCH";
    }
  }
  exports2.ChatlinksTooMuchError = ChatlinksTooMuchError;

  class ChatlistExcludeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `exclude_peers` are invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHATLIST_EXCLUDE_INVALID";
    }
  }
  exports2.ChatlistExcludeInvalidError = ChatlistExcludeInvalidError;

  class ChatlistsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You have created too many folder links, hitting the `chatlist_invites_limit_default`/`chatlist_invites_limit_premium` [limits &raquo;](https://core.telegram.org/api/config#chatlist-invites-limit-default)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CHATLISTS_TOO_MUCH";
    }
  }
  exports2.ChatlistsTooMuchError = ChatlistsTooMuchError;

  class CodeEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided code is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CODE_EMPTY";
    }
  }
  exports2.CodeEmptyError = CodeEmptyError;

  class CodeHashInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Code hash invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CODE_HASH_INVALID";
    }
  }
  exports2.CodeHashInvalidError = CodeHashInvalidError;

  class CodeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Code invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CODE_INVALID";
    }
  }
  exports2.CodeInvalidError = CodeInvalidError;

  class CollectibleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified collectible is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "COLLECTIBLE_INVALID";
    }
  }
  exports2.CollectibleInvalidError = CollectibleInvalidError;

  class CollectibleNotFoundError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified collectible could not be found." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "COLLECTIBLE_NOT_FOUND";
    }
  }
  exports2.CollectibleNotFoundError = CollectibleNotFoundError;

  class CollectionIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified collection ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "COLLECTION_ID_INVALID";
    }
  }
  exports2.CollectionIdInvalidError = CollectionIdInvalidError;

  class ColorInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified color palette ID was invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "COLOR_INVALID";
    }
  }
  exports2.ColorInvalidError = ColorInvalidError;

  class ConnectionApiIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided API id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_API_ID_INVALID";
    }
  }
  exports2.ConnectionApiIdInvalidError = ConnectionApiIdInvalidError;

  class ConnectionAppVersionEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "App version is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_APP_VERSION_EMPTY";
    }
  }
  exports2.ConnectionAppVersionEmptyError = ConnectionAppVersionEmptyError;

  class ConnectionIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified connection ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_ID_INVALID";
    }
  }
  exports2.ConnectionIdInvalidError = ConnectionIdInvalidError;

  class ConnectionLayerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Layer invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONNECTION_LAYER_INVALID";
    }
  }
  exports2.ConnectionLayerInvalidError = ConnectionLayerInvalidError;

  class ContactAddMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Contact to add is missing." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONTACT_ADD_MISSING";
    }
  }
  exports2.ContactAddMissingError = ContactAddMissingError;

  class ContactIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided contact ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONTACT_ID_INVALID";
    }
  }
  exports2.ContactIdInvalidError = ContactIdInvalidError;

  class ContactMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified user is not a contact." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONTACT_MISSING";
    }
  }
  exports2.ContactMissingError = ContactMissingError;

  class ContactNameEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Contact name empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONTACT_NAME_EMPTY";
    }
  }
  exports2.ContactNameEmptyError = ContactNameEmptyError;

  class ContactReqMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Missing contact request." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CONTACT_REQ_MISSING";
    }
  }
  exports2.ContactReqMissingError = ContactReqMissingError;

  class CreateCallFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An error occurred while creating the call." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CREATE_CALL_FAILED";
    }
  }
  exports2.CreateCallFailedError = CreateCallFailedError;

  class CredentialInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified credential is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CREDENTIAL_INVALID";
    }
  }
  exports2.CredentialInvalidError = CredentialInvalidError;

  class CurrencyTotalAmountInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The total amount of all prices is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CURRENCY_TOTAL_AMOUNT_INVALID";
    }
  }
  exports2.CurrencyTotalAmountInvalidError = CurrencyTotalAmountInvalidError;

  class CustomReactionsTooManyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many custom reactions were specified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "CUSTOM_REACTIONS_TOO_MANY";
    }
  }
  exports2.CustomReactionsTooManyError = CustomReactionsTooManyError;

  class DataHashSizeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The size of the specified secureValueErrorData.data_hash is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DATA_HASH_SIZE_INVALID";
    }
  }
  exports2.DataHashSizeInvalidError = DataHashSizeInvalidError;

  class DataInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Encrypted data invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DATA_INVALID";
    }
  }
  exports2.DataInvalidError = DataInvalidError;

  class DataJsonInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided JSON data is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DATA_JSON_INVALID";
    }
  }
  exports2.DataJsonInvalidError = DataJsonInvalidError;

  class DataTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Data too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DATA_TOO_LONG";
    }
  }
  exports2.DataTooLongError = DataTooLongError;

  class DateEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Date empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DATE_EMPTY";
    }
  }
  exports2.DateEmptyError = DateEmptyError;

  class DcIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided DC ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DC_ID_INVALID";
    }
  }
  exports2.DcIdInvalidError = DcIdInvalidError;

  class DhGAInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "g_a invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DH_G_A_INVALID";
    }
  }
  exports2.DhGAInvalidError = DhGAInvalidError;

  class DocumentInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified document is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "DOCUMENT_INVALID";
    }
  }
  exports2.DocumentInvalidError = DocumentInvalidError;

  class EffectChatInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Message [effects](https://core.telegram.org/api/effects) can only be used in private 1-on-1 chats, but the caller tried to send a message with an effect to a group or channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EFFECT_CHAT_INVALID";
    }
  }
  exports2.EffectChatInvalidError = EffectChatInvalidError;

  class EffectIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified effect ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EFFECT_ID_INVALID";
    }
  }
  exports2.EffectIdInvalidError = EffectIdInvalidError;

  class EmailHashExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Email hash expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMAIL_HASH_EXPIRED";
    }
  }
  exports2.EmailHashExpiredError = EmailHashExpiredError;

  class EmailInstallMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Attempting to send a code to the recovery email, but no email is configured." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMAIL_INSTALL_MISSING";
    }
  }
  exports2.EmailInstallMissingError = EmailInstallMissingError;

  class EmailInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified email is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMAIL_INVALID";
    }
  }
  exports2.EmailInvalidError = EmailInvalidError;

  class EmailNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified email cannot be used to complete the operation." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMAIL_NOT_ALLOWED";
    }
  }
  exports2.EmailNotAllowedError = EmailNotAllowedError;

  class EmailNotSetupError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "In order to change the login email with emailVerifyPurposeLoginChange, an existing login email must already be set using emailVerifyPurposeLoginSetup." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMAIL_NOT_SETUP";
    }
  }
  exports2.EmailNotSetupError = EmailNotSetupError;

  class EmailUnconfirmedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const codeLength = Number(args.capture || 0);
      const message = "The provided email isn't confirmed, " + codeLength + " is the length of the verification code that was just sent to the email: use [account.verifyEmail](https://core.telegram.org/method/account.verifyEmail) to enter the received verification code and enable the recovery email." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.codeLength = codeLength;
    }
  }
  exports2.EmailUnconfirmedError = EmailUnconfirmedError;

  class EmailVerifyExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The verification email has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMAIL_VERIFY_EXPIRED";
    }
  }
  exports2.EmailVerifyExpiredError = EmailVerifyExpiredError;

  class EmojiInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified theme emoji is valid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMOJI_INVALID";
    }
  }
  exports2.EmojiInvalidError = EmojiInvalidError;

  class EmojiMarkupInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `video_emoji_markup` was invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMOJI_MARKUP_INVALID";
    }
  }
  exports2.EmojiMarkupInvalidError = EmojiMarkupInvalidError;

  class EmojiNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The theme wasn't changed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMOJI_NOT_MODIFIED";
    }
  }
  exports2.EmojiNotModifiedError = EmojiNotModifiedError;

  class EmoticonEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The emoji is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMOTICON_EMPTY";
    }
  }
  exports2.EmoticonEmptyError = EmoticonEmptyError;

  class EmoticonInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified emoji is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMOTICON_INVALID";
    }
  }
  exports2.EmoticonInvalidError = EmoticonInvalidError;

  class EmoticonStickerpackMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "inputStickerSetDice.emoji cannot be empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EMOTICON_STICKERPACK_MISSING";
    }
  }
  exports2.EmoticonStickerpackMissingError = EmoticonStickerpackMissingError;

  class EncryptedMessageInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Encrypted message invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENCRYPTED_MESSAGE_INVALID";
    }
  }
  exports2.EncryptedMessageInvalidError = EncryptedMessageInvalidError;

  class EncryptionAlreadyAcceptedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Secret chat already accepted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENCRYPTION_ALREADY_ACCEPTED";
    }
  }
  exports2.EncryptionAlreadyAcceptedError = EncryptionAlreadyAcceptedError;

  class EncryptionAlreadyDeclinedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The secret chat was already declined." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENCRYPTION_ALREADY_DECLINED";
    }
  }
  exports2.EncryptionAlreadyDeclinedError = EncryptionAlreadyDeclinedError;

  class EncryptionDeclinedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The secret chat was declined." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENCRYPTION_DECLINED";
    }
  }
  exports2.EncryptionDeclinedError = EncryptionDeclinedError;

  class EncryptionIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided secret chat ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENCRYPTION_ID_INVALID";
    }
  }
  exports2.EncryptionIdInvalidError = EncryptionIdInvalidError;

  class EntitiesTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You provided too many styled message entities." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENTITIES_TOO_LONG";
    }
  }
  exports2.EntitiesTooLongError = EntitiesTooLongError;

  class EntityBoundsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A specified [entity offset or length](https://core.telegram.org/api/entities#entity-length) is invalid, see [here &raquo;](https://core.telegram.org/api/entities#entity-length) for info on how to properly compute the entity offset/length." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENTITY_BOUNDS_INVALID";
    }
  }
  exports2.EntityBoundsInvalidError = EntityBoundsInvalidError;

  class EntityDateFormatInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the passed messageEntityFormattedDate objects has an invalid format (i.e. an invalid combination of the format flags)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENTITY_DATE_FORMAT_INVALID";
    }
  }
  exports2.EntityDateFormatInvalidError = EntityDateFormatInvalidError;

  class EntityDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the passed messageEntityFormattedDate objects has an invalid date: the allowed value ranges from `0` to the current date plus 1098 days (`time()+1098*86400`)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENTITY_DATE_INVALID";
    }
  }
  exports2.EntityDateInvalidError = EntityDateInvalidError;

  class EntityDateTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The maximum text span that can be covered by a date entity is 31 UTF-16 code units if any of the date formatting flags is set, or 127 UTF-16 code units without.  ." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENTITY_DATE_TOO_LONG";
    }
  }
  exports2.EntityDateTooLongError = EntityDateTooLongError;

  class EntityMentionUserInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You mentioned an invalid user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ENTITY_MENTION_USER_INVALID";
    }
  }
  exports2.EntityMentionUserInvalidError = EntityMentionUserInvalidError;

  class ErrorTextEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided error message is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ERROR_TEXT_EMPTY";
    }
  }
  exports2.ErrorTextEmptyError = ErrorTextEmptyError;

  class ExpireDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified expiration date is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXPIRE_DATE_INVALID";
    }
  }
  exports2.ExpireDateInvalidError = ExpireDateInvalidError;

  class ExpiresAtInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `expires_at` timestamp is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXPIRES_AT_INVALID";
    }
  }
  exports2.ExpiresAtInvalidError = ExpiresAtInvalidError;

  class ExportCardInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Provided card is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXPORT_CARD_INVALID";
    }
  }
  exports2.ExportCardInvalidError = ExportCardInvalidError;

  class ExtendedMediaAmountInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `stars_amount` of the passed [inputMediaPaidMedia](https://core.telegram.org/constructor/inputMediaPaidMedia) is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXTENDED_MEDIA_AMOUNT_INVALID";
    }
  }
  exports2.ExtendedMediaAmountInvalidError = ExtendedMediaAmountInvalidError;

  class ExtendedMediaEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified extended media is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXTENDED_MEDIA_EMPTY";
    }
  }
  exports2.ExtendedMediaEmptyError = ExtendedMediaEmptyError;

  class ExtendedMediaInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified paid media is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXTENDED_MEDIA_INVALID";
    }
  }
  exports2.ExtendedMediaInvalidError = ExtendedMediaInvalidError;

  class ExtendedMediaPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Paid media is not allowed for the target peer." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXTENDED_MEDIA_PEER_INVALID";
    }
  }
  exports2.ExtendedMediaPeerInvalidError = ExtendedMediaPeerInvalidError;

  class ExternalUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "External URL invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "EXTERNAL_URL_INVALID";
    }
  }
  exports2.ExternalUrlInvalidError = ExternalUrlInvalidError;

  class FileContentTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "File content-type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_CONTENT_TYPE_INVALID";
    }
  }
  exports2.FileContentTypeInvalidError = FileContentTypeInvalidError;

  class FileEmtpyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An empty file was provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_EMTPY";
    }
  }
  exports2.FileEmtpyError = FileEmtpyError;

  class FileIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided file id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_ID_INVALID";
    }
  }
  exports2.FileIdInvalidError = FileIdInvalidError;

  class FilePartEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided file part is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_EMPTY";
    }
  }
  exports2.FilePartEmptyError = FilePartEmptyError;

  class FilePartInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The file part number is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_INVALID";
    }
  }
  exports2.FilePartInvalidError = FilePartInvalidError;

  class FilePartLengthInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The length of a file part is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_LENGTH_INVALID";
    }
  }
  exports2.FilePartLengthInvalidError = FilePartLengthInvalidError;

  class FilePartSizeChangedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Provided file part size has changed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_SIZE_CHANGED";
    }
  }
  exports2.FilePartSizeChangedError = FilePartSizeChangedError;

  class FilePartSizeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided file part size is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_SIZE_INVALID";
    }
  }
  exports2.FilePartSizeInvalidError = FilePartSizeInvalidError;

  class FilePartTooBigError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The uploaded file part is too big." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_TOO_BIG";
    }
  }
  exports2.FilePartTooBigError = FilePartTooBigError;

  class FilePartTooSmallError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The size of the uploaded file part is too small, please see the documentation for the allowed sizes." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PART_TOO_SMALL";
    }
  }
  exports2.FilePartTooSmallError = FilePartTooSmallError;

  class FilePartsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The number of file parts is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_PARTS_INVALID";
    }
  }
  exports2.FilePartsInvalidError = FilePartsInvalidError;

  class FileReferenceEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "The file reference of the media file at offset " + value + " in the multi_media array is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.FileReferenceEmptyError = FileReferenceEmptyError;

  class FileReferenceExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "The file reference of the media file at index " + value + " in the passed media array expired, it [must be refreshed as specified in the documentation](https://core.telegram.org/api/file-references). ." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.FileReferenceExpiredError = FileReferenceExpiredError;

  class FileReferenceInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "The [file reference](https://core.telegram.org/api/file-references) of the media file at index " + value + " in the passed media array is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.FileReferenceInvalidError = FileReferenceInvalidError;

  class FileTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An empty file title was specified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_TITLE_EMPTY";
    }
  }
  exports2.FileTitleEmptyError = FileTitleEmptyError;

  class FileTokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The master DC did not accept the `file_token` (e.g., the token has expired). Continue downloading the file from the master DC using upload.getFile." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILE_TOKEN_INVALID";
    }
  }
  exports2.FileTokenInvalidError = FileTokenInvalidError;

  class FilterIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified filter ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILTER_ID_INVALID";
    }
  }
  exports2.FilterIdInvalidError = FilterIdInvalidError;

  class FilterIncludeEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The include_peers vector of the filter is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILTER_INCLUDE_EMPTY";
    }
  }
  exports2.FilterIncludeEmptyError = FilterIncludeEmptyError;

  class FilterNotSupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified filter cannot be used in this context." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILTER_NOT_SUPPORTED";
    }
  }
  exports2.FilterNotSupportedError = FilterNotSupportedError;

  class FilterTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The title field of the filter is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FILTER_TITLE_EMPTY";
    }
  }
  exports2.FilterTitleEmptyError = FilterTitleEmptyError;

  class FirstnameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The first name is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FIRSTNAME_INVALID";
    }
  }
  exports2.FirstnameInvalidError = FirstnameInvalidError;

  class FolderIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An empty folder ID was specified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FOLDER_ID_EMPTY";
    }
  }
  exports2.FolderIdEmptyError = FolderIdEmptyError;

  class FolderIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid folder ID." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FOLDER_ID_INVALID";
    }
  }
  exports2.FolderIdInvalidError = FolderIdInvalidError;

  class FormExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The form was generated more than 10 minutes ago and has expired, please re-generate it using [payments.getPaymentForm](https://core.telegram.org/method/payments.getPaymentForm) and pass the new `form_id`." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FORM_EXPIRED";
    }
  }
  exports2.FormExpiredError = FormExpiredError;

  class FormIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified form ID is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FORM_ID_EMPTY";
    }
  }
  exports2.FormIdEmptyError = FormIdEmptyError;

  class FormSubmitDuplicateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The same payment form was already submitted.  ." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FORM_SUBMIT_DUPLICATE";
    }
  }
  exports2.FormSubmitDuplicateError = FormSubmitDuplicateError;

  class FormUnsupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Please update your client." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FORM_UNSUPPORTED";
    }
  }
  exports2.FormUnsupportedError = FormUnsupportedError;

  class ForumEnabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't execute the specified action because the group is a [forum](https://core.telegram.org/api/forum), disable forum functionality to continue." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FORUM_ENABLED";
    }
  }
  exports2.ForumEnabledError = ForumEnabledError;

  class FreshChangeAdminsForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You were just elected admin, you can't add or modify other admins yet." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FRESH_CHANGE_ADMINS_FORBIDDEN";
    }
  }
  exports2.FreshChangeAdminsForbiddenError = FreshChangeAdminsForbiddenError;

  class FromMessageBotDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots can't use fromMessage min constructors." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FROM_MESSAGE_BOT_DISABLED";
    }
  }
  exports2.FromMessageBotDisabledError = FromMessageBotDisabledError;

  class FromPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified from_id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FROM_PEER_INVALID";
    }
  }
  exports2.FromPeerInvalidError = FromPeerInvalidError;

  class FrozenParticipantMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The current account is [frozen](https://core.telegram.org/api/auth#frozen-accounts), and cannot access the specified peer." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "FROZEN_PARTICIPANT_MISSING";
    }
  }
  exports2.FrozenParticipantMissingError = FrozenParticipantMissingError;

  class GameBotInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots can't send another bot's game." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GAME_BOT_INVALID";
    }
  }
  exports2.GameBotInvalidError = GameBotInvalidError;

  class GeneralModifyIconForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = `You can't modify the icon of the "General" topic.` + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GENERAL_MODIFY_ICON_FORBIDDEN";
    }
  }
  exports2.GeneralModifyIconForbiddenError = GeneralModifyIconForbiddenError;

  class GeoPointInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid geoposition provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GEO_POINT_INVALID";
    }
  }
  exports2.GeoPointInvalidError = GeoPointInvalidError;

  class GifContentTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "GIF content-type invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GIF_CONTENT_TYPE_INVALID";
    }
  }
  exports2.GifContentTypeInvalidError = GifContentTypeInvalidError;

  class GifIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided GIF ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GIF_ID_INVALID";
    }
  }
  exports2.GifIdInvalidError = GifIdInvalidError;

  class GiftMonthsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The value passed in invoice.inputInvoicePremiumGiftStars.months is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GIFT_MONTHS_INVALID";
    }
  }
  exports2.GiftMonthsInvalidError = GiftMonthsInvalidError;

  class GiftSlugExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified gift slug has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GIFT_SLUG_EXPIRED";
    }
  }
  exports2.GiftSlugExpiredError = GiftSlugExpiredError;

  class GiftSlugInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified slug is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GIFT_SLUG_INVALID";
    }
  }
  exports2.GiftSlugInvalidError = GiftSlugInvalidError;

  class GiftStarsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified amount of stars is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GIFT_STARS_INVALID";
    }
  }
  exports2.GiftStarsInvalidError = GiftStarsInvalidError;

  class GraphExpiredReloadError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This graph has expired, please obtain a new graph token." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GRAPH_EXPIRED_RELOAD";
    }
  }
  exports2.GraphExpiredReloadError = GraphExpiredReloadError;

  class GraphInvalidReloadError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid graph token provided, please reload the stats and provide the updated token." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GRAPH_INVALID_RELOAD";
    }
  }
  exports2.GraphInvalidReloadError = GraphInvalidReloadError;

  class GraphOutdatedReloadError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The graph is outdated, please get a new async token using stats.getBroadcastStats." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GRAPH_OUTDATED_RELOAD";
    }
  }
  exports2.GraphOutdatedReloadError = GraphOutdatedReloadError;

  class GroupcallAlreadyDiscardedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The group call was already discarded." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_ALREADY_DISCARDED";
    }
  }
  exports2.GroupcallAlreadyDiscardedError = GroupcallAlreadyDiscardedError;

  class GroupcallForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified group call cannot be used in this context." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_FORBIDDEN";
    }
  }
  exports2.GroupcallForbiddenError = GroupcallForbiddenError;

  class GroupcallInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified group call is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_INVALID";
    }
  }
  exports2.GroupcallInvalidError = GroupcallInvalidError;

  class GroupcallJoinMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You haven't joined this group call." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_JOIN_MISSING";
    }
  }
  exports2.GroupcallJoinMissingError = GroupcallJoinMissingError;

  class GroupcallNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Group call settings weren't modified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_NOT_MODIFIED";
    }
  }
  exports2.GroupcallNotModifiedError = GroupcallNotModifiedError;

  class GroupcallSsrcDuplicateMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The app needs to retry joining the group call with a new SSRC value." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPCALL_SSRC_DUPLICATE_MUCH";
    }
  }
  exports2.GroupcallSsrcDuplicateMuchError = GroupcallSsrcDuplicateMuchError;

  class GroupedMediaInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid grouped media." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "GROUPED_MEDIA_INVALID";
    }
  }
  exports2.GroupedMediaInvalidError = GroupedMediaInvalidError;

  class HashInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided hash is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "HASH_INVALID";
    }
  }
  exports2.HashInvalidError = HashInvalidError;

  class HashSizeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The size of the specified secureValueError.hash is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "HASH_SIZE_INVALID";
    }
  }
  exports2.HashSizeInvalidError = HashSizeInvalidError;

  class HashtagInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified hashtag is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "HASHTAG_INVALID";
    }
  }
  exports2.HashtagInvalidError = HashtagInvalidError;

  class HideRequesterMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The join request was missing or was already handled." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "HIDE_REQUESTER_MISSING";
    }
  }
  exports2.HideRequesterMissingError = HideRequesterMissingError;

  class IdExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed prepared inline message ID has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ID_EXPIRED";
    }
  }
  exports2.IdExpiredError = IdExpiredError;

  class IdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ID_INVALID";
    }
  }
  exports2.IdInvalidError = IdInvalidError;

  class ImageProcessFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Failure while processing image." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "IMAGE_PROCESS_FAILED";
    }
  }
  exports2.ImageProcessFailedError = ImageProcessFailedError;

  class ImportFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified chat export file is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "IMPORT_FILE_INVALID";
    }
  }
  exports2.ImportFileInvalidError = ImportFileInvalidError;

  class ImportFormatDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The date specified in the import file is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "IMPORT_FORMAT_DATE_INVALID";
    }
  }
  exports2.ImportFormatDateInvalidError = ImportFormatDateInvalidError;

  class ImportFormatUnrecognizedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified chat export file was exported from an unsupported chat app." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "IMPORT_FORMAT_UNRECOGNIZED";
    }
  }
  exports2.ImportFormatUnrecognizedError = ImportFormatUnrecognizedError;

  class ImportIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified import ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "IMPORT_ID_INVALID";
    }
  }
  exports2.ImportIdInvalidError = ImportIdInvalidError;

  class ImportTokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified token is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "IMPORT_TOKEN_INVALID";
    }
  }
  exports2.ImportTokenInvalidError = ImportTokenInvalidError;

  class InlineResultExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The inline query expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INLINE_RESULT_EXPIRED";
    }
  }
  exports2.InlineResultExpiredError = InlineResultExpiredError;

  class InputChatlistInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified folder is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_CHATLIST_INVALID";
    }
  }
  exports2.InputChatlistInvalidError = InputChatlistInvalidError;

  class InputFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified [InputFile](https://core.telegram.org/type/InputFile) is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_FILE_INVALID";
    }
  }
  exports2.InputFileInvalidError = InputFileInvalidError;

  class InputFilterInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified filter is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_FILTER_INVALID";
    }
  }
  exports2.InputFilterInvalidError = InputFilterInvalidError;

  class InputPeersEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified peer array is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_PEERS_EMPTY";
    }
  }
  exports2.InputPeersEmptyError = InputPeersEmptyError;

  class InputPurposeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified payment purpose is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_PURPOSE_INVALID";
    }
  }
  exports2.InputPurposeInvalidError = InputPurposeInvalidError;

  class InputStarsAmountInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified offer amount in stars is invalid, see [here &raquo;](https://core.telegram.org/api/gifts#collectible-gift-purchase-offers) for the allowed range." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_STARS_AMOUNT_INVALID";
    }
  }
  exports2.InputStarsAmountInvalidError = InputStarsAmountInvalidError;

  class InputStarsNanosInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = " The specified offer amount in nanotons is invalid, see [here &raquo;](https://core.telegram.org/api/gifts#collectible-gift-purchase-offers) for the allowed range." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_STARS_NANOS_INVALID";
    }
  }
  exports2.InputStarsNanosInvalidError = InputStarsNanosInvalidError;

  class InputTextEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified text is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_TEXT_EMPTY";
    }
  }
  exports2.InputTextEmptyError = InputTextEmptyError;

  class InputTextTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified text is too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_TEXT_TOO_LONG";
    }
  }
  exports2.InputTextTooLongError = InputTextTooLongError;

  class InputUserDeactivatedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified user was deleted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INPUT_USER_DEACTIVATED";
    }
  }
  exports2.InputUserDeactivatedError = InputUserDeactivatedError;

  class InviteForbiddenWithJoinasError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "If the user has anonymously joined a group call as a channel, they can't invite other users to the group call because that would cause deanonymization, because the invite would be sent using the original user ID, not the anonymized channel ID." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_FORBIDDEN_WITH_JOINAS";
    }
  }
  exports2.InviteForbiddenWithJoinasError = InviteForbiddenWithJoinasError;

  class InviteHashEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The invite hash is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_HASH_EMPTY";
    }
  }
  exports2.InviteHashEmptyError = InviteHashEmptyError;

  class InviteHashExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The invite link has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_HASH_EXPIRED";
    }
  }
  exports2.InviteHashExpiredError = InviteHashExpiredError;

  class InviteHashInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The invite hash is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_HASH_INVALID";
    }
  }
  exports2.InviteHashInvalidError = InviteHashInvalidError;

  class InviteRequestSentError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You have successfully requested to join this chat or channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_REQUEST_SENT";
    }
  }
  exports2.InviteRequestSentError = InviteRequestSentError;

  class InviteRevokedMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invite link was already revoked or is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_REVOKED_MISSING";
    }
  }
  exports2.InviteRevokedMissingError = InviteRevokedMissingError;

  class InviteSlugEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invite slug is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_SLUG_EMPTY";
    }
  }
  exports2.InviteSlugEmptyError = InviteSlugEmptyError;

  class InviteSlugExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified chat folder link has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_SLUG_EXPIRED";
    }
  }
  exports2.InviteSlugExpiredError = InviteSlugExpiredError;

  class InviteSlugInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invitation slug is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITE_SLUG_INVALID";
    }
  }
  exports2.InviteSlugInvalidError = InviteSlugInvalidError;

  class InvitesTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The maximum number of per-folder invites specified by the `chatlist_invites_limit_default`/`chatlist_invites_limit_premium` [client configuration parameters &raquo;](https://core.telegram.org/api/config#chatlist-invites-limit-default) was reached." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVITES_TOO_MUCH";
    }
  }
  exports2.InvitesTooMuchError = InvitesTooMuchError;

  class InvoiceInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invoice is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVOICE_INVALID";
    }
  }
  exports2.InvoiceInvalidError = InvoiceInvalidError;

  class InvoicePayloadInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invoice payload is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "INVOICE_PAYLOAD_INVALID";
    }
  }
  exports2.InvoicePayloadInvalidError = InvoicePayloadInvalidError;

  class JoinAsPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified peer cannot be used to join a group call." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "JOIN_AS_PEER_INVALID";
    }
  }
  exports2.JoinAsPeerInvalidError = JoinAsPeerInvalidError;

  class LangCodeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified language code is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LANG_CODE_INVALID";
    }
  }
  exports2.LangCodeInvalidError = LangCodeInvalidError;

  class LangCodeNotSupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified language code is not supported." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LANG_CODE_NOT_SUPPORTED";
    }
  }
  exports2.LangCodeNotSupportedError = LangCodeNotSupportedError;

  class LangPackInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided language pack is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LANG_PACK_INVALID";
    }
  }
  exports2.LangPackInvalidError = LangPackInvalidError;

  class LanguageInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified lang_code is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LANGUAGE_INVALID";
    }
  }
  exports2.LanguageInvalidError = LanguageInvalidError;

  class LastnameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The last name is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LASTNAME_INVALID";
    }
  }
  exports2.LastnameInvalidError = LastnameInvalidError;

  class LimitInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided limit is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LIMIT_INVALID";
    }
  }
  exports2.LimitInvalidError = LimitInvalidError;

  class LimitPerPostInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified reactions_limit value is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LIMIT_PER_POST_INVALID";
    }
  }
  exports2.LimitPerPostInvalidError = LimitPerPostInvalidError;

  class LinkNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Discussion link not modified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LINK_NOT_MODIFIED";
    }
  }
  exports2.LinkNotModifiedError = LinkNotModifiedError;

  class LocationInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided location is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "LOCATION_INVALID";
    }
  }
  exports2.LocationInvalidError = LocationInvalidError;

  class ManagerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified manager bot is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MANAGER_INVALID";
    }
  }
  exports2.ManagerInvalidError = ManagerInvalidError;

  class ManagerPermissionMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified manager bot does not have the [user](https://core.telegram.org/constructor/user).`bot_can_manage_bots` flag set." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MANAGER_PERMISSION_MISSING";
    }
  }
  exports2.ManagerPermissionMissingError = ManagerPermissionMissingError;

  class MaxDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified maximum date is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MAX_DATE_INVALID";
    }
  }
  exports2.MaxDateInvalidError = MaxDateInvalidError;

  class MaxIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided max ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MAX_ID_INVALID";
    }
  }
  exports2.MaxIdInvalidError = MaxIdInvalidError;

  class MaxQtsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified max_qts is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MAX_QTS_INVALID";
    }
  }
  exports2.MaxQtsInvalidError = MaxQtsInvalidError;

  class Md5ChecksumInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The MD5 checksums do not match." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MD5_CHECKSUM_INVALID";
    }
  }
  exports2.Md5ChecksumInvalidError = Md5ChecksumInvalidError;

  class MediaAlreadyPaidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You already paid for the specified media." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_ALREADY_PAID";
    }
  }
  exports2.MediaAlreadyPaidError = MediaAlreadyPaidError;

  class MediaCaptionTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The caption is too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_CAPTION_TOO_LONG";
    }
  }
  exports2.MediaCaptionTooLongError = MediaCaptionTooLongError;

  class MediaEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided media object is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_EMPTY";
    }
  }
  exports2.MediaEmptyError = MediaEmptyError;

  class MediaFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified media file is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_FILE_INVALID";
    }
  }
  exports2.MediaFileInvalidError = MediaFileInvalidError;

  class MediaGroupedInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You tried to send media of different types in an album." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_GROUPED_INVALID";
    }
  }
  exports2.MediaGroupedInvalidError = MediaGroupedInvalidError;

  class MediaInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Media invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_INVALID";
    }
  }
  exports2.MediaInvalidError = MediaInvalidError;

  class MediaNewInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The new media is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_NEW_INVALID";
    }
  }
  exports2.MediaNewInvalidError = MediaNewInvalidError;

  class MediaPrevInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Previous media invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_PREV_INVALID";
    }
  }
  exports2.MediaPrevInvalidError = MediaPrevInvalidError;

  class MediaTtlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified media TTL is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_TTL_INVALID";
    }
  }
  exports2.MediaTtlInvalidError = MediaTtlInvalidError;

  class MediaTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified media type cannot be used in stories." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_TYPE_INVALID";
    }
  }
  exports2.MediaTypeInvalidError = MediaTypeInvalidError;

  class MediaVideoStoryMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A non-story video cannot be repubblished as a story (emitted when trying to resend a non-story video as a story using inputDocument)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEDIA_VIDEO_STORY_MISSING";
    }
  }
  exports2.MediaVideoStoryMissingError = MediaVideoStoryMissingError;

  class MegagroupGeoRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This method can only be invoked on a geogroup." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEGAGROUP_GEO_REQUIRED";
    }
  }
  exports2.MegagroupGeoRequiredError = MegagroupGeoRequiredError;

  class MegagroupIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid supergroup ID." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEGAGROUP_ID_INVALID";
    }
  }
  exports2.MegagroupIdInvalidError = MegagroupIdInvalidError;

  class MegagroupPrehistoryHiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Group with hidden history for new members can't be set as discussion groups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEGAGROUP_PREHISTORY_HIDDEN";
    }
  }
  exports2.MegagroupPrehistoryHiddenError = MegagroupPrehistoryHiddenError;

  class MegagroupRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can only use this method on a supergroup." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MEGAGROUP_REQUIRED";
    }
  }
  exports2.MegagroupRequiredError = MegagroupRequiredError;

  class MessageEditTimeExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't edit this message anymore, too much time has passed since its creation." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_EDIT_TIME_EXPIRED";
    }
  }
  exports2.MessageEditTimeExpiredError = MessageEditTimeExpiredError;

  class MessageEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided message is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_EMPTY";
    }
  }
  exports2.MessageEmptyError = MessageEmptyError;

  class MessageIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided message id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_ID_INVALID";
    }
  }
  exports2.MessageIdInvalidError = MessageIdInvalidError;

  class MessageIdsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No message ids were provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_IDS_EMPTY";
    }
  }
  exports2.MessageIdsEmptyError = MessageIdsEmptyError;

  class MessageNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided message data is identical to the previous message data, the message wasn't modified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_NOT_MODIFIED";
    }
  }
  exports2.MessageNotModifiedError = MessageNotModifiedError;

  class MessageNotReadYetError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified message wasn't read yet." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_NOT_READ_YET";
    }
  }
  exports2.MessageNotReadYetError = MessageNotReadYetError;

  class MessagePollClosedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Poll closed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_POLL_CLOSED";
    }
  }
  exports2.MessagePollClosedError = MessagePollClosedError;

  class MessageRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A non-empty list of IDs must be passed to `id`." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_REQUIRED";
    }
  }
  exports2.MessageRequiredError = MessageRequiredError;

  class MessageTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided message is too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_TOO_LONG";
    }
  }
  exports2.MessageTooLongError = MessageTooLongError;

  class MessageTooOldError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The message is too old, the requested information is not available." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MESSAGE_TOO_OLD";
    }
  }
  exports2.MessageTooOldError = MessageTooOldError;

  class MethodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified method is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "METHOD_INVALID";
    }
  }
  exports2.MethodInvalidError = MethodInvalidError;

  class MinDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified minimum date is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MIN_DATE_INVALID";
    }
  }
  exports2.MinDateInvalidError = MinDateInvalidError;

  class MonthInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The number of months specified in inputInvoicePremiumGiftStars.months is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MONTH_INVALID";
    }
  }
  exports2.MonthInvalidError = MonthInvalidError;

  class MsgIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid message ID provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MSG_ID_INVALID";
    }
  }
  exports2.MsgIdInvalidError = MsgIdInvalidError;

  class MsgTooOldError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "[`chat_read_mark_expire_period` seconds](https://core.telegram.org/api/config#chat-read-mark-expire-period) have passed since the message was sent, read receipts were deleted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MSG_TOO_OLD";
    }
  }
  exports2.MsgTooOldError = MsgTooOldError;

  class MsgVoiceMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified message is not a voice message." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MSG_VOICE_MISSING";
    }
  }
  exports2.MsgVoiceMissingError = MsgVoiceMissingError;

  class MsgVoiceTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified voice message is too long to be transcribed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MSG_VOICE_TOO_LONG";
    }
  }
  exports2.MsgVoiceTooLongError = MsgVoiceTooLongError;

  class MsgWaitError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A waiting call returned an error." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MSG_WAIT_FAILED";
    }
  }
  exports2.MsgWaitError = MsgWaitError;

  class MultiMediaTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many media files for album." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "MULTI_MEDIA_TOO_LONG";
    }
  }
  exports2.MultiMediaTooLongError = MultiMediaTooLongError;

  class NameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified bot name is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NAME_INVALID";
    }
  }
  exports2.NameInvalidError = NameInvalidError;

  class NeedActionMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The caller didn't specify a valid action (either save or suggest) for the contact profile photo upload." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NEED_ACTION_MISSING";
    }
  }
  exports2.NeedActionMissingError = NeedActionMissingError;

  class NewSaltInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The new salt is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NEW_SALT_INVALID";
    }
  }
  exports2.NewSaltInvalidError = NewSaltInvalidError;

  class NewSettingsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No password is set on the current account, and no new password was specified in `new_settings`." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NEW_SETTINGS_EMPTY";
    }
  }
  exports2.NewSettingsEmptyError = NewSettingsEmptyError;

  class NewSettingsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The new password settings are invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NEW_SETTINGS_INVALID";
    }
  }
  exports2.NewSettingsInvalidError = NewSettingsInvalidError;

  class NextOffsetInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified offset is longer than 64 bytes." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NEXT_OFFSET_INVALID";
    }
  }
  exports2.NextOffsetInvalidError = NextOffsetInvalidError;

  class NoPaymentNeededError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The upgrade/transfer of the specified gift was already paid for or is free." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NO_PAYMENT_NEEDED";
    }
  }
  exports2.NoPaymentNeededError = NoPaymentNeededError;

  class NogeneralHideForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = 'Only the "General" topic with `id=1` can be hidden.' + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NOGENERAL_HIDE_FORBIDDEN";
    }
  }
  exports2.NogeneralHideForbiddenError = NogeneralHideForbiddenError;

  class NotEligibleError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The current user is not eligible to join the Peer-to-Peer Login Program." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NOT_ELIGIBLE";
    }
  }
  exports2.NotEligibleError = NotEligibleError;

  class NotJoinedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The current user hasn't joined the Peer-to-Peer Login Program." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "NOT_JOINED";
    }
  }
  exports2.NotJoinedError = NotJoinedError;

  class OffsetInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided offset is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "OFFSET_INVALID";
    }
  }
  exports2.OffsetInvalidError = OffsetInvalidError;

  class OffsetPeerIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided offset peer is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "OFFSET_PEER_ID_INVALID";
    }
  }
  exports2.OffsetPeerIdInvalidError = OffsetPeerIdInvalidError;

  class OptionInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid option selected." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "OPTION_INVALID";
    }
  }
  exports2.OptionInvalidError = OptionInvalidError;

  class OptionsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many options provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "OPTIONS_TOO_MUCH";
    }
  }
  exports2.OptionsTooMuchError = OptionsTooMuchError;

  class OrderInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified username order is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "ORDER_INVALID";
    }
  }
  exports2.OrderInvalidError = OrderInvalidError;

  class PackShortNameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Short pack name invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PACK_SHORT_NAME_INVALID";
    }
  }
  exports2.PackShortNameInvalidError = PackShortNameInvalidError;

  class PackShortNameOccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A stickerpack with this name already exists." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PACK_SHORT_NAME_OCCUPIED";
    }
  }
  exports2.PackShortNameOccupiedError = PackShortNameOccupiedError;

  class PackTitleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The stickerpack title is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PACK_TITLE_INVALID";
    }
  }
  exports2.PackTitleInvalidError = PackTitleInvalidError;

  class PackTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The masks and emojis flags are mutually exclusive." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PACK_TYPE_INVALID";
    }
  }
  exports2.PackTypeInvalidError = PackTypeInvalidError;

  class ParentPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `parent_peer` is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PARENT_PEER_INVALID";
    }
  }
  exports2.ParentPeerInvalidError = ParentPeerInvalidError;

  class ParticipantIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified participant ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PARTICIPANT_ID_INVALID";
    }
  }
  exports2.ParticipantIdInvalidError = ParticipantIdInvalidError;

  class ParticipantJoinMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Trying to enable a presentation, when the user hasn't joined the Video Chat with [phone.joinGroupCall](https://core.telegram.org/method/phone.joinGroupCall)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PARTICIPANT_JOIN_MISSING";
    }
  }
  exports2.ParticipantJoinMissingError = ParticipantJoinMissingError;

  class ParticipantVersionOutdatedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The other participant does not use an up to date telegram client with support for calls." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PARTICIPANT_VERSION_OUTDATED";
    }
  }
  exports2.ParticipantVersionOutdatedError = ParticipantVersionOutdatedError;

  class ParticipantsTooFewError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Not enough participants." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PARTICIPANTS_TOO_FEW";
    }
  }
  exports2.ParticipantsTooFewError = ParticipantsTooFewError;

  class PasskeyOriginMismatchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Third-party clients currently don't support passkeys even when changing the origin." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSKEY_ORIGIN_MISMATCH";
    }
  }
  exports2.PasskeyOriginMismatchError = PasskeyOriginMismatchError;

  class PasswordEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided password is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSWORD_EMPTY";
    }
  }
  exports2.PasswordEmptyError = PasswordEmptyError;

  class PasswordHashInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided password hash is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSWORD_HASH_INVALID";
    }
  }
  exports2.PasswordHashInvalidError = PasswordHashInvalidError;

  class PasswordMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You must [enable 2FA](https://core.telegram.org/api/srp) before executing this operation." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSWORD_MISSING";
    }
  }
  exports2.PasswordMissingError = PasswordMissingError;

  class PasswordRecoveryExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The recovery code has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSWORD_RECOVERY_EXPIRED";
    }
  }
  exports2.PasswordRecoveryExpiredError = PasswordRecoveryExpiredError;

  class PasswordRecoveryNaError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No email was set, can't recover password via email." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSWORD_RECOVERY_NA";
    }
  }
  exports2.PasswordRecoveryNaError = PasswordRecoveryNaError;

  class PasswordRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A [2FA password](https://core.telegram.org/api/srp) must be configured to use Telegram Passport." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PASSWORD_REQUIRED";
    }
  }
  exports2.PasswordRequiredError = PasswordRequiredError;

  class PasswordTooFreshError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "The password was modified less than 24 hours ago, try again in " + value + " seconds." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.PasswordTooFreshError = PasswordTooFreshError;

  class PaymentCredentialsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified payment credentials are invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PAYMENT_CREDENTIALS_INVALID";
    }
  }
  exports2.PaymentCredentialsInvalidError = PaymentCredentialsInvalidError;

  class PaymentProviderInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified payment provider is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PAYMENT_PROVIDER_INVALID";
    }
  }
  exports2.PaymentProviderInvalidError = PaymentProviderInvalidError;

  class PaymentRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Payment is required for this action, see [here &raquo;](https://core.telegram.org/api/gifts) for more info." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PAYMENT_REQUIRED";
    }
  }
  exports2.PaymentRequiredError = PaymentRequiredError;

  class PeerHistoryEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't pin an empty chat with a user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PEER_HISTORY_EMPTY";
    }
  }
  exports2.PeerHistoryEmptyError = PeerHistoryEmptyError;

  class PeerIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided peer id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PEER_ID_INVALID";
    }
  }
  exports2.PeerIdInvalidError = PeerIdInvalidError;

  class PeerIdNotSupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided peer ID is not supported." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PEER_ID_NOT_SUPPORTED";
    }
  }
  exports2.PeerIdNotSupportedError = PeerIdNotSupportedError;

  class PeerTypesInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed [keyboardButtonSwitchInline](https://core.telegram.org/constructor/keyboardButtonSwitchInline).`peer_types` field is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PEER_TYPES_INVALID";
    }
  }
  exports2.PeerTypesInvalidError = PeerTypesInvalidError;

  class PeersListEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified list of peers is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PEERS_LIST_EMPTY";
    }
  }
  exports2.PeersListEmptyError = PeersListEmptyError;

  class PersistentTimestampEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Persistent timestamp empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PERSISTENT_TIMESTAMP_EMPTY";
    }
  }
  exports2.PersistentTimestampEmptyError = PersistentTimestampEmptyError;

  class PersistentTimestampInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Persistent timestamp invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PERSISTENT_TIMESTAMP_INVALID";
    }
  }
  exports2.PersistentTimestampInvalidError = PersistentTimestampInvalidError;

  class PhoneCodeEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "phone_code is missing." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_CODE_EMPTY";
    }
  }
  exports2.PhoneCodeEmptyError = PhoneCodeEmptyError;

  class PhoneCodeExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The phone code you provided has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_CODE_EXPIRED";
    }
  }
  exports2.PhoneCodeExpiredError = PhoneCodeExpiredError;

  class PhoneCodeHashEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "phone_code_hash is missing." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_CODE_HASH_EMPTY";
    }
  }
  exports2.PhoneCodeHashEmptyError = PhoneCodeHashEmptyError;

  class PhoneCodeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided phone code is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_CODE_INVALID";
    }
  }
  exports2.PhoneCodeInvalidError = PhoneCodeInvalidError;

  class PhoneHashExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An invalid or expired `phone_code_hash` was provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_HASH_EXPIRED";
    }
  }
  exports2.PhoneHashExpiredError = PhoneHashExpiredError;

  class PhoneNotOccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No user is associated to the specified phone number." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NOT_OCCUPIED";
    }
  }
  exports2.PhoneNotOccupiedError = PhoneNotOccupiedError;

  class PhoneNumberAppSignupForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't sign up using this app." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NUMBER_APP_SIGNUP_FORBIDDEN";
    }
  }
  exports2.PhoneNumberAppSignupForbiddenError = PhoneNumberAppSignupForbiddenError;

  class PhoneNumberBannedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided phone number is banned from telegram." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NUMBER_BANNED";
    }
  }
  exports2.PhoneNumberBannedError = PhoneNumberBannedError;

  class PhoneNumberFloodError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You asked for the code too many times." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NUMBER_FLOOD";
    }
  }
  exports2.PhoneNumberFloodError = PhoneNumberFloodError;

  class PhoneNumberInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The phone number is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NUMBER_INVALID";
    }
  }
  exports2.PhoneNumberInvalidError = PhoneNumberInvalidError;

  class PhoneNumberOccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The phone number is already in use." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NUMBER_OCCUPIED";
    }
  }
  exports2.PhoneNumberOccupiedError = PhoneNumberOccupiedError;

  class PhoneNumberUnoccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The phone number is not yet being used." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_NUMBER_UNOCCUPIED";
    }
  }
  exports2.PhoneNumberUnoccupiedError = PhoneNumberUnoccupiedError;

  class PhonePasswordProtectedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This phone is password protected." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHONE_PASSWORD_PROTECTED";
    }
  }
  exports2.PhonePasswordProtectedError = PhonePasswordProtectedError;

  class PhotoContentTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo mime-type invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_CONTENT_TYPE_INVALID";
    }
  }
  exports2.PhotoContentTypeInvalidError = PhotoContentTypeInvalidError;

  class PhotoContentUrlEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo URL invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_CONTENT_URL_EMPTY";
    }
  }
  exports2.PhotoContentUrlEmptyError = PhotoContentUrlEmptyError;

  class PhotoCropFileMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo crop file missing." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_CROP_FILE_MISSING";
    }
  }
  exports2.PhotoCropFileMissingError = PhotoCropFileMissingError;

  class PhotoCropSizeSmallError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo is too small." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_CROP_SIZE_SMALL";
    }
  }
  exports2.PhotoCropSizeSmallError = PhotoCropSizeSmallError;

  class PhotoExtInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The extension of the photo is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_EXT_INVALID";
    }
  }
  exports2.PhotoExtInvalidError = PhotoExtInvalidError;

  class PhotoFileMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Profile photo file missing." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_FILE_MISSING";
    }
  }
  exports2.PhotoFileMissingError = PhotoFileMissingError;

  class PhotoIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo ID invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_ID_INVALID";
    }
  }
  exports2.PhotoIdInvalidError = PhotoIdInvalidError;

  class PhotoInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_INVALID";
    }
  }
  exports2.PhotoInvalidError = PhotoInvalidError;

  class PhotoInvalidDimensionsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The photo dimensions are invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_INVALID_DIMENSIONS";
    }
  }
  exports2.PhotoInvalidDimensionsError = PhotoInvalidDimensionsError;

  class PhotoSaveFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Internal issues, try again later." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_SAVE_FILE_INVALID";
    }
  }
  exports2.PhotoSaveFileInvalidError = PhotoSaveFileInvalidError;

  class PhotoThumbUrlEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Photo thumbnail URL is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PHOTO_THUMB_URL_EMPTY";
    }
  }
  exports2.PhotoThumbUrlEmptyError = PhotoThumbUrlEmptyError;

  class PinRestrictedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't pin messages." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PIN_RESTRICTED";
    }
  }
  exports2.PinRestrictedError = PinRestrictedError;

  class PinnedDialogsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many pinned dialogs." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PINNED_DIALOGS_TOO_MUCH";
    }
  }
  exports2.PinnedDialogsTooMuchError = PinnedDialogsTooMuchError;

  class PinnedTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "There are too many pinned topics, unpin some first." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PINNED_TOO_MUCH";
    }
  }
  exports2.PinnedTooMuchError = PinnedTooMuchError;

  class PinnedTopicNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified topic is already pinned." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PINNED_TOPIC_NOT_MODIFIED";
    }
  }
  exports2.PinnedTopicNotModifiedError = PinnedTopicNotModifiedError;

  class PollAnswerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the poll answers is not acceptable." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_ANSWER_INVALID";
    }
  }
  exports2.PollAnswerInvalidError = PollAnswerInvalidError;

  class PollAnswersInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid poll answers were provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_ANSWERS_INVALID";
    }
  }
  exports2.PollAnswersInvalidError = PollAnswersInvalidError;

  class PollOptionDuplicateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Duplicate poll options provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_OPTION_DUPLICATE";
    }
  }
  exports2.PollOptionDuplicateError = PollOptionDuplicateError;

  class PollOptionInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid poll option provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_OPTION_INVALID";
    }
  }
  exports2.PollOptionInvalidError = PollOptionInvalidError;

  class PollQuestionInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the poll questions is not acceptable." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "POLL_QUESTION_INVALID";
    }
  }
  exports2.PollQuestionInvalidError = PollQuestionInvalidError;

  class PremiumAccountRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A premium account is required to execute this action." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PREMIUM_ACCOUNT_REQUIRED";
    }
  }
  exports2.PremiumAccountRequiredError = PremiumAccountRequiredError;

  class PremiumPurposeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified InputStorePaymentPurpose is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PREMIUM_PURPOSE_INVALID";
    }
  }
  exports2.PremiumPurposeInvalidError = PremiumPurposeInvalidError;

  class PricingChatInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The pricing for the [subscription](https://core.telegram.org/api/subscriptions) is invalid, the maximum price is specified in the [`stars_subscription_amount_max` config key &raquo;](https://core.telegram.org/api/config#stars-subscription-amount-max)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PRICING_CHAT_INVALID";
    }
  }
  exports2.PricingChatInvalidError = PricingChatInvalidError;

  class PrivacyKeyInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The privacy key is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PRIVACY_KEY_INVALID";
    }
  }
  exports2.PrivacyKeyInvalidError = PrivacyKeyInvalidError;

  class PrivacyTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many privacy rules were specified, the current limit is 1000." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PRIVACY_TOO_LONG";
    }
  }
  exports2.PrivacyTooLongError = PrivacyTooLongError;

  class PrivacyValueInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified privacy rule combination is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PRIVACY_VALUE_INVALID";
    }
  }
  exports2.PrivacyValueInvalidError = PrivacyValueInvalidError;

  class PublicBroadcastExpectedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "`channel` only accepts a channel, but a supergroup was passed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PUBLIC_BROADCAST_EXPECTED";
    }
  }
  exports2.PublicBroadcastExpectedError = PublicBroadcastExpectedError;

  class PublicKeyInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified e2e public key is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PUBLIC_KEY_INVALID";
    }
  }
  exports2.PublicKeyInvalidError = PublicKeyInvalidError;

  class PublicKeyRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A public key is required." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PUBLIC_KEY_REQUIRED";
    }
  }
  exports2.PublicKeyRequiredError = PublicKeyRequiredError;

  class PurposeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified payment purpose is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "PURPOSE_INVALID";
    }
  }
  exports2.PurposeInvalidError = PurposeInvalidError;

  class QueryIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The query ID is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUERY_ID_EMPTY";
    }
  }
  exports2.QueryIdEmptyError = QueryIdEmptyError;

  class QueryIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The query ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUERY_ID_INVALID";
    }
  }
  exports2.QueryIdInvalidError = QueryIdInvalidError;

  class QueryTooShortError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The query string is too short." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUERY_TOO_SHORT";
    }
  }
  exports2.QueryTooShortError = QueryTooShortError;

  class QuickRepliesBotNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "[Quick replies](https://core.telegram.org/api/business#quick-reply-shortcuts) cannot be used by bots." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUICK_REPLIES_BOT_NOT_ALLOWED";
    }
  }
  exports2.QuickRepliesBotNotAllowedError = QuickRepliesBotNotAllowedError;

  class QuickRepliesTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A maximum of [appConfig.`quick_replies_limit`](https://core.telegram.org/api/config#quick-replies-limit) shortcuts may be created, the limit was reached." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUICK_REPLIES_TOO_MUCH";
    }
  }
  exports2.QuickRepliesTooMuchError = QuickRepliesTooMuchError;

  class QuizAnswerMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can forward a quiz while hiding the original author only after choosing an option in the quiz." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUIZ_ANSWER_MISSING";
    }
  }
  exports2.QuizAnswerMissingError = QuizAnswerMissingError;

  class QuizCorrectAnswerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An invalid value was provided to the correct_answers field." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUIZ_CORRECT_ANSWER_INVALID";
    }
  }
  exports2.QuizCorrectAnswerInvalidError = QuizCorrectAnswerInvalidError;

  class QuizCorrectAnswersEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No correct quiz answer was specified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUIZ_CORRECT_ANSWERS_EMPTY";
    }
  }
  exports2.QuizCorrectAnswersEmptyError = QuizCorrectAnswersEmptyError;

  class QuizCorrectAnswersTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You specified too many correct answers in a quiz, quizzes can only have one right answer!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUIZ_CORRECT_ANSWERS_TOO_MUCH";
    }
  }
  exports2.QuizCorrectAnswersTooMuchError = QuizCorrectAnswersTooMuchError;

  class QuizMultipleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Quizzes can't have the multiple_choice flag set!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUIZ_MULTIPLE_INVALID";
    }
  }
  exports2.QuizMultipleInvalidError = QuizMultipleInvalidError;

  class QuoteTextInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `reply_to`.`quote_text` field is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "QUOTE_TEXT_INVALID";
    }
  }
  exports2.QuoteTextInvalidError = QuoteTextInvalidError;

  class RaiseHandForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot raise your hand." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RAISE_HAND_FORBIDDEN";
    }
  }
  exports2.RaiseHandForbiddenError = RaiseHandForbiddenError;

  class RandomIdDuplicateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You provided a random ID that was already used." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RANDOM_ID_DUPLICATE";
    }
  }
  exports2.RandomIdDuplicateError = RandomIdDuplicateError;

  class RandomIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Random ID empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RANDOM_ID_EMPTY";
    }
  }
  exports2.RandomIdEmptyError = RandomIdEmptyError;

  class RandomIdExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `random_id` was expired (most likely it didn't follow the required `uint64_t random_id = (time() << 32) | ((uint64_t)random_uint32_t())` format, or the specified time is too far in the past)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RANDOM_ID_EXPIRED";
    }
  }
  exports2.RandomIdExpiredError = RandomIdExpiredError;

  class RandomIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A provided random ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RANDOM_ID_INVALID";
    }
  }
  exports2.RandomIdInvalidError = RandomIdInvalidError;

  class RandomLengthInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Random length invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RANDOM_LENGTH_INVALID";
    }
  }
  exports2.RandomLengthInvalidError = RandomLengthInvalidError;

  class RangesInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid range provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RANGES_INVALID";
    }
  }
  exports2.RangesInvalidError = RangesInvalidError;

  class ReactionEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Empty reaction provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REACTION_EMPTY";
    }
  }
  exports2.ReactionEmptyError = ReactionEmptyError;

  class ReactionInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified reaction is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REACTION_INVALID";
    }
  }
  exports2.ReactionInvalidError = ReactionInvalidError;

  class ReactionsCountInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified number of reactions is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REACTIONS_COUNT_INVALID";
    }
  }
  exports2.ReactionsCountInvalidError = ReactionsCountInvalidError;

  class ReactionsTooManyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The message already has exactly `reactions_uniq_max` reaction emojis, you can't react with a new emoji, see [the docs for more info &raquo;](https://core.telegram.org/api/config#client-configuration)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REACTIONS_TOO_MANY";
    }
  }
  exports2.ReactionsTooManyError = ReactionsTooManyError;

  class ReceiptEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified receipt is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RECEIPT_EMPTY";
    }
  }
  exports2.ReceiptEmptyError = ReceiptEmptyError;

  class ReplyMarkupBuyEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Reply markup for buy button empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_MARKUP_BUY_EMPTY";
    }
  }
  exports2.ReplyMarkupBuyEmptyError = ReplyMarkupBuyEmptyError;

  class ReplyMarkupGameEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A game message is being edited, but the newly provided keyboard doesn't have a keyboardButtonGame button." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_MARKUP_GAME_EMPTY";
    }
  }
  exports2.ReplyMarkupGameEmptyError = ReplyMarkupGameEmptyError;

  class ReplyMarkupInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided reply markup is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_MARKUP_INVALID";
    }
  }
  exports2.ReplyMarkupInvalidError = ReplyMarkupInvalidError;

  class ReplyMarkupTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified reply_markup is too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_MARKUP_TOO_LONG";
    }
  }
  exports2.ReplyMarkupTooLongError = ReplyMarkupTooLongError;

  class ReplyMessageIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified reply-to message ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_MESSAGE_ID_INVALID";
    }
  }
  exports2.ReplyMessageIdInvalidError = ReplyMessageIdInvalidError;

  class ReplyMessagesTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Each shortcut can contain a maximum of [appConfig.`quick_reply_messages_limit`](https://core.telegram.org/api/config#quick-reply-messages-limit) messages, the limit was reached." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_MESSAGES_TOO_MUCH";
    }
  }
  exports2.ReplyMessagesTooMuchError = ReplyMessagesTooMuchError;

  class ReplyToInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `reply_to` field is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_TO_INVALID";
    }
  }
  exports2.ReplyToInvalidError = ReplyToInvalidError;

  class ReplyToMonoforumPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified inputReplyToMonoForum.monoforum_peer_id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_TO_MONOFORUM_PEER_INVALID";
    }
  }
  exports2.ReplyToMonoforumPeerInvalidError = ReplyToMonoforumPeerInvalidError;

  class ReplyToUserInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The replied-to user is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REPLY_TO_USER_INVALID";
    }
  }
  exports2.ReplyToUserInvalidError = ReplyToUserInvalidError;

  class RequestMsgExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The request specified in request_msg_id has already expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REQUEST_MSG_EXPIRED";
    }
  }
  exports2.RequestMsgExpiredError = RequestMsgExpiredError;

  class RequestTokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The master DC did not accept the `request_token` from the CDN DC. Continue downloading the file from the master DC using upload.getFile." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REQUEST_TOKEN_INVALID";
    }
  }
  exports2.RequestTokenInvalidError = RequestTokenInvalidError;

  class ResellStarsTooFewError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The offered price is too low." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESELL_STARS_TOO_FEW";
    }
  }
  exports2.ResellStarsTooFewError = ResellStarsTooFewError;

  class ResellStarsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The offered price is too high." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESELL_STARS_TOO_MUCH";
    }
  }
  exports2.ResellStarsTooMuchError = ResellStarsTooMuchError;

  class ResetRequestMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No password reset is in progress." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESET_REQUEST_MISSING";
    }
  }
  exports2.ResetRequestMissingError = ResetRequestMissingError;

  class ResultIdDuplicateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You provided a duplicate result ID." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESULT_ID_DUPLICATE";
    }
  }
  exports2.ResultIdDuplicateError = ResultIdDuplicateError;

  class ResultIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Result ID empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESULT_ID_EMPTY";
    }
  }
  exports2.ResultIdEmptyError = ResultIdEmptyError;

  class ResultIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the specified result IDs is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESULT_ID_INVALID";
    }
  }
  exports2.ResultIdInvalidError = ResultIdInvalidError;

  class ResultTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Result type invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESULT_TYPE_INVALID";
    }
  }
  exports2.ResultTypeInvalidError = ResultTypeInvalidError;

  class ResultsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Too many results were provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RESULTS_TOO_MUCH";
    }
  }
  exports2.ResultsTooMuchError = ResultsTooMuchError;

  class RevoteNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot change your vote." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "REVOTE_NOT_ALLOWED";
    }
  }
  exports2.RevoteNotAllowedError = RevoteNotAllowedError;

  class RightsNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The new admin rights are equal to the old rights, no change was made." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RIGHTS_NOT_MODIFIED";
    }
  }
  exports2.RightsNotModifiedError = RightsNotModifiedError;

  class RingtoneInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified ringtone is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RINGTONE_INVALID";
    }
  }
  exports2.RingtoneInvalidError = RingtoneInvalidError;

  class RingtoneMimeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The MIME type for the ringtone is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RINGTONE_MIME_INVALID";
    }
  }
  exports2.RingtoneMimeInvalidError = RingtoneMimeInvalidError;

  class RsaDecryptFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Internal RSA decryption failed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "RSA_DECRYPT_FAILED";
    }
  }
  exports2.RsaDecryptFailedError = RsaDecryptFailedError;

  class SavedIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed inputSavedStarGiftChat.saved_id is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SAVED_ID_EMPTY";
    }
  }
  exports2.SavedIdEmptyError = SavedIdEmptyError;

  class ScheduleBotNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots cannot schedule messages." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SCHEDULE_BOT_NOT_ALLOWED";
    }
  }
  exports2.ScheduleBotNotAllowedError = ScheduleBotNotAllowedError;

  class ScheduleDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid schedule date provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SCHEDULE_DATE_INVALID";
    }
  }
  exports2.ScheduleDateInvalidError = ScheduleDateInvalidError;

  class ScheduleDateTooLateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't schedule a message this far in the future." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SCHEDULE_DATE_TOO_LATE";
    }
  }
  exports2.ScheduleDateTooLateError = ScheduleDateTooLateError;

  class ScheduleStatusPrivateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Can't schedule until user is online, if the user's last seen timestamp is hidden by their privacy settings." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SCHEDULE_STATUS_PRIVATE";
    }
  }
  exports2.ScheduleStatusPrivateError = ScheduleStatusPrivateError;

  class ScheduleTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "There are too many scheduled messages." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SCHEDULE_TOO_MUCH";
    }
  }
  exports2.ScheduleTooMuchError = ScheduleTooMuchError;

  class ScoreInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified game score is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SCORE_INVALID";
    }
  }
  exports2.ScoreInvalidError = ScoreInvalidError;

  class SearchQueryEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The search query is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEARCH_QUERY_EMPTY";
    }
  }
  exports2.SearchQueryEmptyError = SearchQueryEmptyError;

  class SearchWithLinkNotSupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot provide a search query and an invite link at the same time." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEARCH_WITH_LINK_NOT_SUPPORTED";
    }
  }
  exports2.SearchWithLinkNotSupportedError = SearchWithLinkNotSupportedError;

  class SecondsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid duration provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SECONDS_INVALID";
    }
  }
  exports2.SecondsInvalidError = SecondsInvalidError;

  class SecureSecretRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A secure secret is required." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SECURE_SECRET_REQUIRED";
    }
  }
  exports2.SecureSecretRequiredError = SecureSecretRequiredError;

  class SelfDeleteRestrictedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Business bots can't delete messages just for the user, `revoke` **must** be set." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SELF_DELETE_RESTRICTED";
    }
  }
  exports2.SelfDeleteRestrictedError = SelfDeleteRestrictedError;

  class SendAsPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't send messages as the specified peer." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEND_AS_PEER_INVALID";
    }
  }
  exports2.SendAsPeerInvalidError = SendAsPeerInvalidError;

  class SendMessageGameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An inputBotInlineMessageGame can only be contained in an inputBotInlineResultGame, not in an inputBotInlineResult/inputBotInlineResultPhoto/etc." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEND_MESSAGE_GAME_INVALID";
    }
  }
  exports2.SendMessageGameInvalidError = SendMessageGameInvalidError;

  class SendMessageMediaInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid media provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEND_MESSAGE_MEDIA_INVALID";
    }
  }
  exports2.SendMessageMediaInvalidError = SendMessageMediaInvalidError;

  class SendMessageTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The message type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SEND_MESSAGE_TYPE_INVALID";
    }
  }
  exports2.SendMessageTypeInvalidError = SendMessageTypeInvalidError;

  class SessionTooFreshError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "This session was created less than 24 hours ago, try again in " + value + " seconds." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.SessionTooFreshError = SessionTooFreshError;

  class SettingsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid settings were provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SETTINGS_INVALID";
    }
  }
  exports2.SettingsInvalidError = SettingsInvalidError;

  class Sha256HashInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided SHA256 hash is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SHA256_HASH_INVALID";
    }
  }
  exports2.Sha256HashInvalidError = Sha256HashInvalidError;

  class ShortNameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified short name is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SHORT_NAME_INVALID";
    }
  }
  exports2.ShortNameInvalidError = ShortNameInvalidError;

  class ShortNameOccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified short name is already in use." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SHORT_NAME_OCCUPIED";
    }
  }
  exports2.ShortNameOccupiedError = ShortNameOccupiedError;

  class ShortcutInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified shortcut is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SHORTCUT_INVALID";
    }
  }
  exports2.ShortcutInvalidError = ShortcutInvalidError;

  class SlotsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified slot list is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SLOTS_EMPTY";
    }
  }
  exports2.SlotsEmptyError = SlotsEmptyError;

  class SlowmodeMultiMsgsDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Slowmode is enabled, you cannot forward multiple messages to this group." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SLOWMODE_MULTI_MSGS_DISABLED";
    }
  }
  exports2.SlowmodeMultiMsgsDisabledError = SlowmodeMultiMsgsDisabledError;

  class SlugInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified invoice slug is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SLUG_INVALID";
    }
  }
  exports2.SlugInvalidError = SlugInvalidError;

  class SmsCodeCreateFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An error occurred while creating the SMS code." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SMS_CODE_CREATE_FAILED";
    }
  }
  exports2.SmsCodeCreateFailedError = SmsCodeCreateFailedError;

  class SmsjobIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified job ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SMSJOB_ID_INVALID";
    }
  }
  exports2.SmsjobIdInvalidError = SmsjobIdInvalidError;

  class SrpAInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified inputCheckPasswordSRP.A value is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SRP_A_INVALID";
    }
  }
  exports2.SrpAInvalidError = SrpAInvalidError;

  class SrpIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid SRP ID provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SRP_ID_INVALID";
    }
  }
  exports2.SrpIdInvalidError = SrpIdInvalidError;

  class SrpPasswordChangedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Password has changed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SRP_PASSWORD_CHANGED";
    }
  }
  exports2.SrpPasswordChangedError = SrpPasswordChangedError;

  class StargiftAlreadyConvertedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified star gift was already converted to Stars." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_ALREADY_CONVERTED";
    }
  }
  exports2.StargiftAlreadyConvertedError = StargiftAlreadyConvertedError;

  class StargiftAlreadyRefundedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified star gift was already refunded." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_ALREADY_REFUNDED";
    }
  }
  exports2.StargiftAlreadyRefundedError = StargiftAlreadyRefundedError;

  class StargiftAlreadyUpgradedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified gift was already upgraded to a collectible gift." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_ALREADY_UPGRADED";
    }
  }
  exports2.StargiftAlreadyUpgradedError = StargiftAlreadyUpgradedError;

  class StargiftAttributeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the specified star gift attributes is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_ATTRIBUTE_INVALID";
    }
  }
  exports2.StargiftAttributeInvalidError = StargiftAttributeInvalidError;

  class StargiftInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed gift is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_INVALID";
    }
  }
  exports2.StargiftInvalidError = StargiftInvalidError;

  class StargiftMessageInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified inputInvoiceStarGift.message is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_MESSAGE_INVALID";
    }
  }
  exports2.StargiftMessageInvalidError = StargiftMessageInvalidError;

  class StargiftNotFoundError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified gift was not found." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_NOT_FOUND";
    }
  }
  exports2.StargiftNotFoundError = StargiftNotFoundError;

  class StargiftNotOwnerError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You're not the owner of the gift you trying to transfer." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_NOT_OWNER";
    }
  }
  exports2.StargiftNotOwnerError = StargiftNotOwnerError;

  class StargiftNotUniqueError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't transfer a non-collectible gift." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_NOT_UNIQUE";
    }
  }
  exports2.StargiftNotUniqueError = StargiftNotUniqueError;

  class StargiftObjectInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified star gift object is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_OBJECT_INVALID";
    }
  }
  exports2.StargiftObjectInvalidError = StargiftObjectInvalidError;

  class StargiftOfferInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified offer amount is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_OFFER_INVALID";
    }
  }
  exports2.StargiftOfferInvalidError = StargiftOfferInvalidError;

  class StargiftOfferNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't send a purchase offer for this gift." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_OFFER_NOT_ALLOWED";
    }
  }
  exports2.StargiftOfferNotAllowedError = StargiftOfferNotAllowedError;

  class StargiftOwnerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot transfer or sell a gift owned by another user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_OWNER_INVALID";
    }
  }
  exports2.StargiftOwnerInvalidError = StargiftOwnerInvalidError;

  class StargiftPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified inputSavedStarGiftChat.peer is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_PEER_INVALID";
    }
  }
  exports2.StargiftPeerInvalidError = StargiftPeerInvalidError;

  class StargiftResellCurrencyNotAllowedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You can't buy the gift using the specified currency (i.e. trying to pay in Stars for TON gifts)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_RESELL_CURRENCY_NOT_ALLOWED";
    }
  }
  exports2.StargiftResellCurrencyNotAllowedError = StargiftResellCurrencyNotAllowedError;

  class StargiftResellTooEarlyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "You will be able to resell this gift in " + value + " seconds." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.StargiftResellTooEarlyError = StargiftResellTooEarlyError;

  class StargiftSlugInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified gift slug is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_SLUG_INVALID";
    }
  }
  exports2.StargiftSlugInvalidError = StargiftSlugInvalidError;

  class StargiftTransferTooEarlyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "You cannot transfer this gift yet, wait " + value + " seconds." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.StargiftTransferTooEarlyError = StargiftTransferTooEarlyError;

  class StargiftUpgradeUnavailableError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A received gift can only be upgraded to a collectible gift if the [messageActionStarGift](https://core.telegram.org/constructor/messageActionStarGift)/[savedStarGift](https://core.telegram.org/constructor/savedStarGift).`can_upgrade` flag is set." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_UPGRADE_UNAVAILABLE";
    }
  }
  exports2.StargiftUpgradeUnavailableError = StargiftUpgradeUnavailableError;

  class StargiftUsageLimitedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The gift is sold out." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_USAGE_LIMITED";
    }
  }
  exports2.StargiftUsageLimitedError = StargiftUsageLimitedError;

  class StargiftUserUsageLimitedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You've reached the starGift.limited_per_user limit, you can't buy any more gifts of this type." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARGIFT_USER_USAGE_LIMITED";
    }
  }
  exports2.StargiftUserUsageLimitedError = StargiftUserUsageLimitedError;

  class StarrefAwaitingEndError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The previous referral program was terminated less than 24 hours ago: further changes can be made after the date specified in userFull.starref_program.end_date." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARREF_AWAITING_END";
    }
  }
  exports2.StarrefAwaitingEndError = StarrefAwaitingEndError;

  class StarrefExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified referral link is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARREF_EXPIRED";
    }
  }
  exports2.StarrefExpiredError = StarrefExpiredError;

  class StarrefHashRevokedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified affiliate link was already revoked." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARREF_HASH_REVOKED";
    }
  }
  exports2.StarrefHashRevokedError = StarrefHashRevokedError;

  class StarrefPermilleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified commission_permille is invalid: the minimum and maximum values for this parameter are contained in the [starref_min_commission_permille](https://core.telegram.org/api/config#starref-min-commission-permille) and [starref_max_commission_permille](https://core.telegram.org/api/config#starref-max-commission-permille) client configuration parameters." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARREF_PERMILLE_INVALID";
    }
  }
  exports2.StarrefPermilleInvalidError = StarrefPermilleInvalidError;

  class StarrefPermilleTooLowError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified commission_permille is too low: the minimum and maximum values for this parameter are contained in the [starref_min_commission_permille](https://core.telegram.org/api/config#starref-min-commission-permille) and [starref_max_commission_permille](https://core.telegram.org/api/config#starref-max-commission-permille) client configuration parameters." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARREF_PERMILLE_TOO_LOW";
    }
  }
  exports2.StarrefPermilleTooLowError = StarrefPermilleTooLowError;

  class StarsAmountInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified amount in stars is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARS_AMOUNT_INVALID";
    }
  }
  exports2.StarsAmountInvalidError = StarsAmountInvalidError;

  class StarsInvoiceInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified Telegram Star invoice is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARS_INVOICE_INVALID";
    }
  }
  exports2.StarsInvoiceInvalidError = StarsInvoiceInvalidError;

  class StarsPaymentRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "To import this chat invite link, you must first [pay for the associated Telegram Star subscription &raquo;](https://core.telegram.org/api/subscriptions#channel-subscriptions)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STARS_PAYMENT_REQUIRED";
    }
  }
  exports2.StarsPaymentRequiredError = StarsPaymentRequiredError;

  class StartParamEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The start parameter is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "START_PARAM_EMPTY";
    }
  }
  exports2.StartParamEmptyError = StartParamEmptyError;

  class StartParamInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Start parameter invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "START_PARAM_INVALID";
    }
  }
  exports2.StartParamInvalidError = StartParamInvalidError;

  class StartParamTooLongError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Start parameter is too long." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "START_PARAM_TOO_LONG";
    }
  }
  exports2.StartParamTooLongError = StartParamTooLongError;

  class StickerDocumentInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified sticker document is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_DOCUMENT_INVALID";
    }
  }
  exports2.StickerDocumentInvalidError = StickerDocumentInvalidError;

  class StickerEmojiInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Sticker emoji invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_EMOJI_INVALID";
    }
  }
  exports2.StickerEmojiInvalidError = StickerEmojiInvalidError;

  class StickerFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Sticker file invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_FILE_INVALID";
    }
  }
  exports2.StickerFileInvalidError = StickerFileInvalidError;

  class StickerGifDimensionsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified video sticker has invalid dimensions." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_GIF_DIMENSIONS";
    }
  }
  exports2.StickerGifDimensionsError = StickerGifDimensionsError;

  class StickerIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided sticker ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_ID_INVALID";
    }
  }
  exports2.StickerIdInvalidError = StickerIdInvalidError;

  class StickerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided sticker is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_INVALID";
    }
  }
  exports2.StickerInvalidError = StickerInvalidError;

  class StickerMimeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified sticker MIME type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_MIME_INVALID";
    }
  }
  exports2.StickerMimeInvalidError = StickerMimeInvalidError;

  class StickerPngDimensionsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Sticker png dimensions invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_PNG_DIMENSIONS";
    }
  }
  exports2.StickerPngDimensionsError = StickerPngDimensionsError;

  class StickerPngNopngError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the specified stickers is not a valid PNG file." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_PNG_NOPNG";
    }
  }
  exports2.StickerPngNopngError = StickerPngNopngError;

  class StickerTgsNodocError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You must send the animated sticker as a document." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_TGS_NODOC";
    }
  }
  exports2.StickerTgsNodocError = StickerTgsNodocError;

  class StickerTgsNotgsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid TGS sticker provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_TGS_NOTGS";
    }
  }
  exports2.StickerTgsNotgsError = StickerTgsNotgsError;

  class StickerThumbPngNopngError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Incorrect stickerset thumb file provided, PNG / WEBP expected." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_THUMB_PNG_NOPNG";
    }
  }
  exports2.StickerThumbPngNopngError = StickerThumbPngNopngError;

  class StickerThumbTgsNotgsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Incorrect stickerset TGS thumb file provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_THUMB_TGS_NOTGS";
    }
  }
  exports2.StickerThumbTgsNotgsError = StickerThumbTgsNotgsError;

  class StickerVideoBigError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified video sticker is too big." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_VIDEO_BIG";
    }
  }
  exports2.StickerVideoBigError = StickerVideoBigError;

  class StickerVideoNodocError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You must send the video sticker as a document." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_VIDEO_NODOC";
    }
  }
  exports2.StickerVideoNodocError = StickerVideoNodocError;

  class StickerVideoNowebmError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified video sticker is not in webm format." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKER_VIDEO_NOWEBM";
    }
  }
  exports2.StickerVideoNowebmError = StickerVideoNowebmError;

  class StickerpackStickersTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "There are too many stickers in this stickerpack, you can't add any more." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKERPACK_STICKERS_TOO_MUCH";
    }
  }
  exports2.StickerpackStickersTooMuchError = StickerpackStickersTooMuchError;

  class StickersEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No sticker provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKERS_EMPTY";
    }
  }
  exports2.StickersEmptyError = StickersEmptyError;

  class StickersTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "There are too many stickers in this stickerpack, you can't add any more." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKERS_TOO_MUCH";
    }
  }
  exports2.StickersTooMuchError = StickersTooMuchError;

  class StickersetInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided sticker set is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STICKERSET_INVALID";
    }
  }
  exports2.StickersetInvalidError = StickersetInvalidError;

  class StoriesNeverCreatedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This peer hasn't ever posted any stories." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STORIES_NEVER_CREATED";
    }
  }
  exports2.StoriesNeverCreatedError = StoriesNeverCreatedError;

  class StoriesTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You have hit the maximum active stories limit as specified by the [`story_expiring_limit_*` client configuration parameters](https://core.telegram.org/api/config#story-expiring-limit-default): you should buy a [Premium](https://core.telegram.org/api/premium) subscription, delete an active story, or wait for the oldest story to expire." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STORIES_TOO_MUCH";
    }
  }
  exports2.StoriesTooMuchError = StoriesTooMuchError;

  class StoryIdEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You specified no story IDs." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STORY_ID_EMPTY";
    }
  }
  exports2.StoryIdEmptyError = StoryIdEmptyError;

  class StoryIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified story ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STORY_ID_INVALID";
    }
  }
  exports2.StoryIdInvalidError = StoryIdInvalidError;

  class StoryLiveAlreadyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "This peer already has an active live story, and its ID is equal to " + value + "." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.StoryLiveAlreadyError = StoryLiveAlreadyError;

  class StoryNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The new story information you passed is equal to the previous story information, thus it wasn't modified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STORY_NOT_MODIFIED";
    }
  }
  exports2.StoryNotModifiedError = StoryNotModifiedError;

  class StoryPeriodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified story period is invalid for this account." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "STORY_PERIOD_INVALID";
    }
  }
  exports2.StoryPeriodInvalidError = StoryPeriodInvalidError;

  class StorySendFloodMonthlyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "You've hit the monthly story limit as specified by the [`stories_sent_monthly_limit_*` client configuration parameters](https://core.telegram.org/api/config#stories-sent-monthly-limit-default): wait " + value + " seconds before posting a new story." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.StorySendFloodMonthlyError = StorySendFloodMonthlyError;

  class StorySendFloodWeeklyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const value = Number(args.capture || 0);
      const message = "You've hit the weekly story limit as specified by the [`stories_sent_weekly_limit_*` client configuration parameters](https://core.telegram.org/api/config#stories-sent-weekly-limit-default): wait for " + value + " seconds before posting a new story." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.value = value;
    }
  }
  exports2.StorySendFloodWeeklyError = StorySendFloodWeeklyError;

  class SubscriptionExportMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot send a [bot subscription invoice](https://core.telegram.org/api/subscriptions#bot-subscriptions) directly, you may only create invoice links using [payments.exportInvoice](https://core.telegram.org/method/payments.exportInvoice)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SUBSCRIPTION_EXPORT_MISSING";
    }
  }
  exports2.SubscriptionExportMissingError = SubscriptionExportMissingError;

  class SubscriptionIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified subscription_id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SUBSCRIPTION_ID_INVALID";
    }
  }
  exports2.SubscriptionIdInvalidError = SubscriptionIdInvalidError;

  class SubscriptionPeriodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified subscription_pricing.period is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SUBSCRIPTION_PERIOD_INVALID";
    }
  }
  exports2.SubscriptionPeriodInvalidError = SubscriptionPeriodInvalidError;

  class SuggestedPostAmountInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified price for the suggested post is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SUGGESTED_POST_AMOUNT_INVALID";
    }
  }
  exports2.SuggestedPostAmountInvalidError = SuggestedPostAmountInvalidError;

  class SuggestedPostPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot send suggested posts to non-[monoforum](https://core.telegram.org/api/monoforum) peers." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SUGGESTED_POST_PEER_INVALID";
    }
  }
  exports2.SuggestedPostPeerInvalidError = SuggestedPostPeerInvalidError;

  class SwitchPmTextEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The switch_pm.text field was empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SWITCH_PM_TEXT_EMPTY";
    }
  }
  exports2.SwitchPmTextEmptyError = SwitchPmTextEmptyError;

  class SwitchWebviewUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The URL specified in switch_webview.url is invalid!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "SWITCH_WEBVIEW_URL_INVALID";
    }
  }
  exports2.SwitchWebviewUrlInvalidError = SwitchWebviewUrlInvalidError;

  class TakeoutInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified takeout ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TAKEOUT_INVALID";
    }
  }
  exports2.TakeoutInvalidError = TakeoutInvalidError;

  class TakeoutRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A [takeout](https://core.telegram.org/api/takeout) session needs to be initialized first, [see here &raquo; for more info](https://core.telegram.org/api/takeout)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TAKEOUT_REQUIRED";
    }
  }
  exports2.TakeoutRequiredError = TakeoutRequiredError;

  class TaskAlreadyExistsError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "An email reset was already requested." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TASK_ALREADY_EXISTS";
    }
  }
  exports2.TaskAlreadyExistsError = TaskAlreadyExistsError;

  class TempAuthKeyAlreadyBoundError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed temporary key is already bound to another **perm_auth_key_id**." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TEMP_AUTH_KEY_ALREADY_BOUND";
    }
  }
  exports2.TempAuthKeyAlreadyBoundError = TempAuthKeyAlreadyBoundError;

  class TempAuthKeyEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No temporary auth key provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TEMP_AUTH_KEY_EMPTY";
    }
  }
  exports2.TempAuthKeyEmptyError = TempAuthKeyEmptyError;

  class TermsUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified [invoice](https://core.telegram.org/constructor/invoice).`terms_url` is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TERMS_URL_INVALID";
    }
  }
  exports2.TermsUrlInvalidError = TermsUrlInvalidError;

  class TextdraftPeerInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "sendMessageTextDraftAction can only be used in private 1-on-1 chats." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TEXTDRAFT_PEER_INVALID";
    }
  }
  exports2.TextdraftPeerInvalidError = TextdraftPeerInvalidError;

  class ThemeFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid theme file provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_FILE_INVALID";
    }
  }
  exports2.ThemeFileInvalidError = ThemeFileInvalidError;

  class ThemeFormatInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid theme format provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_FORMAT_INVALID";
    }
  }
  exports2.ThemeFormatInvalidError = ThemeFormatInvalidError;

  class ThemeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid theme provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_INVALID";
    }
  }
  exports2.ThemeInvalidError = ThemeInvalidError;

  class ThemeMimeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The theme's MIME type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_MIME_INVALID";
    }
  }
  exports2.ThemeMimeInvalidError = ThemeMimeInvalidError;

  class ThemeParamsInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `theme_params` field is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_PARAMS_INVALID";
    }
  }
  exports2.ThemeParamsInvalidError = ThemeParamsInvalidError;

  class ThemeSlugInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified theme slug is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_SLUG_INVALID";
    }
  }
  exports2.ThemeSlugInvalidError = ThemeSlugInvalidError;

  class ThemeTitleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified theme title is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "THEME_TITLE_INVALID";
    }
  }
  exports2.ThemeTitleInvalidError = ThemeTitleInvalidError;

  class TimezoneInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified timezone does not exist." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TIMEZONE_INVALID";
    }
  }
  exports2.TimezoneInvalidError = TimezoneInvalidError;

  class TitleInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified stickerpack title is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TITLE_INVALID";
    }
  }
  exports2.TitleInvalidError = TitleInvalidError;

  class TmpPasswordDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The temporary password is disabled." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TMP_PASSWORD_DISABLED";
    }
  }
  exports2.TmpPasswordDisabledError = TmpPasswordDisabledError;

  class TmpPasswordInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed tmp_password is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TMP_PASSWORD_INVALID";
    }
  }
  exports2.TmpPasswordInvalidError = TmpPasswordInvalidError;

  class ToIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified `to_id` of the passed inputInvoiceStarGiftResale or inputInvoiceStarGiftTransfer is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TO_ID_INVALID";
    }
  }
  exports2.ToIdInvalidError = ToIdInvalidError;

  class ToLangInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified destination language is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TO_LANG_INVALID";
    }
  }
  exports2.ToLangInvalidError = ToLangInvalidError;

  class TodoItemDuplicateError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Duplicate [checklist items](https://core.telegram.org/api/todo) detected." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TODO_ITEM_DUPLICATE";
    }
  }
  exports2.TodoItemDuplicateError = TodoItemDuplicateError;

  class TodoItemsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A checklist was specified, but no [checklist items](https://core.telegram.org/api/todo) were passed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TODO_ITEMS_EMPTY";
    }
  }
  exports2.TodoItemsEmptyError = TodoItemsEmptyError;

  class TodoItemsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You specified too many todo list items." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TODO_ITEMS_TOO_MUCH";
    }
  }
  exports2.TodoItemsTooMuchError = TodoItemsTooMuchError;

  class TodoNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No todo items were specified, so no changes were made to the todo list." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TODO_NOT_MODIFIED";
    }
  }
  exports2.TodoNotModifiedError = TodoNotModifiedError;

  class TokenEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified token is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOKEN_EMPTY";
    }
  }
  exports2.TokenEmptyError = TokenEmptyError;

  class TokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided token is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOKEN_INVALID";
    }
  }
  exports2.TokenInvalidError = TokenInvalidError;

  class TokenTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified token type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOKEN_TYPE_INVALID";
    }
  }
  exports2.TokenTypeInvalidError = TokenTypeInvalidError;

  class TopicCloseSeparatelyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The `close` flag cannot be provided together with any of the other flags." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_CLOSE_SEPARATELY";
    }
  }
  exports2.TopicCloseSeparatelyError = TopicCloseSeparatelyError;

  class TopicClosedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This topic was closed, you can't send messages to it anymore." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_CLOSED";
    }
  }
  exports2.TopicClosedError = TopicClosedError;

  class TopicDeletedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified topic was deleted." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_DELETED";
    }
  }
  exports2.TopicDeletedError = TopicDeletedError;

  class TopicHideSeparatelyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The `hide` flag cannot be provided together with any of the other flags." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_HIDE_SEPARATELY";
    }
  }
  exports2.TopicHideSeparatelyError = TopicHideSeparatelyError;

  class TopicIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified topic ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_ID_INVALID";
    }
  }
  exports2.TopicIdInvalidError = TopicIdInvalidError;

  class TopicNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The updated topic info is equal to the current topic info, nothing was changed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_NOT_MODIFIED";
    }
  }
  exports2.TopicNotModifiedError = TopicNotModifiedError;

  class TopicTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified topic title is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPIC_TITLE_EMPTY";
    }
  }
  exports2.TopicTitleEmptyError = TopicTitleEmptyError;

  class TopicsEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You specified no topic IDs." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TOPICS_EMPTY";
    }
  }
  exports2.TopicsEmptyError = TopicsEmptyError;

  class TransactionIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified transaction ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TRANSACTION_ID_INVALID";
    }
  }
  exports2.TransactionIdInvalidError = TransactionIdInvalidError;

  class TranscriptionFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Audio transcription failed." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TRANSCRIPTION_FAILED";
    }
  }
  exports2.TranscriptionFailedError = TranscriptionFailedError;

  class TranslateReqQuotaExceededError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Translation is currently unavailable due to a temporary server-side lack of resources." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TRANSLATE_REQ_QUOTA_EXCEEDED";
    }
  }
  exports2.TranslateReqQuotaExceededError = TranslateReqQuotaExceededError;

  class TtlDaysInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided TTL is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TTL_DAYS_INVALID";
    }
  }
  exports2.TtlDaysInvalidError = TtlDaysInvalidError;

  class TtlMediaInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid media Time To Live was provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TTL_MEDIA_INVALID";
    }
  }
  exports2.TtlMediaInvalidError = TtlMediaInvalidError;

  class TtlPeriodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified TTL period is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TTL_PERIOD_INVALID";
    }
  }
  exports2.TtlPeriodInvalidError = TtlPeriodInvalidError;

  class TypesEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "No top peer type was provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "TYPES_EMPTY";
    }
  }
  exports2.TypesEmptyError = TypesEmptyError;

  class UnsupportedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "`require_payment` cannot be *set* by users, only by monoforums: users must instead use the [inputPrivacyKeyNoPaidMessages](https://core.telegram.org/constructor/inputPrivacyKeyNoPaidMessages) privacy setting to remove a previously added exemption." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "UNSUPPORTED";
    }
  }
  exports2.UnsupportedError = UnsupportedError;

  class UntilDateInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid until date provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "UNTIL_DATE_INVALID";
    }
  }
  exports2.UntilDateInvalidError = UntilDateInvalidError;

  class UrlExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified OAuth request has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "URL_EXPIRED";
    }
  }
  exports2.UrlExpiredError = UrlExpiredError;

  class UrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid URL provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "URL_INVALID";
    }
  }
  exports2.UrlInvalidError = UrlInvalidError;

  class UsageLimitInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified usage limit is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USAGE_LIMIT_INVALID";
    }
  }
  exports2.UsageLimitInvalidError = UsageLimitInvalidError;

  class UserAdminInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You're not an admin." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_ADMIN_INVALID";
    }
  }
  exports2.UserAdminInvalidError = UserAdminInvalidError;

  class UserAlreadyInvitedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You have already invited this user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_ALREADY_INVITED";
    }
  }
  exports2.UserAlreadyInvitedError = UserAlreadyInvitedError;

  class UserAlreadyParticipantError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The user is already in the group." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_ALREADY_PARTICIPANT";
    }
  }
  exports2.UserAlreadyParticipantError = UserAlreadyParticipantError;

  class UserBannedInChannelError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You're banned from sending messages in supergroups/channels." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_BANNED_IN_CHANNEL";
    }
  }
  exports2.UserBannedInChannelError = UserBannedInChannelError;

  class UserBlockedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "User blocked." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_BLOCKED";
    }
  }
  exports2.UserBlockedError = UserBlockedError;

  class UserBotError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots can only be admins in channels." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_BOT";
    }
  }
  exports2.UserBotError = UserBotError;

  class UserBotInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "User accounts must provide the `bot` method parameter when calling this method. If there is no such method parameter, this method can only be invoked by bot accounts." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_BOT_INVALID";
    }
  }
  exports2.UserBotInvalidError = UserBotInvalidError;

  class UserBotRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This method can only be called by a bot." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_BOT_REQUIRED";
    }
  }
  exports2.UserBotRequiredError = UserBotRequiredError;

  class UserBotToBotDisabledError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bot-to-bot messaging is disabled because one of the two bots hasn't enabled the Bot to Bot setting in @BotFather." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_BOT_TO_BOT_DISABLED";
    }
  }
  exports2.UserBotToBotDisabledError = UserBotToBotDisabledError;

  class UserChannelsTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "One of the users you tried to add is already in too many channels/supergroups." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_CHANNELS_TOO_MUCH";
    }
  }
  exports2.UserChannelsTooMuchError = UserChannelsTooMuchError;

  class UserCreatorError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "For channels.editAdmin: you've tried to edit the admin rights of the owner, but you're not the owner; for channels.leaveChannel: you can't leave this channel, because you're its creator." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_CREATOR";
    }
  }
  exports2.UserCreatorError = UserCreatorError;

  class UserGiftUnavailableError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Gifts are not available in the current region ([stars_gifts_enabled](https://core.telegram.org/api/config#stars-gifts-enabled) is equal to false)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_GIFT_UNAVAILABLE";
    }
  }
  exports2.UserGiftUnavailableError = UserGiftUnavailableError;

  class UserIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided user ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_ID_INVALID";
    }
  }
  exports2.UserIdInvalidError = UserIdInvalidError;

  class UserInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid user provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_INVALID";
    }
  }
  exports2.UserInvalidError = UserInvalidError;

  class UserIsBlockedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You were blocked by this user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_IS_BLOCKED";
    }
  }
  exports2.UserIsBlockedError = UserIsBlockedError;

  class UserIsBotError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Bots can't send messages to other bots." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_IS_BOT";
    }
  }
  exports2.UserIsBotError = UserIsBotError;

  class UserKickedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This user was kicked from this supergroup/channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_KICKED";
    }
  }
  exports2.UserKickedError = UserKickedError;

  class UserNotMutualContactError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided user is not a mutual contact." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_NOT_MUTUAL_CONTACT";
    }
  }
  exports2.UserNotMutualContactError = UserNotMutualContactError;

  class UserNotParticipantError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You're not a member of this supergroup/channel." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_NOT_PARTICIPANT";
    }
  }
  exports2.UserNotParticipantError = UserNotParticipantError;

  class UserPublicMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Cannot generate a link to stories posted by a peer without a username." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_PUBLIC_MISSING";
    }
  }
  exports2.UserPublicMissingError = UserPublicMissingError;

  class UserVolumeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified user volume is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USER_VOLUME_INVALID";
    }
  }
  exports2.UserVolumeInvalidError = UserVolumeInvalidError;

  class UsernameInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided username is not valid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAME_INVALID";
    }
  }
  exports2.UsernameInvalidError = UsernameInvalidError;

  class UsernameNotModifiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The username was not modified." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAME_NOT_MODIFIED";
    }
  }
  exports2.UsernameNotModifiedError = UsernameNotModifiedError;

  class UsernameNotOccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided username is not occupied." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAME_NOT_OCCUPIED";
    }
  }
  exports2.UsernameNotOccupiedError = UsernameNotOccupiedError;

  class UsernameOccupiedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The provided username is already occupied." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAME_OCCUPIED";
    }
  }
  exports2.UsernameOccupiedError = UsernameOccupiedError;

  class UsernamePurchaseAvailableError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified username can be purchased on https://fragment.com." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAME_PURCHASE_AVAILABLE";
    }
  }
  exports2.UsernamePurchaseAvailableError = UsernamePurchaseAvailableError;

  class UsernameSuffixMissingError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The required `bot` suffix is missing from the passed username." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAME_SUFFIX_MISSING";
    }
  }
  exports2.UsernameSuffixMissingError = UsernameSuffixMissingError;

  class UsernamesActiveTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The maximum number of active usernames was reached." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERNAMES_ACTIVE_TOO_MUCH";
    }
  }
  exports2.UsernamesActiveTooMuchError = UsernamesActiveTooMuchError;

  class UserpicUploadRequiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You must have a profile picture to publish your geolocation." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERPIC_UPLOAD_REQUIRED";
    }
  }
  exports2.UserpicUploadRequiredError = UserpicUploadRequiredError;

  class UsersTooFewError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Not enough users (to create a chat, for example)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERS_TOO_FEW";
    }
  }
  exports2.UsersTooFewError = UsersTooFewError;

  class UsersTooMuchError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The maximum number of users has been exceeded (to create a chat, for example)." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "USERS_TOO_MUCH";
    }
  }
  exports2.UsersTooMuchError = UsersTooMuchError;

  class VenueIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified venue ID is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VENUE_ID_INVALID";
    }
  }
  exports2.VenueIdInvalidError = VenueIdInvalidError;

  class VideoContentTypeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The video's content type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VIDEO_CONTENT_TYPE_INVALID";
    }
  }
  exports2.VideoContentTypeInvalidError = VideoContentTypeInvalidError;

  class VideoDurationInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The duration of the specified video is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VIDEO_DURATION_INVALID";
    }
  }
  exports2.VideoDurationInvalidError = VideoDurationInvalidError;

  class VideoFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified video file is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VIDEO_FILE_INVALID";
    }
  }
  exports2.VideoFileInvalidError = VideoFileInvalidError;

  class VideoPauseForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot pause the video stream." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VIDEO_PAUSE_FORBIDDEN";
    }
  }
  exports2.VideoPauseForbiddenError = VideoPauseForbiddenError;

  class VideoStopForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You cannot stop the video stream." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VIDEO_STOP_FORBIDDEN";
    }
  }
  exports2.VideoStopForbiddenError = VideoStopForbiddenError;

  class VideoTitleEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified video title is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VIDEO_TITLE_EMPTY";
    }
  }
  exports2.VideoTitleEmptyError = VideoTitleEmptyError;

  class VoiceMessagesForbiddenError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "This user's privacy settings forbid you from sending voice messages." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "VOICE_MESSAGES_FORBIDDEN";
    }
  }
  exports2.VoiceMessagesForbiddenError = VoiceMessagesForbiddenError;

  class WallpaperFileInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified wallpaper file is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WALLPAPER_FILE_INVALID";
    }
  }
  exports2.WallpaperFileInvalidError = WallpaperFileInvalidError;

  class WallpaperInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified wallpaper is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WALLPAPER_INVALID";
    }
  }
  exports2.WallpaperInvalidError = WallpaperInvalidError;

  class WallpaperMimeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified wallpaper MIME type is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WALLPAPER_MIME_INVALID";
    }
  }
  exports2.WallpaperMimeInvalidError = WallpaperMimeInvalidError;

  class WallpaperNotFoundError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified wallpaper could not be found." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WALLPAPER_NOT_FOUND";
    }
  }
  exports2.WallpaperNotFoundError = WallpaperNotFoundError;

  class WcConvertUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "WC convert URL invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WC_CONVERT_URL_INVALID";
    }
  }
  exports2.WcConvertUrlInvalidError = WcConvertUrlInvalidError;

  class WebappReqIdInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified webapp_req_id is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBAPP_REQ_ID_INVALID";
    }
  }
  exports2.WebappReqIdInvalidError = WebappReqIdInvalidError;

  class WebauthTokenExpiredError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified auth token has expired." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBAUTH_TOKEN_EXPIRED";
    }
  }
  exports2.WebauthTokenExpiredError = WebauthTokenExpiredError;

  class WebdocumentInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid webdocument URL provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBDOCUMENT_INVALID";
    }
  }
  exports2.WebdocumentInvalidError = WebdocumentInvalidError;

  class WebdocumentMimeInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Invalid webdocument mime type provided." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBDOCUMENT_MIME_INVALID";
    }
  }
  exports2.WebdocumentMimeInvalidError = WebdocumentMimeInvalidError;

  class WebdocumentSizeTooBigError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Webdocument is too big!" + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBDOCUMENT_SIZE_TOO_BIG";
    }
  }
  exports2.WebdocumentSizeTooBigError = WebdocumentSizeTooBigError;

  class WebdocumentUrlEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The passed web document URL is empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBDOCUMENT_URL_EMPTY";
    }
  }
  exports2.WebdocumentUrlEmptyError = WebdocumentUrlEmptyError;

  class WebdocumentUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified webdocument URL is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBDOCUMENT_URL_INVALID";
    }
  }
  exports2.WebdocumentUrlInvalidError = WebdocumentUrlInvalidError;

  class WebpageCurlFailedError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Failure while fetching the webpage with cURL." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPAGE_CURL_FAILED";
    }
  }
  exports2.WebpageCurlFailedError = WebpageCurlFailedError;

  class WebpageMediaEmptyError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "Webpage media empty." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPAGE_MEDIA_EMPTY";
    }
  }
  exports2.WebpageMediaEmptyError = WebpageMediaEmptyError;

  class WebpageNotFoundError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "A preview for the specified webpage `url` could not be generated." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPAGE_NOT_FOUND";
    }
  }
  exports2.WebpageNotFoundError = WebpageNotFoundError;

  class WebpageUrlInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified webpage `url` is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPAGE_URL_INVALID";
    }
  }
  exports2.WebpageUrlInvalidError = WebpageUrlInvalidError;

  class WebpushAuthInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified web push authentication secret is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPUSH_AUTH_INVALID";
    }
  }
  exports2.WebpushAuthInvalidError = WebpushAuthInvalidError;

  class WebpushKeyInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified web push elliptic curve Diffie-Hellman public key is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPUSH_KEY_INVALID";
    }
  }
  exports2.WebpushKeyInvalidError = WebpushKeyInvalidError;

  class WebpushTokenInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified web push token is invalid." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "WEBPUSH_TOKEN_INVALID";
    }
  }
  exports2.WebpushTokenInvalidError = WebpushTokenInvalidError;

  class YouBlockedUserError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "You blocked this user." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "YOU_BLOCKED_USER";
    }
  }
  exports2.YouBlockedUserError = YouBlockedUserError;

  class BotMethodInvalidError extends RPCBaseErrors_1.BadRequestError {
    constructor(args) {
      const message = "The specified method cannot be used by bots." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "BOT_METHOD_INVALID";
    }
  }
