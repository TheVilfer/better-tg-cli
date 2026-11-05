  var __ERRS = [["AboutTooLongError", "BadRequestError", "About string too long.", "ABOUT_TOO_LONG"], ["AccessTokenExpiredError", "BadRequestError", "Access token expired.", "ACCESS_TOKEN_EXPIRED"], ["AccessTokenInvalidError", "BadRequestError", "Access token invalid.", "ACCESS_TOKEN_INVALID"], ["AdExpiredError", "BadRequestError", "The ad has expired (too old or not found).", "AD_EXPIRED"], ["AddressInvalidError", "BadRequestError", "The specified geopoint address is invalid.", "ADDRESS_INVALID"], ["AdminIdInvalidError", "BadRequestError", "The specified admin ID is invalid.", "ADMIN_ID_INVALID"], ["AdminRankEmojiNotAllowedError", "BadRequestError", "An admin rank cannot contain emojis.", "ADMIN_RANK_EMOJI_NOT_ALLOWED"], ["AdminRankInvalidError", "BadRequestError", "The specified admin rank is invalid.", "ADMIN_RANK_INVALID"], ["AdminRightsEmptyError", "BadRequestError", "The chatAdminRights constructor passed in keyboardButtonRequestPeer.peer_type.user_admin_rights has no rights set (i.e. flags is 0).", "ADMIN_RIGHTS_EMPTY"], ["AdminsTooMuchError", "BadRequestError", "There are too many admins.", "ADMINS_TOO_MUCH"], ["AiComposeTaskMissingError", "BadRequestError", "No AI task was specified. The caller must provide at least one of: proofread, translate (with a target language), tone, or emojify.", "AI_COMPOSE_TASK_MISSING"], ["AicomposeFloodPremiumError", "BadRequestError", "You've reached the daily limit of AI text transformations, upgrade to [Telegram Premium](https://core.telegram.org/api/premium) to get **50x** times more AI text transformations per day!", "AICOMPOSE_FLOOD_PREMIUM"], ["AicomposeToneInvalidError", "BadRequestError", "The specified tone is invalid.", "AICOMPOSE_TONE_INVALID"], ["AicomposeToneTitleInvalidError", "BadRequestError", "The specified tone title is invalid.", "AICOMPOSE_TONE_TITLE_INVALID"], ["AlbumPhotosTooManyError", "BadRequestError", "You have uploaded too many profile photos, delete some before retrying.", "ALBUM_PHOTOS_TOO_MANY"], ["ApiIdInvalidError", "BadRequestError", "API ID invalid.", "API_ID_INVALID"], ["ApiIdPublishedFloodError", "BadRequestError", "This API id was published somewhere, you can't use it now.", "API_ID_PUBLISHED_FLOOD"], ["ArticleTitleEmptyError", "BadRequestError", "The title of the article is empty.", "ARTICLE_TITLE_EMPTY"], ["AudioContentUrlEmptyError", "BadRequestError", "The remote URL specified in the content field is empty.", "AUDIO_CONTENT_URL_EMPTY"], ["AudioTitleEmptyError", "BadRequestError", "An empty audio title was provided.", "AUDIO_TITLE_EMPTY"], ["AuthBytesInvalidError", "BadRequestError", "The provided authorization is invalid.", "AUTH_BYTES_INVALID"], ["AuthTokenAlreadyAcceptedError", "BadRequestError", "The specified auth token was already accepted.", "AUTH_TOKEN_ALREADY_ACCEPTED"], ["AuthTokenExceptionError", "BadRequestError", "An error occurred while importing the auth token.", "AUTH_TOKEN_EXCEPTION"], ["AuthTokenExpiredError", "BadRequestError", "The authorization token has expired.", "AUTH_TOKEN_EXPIRED"], ["AuthTokenInvalidError", "BadRequestError", "The specified auth token is invalid.", "AUTH_TOKEN_INVALID"], ["AuthTokenInvalidxError", "BadRequestError", "The specified auth token is invalid.", "AUTH_TOKEN_INVALIDX"], ["AutoarchiveNotAvailableError", "BadRequestError", "The autoarchive setting is not available at this time: please check the value of the [autoarchive_setting_available field in client config &raquo;](https://core.telegram.org/api/config#client-configuration) before calling this method.", "AUTOARCHIVE_NOT_AVAILABLE"], ["BalanceTooLowError", "BadRequestError", "The transaction cannot be completed because the current [Telegram Stars balance](https://core.telegram.org/api/stars) is too low.", "BALANCE_TOO_LOW"], ["BankCardNumberInvalidError", "BadRequestError", "The specified card number is invalid.", "BANK_CARD_NUMBER_INVALID"], ["BannedRightsInvalidError", "BadRequestError", "You provided some invalid flags in the banned rights.", "BANNED_RIGHTS_INVALID"], ["BirthdayAlreadyError", "BadRequestError", "The target user already has a birthday set.", "BIRTHDAY_ALREADY"], ["BirthdayInvalidError", "BadRequestError", "An invalid age was specified, must be between 0 and 150 years.", "BIRTHDAY_INVALID"], ["BoostNotModifiedError", "BadRequestError", "You're already [boosting](https://core.telegram.org/api/boost) the specified channel.", "BOOST_NOT_MODIFIED"], ["BoostPeerInvalidError", "BadRequestError", "The specified `boost_peer` is invalid.", "BOOST_PEER_INVALID"], ["BoostsEmptyError", "BadRequestError", "No boost slots were specified.", "BOOSTS_EMPTY"], ["BoostsRequiredError", "BadRequestError", "The specified channel must first be [boosted by its users](https://core.telegram.org/api/boost) in order to perform this action.", "BOOSTS_REQUIRED"], ["BotAlreadyDisabledError", "BadRequestError", "The connected business bot was already disabled for the specified peer.", "BOT_ALREADY_DISABLED"], ["BotAppBotInvalidError", "BadRequestError", "The bot_id passed in the inputBotAppShortName constructor is invalid.", "BOT_APP_BOT_INVALID"], ["BotAppInvalidError", "BadRequestError", "The specified bot app is invalid.", "BOT_APP_INVALID"], ["BotAppShortnameInvalidError", "BadRequestError", "The specified bot app short name is invalid.", "BOT_APP_SHORTNAME_INVALID"], ["BotBusinessMissingError", "BadRequestError", "The specified bot is not a business bot (the [user](https://core.telegram.org/constructor/user).`bot_business` flag is not set).", "BOT_BUSINESS_MISSING"], ["BotChannelsNaError", "BadRequestError", "Bots can't edit admin privileges.", "BOT_CHANNELS_NA"], ["BotCommandDescriptionInvalidError", "BadRequestError", "The specified command description is invalid.", "BOT_COMMAND_DESCRIPTION_INVALID"], ["BotCommandInvalidError", "BadRequestError", "The specified command is invalid.", "BOT_COMMAND_INVALID"], ["BotCreateLimitExceededError", "BadRequestError", "The current user already owns the maximum allowed number of owned bots, as specified by [`bots_create_limit_default` &raquo;](https://core.telegram.org/api/config#bots-create-limit-default) and [`bots_create_limit_premium` &raquo;](https://core.telegram.org/api/config#bots-create-limit-premium); if the current user doesn't have Telegram Premium, upgrading to Premium will allow them to create more bots.", "BOT_CREATE_LIMIT_EXCEEDED"], ["BotDomainInvalidError", "BadRequestError", "Bot domain invalid.", "BOT_DOMAIN_INVALID"], ["BotFallbackUnsupportedError", "BadRequestError", "The fallback flag can't be set for bots.", "BOT_FALLBACK_UNSUPPORTED"], ["BotGamesDisabledError", "BadRequestError", "Games can't be sent to channels.", "BOT_GAMES_DISABLED"], ["BotGroupsBlockedError", "BadRequestError", "This bot can't be added to groups.", "BOT_GROUPS_BLOCKED"], ["BotIdInvalidError", "BadRequestError", "The specified bot ID is invalid.", "BOT_ID_INVALID"], ["BotInlineDisabledError", "BadRequestError", "This bot can't be used in inline mode.", "BOT_INLINE_DISABLED"], ["BotInvalidError", "BadRequestError", "This is not a valid bot.", "BOT_INVALID"], ["BotInvoiceInvalidError", "BadRequestError", "The specified invoice is invalid.", "BOT_INVOICE_INVALID"], ["BotNotConnectedYetError", "BadRequestError", "No [business bot](https://core.telegram.org/api/business#connected-bots) is connected to the currently logged in user.", "BOT_NOT_CONNECTED_YET"], ["BotOnesideNotAvailError", "BadRequestError", "Bots can't pin messages in PM just for themselves.", "BOT_ONESIDE_NOT_AVAIL"], ["BotPaymentsDisabledError", "BadRequestError", "Please enable bot payments in botfather before calling this method.", "BOT_PAYMENTS_DISABLED"], ["BotResponseTimeoutError", "BadRequestError", "A timeout occurred while fetching data from the bot.", "BOT_RESPONSE_TIMEOUT"], ["BotScoreNotModifiedError", "BadRequestError", "The score wasn't modified.", "BOT_SCORE_NOT_MODIFIED"], ["BotWebviewDisabledError", "BadRequestError", "A webview cannot be opened in the specified conditions: emitted for example if `from_bot_menu` or `url` are set and `peer` is not the chat with the bot.", "BOT_WEBVIEW_DISABLED"], ["BotsTooMuchError", "BadRequestError", "There are too many bots in this chat/channel.", "BOTS_TOO_MUCH"], ["BroadcastIdInvalidError", "BadRequestError", "Broadcast ID invalid.", "BROADCAST_ID_INVALID"], ["BroadcastPublicVotersForbiddenError", "BadRequestError", "You can't forward polls with public voters.", "BROADCAST_PUBLIC_VOTERS_FORBIDDEN"], ["BroadcastRequiredError", "BadRequestError", "This method can only be called on a channel, please use stats.getMegagroupStats for supergroups.", "BROADCAST_REQUIRED"], ["BusinessConnectionInvalidError", "BadRequestError", "The `connection_id` passed to the wrapping [invokeWithBusinessConnection](https://core.telegram.org/api/business) call is invalid.", "BUSINESS_CONNECTION_INVALID"], ["BusinessConnectionNotAllowedError", "BadRequestError", "This method was invoked over a business connection using [invokeWithBusinessConnection](https://core.telegram.org/api/business#connected-bots), but either (1) we're a user, and users cannot invoke methods over a business connection; (2) we're a bot, but business mode was disabled in @botfather or (3); we're a bot, but this method cannot be invoked over a business connection.", "BUSINESS_CONNECTION_NOT_ALLOWED"], ["BusinessPeerInvalidError", "BadRequestError", "Messages can't be set to the specified peer through the current [business connection](https://core.telegram.org/api/business#connected-bots).", "BUSINESS_PEER_INVALID"], ["BusinessPeerUsageMissingError", "BadRequestError", "You cannot send a message to a user through a [business connection](https://core.telegram.org/api/business#connected-bots) if the user hasn't recently contacted us.", "BUSINESS_PEER_USAGE_MISSING"], ["BusinessRecipientsEmptyError", "BadRequestError", "You didn't set any flag in inputBusinessBotRecipients, thus the bot cannot work with *any* peer.", "BUSINESS_RECIPIENTS_EMPTY"], ["BusinessWorkHoursEmptyError", "BadRequestError", "No work hours were specified.", "BUSINESS_WORK_HOURS_EMPTY"], ["BusinessWorkHoursPeriodInvalidError", "BadRequestError", "The specified work hours are invalid, see [here &raquo;](https://core.telegram.org/api/business#opening-hours) for the exact requirements.", "BUSINESS_WORK_HOURS_PERIOD_INVALID"], ["ButtonCopyTextInvalidError", "BadRequestError", "The specified [keyboardButtonCopy](https://core.telegram.org/constructor/keyboardButtonCopy).`copy_text` is invalid.", "BUTTON_COPY_TEXT_INVALID"], ["ButtonDataInvalidError", "BadRequestError", "The data of one or more of the buttons you provided is invalid.", "BUTTON_DATA_INVALID"], ["ButtonIdInvalidError", "BadRequestError", "The specified button ID is invalid.", "BUTTON_ID_INVALID"], ["ButtonInvalidError", "BadRequestError", "The specified button is invalid.", "BUTTON_INVALID"], ["ButtonPosInvalidError", "BadRequestError", "The position of one of the keyboard buttons is invalid (i.e. a Game or Pay button not in the first position, and so on...).", "BUTTON_POS_INVALID"], ["ButtonTextInvalidError", "BadRequestError", "The specified button text is invalid.", "BUTTON_TEXT_INVALID"], ["ButtonTypeInvalidError", "BadRequestError", "The type of one or more of the buttons you provided is invalid.", "BUTTON_TYPE_INVALID"], ["ButtonUrlInvalidError", "BadRequestError", "Button URL invalid.", "BUTTON_URL_INVALID"], ["ButtonUserInvalidError", "BadRequestError", "The `user_id` passed to inputKeyboardButtonUserProfile is invalid!", "BUTTON_USER_INVALID"], ["ButtonUserPrivacyRestrictedError", "BadRequestError", "The privacy setting of the user specified in a [inputKeyboardButtonUserProfile](https://core.telegram.org/constructor/inputKeyboardButtonUserProfile) button do not allow creating such a button.", "BUTTON_USER_PRIVACY_RESTRICTED"], ["CallAlreadyAcceptedError", "BadRequestError", "The call was already accepted.", "CALL_ALREADY_ACCEPTED"], ["CallAlreadyDeclinedError", "BadRequestError", "The call was already declined.", "CALL_ALREADY_DECLINED"], ["CallNotActiveError", "BadRequestError", "The specified call is not active.", "CALL_NOT_ACTIVE"], ["CallOccupyFailedError", "BadRequestError", "The call failed because the user is already making another call.", "CALL_OCCUPY_FAILED"], ["CallPeerInvalidError", "BadRequestError", "The provided call peer object is invalid.", "CALL_PEER_INVALID"], ["CallProtocolFlagsInvalidError", "BadRequestError", "Call protocol flags invalid.", "CALL_PROTOCOL_FLAGS_INVALID"], ["CallProtocolLayerInvalidError", "BadRequestError", "The specified protocol layer version range is invalid.", "CALL_PROTOCOL_LAYER_INVALID"], ["CdnMethodInvalidError", "BadRequestError", "You can't call this method in a CDN DC.", "CDN_METHOD_INVALID"], ["ChannelForumMissingError", "BadRequestError", "This supergroup is not a forum.", "CHANNEL_FORUM_MISSING"], ["ChannelIdInvalidError", "BadRequestError", "The specified supergroup ID is invalid.", "CHANNEL_ID_INVALID"], ["ChannelInvalidError", "BadRequestError", "The provided channel is invalid.", "CHANNEL_INVALID"], ["ChannelMonoforumUnsupportedError", "BadRequestError", "[Monoforums](https://core.telegram.org/api/channel#monoforums) do not support this feature.", "CHANNEL_MONOFORUM_UNSUPPORTED"], ["ChannelParicipantMissingError", "BadRequestError", "The current user is not in the channel.", "CHANNEL_PARICIPANT_MISSING"], ["ChannelPrivateError", "BadRequestError", "You haven't joined this channel/supergroup.", "CHANNEL_PRIVATE"], ["ChannelTooBigError", "BadRequestError", "This channel has too many participants (>1000) to be deleted.", "CHANNEL_TOO_BIG"], ["ChannelTooLargeError", "BadRequestError", "Channel is too large to be deleted; this error is issued when trying to delete channels with more than 1000 members (subject to change).", "CHANNEL_TOO_LARGE"], ["ChannelsAdminLocatedTooMuchError", "BadRequestError", "The user has reached the limit of public geogroups.", "CHANNELS_ADMIN_LOCATED_TOO_MUCH"], ["ChannelsAdminPublicTooMuchError", "BadRequestError", "You're admin of too many public channels, make some channels private to change the username of this channel.", "CHANNELS_ADMIN_PUBLIC_TOO_MUCH"], ["ChannelsTooMuchError", "BadRequestError", "You have joined too many channels/supergroups.", "CHANNELS_TOO_MUCH"], ["ChargeAlreadyRefundedError", "BadRequestError", "The transaction was already refunded.", "CHARGE_ALREADY_REFUNDED"], ["ChargeIdEmptyError", "BadRequestError", "The specified charge_id is empty.", "CHARGE_ID_EMPTY"], ["ChargeIdInvalidError", "BadRequestError", "The specified charge_id is invalid.", "CHARGE_ID_INVALID"], ["ChatAboutNotModifiedError", "BadRequestError", "About text has not changed.", "CHAT_ABOUT_NOT_MODIFIED"], ["ChatAboutTooLongError", "BadRequestError", "Chat about too long.", "CHAT_ABOUT_TOO_LONG"], ["ChatAdminRequiredError", "BadRequestError", "You must be an admin in this chat to do this.", "CHAT_ADMIN_REQUIRED"], ["ChatDiscussionUnallowedError", "BadRequestError", "You can't enable forum topics in a discussion group linked to a channel.", "CHAT_DISCUSSION_UNALLOWED"], ["ChatForwardsRestrictedError", "BadRequestError", "You can't forward messages from a protected chat.", "CHAT_FORWARDS_RESTRICTED"], ["ChatIdEmptyError", "BadRequestError", "The provided chat ID is empty.", "CHAT_ID_EMPTY"], ["ChatIdInvalidError", "BadRequestError", "The provided chat id is invalid.", "CHAT_ID_INVALID"], ["ChatInvalidError", "BadRequestError", "Invalid chat.", "CHAT_INVALID"], ["ChatInvitePermanentError", "BadRequestError", "You can't set an expiration date on permanent invite links.", "CHAT_INVITE_PERMANENT"], ["ChatLinkExistsError", "BadRequestError", "The chat is public, you can't hide the history to new users.", "CHAT_LINK_EXISTS"], ["ChatMemberAddFailedError", "BadRequestError", "Could not add participants.", "CHAT_MEMBER_ADD_FAILED"], ["ChatNotModifiedError", "BadRequestError", "No changes were made to chat information because the new information you passed is identical to the current information.", "CHAT_NOT_MODIFIED"], ["ChatPublicRequiredError", "BadRequestError", "You can only enable join requests in public groups.", "CHAT_PUBLIC_REQUIRED"], ["ChatRestrictedError", "BadRequestError", "You can't send messages in this chat, you were restricted.", "CHAT_RESTRICTED"], ["ChatRevokeDateUnsupportedError", "BadRequestError", "`min_date` and `max_date` are not available for using with non-user peers.", "CHAT_REVOKE_DATE_UNSUPPORTED"], ["ChatSendInlineForbiddenError", "BadRequestError", "You can't send inline messages in this group.", "CHAT_SEND_INLINE_FORBIDDEN"], ["ChatTitleEmptyError", "BadRequestError", "No chat title provided.", "CHAT_TITLE_EMPTY"], ["ChatTooBigError", "BadRequestError", "This method is not available for groups with more than `chat_read_mark_size_threshold` members, [see client configuration &raquo;](https://core.telegram.org/api/config#client-configuration).", "CHAT_TOO_BIG"], ["ChatWriteForbiddenError", "BadRequestError", "You can't write in this chat.", "CHAT_WRITE_FORBIDDEN"], ["ChatlinkSlugEmptyError", "BadRequestError", "The specified slug is empty.", "CHATLINK_SLUG_EMPTY"], ["ChatlinkSlugExpiredError", "BadRequestError", "The specified [business chat link](https://core.telegram.org/api/business#business-chat-links) has expired.", "CHATLINK_SLUG_EXPIRED"], ["ChatlinksTooMuchError", "BadRequestError", "Too many [business chat links](https://core.telegram.org/api/business#business-chat-links) were created, please delete some older links.", "CHATLINKS_TOO_MUCH"], ["ChatlistExcludeInvalidError", "BadRequestError", "The specified `exclude_peers` are invalid.", "CHATLIST_EXCLUDE_INVALID"], ["ChatlistsTooMuchError", "BadRequestError", "You have created too many folder links, hitting the `chatlist_invites_limit_default`/`chatlist_invites_limit_premium` [limits &raquo;](https://core.telegram.org/api/config#chatlist-invites-limit-default).", "CHATLISTS_TOO_MUCH"], ["CodeEmptyError", "BadRequestError", "The provided code is empty.", "CODE_EMPTY"], ["CodeHashInvalidError", "BadRequestError", "Code hash invalid.", "CODE_HASH_INVALID"], ["CodeInvalidError", "BadRequestError", "Code invalid.", "CODE_INVALID"], ["CollectibleInvalidError", "BadRequestError", "The specified collectible is invalid.", "COLLECTIBLE_INVALID"], ["CollectibleNotFoundError", "BadRequestError", "The specified collectible could not be found.", "COLLECTIBLE_NOT_FOUND"], ["CollectionIdInvalidError", "BadRequestError", "The specified collection ID is invalid.", "COLLECTION_ID_INVALID"], ["ColorInvalidError", "BadRequestError", "The specified color palette ID was invalid.", "COLOR_INVALID"], ["ConnectionApiIdInvalidError", "BadRequestError", "The provided API id is invalid.", "CONNECTION_API_ID_INVALID"], ["ConnectionAppVersionEmptyError", "BadRequestError", "App version is empty.", "CONNECTION_APP_VERSION_EMPTY"], ["ConnectionIdInvalidError", "BadRequestError", "The specified connection ID is invalid.", "CONNECTION_ID_INVALID"], ["ConnectionLayerInvalidError", "BadRequestError", "Layer invalid.", "CONNECTION_LAYER_INVALID"], ["ContactAddMissingError", "BadRequestError", "Contact to add is missing.", "CONTACT_ADD_MISSING"], ["ContactIdInvalidError", "BadRequestError", "The provided contact ID is invalid.", "CONTACT_ID_INVALID"], ["ContactMissingError", "BadRequestError", "The specified user is not a contact.", "CONTACT_MISSING"], ["ContactNameEmptyError", "BadRequestError", "Contact name empty.", "CONTACT_NAME_EMPTY"], ["ContactReqMissingError", "BadRequestError", "Missing contact request.", "CONTACT_REQ_MISSING"], ["CreateCallFailedError", "BadRequestError", "An error occurred while creating the call.", "CREATE_CALL_FAILED"], ["CredentialInvalidError", "BadRequestError", "The specified credential is invalid.", "CREDENTIAL_INVALID"], ["CurrencyTotalAmountInvalidError", "BadRequestError", "The total amount of all prices is invalid.", "CURRENCY_TOTAL_AMOUNT_INVALID"], ["CustomReactionsTooManyError", "BadRequestError", "Too many custom reactions were specified.", "CUSTOM_REACTIONS_TOO_MANY"], ["DataHashSizeInvalidError", "BadRequestError", "The size of the specified secureValueErrorData.data_hash is invalid.", "DATA_HASH_SIZE_INVALID"], ["DataInvalidError", "BadRequestError", "Encrypted data invalid.", "DATA_INVALID"], ["DataJsonInvalidError", "BadRequestError", "The provided JSON data is invalid.", "DATA_JSON_INVALID"], ["DataTooLongError", "BadRequestError", "Data too long.", "DATA_TOO_LONG"], ["DateEmptyError", "BadRequestError", "Date empty.", "DATE_EMPTY"], ["DcIdInvalidError", "BadRequestError", "The provided DC ID is invalid.", "DC_ID_INVALID"], ["DhGAInvalidError", "BadRequestError", "g_a invalid.", "DH_G_A_INVALID"], ["DocumentInvalidError", "BadRequestError", "The specified document is invalid.", "DOCUMENT_INVALID"], ["EffectChatInvalidError", "BadRequestError", "Message [effects](https://core.telegram.org/api/effects) can only be used in private 1-on-1 chats, but the caller tried to send a message with an effect to a group or channel.", "EFFECT_CHAT_INVALID"], ["EffectIdInvalidError", "BadRequestError", "The specified effect ID is invalid.", "EFFECT_ID_INVALID"], ["EmailHashExpiredError", "BadRequestError", "Email hash expired.", "EMAIL_HASH_EXPIRED"], ["EmailInstallMissingError", "BadRequestError", "Attempting to send a code to the recovery email, but no email is configured.", "EMAIL_INSTALL_MISSING"], ["EmailInvalidError", "BadRequestError", "The specified email is invalid.", "EMAIL_INVALID"], ["EmailNotAllowedError", "BadRequestError", "The specified email cannot be used to complete the operation.", "EMAIL_NOT_ALLOWED"], ["EmailNotSetupError", "BadRequestError", "In order to change the login email with emailVerifyPurposeLoginChange, an existing login email must already be set using emailVerifyPurposeLoginSetup.", "EMAIL_NOT_SETUP"], ["EmailVerifyExpiredError", "BadRequestError", "The verification email has expired.", "EMAIL_VERIFY_EXPIRED"], ["EmojiInvalidError", "BadRequestError", "The specified theme emoji is valid.", "EMOJI_INVALID"], ["EmojiMarkupInvalidError", "BadRequestError", "The specified `video_emoji_markup` was invalid.", "EMOJI_MARKUP_INVALID"], ["EmojiNotModifiedError", "BadRequestError", "The theme wasn't changed.", "EMOJI_NOT_MODIFIED"], ["EmoticonEmptyError", "BadRequestError", "The emoji is empty.", "EMOTICON_EMPTY"], ["EmoticonInvalidError", "BadRequestError", "The specified emoji is invalid.", "EMOTICON_INVALID"], ["EmoticonStickerpackMissingError", "BadRequestError", "inputStickerSetDice.emoji cannot be empty.", "EMOTICON_STICKERPACK_MISSING"], ["EncryptedMessageInvalidError", "BadRequestError", "Encrypted message invalid.", "ENCRYPTED_MESSAGE_INVALID"], ["EncryptionAlreadyAcceptedError", "BadRequestError", "Secret chat already accepted.", "ENCRYPTION_ALREADY_ACCEPTED"], ["EncryptionAlreadyDeclinedError", "BadRequestError", "The secret chat was already declined.", "ENCRYPTION_ALREADY_DECLINED"], ["EncryptionDeclinedError", "BadRequestError", "The secret chat was declined.", "ENCRYPTION_DECLINED"], ["EncryptionIdInvalidError", "BadRequestError", "The provided secret chat ID is invalid.", "ENCRYPTION_ID_INVALID"], ["EntitiesTooLongError", "BadRequestError", "You provided too many styled message entities.", "ENTITIES_TOO_LONG"], ["EntityBoundsInvalidError", "BadRequestError", "A specified [entity offset or length](https://core.telegram.org/api/entities#entity-length) is invalid, see [here &raquo;](https://core.telegram.org/api/entities#entity-length) for info on how to properly compute the entity offset/length.", "ENTITY_BOUNDS_INVALID"], ["EntityDateFormatInvalidError", "BadRequestError", "One of the passed messageEntityFormattedDate objects has an invalid format (i.e. an invalid combination of the format flags).", "ENTITY_DATE_FORMAT_INVALID"], ["EntityDateInvalidError", "BadRequestError", "One of the passed messageEntityFormattedDate objects has an invalid date: the allowed value ranges from `0` to the current date plus 1098 days (`time()+1098*86400`).", "ENTITY_DATE_INVALID"], ["EntityDateTooLongError", "BadRequestError", "The maximum text span that can be covered by a date entity is 31 UTF-16 code units if any of the date formatting flags is set, or 127 UTF-16 code units without.  .", "ENTITY_DATE_TOO_LONG"], ["EntityMentionUserInvalidError", "BadRequestError", "You mentioned an invalid user.", "ENTITY_MENTION_USER_INVALID"], ["ErrorTextEmptyError", "BadRequestError", "The provided error message is empty.", "ERROR_TEXT_EMPTY"], ["ExpireDateInvalidError", "BadRequestError", "The specified expiration date is invalid.", "EXPIRE_DATE_INVALID"], ["ExpiresAtInvalidError", "BadRequestError", "The specified `expires_at` timestamp is invalid.", "EXPIRES_AT_INVALID"], ["ExportCardInvalidError", "BadRequestError", "Provided card is invalid.", "EXPORT_CARD_INVALID"], ["ExtendedMediaAmountInvalidError", "BadRequestError", "The specified `stars_amount` of the passed [inputMediaPaidMedia](https://core.telegram.org/constructor/inputMediaPaidMedia) is invalid.", "EXTENDED_MEDIA_AMOUNT_INVALID"], ["ExtendedMediaEmptyError", "BadRequestError", "The specified extended media is empty.", "EXTENDED_MEDIA_EMPTY"], ["ExtendedMediaInvalidError", "BadRequestError", "The specified paid media is invalid.", "EXTENDED_MEDIA_INVALID"], ["ExtendedMediaPeerInvalidError", "BadRequestError", "Paid media is not allowed for the target peer.", "EXTENDED_MEDIA_PEER_INVALID"], ["ExternalUrlInvalidError", "BadRequestError", "External URL invalid.", "EXTERNAL_URL_INVALID"], ["FileContentTypeInvalidError", "BadRequestError", "File content-type is invalid.", "FILE_CONTENT_TYPE_INVALID"], ["FileEmtpyError", "BadRequestError", "An empty file was provided.", "FILE_EMTPY"], ["FileIdInvalidError", "BadRequestError", "The provided file id is invalid.", "FILE_ID_INVALID"], ["FilePartEmptyError", "BadRequestError", "The provided file part is empty.", "FILE_PART_EMPTY"], ["FilePartInvalidError", "BadRequestError", "The file part number is invalid.", "FILE_PART_INVALID"], ["FilePartLengthInvalidError", "BadRequestError", "The length of a file part is invalid.", "FILE_PART_LENGTH_INVALID"], ["FilePartSizeChangedError", "BadRequestError", "Provided file part size has changed.", "FILE_PART_SIZE_CHANGED"], ["FilePartSizeInvalidError", "BadRequestError", "The provided file part size is invalid.", "FILE_PART_SIZE_INVALID"], ["FilePartTooBigError", "BadRequestError", "The uploaded file part is too big.", "FILE_PART_TOO_BIG"], ["FilePartTooSmallError", "BadRequestError", "The size of the uploaded file part is too small, please see the documentation for the allowed sizes.", "FILE_PART_TOO_SMALL"], ["FilePartsInvalidError", "BadRequestError", "The number of file parts is invalid.", "FILE_PARTS_INVALID"], ["FileTitleEmptyError", "BadRequestError", "An empty file title was specified.", "FILE_TITLE_EMPTY"], ["FileTokenInvalidError", "BadRequestError", "The master DC did not accept the `file_token` (e.g., the token has expired). Continue downloading the file from the master DC using upload.getFile.", "FILE_TOKEN_INVALID"], ["FilterIdInvalidError", "BadRequestError", "The specified filter ID is invalid.", "FILTER_ID_INVALID"], ["FilterIncludeEmptyError", "BadRequestError", "The include_peers vector of the filter is empty.", "FILTER_INCLUDE_EMPTY"], ["FilterNotSupportedError", "BadRequestError", "The specified filter cannot be used in this context.", "FILTER_NOT_SUPPORTED"], ["FilterTitleEmptyError", "BadRequestError", "The title field of the filter is empty.", "FILTER_TITLE_EMPTY"], ["FirstnameInvalidError", "BadRequestError", "The first name is invalid.", "FIRSTNAME_INVALID"], ["FolderIdEmptyError", "BadRequestError", "An empty folder ID was specified.", "FOLDER_ID_EMPTY"], ["FolderIdInvalidError", "BadRequestError", "Invalid folder ID.", "FOLDER_ID_INVALID"], ["FormExpiredError", "BadRequestError", "The form was generated more than 10 minutes ago and has expired, please re-generate it using [payments.getPaymentForm](https://core.telegram.org/method/payments.getPaymentForm) and pass the new `form_id`.", "FORM_EXPIRED"], ["FormIdEmptyError", "BadRequestError", "The specified form ID is empty.", "FORM_ID_EMPTY"], ["FormSubmitDuplicateError", "BadRequestError", "The same payment form was already submitted.  .", "FORM_SUBMIT_DUPLICATE"], ["FormUnsupportedError", "BadRequestError", "Please update your client.", "FORM_UNSUPPORTED"], ["ForumEnabledError", "BadRequestError", "You can't execute the specified action because the group is a [forum](https://core.telegram.org/api/forum), disable forum functionality to continue.", "FORUM_ENABLED"], ["FreshChangeAdminsForbiddenError", "BadRequestError", "You were just elected admin, you can't add or modify other admins yet.", "FRESH_CHANGE_ADMINS_FORBIDDEN"], ["FromMessageBotDisabledError", "BadRequestError", "Bots can't use fromMessage min constructors.", "FROM_MESSAGE_BOT_DISABLED"], ["FromPeerInvalidError", "BadRequestError", "The specified from_id is invalid.", "FROM_PEER_INVALID"], ["FrozenParticipantMissingError", "BadRequestError", "The current account is [frozen](https://core.telegram.org/api/auth#frozen-accounts), and cannot access the specified peer.", "FROZEN_PARTICIPANT_MISSING"], ["GameBotInvalidError", "BadRequestError", "Bots can't send another bot's game.", "GAME_BOT_INVALID"], ["GeneralModifyIconForbiddenError", "BadRequestError", `You can't modify the icon of the "General" topic.`, "GENERAL_MODIFY_ICON_FORBIDDEN"], ["GeoPointInvalidError", "BadRequestError", "Invalid geoposition provided.", "GEO_POINT_INVALID"], ["GifContentTypeInvalidError", "BadRequestError", "GIF content-type invalid.", "GIF_CONTENT_TYPE_INVALID"], ["GifIdInvalidError", "BadRequestError", "The provided GIF ID is invalid.", "GIF_ID_INVALID"], ["GiftMonthsInvalidError", "BadRequestError", "The value passed in invoice.inputInvoicePremiumGiftStars.months is invalid.", "GIFT_MONTHS_INVALID"], ["GiftSlugExpiredError", "BadRequestError", "The specified gift slug has expired.", "GIFT_SLUG_EXPIRED"], ["GiftSlugInvalidError", "BadRequestError", "The specified slug is invalid.", "GIFT_SLUG_INVALID"], ["GiftStarsInvalidError", "BadRequestError", "The specified amount of stars is invalid.", "GIFT_STARS_INVALID"], ["GraphExpiredReloadError", "BadRequestError", "This graph has expired, please obtain a new graph token.", "GRAPH_EXPIRED_RELOAD"], ["GraphInvalidReloadError", "BadRequestError", "Invalid graph token provided, please reload the stats and provide the updated token.", "GRAPH_INVALID_RELOAD"], ["GraphOutdatedReloadError", "BadRequestError", "The graph is outdated, please get a new async token using stats.getBroadcastStats.", "GRAPH_OUTDATED_RELOAD"], ["GroupcallAlreadyDiscardedError", "BadRequestError", "The group call was already discarded.", "GROUPCALL_ALREADY_DISCARDED"], ["GroupcallForbiddenError", "BadRequestError", "The specified group call cannot be used in this context.", "GROUPCALL_FORBIDDEN"], ["GroupcallInvalidError", "BadRequestError", "The specified group call is invalid.", "GROUPCALL_INVALID"], ["GroupcallJoinMissingError", "BadRequestError", "You haven't joined this group call.", "GROUPCALL_JOIN_MISSING"], ["GroupcallNotModifiedError", "BadRequestError", "Group call settings weren't modified.", "GROUPCALL_NOT_MODIFIED"], ["GroupcallSsrcDuplicateMuchError", "BadRequestError", "The app needs to retry joining the group call with a new SSRC value.", "GROUPCALL_SSRC_DUPLICATE_MUCH"], ["GroupedMediaInvalidError", "BadRequestError", "Invalid grouped media.", "GROUPED_MEDIA_INVALID"], ["HashInvalidError", "BadRequestError", "The provided hash is invalid.", "HASH_INVALID"], ["HashSizeInvalidError", "BadRequestError", "The size of the specified secureValueError.hash is invalid.", "HASH_SIZE_INVALID"], ["HashtagInvalidError", "BadRequestError", "The specified hashtag is invalid.", "HASHTAG_INVALID"], ["HideRequesterMissingError", "BadRequestError", "The join request was missing or was already handled.", "HIDE_REQUESTER_MISSING"], ["IdExpiredError", "BadRequestError", "The passed prepared inline message ID has expired.", "ID_EXPIRED"], ["IdInvalidError", "BadRequestError", "The passed ID is invalid.", "ID_INVALID"], ["ImageProcessFailedError", "BadRequestError", "Failure while processing image.", "IMAGE_PROCESS_FAILED"], ["ImportFileInvalidError", "BadRequestError", "The specified chat export file is invalid.", "IMPORT_FILE_INVALID"], ["ImportFormatDateInvalidError", "BadRequestError", "The date specified in the import file is invalid.", "IMPORT_FORMAT_DATE_INVALID"], ["ImportFormatUnrecognizedError", "BadRequestError", "The specified chat export file was exported from an unsupported chat app.", "IMPORT_FORMAT_UNRECOGNIZED"], ["ImportIdInvalidError", "BadRequestError", "The specified import ID is invalid.", "IMPORT_ID_INVALID"], ["ImportTokenInvalidError", "BadRequestError", "The specified token is invalid.", "IMPORT_TOKEN_INVALID"], ["InlineResultExpiredError", "BadRequestError", "The inline query expired.", "INLINE_RESULT_EXPIRED"], ["InputChatlistInvalidError", "BadRequestError", "The specified folder is invalid.", "INPUT_CHATLIST_INVALID"], ["InputFileInvalidError", "BadRequestError", "The specified [InputFile](https://core.telegram.org/type/InputFile) is invalid.", "INPUT_FILE_INVALID"], ["InputFilterInvalidError", "BadRequestError", "The specified filter is invalid.", "INPUT_FILTER_INVALID"], ["InputPeersEmptyError", "BadRequestError", "The specified peer array is empty.", "INPUT_PEERS_EMPTY"], ["InputPurposeInvalidError", "BadRequestError", "The specified payment purpose is invalid.", "INPUT_PURPOSE_INVALID"], ["InputStarsAmountInvalidError", "BadRequestError", "The specified offer amount in stars is invalid, see [here &raquo;](https://core.telegram.org/api/gifts#collectible-gift-purchase-offers) for the allowed range.", "INPUT_STARS_AMOUNT_INVALID"], ["InputStarsNanosInvalidError", "BadRequestError", " The specified offer amount in nanotons is invalid, see [here &raquo;](https://core.telegram.org/api/gifts#collectible-gift-purchase-offers) for the allowed range.", "INPUT_STARS_NANOS_INVALID"], ["InputTextEmptyError", "BadRequestError", "The specified text is empty.", "INPUT_TEXT_EMPTY"], ["InputTextTooLongError", "BadRequestError", "The specified text is too long.", "INPUT_TEXT_TOO_LONG"], ["InputUserDeactivatedError", "BadRequestError", "The specified user was deleted.", "INPUT_USER_DEACTIVATED"], ["InviteForbiddenWithJoinasError", "BadRequestError", "If the user has anonymously joined a group call as a channel, they can't invite other users to the group call because that would cause deanonymization, because the invite would be sent using the original user ID, not the anonymized channel ID.", "INVITE_FORBIDDEN_WITH_JOINAS"], ["InviteHashEmptyError", "BadRequestError", "The invite hash is empty.", "INVITE_HASH_EMPTY"], ["InviteHashExpiredError", "BadRequestError", "The invite link has expired.", "INVITE_HASH_EXPIRED"], ["InviteHashInvalidError", "BadRequestError", "The invite hash is invalid.", "INVITE_HASH_INVALID"], ["InviteRequestSentError", "BadRequestError", "You have successfully requested to join this chat or channel.", "INVITE_REQUEST_SENT"], ["InviteRevokedMissingError", "BadRequestError", "The specified invite link was already revoked or is invalid.", "INVITE_REVOKED_MISSING"], ["InviteSlugEmptyError", "BadRequestError", "The specified invite slug is empty.", "INVITE_SLUG_EMPTY"], ["InviteSlugExpiredError", "BadRequestError", "The specified chat folder link has expired.", "INVITE_SLUG_EXPIRED"], ["InviteSlugInvalidError", "BadRequestError", "The specified invitation slug is invalid.", "INVITE_SLUG_INVALID"], ["InvitesTooMuchError", "BadRequestError", "The maximum number of per-folder invites specified by the `chatlist_invites_limit_default`/`chatlist_invites_limit_premium` [client configuration parameters &raquo;](https://core.telegram.org/api/config#chatlist-invites-limit-default) was reached.", "INVITES_TOO_MUCH"], ["InvoiceInvalidError", "BadRequestError", "The specified invoice is invalid.", "INVOICE_INVALID"], ["InvoicePayloadInvalidError", "BadRequestError", "The specified invoice payload is invalid.", "INVOICE_PAYLOAD_INVALID"], ["JoinAsPeerInvalidError", "BadRequestError", "The specified peer cannot be used to join a group call.", "JOIN_AS_PEER_INVALID"], ["LangCodeInvalidError", "BadRequestError", "The specified language code is invalid.", "LANG_CODE_INVALID"], ["LangCodeNotSupportedError", "BadRequestError", "The specified language code is not supported.", "LANG_CODE_NOT_SUPPORTED"], ["LangPackInvalidError", "BadRequestError", "The provided language pack is invalid.", "LANG_PACK_INVALID"], ["LanguageInvalidError", "BadRequestError", "The specified lang_code is invalid.", "LANGUAGE_INVALID"], ["LastnameInvalidError", "BadRequestError", "The last name is invalid.", "LASTNAME_INVALID"], ["LimitInvalidError", "BadRequestError", "The provided limit is invalid.", "LIMIT_INVALID"], ["LimitPerPostInvalidError", "BadRequestError", "The specified reactions_limit value is invalid.", "LIMIT_PER_POST_INVALID"], ["LinkNotModifiedError", "BadRequestError", "Discussion link not modified.", "LINK_NOT_MODIFIED"], ["LocationInvalidError", "BadRequestError", "The provided location is invalid.", "LOCATION_INVALID"], ["ManagerInvalidError", "BadRequestError", "The specified manager bot is invalid.", "MANAGER_INVALID"], ["ManagerPermissionMissingError", "BadRequestError", "The specified manager bot does not have the [user](https://core.telegram.org/constructor/user).`bot_can_manage_bots` flag set.", "MANAGER_PERMISSION_MISSING"], ["MaxDateInvalidError", "BadRequestError", "The specified maximum date is invalid.", "MAX_DATE_INVALID"], ["MaxIdInvalidError", "BadRequestError", "The provided max ID is invalid.", "MAX_ID_INVALID"], ["MaxQtsInvalidError", "BadRequestError", "The specified max_qts is invalid.", "MAX_QTS_INVALID"], ["Md5ChecksumInvalidError", "BadRequestError", "The MD5 checksums do not match.", "MD5_CHECKSUM_INVALID"], ["MediaAlreadyPaidError", "BadRequestError", "You already paid for the specified media.", "MEDIA_ALREADY_PAID"], ["MediaCaptionTooLongError", "BadRequestError", "The caption is too long.", "MEDIA_CAPTION_TOO_LONG"], ["MediaEmptyError", "BadRequestError", "The provided media object is invalid.", "MEDIA_EMPTY"], ["MediaFileInvalidError", "BadRequestError", "The specified media file is invalid.", "MEDIA_FILE_INVALID"], ["MediaGroupedInvalidError", "BadRequestError", "You tried to send media of different types in an album.", "MEDIA_GROUPED_INVALID"], ["MediaInvalidError", "BadRequestError", "Media invalid.", "MEDIA_INVALID"], ["MediaNewInvalidError", "BadRequestError", "The new media is invalid.", "MEDIA_NEW_INVALID"], ["MediaPrevInvalidError", "BadRequestError", "Previous media invalid.", "MEDIA_PREV_INVALID"], ["MediaTtlInvalidError", "BadRequestError", "The specified media TTL is invalid.", "MEDIA_TTL_INVALID"], ["MediaTypeInvalidError", "BadRequestError", "The specified media type cannot be used in stories.", "MEDIA_TYPE_INVALID"], ["MediaVideoStoryMissingError", "BadRequestError", "A non-story video cannot be repubblished as a story (emitted when trying to resend a non-story video as a story using inputDocument).", "MEDIA_VIDEO_STORY_MISSING"], ["MegagroupGeoRequiredError", "BadRequestError", "This method can only be invoked on a geogroup.", "MEGAGROUP_GEO_REQUIRED"], ["MegagroupIdInvalidError", "BadRequestError", "Invalid supergroup ID.", "MEGAGROUP_ID_INVALID"], ["MegagroupPrehistoryHiddenError", "BadRequestError", "Group with hidden history for new members can't be set as discussion groups.", "MEGAGROUP_PREHISTORY_HIDDEN"], ["MegagroupRequiredError", "BadRequestError", "You can only use this method on a supergroup.", "MEGAGROUP_REQUIRED"], ["MessageEditTimeExpiredError", "BadRequestError", "You can't edit this message anymore, too much time has passed since its creation.", "MESSAGE_EDIT_TIME_EXPIRED"], ["MessageEmptyError", "BadRequestError", "The provided message is empty.", "MESSAGE_EMPTY"], ["MessageIdInvalidError", "BadRequestError", "The provided message id is invalid.", "MESSAGE_ID_INVALID"], ["MessageIdsEmptyError", "BadRequestError", "No message ids were provided.", "MESSAGE_IDS_EMPTY"], ["MessageNotModifiedError", "BadRequestError", "The provided message data is identical to the previous message data, the message wasn't modified.", "MESSAGE_NOT_MODIFIED"], ["MessageNotReadYetError", "BadRequestError", "The specified message wasn't read yet.", "MESSAGE_NOT_READ_YET"], ["MessagePollClosedError", "BadRequestError", "Poll closed.", "MESSAGE_POLL_CLOSED"], ["MessageRequiredError", "BadRequestError", "A non-empty list of IDs must be passed to `id`.", "MESSAGE_REQUIRED"], ["MessageTooLongError", "BadRequestError", "The provided message is too long.", "MESSAGE_TOO_LONG"], ["MessageTooOldError", "BadRequestError", "The message is too old, the requested information is not available.", "MESSAGE_TOO_OLD"], ["MethodInvalidError", "BadRequestError", "The specified method is invalid.", "METHOD_INVALID"], ["MinDateInvalidError", "BadRequestError", "The specified minimum date is invalid.", "MIN_DATE_INVALID"], ["MonthInvalidError", "BadRequestError", "The number of months specified in inputInvoicePremiumGiftStars.months is invalid.", "MONTH_INVALID"], ["MsgIdInvalidError", "BadRequestError", "Invalid message ID provided.", "MSG_ID_INVALID"], ["MsgTooOldError", "BadRequestError", "[`chat_read_mark_expire_period` seconds](https://core.telegram.org/api/config#chat-read-mark-expire-period) have passed since the message was sent, read receipts were deleted.", "MSG_TOO_OLD"], ["MsgVoiceMissingError", "BadRequestError", "The specified message is not a voice message.", "MSG_VOICE_MISSING"], ["MsgVoiceTooLongError", "BadRequestError", "The specified voice message is too long to be transcribed.", "MSG_VOICE_TOO_LONG"], ["MsgWaitError", "BadRequestError", "A waiting call returned an error.", "MSG_WAIT_FAILED"], ["MultiMediaTooLongError", "BadRequestError", "Too many media files for album.", "MULTI_MEDIA_TOO_LONG"], ["NameInvalidError", "BadRequestError", "The specified bot name is invalid.", "NAME_INVALID"], ["NeedActionMissingError", "BadRequestError", "The caller didn't specify a valid action (either save or suggest) for the contact profile photo upload.", "NEED_ACTION_MISSING"], ["NewSaltInvalidError", "BadRequestError", "The new salt is invalid.", "NEW_SALT_INVALID"], ["NewSettingsEmptyError", "BadRequestError", "No password is set on the current account, and no new password was specified in `new_settings`.", "NEW_SETTINGS_EMPTY"], ["NewSettingsInvalidError", "BadRequestError", "The new password settings are invalid.", "NEW_SETTINGS_INVALID"], ["NextOffsetInvalidError", "BadRequestError", "The specified offset is longer than 64 bytes.", "NEXT_OFFSET_INVALID"], ["NoPaymentNeededError", "BadRequestError", "The upgrade/transfer of the specified gift was already paid for or is free.", "NO_PAYMENT_NEEDED"], ["NogeneralHideForbiddenError", "BadRequestError", 'Only the "General" topic with `id=1` can be hidden.', "NOGENERAL_HIDE_FORBIDDEN"], ["NotEligibleError", "BadRequestError", "The current user is not eligible to join the Peer-to-Peer Login Program.", "NOT_ELIGIBLE"], ["NotJoinedError", "BadRequestError", "The current user hasn't joined the Peer-to-Peer Login Program.", "NOT_JOINED"], ["OffsetInvalidError", "BadRequestError", "The provided offset is invalid.", "OFFSET_INVALID"], ["OffsetPeerIdInvalidError", "BadRequestError", "The provided offset peer is invalid.", "OFFSET_PEER_ID_INVALID"], ["OptionInvalidError", "BadRequestError", "Invalid option selected.", "OPTION_INVALID"], ["OptionsTooMuchError", "BadRequestError", "Too many options provided.", "OPTIONS_TOO_MUCH"], ["OrderInvalidError", "BadRequestError", "The specified username order is invalid.", "ORDER_INVALID"], ["PackShortNameInvalidError", "BadRequestError", "Short pack name invalid.", "PACK_SHORT_NAME_INVALID"], ["PackShortNameOccupiedError", "BadRequestError", "A stickerpack with this name already exists.", "PACK_SHORT_NAME_OCCUPIED"], ["PackTitleInvalidError", "BadRequestError", "The stickerpack title is invalid.", "PACK_TITLE_INVALID"], ["PackTypeInvalidError", "BadRequestError", "The masks and emojis flags are mutually exclusive.", "PACK_TYPE_INVALID"], ["ParentPeerInvalidError", "BadRequestError", "The specified `parent_peer` is invalid.", "PARENT_PEER_INVALID"], ["ParticipantIdInvalidError", "BadRequestError", "The specified participant ID is invalid.", "PARTICIPANT_ID_INVALID"], ["ParticipantJoinMissingError", "BadRequestError", "Trying to enable a presentation, when the user hasn't joined the Video Chat with [phone.joinGroupCall](https://core.telegram.org/method/phone.joinGroupCall).", "PARTICIPANT_JOIN_MISSING"], ["ParticipantVersionOutdatedError", "BadRequestError", "The other participant does not use an up to date telegram client with support for calls.", "PARTICIPANT_VERSION_OUTDATED"], ["ParticipantsTooFewError", "BadRequestError", "Not enough participants.", "PARTICIPANTS_TOO_FEW"], ["PasskeyOriginMismatchError", "BadRequestError", "Third-party clients currently don't support passkeys even when changing the origin.", "PASSKEY_ORIGIN_MISMATCH"], ["PasswordEmptyError", "BadRequestError", "The provided password is empty.", "PASSWORD_EMPTY"], ["PasswordHashInvalidError", "BadRequestError", "The provided password hash is invalid.", "PASSWORD_HASH_INVALID"], ["PasswordMissingError", "BadRequestError", "You must [enable 2FA](https://core.telegram.org/api/srp) before executing this operation.", "PASSWORD_MISSING"], ["PasswordRecoveryExpiredError", "BadRequestError", "The recovery code has expired.", "PASSWORD_RECOVERY_EXPIRED"], ["PasswordRecoveryNaError", "BadRequestError", "No email was set, can't recover password via email.", "PASSWORD_RECOVERY_NA"], ["PasswordRequiredError", "BadRequestError", "A [2FA password](https://core.telegram.org/api/srp) must be configured to use Telegram Passport.", "PASSWORD_REQUIRED"], ["PaymentCredentialsInvalidError", "BadRequestError", "The specified payment credentials are invalid.", "PAYMENT_CREDENTIALS_INVALID"], ["PaymentProviderInvalidError", "BadRequestError", "The specified payment provider is invalid.", "PAYMENT_PROVIDER_INVALID"], ["PaymentRequiredError", "BadRequestError", "Payment is required for this action, see [here &raquo;](https://core.telegram.org/api/gifts) for more info.", "PAYMENT_REQUIRED"], ["PeerHistoryEmptyError", "BadRequestError", "You can't pin an empty chat with a user.", "PEER_HISTORY_EMPTY"], ["PeerIdInvalidError", "BadRequestError", "The provided peer id is invalid.", "PEER_ID_INVALID"], ["PeerIdNotSupportedError", "BadRequestError", "The provided peer ID is not supported.", "PEER_ID_NOT_SUPPORTED"], ["PeerTypesInvalidError", "BadRequestError", "The passed [keyboardButtonSwitchInline](https://core.telegram.org/constructor/keyboardButtonSwitchInline).`peer_types` field is invalid.", "PEER_TYPES_INVALID"], ["PeersListEmptyError", "BadRequestError", "The specified list of peers is empty.", "PEERS_LIST_EMPTY"], ["PersistentTimestampEmptyError", "BadRequestError", "Persistent timestamp empty.", "PERSISTENT_TIMESTAMP_EMPTY"], ["PersistentTimestampInvalidError", "BadRequestError", "Persistent timestamp invalid.", "PERSISTENT_TIMESTAMP_INVALID"], ["PhoneCodeEmptyError", "BadRequestError", "phone_code is missing.", "PHONE_CODE_EMPTY"], ["PhoneCodeExpiredError", "BadRequestError", "The phone code you provided has expired.", "PHONE_CODE_EXPIRED"], ["PhoneCodeHashEmptyError", "BadRequestError", "phone_code_hash is missing.", "PHONE_CODE_HASH_EMPTY"], ["PhoneCodeInvalidError", "BadRequestError", "The provided phone code is invalid.", "PHONE_CODE_INVALID"], ["PhoneHashExpiredError", "BadRequestError", "An invalid or expired `phone_code_hash` was provided.", "PHONE_HASH_EXPIRED"], ["PhoneNotOccupiedError", "BadRequestError", "No user is associated to the specified phone number.", "PHONE_NOT_OCCUPIED"], ["PhoneNumberAppSignupForbiddenError", "BadRequestError", "You can't sign up using this app.", "PHONE_NUMBER_APP_SIGNUP_FORBIDDEN"], ["PhoneNumberBannedError", "BadRequestError", "The provided phone number is banned from telegram.", "PHONE_NUMBER_BANNED"], ["PhoneNumberFloodError", "BadRequestError", "You asked for the code too many times.", "PHONE_NUMBER_FLOOD"], ["PhoneNumberInvalidError", "BadRequestError", "The phone number is invalid.", "PHONE_NUMBER_INVALID"], ["PhoneNumberOccupiedError", "BadRequestError", "The phone number is already in use.", "PHONE_NUMBER_OCCUPIED"], ["PhoneNumberUnoccupiedError", "BadRequestError", "The phone number is not yet being used.", "PHONE_NUMBER_UNOCCUPIED"], ["PhonePasswordProtectedError", "BadRequestError", "This phone is password protected.", "PHONE_PASSWORD_PROTECTED"], ["PhotoContentTypeInvalidError", "BadRequestError", "Photo mime-type invalid.", "PHOTO_CONTENT_TYPE_INVALID"], ["PhotoContentUrlEmptyError", "BadRequestError", "Photo URL invalid.", "PHOTO_CONTENT_URL_EMPTY"], ["PhotoCropFileMissingError", "BadRequestError", "Photo crop file missing.", "PHOTO_CROP_FILE_MISSING"], ["PhotoCropSizeSmallError", "BadRequestError", "Photo is too small.", "PHOTO_CROP_SIZE_SMALL"], ["PhotoExtInvalidError", "BadRequestError", "The extension of the photo is invalid.", "PHOTO_EXT_INVALID"], ["PhotoFileMissingError", "BadRequestError", "Profile photo file missing.", "PHOTO_FILE_MISSING"], ["PhotoIdInvalidError", "BadRequestError", "Photo ID invalid.", "PHOTO_ID_INVALID"], ["PhotoInvalidError", "BadRequestError", "Photo invalid.", "PHOTO_INVALID"], ["PhotoInvalidDimensionsError", "BadRequestError", "The photo dimensions are invalid.", "PHOTO_INVALID_DIMENSIONS"], ["PhotoSaveFileInvalidError", "BadRequestError", "Internal issues, try again later.", "PHOTO_SAVE_FILE_INVALID"], ["PhotoThumbUrlEmptyError", "BadRequestError", "Photo thumbnail URL is empty.", "PHOTO_THUMB_URL_EMPTY"], ["PinRestrictedError", "BadRequestError", "You can't pin messages.", "PIN_RESTRICTED"], ["PinnedDialogsTooMuchError", "BadRequestError", "Too many pinned dialogs.", "PINNED_DIALOGS_TOO_MUCH"], ["PinnedTooMuchError", "BadRequestError", "There are too many pinned topics, unpin some first.", "PINNED_TOO_MUCH"], ["PinnedTopicNotModifiedError", "BadRequestError", "The specified topic is already pinned.", "PINNED_TOPIC_NOT_MODIFIED"], ["PollAnswerInvalidError", "BadRequestError", "One of the poll answers is not acceptable.", "POLL_ANSWER_INVALID"], ["PollAnswersInvalidError", "BadRequestError", "Invalid poll answers were provided.", "POLL_ANSWERS_INVALID"], ["PollOptionDuplicateError", "BadRequestError", "Duplicate poll options provided.", "POLL_OPTION_DUPLICATE"], ["PollOptionInvalidError", "BadRequestError", "Invalid poll option provided.", "POLL_OPTION_INVALID"], ["PollQuestionInvalidError", "BadRequestError", "One of the poll questions is not acceptable.", "POLL_QUESTION_INVALID"], ["PremiumAccountRequiredError", "BadRequestError", "A premium account is required to execute this action.", "PREMIUM_ACCOUNT_REQUIRED"], ["PremiumPurposeInvalidError", "BadRequestError", "The specified InputStorePaymentPurpose is invalid.", "PREMIUM_PURPOSE_INVALID"], ["PricingChatInvalidError", "BadRequestError", "The pricing for the [subscription](https://core.telegram.org/api/subscriptions) is invalid, the maximum price is specified in the [`stars_subscription_amount_max` config key &raquo;](https://core.telegram.org/api/config#stars-subscription-amount-max).", "PRICING_CHAT_INVALID"], ["PrivacyKeyInvalidError", "BadRequestError", "The privacy key is invalid.", "PRIVACY_KEY_INVALID"], ["PrivacyTooLongError", "BadRequestError", "Too many privacy rules were specified, the current limit is 1000.", "PRIVACY_TOO_LONG"], ["PrivacyValueInvalidError", "BadRequestError", "The specified privacy rule combination is invalid.", "PRIVACY_VALUE_INVALID"], ["PublicBroadcastExpectedError", "BadRequestError", "`channel` only accepts a channel, but a supergroup was passed.", "PUBLIC_BROADCAST_EXPECTED"], ["PublicKeyInvalidError", "BadRequestError", "The specified e2e public key is invalid.", "PUBLIC_KEY_INVALID"], ["PublicKeyRequiredError", "BadRequestError", "A public key is required.", "PUBLIC_KEY_REQUIRED"], ["PurposeInvalidError", "BadRequestError", "The specified payment purpose is invalid.", "PURPOSE_INVALID"], ["QueryIdEmptyError", "BadRequestError", "The query ID is empty.", "QUERY_ID_EMPTY"], ["QueryIdInvalidError", "BadRequestError", "The query ID is invalid.", "QUERY_ID_INVALID"], ["QueryTooShortError", "BadRequestError", "The query string is too short.", "QUERY_TOO_SHORT"], ["QuickRepliesBotNotAllowedError", "BadRequestError", "[Quick replies](https://core.telegram.org/api/business#quick-reply-shortcuts) cannot be used by bots.", "QUICK_REPLIES_BOT_NOT_ALLOWED"], ["QuickRepliesTooMuchError", "BadRequestError", "A maximum of [appConfig.`quick_replies_limit`](https://core.telegram.org/api/config#quick-replies-limit) shortcuts may be created, the limit was reached.", "QUICK_REPLIES_TOO_MUCH"], ["QuizAnswerMissingError", "BadRequestError", "You can forward a quiz while hiding the original author only after choosing an option in the quiz.", "QUIZ_ANSWER_MISSING"], ["QuizCorrectAnswerInvalidError", "BadRequestError", "An invalid value was provided to the correct_answers field.", "QUIZ_CORRECT_ANSWER_INVALID"], ["QuizCorrectAnswersEmptyError", "BadRequestError", "No correct quiz answer was specified.", "QUIZ_CORRECT_ANSWERS_EMPTY"], ["QuizCorrectAnswersTooMuchError", "BadRequestError", "You specified too many correct answers in a quiz, quizzes can only have one right answer!", "QUIZ_CORRECT_ANSWERS_TOO_MUCH"], ["QuizMultipleInvalidError", "BadRequestError", "Quizzes can't have the multiple_choice flag set!", "QUIZ_MULTIPLE_INVALID"], ["QuoteTextInvalidError", "BadRequestError", "The specified `reply_to`.`quote_text` field is invalid.", "QUOTE_TEXT_INVALID"], ["RaiseHandForbiddenError", "BadRequestError", "You cannot raise your hand.", "RAISE_HAND_FORBIDDEN"], ["RandomIdDuplicateError", "BadRequestError", "You provided a random ID that was already used.", "RANDOM_ID_DUPLICATE"], ["RandomIdEmptyError", "BadRequestError", "Random ID empty.", "RANDOM_ID_EMPTY"], ["RandomIdExpiredError", "BadRequestError", "The specified `random_id` was expired (most likely it didn't follow the required `uint64_t random_id = (time() << 32) | ((uint64_t)random_uint32_t())` format, or the specified time is too far in the past).", "RANDOM_ID_EXPIRED"], ["RandomIdInvalidError", "BadRequestError", "A provided random ID is invalid.", "RANDOM_ID_INVALID"], ["RandomLengthInvalidError", "BadRequestError", "Random length invalid.", "RANDOM_LENGTH_INVALID"], ["RangesInvalidError", "BadRequestError", "Invalid range provided.", "RANGES_INVALID"], ["ReactionEmptyError", "BadRequestError", "Empty reaction provided.", "REACTION_EMPTY"], ["ReactionInvalidError", "BadRequestError", "The specified reaction is invalid.", "REACTION_INVALID"], ["ReactionsCountInvalidError", "BadRequestError", "The specified number of reactions is invalid.", "REACTIONS_COUNT_INVALID"], ["ReactionsTooManyError", "BadRequestError", "The message already has exactly `reactions_uniq_max` reaction emojis, you can't react with a new emoji, see [the docs for more info &raquo;](https://core.telegram.org/api/config#client-configuration).", "REACTIONS_TOO_MANY"], ["ReceiptEmptyError", "BadRequestError", "The specified receipt is empty.", "RECEIPT_EMPTY"], ["ReplyMarkupBuyEmptyError", "BadRequestError", "Reply markup for buy button empty.", "REPLY_MARKUP_BUY_EMPTY"], ["ReplyMarkupGameEmptyError", "BadRequestError", "A game message is being edited, but the newly provided keyboard doesn't have a keyboardButtonGame button.", "REPLY_MARKUP_GAME_EMPTY"], ["ReplyMarkupInvalidError", "BadRequestError", "The provided reply markup is invalid.", "REPLY_MARKUP_INVALID"], ["ReplyMarkupTooLongError", "BadRequestError", "The specified reply_markup is too long.", "REPLY_MARKUP_TOO_LONG"], ["ReplyMessageIdInvalidError", "BadRequestError", "The specified reply-to message ID is invalid.", "REPLY_MESSAGE_ID_INVALID"], ["ReplyMessagesTooMuchError", "BadRequestError", "Each shortcut can contain a maximum of [appConfig.`quick_reply_messages_limit`](https://core.telegram.org/api/config#quick-reply-messages-limit) messages, the limit was reached.", "REPLY_MESSAGES_TOO_MUCH"], ["ReplyToInvalidError", "BadRequestError", "The specified `reply_to` field is invalid.", "REPLY_TO_INVALID"], ["ReplyToMonoforumPeerInvalidError", "BadRequestError", "The specified inputReplyToMonoForum.monoforum_peer_id is invalid.", "REPLY_TO_MONOFORUM_PEER_INVALID"], ["ReplyToUserInvalidError", "BadRequestError", "The replied-to user is invalid.", "REPLY_TO_USER_INVALID"], ["RequestMsgExpiredError", "BadRequestError", "The request specified in request_msg_id has already expired.", "REQUEST_MSG_EXPIRED"], ["RequestTokenInvalidError", "BadRequestError", "The master DC did not accept the `request_token` from the CDN DC. Continue downloading the file from the master DC using upload.getFile.", "REQUEST_TOKEN_INVALID"], ["ResellStarsTooFewError", "BadRequestError", "The offered price is too low.", "RESELL_STARS_TOO_FEW"], ["ResellStarsTooMuchError", "BadRequestError", "The offered price is too high.", "RESELL_STARS_TOO_MUCH"], ["ResetRequestMissingError", "BadRequestError", "No password reset is in progress.", "RESET_REQUEST_MISSING"], ["ResultIdDuplicateError", "BadRequestError", "You provided a duplicate result ID.", "RESULT_ID_DUPLICATE"], ["ResultIdEmptyError", "BadRequestError", "Result ID empty.", "RESULT_ID_EMPTY"], ["ResultIdInvalidError", "BadRequestError", "One of the specified result IDs is invalid.", "RESULT_ID_INVALID"], ["ResultTypeInvalidError", "BadRequestError", "Result type invalid.", "RESULT_TYPE_INVALID"], ["ResultsTooMuchError", "BadRequestError", "Too many results were provided.", "RESULTS_TOO_MUCH"], ["RevoteNotAllowedError", "BadRequestError", "You cannot change your vote.", "REVOTE_NOT_ALLOWED"], ["RightsNotModifiedError", "BadRequestError", "The new admin rights are equal to the old rights, no change was made.", "RIGHTS_NOT_MODIFIED"], ["RingtoneInvalidError", "BadRequestError", "The specified ringtone is invalid.", "RINGTONE_INVALID"], ["RingtoneMimeInvalidError", "BadRequestError", "The MIME type for the ringtone is invalid.", "RINGTONE_MIME_INVALID"], ["RsaDecryptFailedError", "BadRequestError", "Internal RSA decryption failed.", "RSA_DECRYPT_FAILED"], ["SavedIdEmptyError", "BadRequestError", "The passed inputSavedStarGiftChat.saved_id is empty.", "SAVED_ID_EMPTY"], ["ScheduleBotNotAllowedError", "BadRequestError", "Bots cannot schedule messages.", "SCHEDULE_BOT_NOT_ALLOWED"], ["ScheduleDateInvalidError", "BadRequestError", "Invalid schedule date provided.", "SCHEDULE_DATE_INVALID"], ["ScheduleDateTooLateError", "BadRequestError", "You can't schedule a message this far in the future.", "SCHEDULE_DATE_TOO_LATE"], ["ScheduleStatusPrivateError", "BadRequestError", "Can't schedule until user is online, if the user's last seen timestamp is hidden by their privacy settings.", "SCHEDULE_STATUS_PRIVATE"], ["ScheduleTooMuchError", "BadRequestError", "There are too many scheduled messages.", "SCHEDULE_TOO_MUCH"], ["ScoreInvalidError", "BadRequestError", "The specified game score is invalid.", "SCORE_INVALID"], ["SearchQueryEmptyError", "BadRequestError", "The search query is empty.", "SEARCH_QUERY_EMPTY"], ["SearchWithLinkNotSupportedError", "BadRequestError", "You cannot provide a search query and an invite link at the same time.", "SEARCH_WITH_LINK_NOT_SUPPORTED"], ["SecondsInvalidError", "BadRequestError", "Invalid duration provided.", "SECONDS_INVALID"], ["SecureSecretRequiredError", "BadRequestError", "A secure secret is required.", "SECURE_SECRET_REQUIRED"], ["SelfDeleteRestrictedError", "BadRequestError", "Business bots can't delete messages just for the user, `revoke` **must** be set.", "SELF_DELETE_RESTRICTED"], ["SendAsPeerInvalidError", "BadRequestError", "You can't send messages as the specified peer.", "SEND_AS_PEER_INVALID"], ["SendMessageGameInvalidError", "BadRequestError", "An inputBotInlineMessageGame can only be contained in an inputBotInlineResultGame, not in an inputBotInlineResult/inputBotInlineResultPhoto/etc.", "SEND_MESSAGE_GAME_INVALID"], ["SendMessageMediaInvalidError", "BadRequestError", "Invalid media provided.", "SEND_MESSAGE_MEDIA_INVALID"], ["SendMessageTypeInvalidError", "BadRequestError", "The message type is invalid.", "SEND_MESSAGE_TYPE_INVALID"], ["SettingsInvalidError", "BadRequestError", "Invalid settings were provided.", "SETTINGS_INVALID"], ["Sha256HashInvalidError", "BadRequestError", "The provided SHA256 hash is invalid.", "SHA256_HASH_INVALID"], ["ShortNameInvalidError", "BadRequestError", "The specified short name is invalid.", "SHORT_NAME_INVALID"], ["ShortNameOccupiedError", "BadRequestError", "The specified short name is already in use.", "SHORT_NAME_OCCUPIED"], ["ShortcutInvalidError", "BadRequestError", "The specified shortcut is invalid.", "SHORTCUT_INVALID"], ["SlotsEmptyError", "BadRequestError", "The specified slot list is empty.", "SLOTS_EMPTY"], ["SlowmodeMultiMsgsDisabledError", "BadRequestError", "Slowmode is enabled, you cannot forward multiple messages to this group.", "SLOWMODE_MULTI_MSGS_DISABLED"], ["SlugInvalidError", "BadRequestError", "The specified invoice slug is invalid.", "SLUG_INVALID"], ["SmsCodeCreateFailedError", "BadRequestError", "An error occurred while creating the SMS code.", "SMS_CODE_CREATE_FAILED"], ["SmsjobIdInvalidError", "BadRequestError", "The specified job ID is invalid.", "SMSJOB_ID_INVALID"], ["SrpAInvalidError", "BadRequestError", "The specified inputCheckPasswordSRP.A value is invalid.", "SRP_A_INVALID"], ["SrpIdInvalidError", "BadRequestError", "Invalid SRP ID provided.", "SRP_ID_INVALID"], ["SrpPasswordChangedError", "BadRequestError", "Password has changed.", "SRP_PASSWORD_CHANGED"], ["StargiftAlreadyConvertedError", "BadRequestError", "The specified star gift was already converted to Stars.", "STARGIFT_ALREADY_CONVERTED"], ["StargiftAlreadyRefundedError", "BadRequestError", "The specified star gift was already refunded.", "STARGIFT_ALREADY_REFUNDED"], ["StargiftAlreadyUpgradedError", "BadRequestError", "The specified gift was already upgraded to a collectible gift.", "STARGIFT_ALREADY_UPGRADED"], ["StargiftAttributeInvalidError", "BadRequestError", "One of the specified star gift attributes is invalid.", "STARGIFT_ATTRIBUTE_INVALID"], ["StargiftInvalidError", "BadRequestError", "The passed gift is invalid.", "STARGIFT_INVALID"], ["StargiftMessageInvalidError", "BadRequestError", "The specified inputInvoiceStarGift.message is invalid.", "STARGIFT_MESSAGE_INVALID"], ["StargiftNotFoundError", "BadRequestError", "The specified gift was not found.", "STARGIFT_NOT_FOUND"], ["StargiftNotOwnerError", "BadRequestError", "You're not the owner of the gift you trying to transfer.", "STARGIFT_NOT_OWNER"], ["StargiftNotUniqueError", "BadRequestError", "You can't transfer a non-collectible gift.", "STARGIFT_NOT_UNIQUE"], ["StargiftObjectInvalidError", "BadRequestError", "The specified star gift object is invalid.", "STARGIFT_OBJECT_INVALID"], ["StargiftOfferInvalidError", "BadRequestError", "The specified offer amount is invalid.", "STARGIFT_OFFER_INVALID"], ["StargiftOfferNotAllowedError", "BadRequestError", "You can't send a purchase offer for this gift.", "STARGIFT_OFFER_NOT_ALLOWED"], ["StargiftOwnerInvalidError", "BadRequestError", "You cannot transfer or sell a gift owned by another user.", "STARGIFT_OWNER_INVALID"], ["StargiftPeerInvalidError", "BadRequestError", "The specified inputSavedStarGiftChat.peer is invalid.", "STARGIFT_PEER_INVALID"], ["StargiftResellCurrencyNotAllowedError", "BadRequestError", "You can't buy the gift using the specified currency (i.e. trying to pay in Stars for TON gifts).", "STARGIFT_RESELL_CURRENCY_NOT_ALLOWED"], ["StargiftSlugInvalidError", "BadRequestError", "The specified gift slug is invalid.", "STARGIFT_SLUG_INVALID"], ["StargiftUpgradeUnavailableError", "BadRequestError", "A received gift can only be upgraded to a collectible gift if the [messageActionStarGift](https://core.telegram.org/constructor/messageActionStarGift)/[savedStarGift](https://core.telegram.org/constructor/savedStarGift).`can_upgrade` flag is set.", "STARGIFT_UPGRADE_UNAVAILABLE"], ["StargiftUsageLimitedError", "BadRequestError", "The gift is sold out.", "STARGIFT_USAGE_LIMITED"], ["StargiftUserUsageLimitedError", "BadRequestError", "You've reached the starGift.limited_per_user limit, you can't buy any more gifts of this type.", "STARGIFT_USER_USAGE_LIMITED"], ["StarrefAwaitingEndError", "BadRequestError", "The previous referral program was terminated less than 24 hours ago: further changes can be made after the date specified in userFull.starref_program.end_date.", "STARREF_AWAITING_END"], ["StarrefExpiredError", "BadRequestError", "The specified referral link is invalid.", "STARREF_EXPIRED"], ["StarrefHashRevokedError", "BadRequestError", "The specified affiliate link was already revoked.", "STARREF_HASH_REVOKED"], ["StarrefPermilleInvalidError", "BadRequestError", "The specified commission_permille is invalid: the minimum and maximum values for this parameter are contained in the [starref_min_commission_permille](https://core.telegram.org/api/config#starref-min-commission-permille) and [starref_max_commission_permille](https://core.telegram.org/api/config#starref-max-commission-permille) client configuration parameters.", "STARREF_PERMILLE_INVALID"], ["StarrefPermilleTooLowError", "BadRequestError", "The specified commission_permille is too low: the minimum and maximum values for this parameter are contained in the [starref_min_commission_permille](https://core.telegram.org/api/config#starref-min-commission-permille) and [starref_max_commission_permille](https://core.telegram.org/api/config#starref-max-commission-permille) client configuration parameters.", "STARREF_PERMILLE_TOO_LOW"], ["StarsAmountInvalidError", "BadRequestError", "The specified amount in stars is invalid.", "STARS_AMOUNT_INVALID"], ["StarsInvoiceInvalidError", "BadRequestError", "The specified Telegram Star invoice is invalid.", "STARS_INVOICE_INVALID"], ["StarsPaymentRequiredError", "BadRequestError", "To import this chat invite link, you must first [pay for the associated Telegram Star subscription &raquo;](https://core.telegram.org/api/subscriptions#channel-subscriptions).", "STARS_PAYMENT_REQUIRED"], ["StartParamEmptyError", "BadRequestError", "The start parameter is empty.", "START_PARAM_EMPTY"], ["StartParamInvalidError", "BadRequestError", "Start parameter invalid.", "START_PARAM_INVALID"], ["StartParamTooLongError", "BadRequestError", "Start parameter is too long.", "START_PARAM_TOO_LONG"], ["StickerDocumentInvalidError", "BadRequestError", "The specified sticker document is invalid.", "STICKER_DOCUMENT_INVALID"], ["StickerEmojiInvalidError", "BadRequestError", "Sticker emoji invalid.", "STICKER_EMOJI_INVALID"], ["StickerFileInvalidError", "BadRequestError", "Sticker file invalid.", "STICKER_FILE_INVALID"], ["StickerGifDimensionsError", "BadRequestError", "The specified video sticker has invalid dimensions.", "STICKER_GIF_DIMENSIONS"], ["StickerIdInvalidError", "BadRequestError", "The provided sticker ID is invalid.", "STICKER_ID_INVALID"], ["StickerInvalidError", "BadRequestError", "The provided sticker is invalid.", "STICKER_INVALID"], ["StickerMimeInvalidError", "BadRequestError", "The specified sticker MIME type is invalid.", "STICKER_MIME_INVALID"], ["StickerPngDimensionsError", "BadRequestError", "Sticker png dimensions invalid.", "STICKER_PNG_DIMENSIONS"], ["StickerPngNopngError", "BadRequestError", "One of the specified stickers is not a valid PNG file.", "STICKER_PNG_NOPNG"], ["StickerTgsNodocError", "BadRequestError", "You must send the animated sticker as a document.", "STICKER_TGS_NODOC"], ["StickerTgsNotgsError", "BadRequestError", "Invalid TGS sticker provided.", "STICKER_TGS_NOTGS"], ["StickerThumbPngNopngError", "BadRequestError", "Incorrect stickerset thumb file provided, PNG / WEBP expected.", "STICKER_THUMB_PNG_NOPNG"], ["StickerThumbTgsNotgsError", "BadRequestError", "Incorrect stickerset TGS thumb file provided.", "STICKER_THUMB_TGS_NOTGS"], ["StickerVideoBigError", "BadRequestError", "The specified video sticker is too big.", "STICKER_VIDEO_BIG"], ["StickerVideoNodocError", "BadRequestError", "You must send the video sticker as a document.", "STICKER_VIDEO_NODOC"], ["StickerVideoNowebmError", "BadRequestError", "The specified video sticker is not in webm format.", "STICKER_VIDEO_NOWEBM"], ["StickerpackStickersTooMuchError", "BadRequestError", "There are too many stickers in this stickerpack, you can't add any more.", "STICKERPACK_STICKERS_TOO_MUCH"], ["StickersEmptyError", "BadRequestError", "No sticker provided.", "STICKERS_EMPTY"], ["StickersTooMuchError", "BadRequestError", "There are too many stickers in this stickerpack, you can't add any more.", "STICKERS_TOO_MUCH"], ["StickersetInvalidError", "BadRequestError", "The provided sticker set is invalid.", "STICKERSET_INVALID"], ["StoriesNeverCreatedError", "BadRequestError", "This peer hasn't ever posted any stories.", "STORIES_NEVER_CREATED"], ["StoriesTooMuchError", "BadRequestError", "You have hit the maximum active stories limit as specified by the [`story_expiring_limit_*` client configuration parameters](https://core.telegram.org/api/config#story-expiring-limit-default): you should buy a [Premium](https://core.telegram.org/api/premium) subscription, delete an active story, or wait for the oldest story to expire.", "STORIES_TOO_MUCH"], ["StoryIdEmptyError", "BadRequestError", "You specified no story IDs.", "STORY_ID_EMPTY"], ["StoryIdInvalidError", "BadRequestError", "The specified story ID is invalid.", "STORY_ID_INVALID"], ["StoryNotModifiedError", "BadRequestError", "The new story information you passed is equal to the previous story information, thus it wasn't modified.", "STORY_NOT_MODIFIED"], ["StoryPeriodInvalidError", "BadRequestError", "The specified story period is invalid for this account.", "STORY_PERIOD_INVALID"], ["SubscriptionExportMissingError", "BadRequestError", "You cannot send a [bot subscription invoice](https://core.telegram.org/api/subscriptions#bot-subscriptions) directly, you may only create invoice links using [payments.exportInvoice](https://core.telegram.org/method/payments.exportInvoice).", "SUBSCRIPTION_EXPORT_MISSING"], ["SubscriptionIdInvalidError", "BadRequestError", "The specified subscription_id is invalid.", "SUBSCRIPTION_ID_INVALID"], ["SubscriptionPeriodInvalidError", "BadRequestError", "The specified subscription_pricing.period is invalid.", "SUBSCRIPTION_PERIOD_INVALID"], ["SuggestedPostAmountInvalidError", "BadRequestError", "The specified price for the suggested post is invalid.", "SUGGESTED_POST_AMOUNT_INVALID"], ["SuggestedPostPeerInvalidError", "BadRequestError", "You cannot send suggested posts to non-[monoforum](https://core.telegram.org/api/monoforum) peers.", "SUGGESTED_POST_PEER_INVALID"], ["SwitchPmTextEmptyError", "BadRequestError", "The switch_pm.text field was empty.", "SWITCH_PM_TEXT_EMPTY"], ["SwitchWebviewUrlInvalidError", "BadRequestError", "The URL specified in switch_webview.url is invalid!", "SWITCH_WEBVIEW_URL_INVALID"], ["TakeoutInvalidError", "BadRequestError", "The specified takeout ID is invalid.", "TAKEOUT_INVALID"], ["TakeoutRequiredError", "BadRequestError", "A [takeout](https://core.telegram.org/api/takeout) session needs to be initialized first, [see here &raquo; for more info](https://core.telegram.org/api/takeout).", "TAKEOUT_REQUIRED"], ["TaskAlreadyExistsError", "BadRequestError", "An email reset was already requested.", "TASK_ALREADY_EXISTS"], ["TempAuthKeyAlreadyBoundError", "BadRequestError", "The passed temporary key is already bound to another **perm_auth_key_id**.", "TEMP_AUTH_KEY_ALREADY_BOUND"], ["TempAuthKeyEmptyError", "BadRequestError", "No temporary auth key provided.", "TEMP_AUTH_KEY_EMPTY"], ["TermsUrlInvalidError", "BadRequestError", "The specified [invoice](https://core.telegram.org/constructor/invoice).`terms_url` is invalid.", "TERMS_URL_INVALID"], ["TextdraftPeerInvalidError", "BadRequestError", "sendMessageTextDraftAction can only be used in private 1-on-1 chats.", "TEXTDRAFT_PEER_INVALID"], ["ThemeFileInvalidError", "BadRequestError", "Invalid theme file provided.", "THEME_FILE_INVALID"], ["ThemeFormatInvalidError", "BadRequestError", "Invalid theme format provided.", "THEME_FORMAT_INVALID"], ["ThemeInvalidError", "BadRequestError", "Invalid theme provided.", "THEME_INVALID"], ["ThemeMimeInvalidError", "BadRequestError", "The theme's MIME type is invalid.", "THEME_MIME_INVALID"], ["ThemeParamsInvalidError", "BadRequestError", "The specified `theme_params` field is invalid.", "THEME_PARAMS_INVALID"], ["ThemeSlugInvalidError", "BadRequestError", "The specified theme slug is invalid.", "THEME_SLUG_INVALID"], ["ThemeTitleInvalidError", "BadRequestError", "The specified theme title is invalid.", "THEME_TITLE_INVALID"], ["TimezoneInvalidError", "BadRequestError", "The specified timezone does not exist.", "TIMEZONE_INVALID"], ["TitleInvalidError", "BadRequestError", "The specified stickerpack title is invalid.", "TITLE_INVALID"], ["TmpPasswordDisabledError", "BadRequestError", "The temporary password is disabled.", "TMP_PASSWORD_DISABLED"], ["TmpPasswordInvalidError", "BadRequestError", "The passed tmp_password is invalid.", "TMP_PASSWORD_INVALID"], ["ToIdInvalidError", "BadRequestError", "The specified `to_id` of the passed inputInvoiceStarGiftResale or inputInvoiceStarGiftTransfer is invalid.", "TO_ID_INVALID"], ["ToLangInvalidError", "BadRequestError", "The specified destination language is invalid.", "TO_LANG_INVALID"], ["TodoItemDuplicateError", "BadRequestError", "Duplicate [checklist items](https://core.telegram.org/api/todo) detected.", "TODO_ITEM_DUPLICATE"], ["TodoItemsEmptyError", "BadRequestError", "A checklist was specified, but no [checklist items](https://core.telegram.org/api/todo) were passed.", "TODO_ITEMS_EMPTY"], ["TodoItemsTooMuchError", "BadRequestError", "You specified too many todo list items.", "TODO_ITEMS_TOO_MUCH"], ["TodoNotModifiedError", "BadRequestError", "No todo items were specified, so no changes were made to the todo list.", "TODO_NOT_MODIFIED"], ["TokenEmptyError", "BadRequestError", "The specified token is empty.", "TOKEN_EMPTY"], ["TokenInvalidError", "BadRequestError", "The provided token is invalid.", "TOKEN_INVALID"], ["TokenTypeInvalidError", "BadRequestError", "The specified token type is invalid.", "TOKEN_TYPE_INVALID"], ["TopicCloseSeparatelyError", "BadRequestError", "The `close` flag cannot be provided together with any of the other flags.", "TOPIC_CLOSE_SEPARATELY"], ["TopicClosedError", "BadRequestError", "This topic was closed, you can't send messages to it anymore.", "TOPIC_CLOSED"], ["TopicDeletedError", "BadRequestError", "The specified topic was deleted.", "TOPIC_DELETED"], ["TopicHideSeparatelyError", "BadRequestError", "The `hide` flag cannot be provided together with any of the other flags.", "TOPIC_HIDE_SEPARATELY"], ["TopicIdInvalidError", "BadRequestError", "The specified topic ID is invalid.", "TOPIC_ID_INVALID"], ["TopicNotModifiedError", "BadRequestError", "The updated topic info is equal to the current topic info, nothing was changed.", "TOPIC_NOT_MODIFIED"], ["TopicTitleEmptyError", "BadRequestError", "The specified topic title is empty.", "TOPIC_TITLE_EMPTY"], ["TopicsEmptyError", "BadRequestError", "You specified no topic IDs.", "TOPICS_EMPTY"], ["TransactionIdInvalidError", "BadRequestError", "The specified transaction ID is invalid.", "TRANSACTION_ID_INVALID"], ["TranscriptionFailedError", "BadRequestError", "Audio transcription failed.", "TRANSCRIPTION_FAILED"], ["TranslateReqQuotaExceededError", "BadRequestError", "Translation is currently unavailable due to a temporary server-side lack of resources.", "TRANSLATE_REQ_QUOTA_EXCEEDED"], ["TtlDaysInvalidError", "BadRequestError", "The provided TTL is invalid.", "TTL_DAYS_INVALID"], ["TtlMediaInvalidError", "BadRequestError", "Invalid media Time To Live was provided.", "TTL_MEDIA_INVALID"], ["TtlPeriodInvalidError", "BadRequestError", "The specified TTL period is invalid.", "TTL_PERIOD_INVALID"], ["TypesEmptyError", "BadRequestError", "No top peer type was provided.", "TYPES_EMPTY"], ["UnsupportedError", "BadRequestError", "`require_payment` cannot be *set* by users, only by monoforums: users must instead use the [inputPrivacyKeyNoPaidMessages](https://core.telegram.org/constructor/inputPrivacyKeyNoPaidMessages) privacy setting to remove a previously added exemption.", "UNSUPPORTED"], ["UntilDateInvalidError", "BadRequestError", "Invalid until date provided.", "UNTIL_DATE_INVALID"], ["UrlExpiredError", "BadRequestError", "The specified OAuth request has expired.", "URL_EXPIRED"], ["UrlInvalidError", "BadRequestError", "Invalid URL provided.", "URL_INVALID"], ["UsageLimitInvalidError", "BadRequestError", "The specified usage limit is invalid.", "USAGE_LIMIT_INVALID"], ["UserAdminInvalidError", "BadRequestError", "You're not an admin.", "USER_ADMIN_INVALID"], ["UserAlreadyInvitedError", "BadRequestError", "You have already invited this user.", "USER_ALREADY_INVITED"], ["UserAlreadyParticipantError", "BadRequestError", "The user is already in the group.", "USER_ALREADY_PARTICIPANT"], ["UserBannedInChannelError", "BadRequestError", "You're banned from sending messages in supergroups/channels.", "USER_BANNED_IN_CHANNEL"], ["UserBlockedError", "BadRequestError", "User blocked.", "USER_BLOCKED"], ["UserBotError", "BadRequestError", "Bots can only be admins in channels.", "USER_BOT"], ["UserBotInvalidError", "BadRequestError", "User accounts must provide the `bot` method parameter when calling this method. If there is no such method parameter, this method can only be invoked by bot accounts.", "USER_BOT_INVALID"], ["UserBotRequiredError", "BadRequestError", "This method can only be called by a bot.", "USER_BOT_REQUIRED"], ["UserBotToBotDisabledError", "BadRequestError", "Bot-to-bot messaging is disabled because one of the two bots hasn't enabled the Bot to Bot setting in @BotFather.", "USER_BOT_TO_BOT_DISABLED"], ["UserChannelsTooMuchError", "BadRequestError", "One of the users you tried to add is already in too many channels/supergroups.", "USER_CHANNELS_TOO_MUCH"], ["UserCreatorError", "BadRequestError", "For channels.editAdmin: you've tried to edit the admin rights of the owner, but you're not the owner; for channels.leaveChannel: you can't leave this channel, because you're its creator.", "USER_CREATOR"], ["UserGiftUnavailableError", "BadRequestError", "Gifts are not available in the current region ([stars_gifts_enabled](https://core.telegram.org/api/config#stars-gifts-enabled) is equal to false).", "USER_GIFT_UNAVAILABLE"], ["UserIdInvalidError", "BadRequestError", "The provided user ID is invalid.", "USER_ID_INVALID"], ["UserInvalidError", "BadRequestError", "Invalid user provided.", "USER_INVALID"], ["UserIsBlockedError", "BadRequestError", "You were blocked by this user.", "USER_IS_BLOCKED"], ["UserIsBotError", "BadRequestError", "Bots can't send messages to other bots.", "USER_IS_BOT"], ["UserKickedError", "BadRequestError", "This user was kicked from this supergroup/channel.", "USER_KICKED"], ["UserNotMutualContactError", "BadRequestError", "The provided user is not a mutual contact.", "USER_NOT_MUTUAL_CONTACT"], ["UserNotParticipantError", "BadRequestError", "You're not a member of this supergroup/channel.", "USER_NOT_PARTICIPANT"], ["UserPublicMissingError", "BadRequestError", "Cannot generate a link to stories posted by a peer without a username.", "USER_PUBLIC_MISSING"], ["UserVolumeInvalidError", "BadRequestError", "The specified user volume is invalid.", "USER_VOLUME_INVALID"], ["UsernameInvalidError", "BadRequestError", "The provided username is not valid.", "USERNAME_INVALID"], ["UsernameNotModifiedError", "BadRequestError", "The username was not modified.", "USERNAME_NOT_MODIFIED"], ["UsernameNotOccupiedError", "BadRequestError", "The provided username is not occupied.", "USERNAME_NOT_OCCUPIED"], ["UsernameOccupiedError", "BadRequestError", "The provided username is already occupied.", "USERNAME_OCCUPIED"], ["UsernamePurchaseAvailableError", "BadRequestError", "The specified username can be purchased on https://fragment.com.", "USERNAME_PURCHASE_AVAILABLE"], ["UsernameSuffixMissingError", "BadRequestError", "The required `bot` suffix is missing from the passed username.", "USERNAME_SUFFIX_MISSING"], ["UsernamesActiveTooMuchError", "BadRequestError", "The maximum number of active usernames was reached.", "USERNAMES_ACTIVE_TOO_MUCH"], ["UserpicUploadRequiredError", "BadRequestError", "You must have a profile picture to publish your geolocation.", "USERPIC_UPLOAD_REQUIRED"], ["UsersTooFewError", "BadRequestError", "Not enough users (to create a chat, for example).", "USERS_TOO_FEW"], ["UsersTooMuchError", "BadRequestError", "The maximum number of users has been exceeded (to create a chat, for example).", "USERS_TOO_MUCH"], ["VenueIdInvalidError", "BadRequestError", "The specified venue ID is invalid.", "VENUE_ID_INVALID"], ["VideoContentTypeInvalidError", "BadRequestError", "The video's content type is invalid.", "VIDEO_CONTENT_TYPE_INVALID"], ["VideoDurationInvalidError", "BadRequestError", "The duration of the specified video is invalid.", "VIDEO_DURATION_INVALID"], ["VideoFileInvalidError", "BadRequestError", "The specified video file is invalid.", "VIDEO_FILE_INVALID"], ["VideoPauseForbiddenError", "BadRequestError", "You cannot pause the video stream.", "VIDEO_PAUSE_FORBIDDEN"], ["VideoStopForbiddenError", "BadRequestError", "You cannot stop the video stream.", "VIDEO_STOP_FORBIDDEN"], ["VideoTitleEmptyError", "BadRequestError", "The specified video title is empty.", "VIDEO_TITLE_EMPTY"], ["VoiceMessagesForbiddenError", "BadRequestError", "This user's privacy settings forbid you from sending voice messages.", "VOICE_MESSAGES_FORBIDDEN"], ["WallpaperFileInvalidError", "BadRequestError", "The specified wallpaper file is invalid.", "WALLPAPER_FILE_INVALID"], ["WallpaperInvalidError", "BadRequestError", "The specified wallpaper is invalid.", "WALLPAPER_INVALID"], ["WallpaperMimeInvalidError", "BadRequestError", "The specified wallpaper MIME type is invalid.", "WALLPAPER_MIME_INVALID"], ["WallpaperNotFoundError", "BadRequestError", "The specified wallpaper could not be found.", "WALLPAPER_NOT_FOUND"], ["WcConvertUrlInvalidError", "BadRequestError", "WC convert URL invalid.", "WC_CONVERT_URL_INVALID"], ["WebappReqIdInvalidError", "BadRequestError", "The specified webapp_req_id is invalid.", "WEBAPP_REQ_ID_INVALID"], ["WebauthTokenExpiredError", "BadRequestError", "The specified auth token has expired.", "WEBAUTH_TOKEN_EXPIRED"], ["WebdocumentInvalidError", "BadRequestError", "Invalid webdocument URL provided.", "WEBDOCUMENT_INVALID"], ["WebdocumentMimeInvalidError", "BadRequestError", "Invalid webdocument mime type provided.", "WEBDOCUMENT_MIME_INVALID"], ["WebdocumentSizeTooBigError", "BadRequestError", "Webdocument is too big!", "WEBDOCUMENT_SIZE_TOO_BIG"], ["WebdocumentUrlEmptyError", "BadRequestError", "The passed web document URL is empty.", "WEBDOCUMENT_URL_EMPTY"], ["WebdocumentUrlInvalidError", "BadRequestError", "The specified webdocument URL is invalid.", "WEBDOCUMENT_URL_INVALID"], ["WebpageCurlFailedError", "BadRequestError", "Failure while fetching the webpage with cURL.", "WEBPAGE_CURL_FAILED"], ["WebpageMediaEmptyError", "BadRequestError", "Webpage media empty.", "WEBPAGE_MEDIA_EMPTY"], ["WebpageNotFoundError", "BadRequestError", "A preview for the specified webpage `url` could not be generated.", "WEBPAGE_NOT_FOUND"], ["WebpageUrlInvalidError", "BadRequestError", "The specified webpage `url` is invalid.", "WEBPAGE_URL_INVALID"], ["WebpushAuthInvalidError", "BadRequestError", "The specified web push authentication secret is invalid.", "WEBPUSH_AUTH_INVALID"], ["WebpushKeyInvalidError", "BadRequestError", "The specified web push elliptic curve Diffie-Hellman public key is invalid.", "WEBPUSH_KEY_INVALID"], ["WebpushTokenInvalidError", "BadRequestError", "The specified web push token is invalid.", "WEBPUSH_TOKEN_INVALID"], ["YouBlockedUserError", "BadRequestError", "You blocked this user.", "YOU_BLOCKED_USER"], ["BotMethodInvalidError", "BadRequestError", "The specified method cannot be used by bots.", "BOT_METHOD_INVALID"], ["ConnectionDeviceModelEmptyError", "BadRequestError", "The specified device model is empty.", "CONNECTION_DEVICE_MODEL_EMPTY"], ["ConnectionLangPackInvalidError", "BadRequestError", "The specified language pack is empty.", "CONNECTION_LANG_PACK_INVALID"], ["ConnectionNotInitedError", "BadRequestError", "Please initialize the connection using initConnection before making queries.", "CONNECTION_NOT_INITED"], ["ConnectionSystemEmptyError", "BadRequestError", "The specified system version is empty.", "CONNECTION_SYSTEM_EMPTY"], ["ConnectionSystemLangCodeEmptyError", "BadRequestError", "The specified system language code is empty.", "CONNECTION_SYSTEM_LANG_CODE_EMPTY"], ["InputConstructorInvalidError", "BadRequestError", "The specified TL constructor is invalid.", "INPUT_CONSTRUCTOR_INVALID"], ["InputFetchErrorError", "BadRequestError", "An error occurred while parsing the provided TL constructor.", "INPUT_FETCH_ERROR"], ["InputFetchFailError", "BadRequestError", "An error occurred while parsing the provided TL constructor.", "INPUT_FETCH_FAIL"], ["InputLayerInvalidError", "BadRequestError", "The specified layer is invalid.", "INPUT_LAYER_INVALID"], ["InputMethodInvalidError", "BadRequestError", "The specified method is invalid.", "INPUT_METHOD_INVALID"], ["InputRequestTooLongError", "BadRequestError", "The request payload is too long.", "INPUT_REQUEST_TOO_LONG"], ["PeerFloodError", "BadRequestError", "The current account is spamreported, you cannot execute this action, check @spambot for more info.", "PEER_FLOOD"], ["StickersetNotModifiedError", "BadRequestError", "The passed stickerset information is equal to the current information.", "STICKERSET_NOT_MODIFIED"], ["AuthKeyUnregisteredError", "UnauthorizedError", "The specified authorization key is not registered in the system (for example, a PFS temporary key has expired).", "AUTH_KEY_UNREGISTERED"], ["AuthKeyInvalidError", "UnauthorizedError", "The specified auth key is invalid.", "AUTH_KEY_INVALID"], ["AuthKeyPermEmptyError", "UnauthorizedError", "The method is unavailable for temporary authorization keys, not bound to a permanent authorization key.", "AUTH_KEY_PERM_EMPTY"], ["SessionExpiredError", "UnauthorizedError", "The session has expired.", "SESSION_EXPIRED"], ["SessionPasswordNeededError", "UnauthorizedError", "2FA is enabled, use a password to login.", "SESSION_PASSWORD_NEEDED"], ["SessionRevokedError", "UnauthorizedError", "The session was revoked by the user.", "SESSION_REVOKED"], ["UserDeactivatedError", "UnauthorizedError", "The current account was deleted by the user.", "USER_DEACTIVATED"], ["UserDeactivatedBanError", "UnauthorizedError", "The current account was deleted and banned by Telegram's antispam system.", "USER_DEACTIVATED_BAN"], ["AccessDeniedError", "ForbiddenError", "The account was deactivated, or is a bot/service account.", "ACCESS_DENIED"], ["BotAccessForbiddenError", "ForbiddenError", "The specified method *can* be used over a [business connection](https://core.telegram.org/api/bots/connected-business-bots) for some operations, but the specified query attempted an operation that is not allowed over a business connection.", "BOT_ACCESS_FORBIDDEN"], ["BotForumCreateForbiddenError", "ForbiddenError", "Since the bot's user.bot_forum_can_manage_topics flag is **not** set, the user cannot create or modify bot forum topics.", "BOT_FORUM_CREATE_FORBIDDEN"], ["BotGuardNotSupportedError", "ForbiddenError", 'This bot is not designated as a "join guard" bot. This method is only available to bots that mediate user joins to chats. .', "BOT_GUARD_NOT_SUPPORTED"], ["BotVerifierForbiddenError", "ForbiddenError", "This bot cannot assign [verification icons](https://core.telegram.org/api/bots/verification).", "BOT_VERIFIER_FORBIDDEN"], ["BroadcastForbiddenError", "ForbiddenError", "Channel poll voters and reactions cannot be fetched to prevent deanonymization.", "BROADCAST_FORBIDDEN"], ["ChannelPublicGroupNaError", "ForbiddenError", "channel/supergroup not available.", "CHANNEL_PUBLIC_GROUP_NA"], ["ChatActionForbiddenError", "ForbiddenError", "You cannot execute this action.", "CHAT_ACTION_FORBIDDEN"], ["ChatAdminInviteRequiredError", "ForbiddenError", "You do not have the rights to do this.", "CHAT_ADMIN_INVITE_REQUIRED"], ["ChatGuestSendForbiddenError", "ForbiddenError", "You join the discussion group before commenting, see [here &raquo;](https://core.telegram.org/api/discussion#requiring-users-to-join-the-group) for more info.", "CHAT_GUEST_SEND_FORBIDDEN"], ["ChatSendAudiosForbiddenError", "ForbiddenError", "You can't send audio messages in this chat.", "CHAT_SEND_AUDIOS_FORBIDDEN"], ["ChatSendDocsForbiddenError", "ForbiddenError", "You can't send documents in this chat.", "CHAT_SEND_DOCS_FORBIDDEN"], ["ChatSendGameForbiddenError", "ForbiddenError", "You can't send a game to this chat.", "CHAT_SEND_GAME_FORBIDDEN"], ["ChatSendGifsForbiddenError", "ForbiddenError", "You can't send gifs in this chat.", "CHAT_SEND_GIFS_FORBIDDEN"], ["ChatSendMediaForbiddenError", "ForbiddenError", "You can't send media in this chat.", "CHAT_SEND_MEDIA_FORBIDDEN"], ["ChatSendPhotosForbiddenError", "ForbiddenError", "You can't send photos in this chat.", "CHAT_SEND_PHOTOS_FORBIDDEN"], ["ChatSendPlainForbiddenError", "ForbiddenError", "You can't send non-media (text) messages in this chat.", "CHAT_SEND_PLAIN_FORBIDDEN"], ["ChatSendPollForbiddenError", "ForbiddenError", "You can't send polls in this chat.", "CHAT_SEND_POLL_FORBIDDEN"], ["ChatSendRoundvideosForbiddenError", "ForbiddenError", "You can't send round videos to this chat.", "CHAT_SEND_ROUNDVIDEOS_FORBIDDEN"], ["ChatSendStickersForbiddenError", "ForbiddenError", "You can't send stickers in this chat.", "CHAT_SEND_STICKERS_FORBIDDEN"], ["ChatSendVideosForbiddenError", "ForbiddenError", "You can't send videos in this chat.", "CHAT_SEND_VIDEOS_FORBIDDEN"], ["ChatSendVoicesForbiddenError", "ForbiddenError", "You can't send voice recordings in this chat.", "CHAT_SEND_VOICES_FORBIDDEN"], ["ChatSendWebpageForbiddenError", "ForbiddenError", "You can't send webpage previews to this chat.", "CHAT_SEND_WEBPAGE_FORBIDDEN"], ["ChatTypeInvalidError", "ForbiddenError", "The specified user type is invalid.", "CHAT_TYPE_INVALID"], ["EditBotInviteForbiddenError", "ForbiddenError", "Normal users can't edit invites that were created by bots.", "EDIT_BOT_INVITE_FORBIDDEN"], ["GroupcallAlreadyStartedError", "ForbiddenError", "The groupcall has already started, you can join directly using [phone.joinGroupCall](https://core.telegram.org/method/phone.joinGroupCall).", "GROUPCALL_ALREADY_STARTED"], ["GroupcallChangeForbiddenError", "ForbiddenError", "You cannot change this group call setting.", "GROUPCALL_CHANGE_FORBIDDEN"], ["InlineBotRequiredError", "ForbiddenError", "Only the inline bot can edit message.", "INLINE_BOT_REQUIRED"], ["MessageAuthorRequiredError", "ForbiddenError", "Message author required.", "MESSAGE_AUTHOR_REQUIRED"], ["MessageDeleteForbiddenError", "ForbiddenError", "You can't delete one of the messages you tried to delete, most likely because it is a service message.", "MESSAGE_DELETE_FORBIDDEN"], ["PollVoteRequiredError", "ForbiddenError", "Cast a vote in the poll before calling this method.", "POLL_VOTE_REQUIRED"], ["PrivacyPremiumRequiredError", "ForbiddenError", "You need a [Telegram Premium subscription](https://core.telegram.org/api/premium) to send a message to this user.", "PRIVACY_PREMIUM_REQUIRED"], ["PublicChannelMissingError", "ForbiddenError", "You can only export group call invite links for public chats or channels.", "PUBLIC_CHANNEL_MISSING"], ["RightForbiddenError", "ForbiddenError", "Your admin rights do not allow you to do this.", "RIGHT_FORBIDDEN"], ["SensitiveChangeForbiddenError", "ForbiddenError", "You can't change your sensitive content settings.", "SENSITIVE_CHANGE_FORBIDDEN"], ["UserDeletedError", "ForbiddenError", "You can't send this secret message because the other participant deleted their account.", "USER_DELETED"], ["UserDisallowedStargiftsError", "ForbiddenError", "The recipient user has configured restrictions on which categories of star gifts they're willing to accept (unique, limited, or unlimited): the sender attempted to get a payment form for a gift that falls into a category the recipient has blocked.", "USER_DISALLOWED_STARGIFTS"], ["UserPermissionDeniedError", "ForbiddenError", "The user hasn't granted or has revoked the bot's access to change their emoji status using [bots.toggleUserEmojiStatusPermission](https://core.telegram.org/method/bots.toggleUserEmojiStatusPermission).", "USER_PERMISSION_DENIED"], ["UserPrivacyRestrictedError", "ForbiddenError", "The user's privacy settings do not allow you to do this.", "USER_PRIVACY_RESTRICTED"], ["UserRestrictedError", "ForbiddenError", "You're spamreported, you can't create channels or chats.", "USER_RESTRICTED"], ["YourPrivacyRestrictedError", "ForbiddenError", "You cannot fetch the read date of this message because you have disallowed other users to do so for *your* messages; to fix, allow other users to see *your* exact last online date OR purchase a [Telegram Premium](https://core.telegram.org/api/premium) subscription.", "YOUR_PRIVACY_RESTRICTED"], ["ChatForbiddenError", "ForbiddenError", "This chat is not available to the current user.", "CHAT_FORBIDDEN"], ["ApiGiftRestrictedUpdateAppError", "AuthKeyError", "Please update the app to access the gift API.", "API_GIFT_RESTRICTED_UPDATE_APP"], ["BusinessAddressActiveError", "AuthKeyError", "The user is currently advertising a [Business Location](https://core.telegram.org/api/business#location), the location may only be changed (or removed) using [account.updateBusinessLocation &raquo;](https://core.telegram.org/method/account.updateBusinessLocation).  .", "BUSINESS_ADDRESS_ACTIVE"], ["CallProtocolCompatLayerInvalidError", "AuthKeyError", "The other side of the call does not support any of the VoIP protocols supported by the local client, as specified by the `protocol.layer` and `protocol.library_versions` fields.", "CALL_PROTOCOL_COMPAT_LAYER_INVALID"], ["EditMessageTempRestrictedError", "AuthKeyError", "Message editing is temporarily forbidden for this user due to regulatory restrictions.", "EDIT_MESSAGE_TEMP_RESTRICTED"], ["FilerefUpgradeNeededError", "AuthKeyError", "The client has to be updated in order to support [file references](https://core.telegram.org/api/file-references).", "FILEREF_UPGRADE_NEEDED"], ["FreshChangePhoneForbiddenError", "AuthKeyError", "You can't change phone number right after logging in, please wait at least 24 hours.", "FRESH_CHANGE_PHONE_FORBIDDEN"], ["FreshResetAuthorisationForbiddenError", "AuthKeyError", "You can't logout other sessions if less than 24 hours have passed since you logged on the current session.", "FRESH_RESET_AUTHORISATION_FORBIDDEN"], ["PaymentUnsupportedError", "AuthKeyError", "A detailed description of the error will be received separately as described [here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable).", "PAYMENT_UNSUPPORTED"], ["PhonePasswordFloodError", "AuthKeyError", "You have tried logging in too many times.", "PHONE_PASSWORD_FLOOD"], ["PollCountryRestrictedError", "AuthKeyError", "Users from the current user's country cannot vote in this [country-restricted poll &raquo;](https://core.telegram.org/api/poll#country-restricted-polls).", "POLL_COUNTRY_RESTRICTED"], ["PollMemberRestrictedError", "AuthKeyError", "Only channel subscribers can vote in this poll.", "POLL_MEMBER_RESTRICTED"], ["PrecheckoutFailedError", "AuthKeyError", "Precheckout failed, a detailed and localized description for the error will be emitted via an [updateServiceNotification as specified here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable).", "PRECHECKOUT_FAILED"], ["PremiumCurrentlyUnavailableError", "AuthKeyError", "You cannot currently purchase a Premium subscription.", "PREMIUM_CURRENTLY_UNAVAILABLE"], ["SendCodeUnavailableError", "AuthKeyError", "Returned when all available options for this type of number were already used (e.g. flash-call, then SMS, then this error might be returned to trigger a second resend).", "SEND_CODE_UNAVAILABLE"], ["StargiftExportInProgressError", "AuthKeyError", "A gift export is in progress, a detailed and localized description for the error will be emitted via an [updateServiceNotification as specified here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable).", "STARGIFT_EXPORT_IN_PROGRESS"], ["StarsFormAmountMismatchError", "AuthKeyError", "The form amount has changed, please fetch the new form using [payments.getPaymentForm](https://core.telegram.org/method/payments.getPaymentForm) and restart the process.", "STARS_FORM_AMOUNT_MISMATCH"], ["StickersetOwnerAnonymousError", "AuthKeyError", "Provided stickerset can't be installed as group stickerset to prevent admin deanonymization.", "STICKERSET_OWNER_ANONYMOUS"], ["TranslationsDisabledError", "AuthKeyError", "Translations are unavailable, a detailed and localized description for the error will be emitted via an [updateServiceNotification as specified here &raquo;](https://core.telegram.org/api/errors#406-not-acceptable).", "TRANSLATIONS_DISABLED"], ["UpdateAppToLoginError", "AuthKeyError", "Please update your client to login.", "UPDATE_APP_TO_LOGIN"], ["UserpicPrivacyRequiredError", "AuthKeyError", "You need to disable privacy settings for your profile picture in order to make your geolocation public.", "USERPIC_PRIVACY_REQUIRED"], ["AuthKeyDuplicatedError", "AuthKeyError", "Concurrent usage of the current session from multiple connections was detected, the current session was invalidated by the server for security reasons!", "AUTH_KEY_DUPLICATED"], ["FrozenMethodInvalidError", "FloodError", "The current account is [frozen](https://core.telegram.org/api/auth#frozen-accounts), and thus cannot execute the specified action.", "FROZEN_METHOD_INVALID"], ["AicomposeTimeoutError", "ServerError", "A timeout occurred while composing the message.", "AICOMPOSE_TIMEOUT"], ["AuthKeyUnsynchronizedError", "ServerError", "Internal error, please repeat the method call.", "AUTH_KEY_UNSYNCHRONIZED"], ["CdnUploadTimeoutError", "ServerError", "A server-side timeout occurred while reuploading the file to the CDN DC.", "CDN_UPLOAD_TIMEOUT"], ["ChatIdGenerateFailedError", "ServerError", "Failure while generating the chat ID.", "CHAT_ID_GENERATE_FAILED"], ["OauthRequestInvalidError", "ServerError", "The specified OAuth request is invalid.", "OAUTH_REQUEST_INVALID"], ["PersistentTimestampOutdatedError", "ServerError", "Channel internal replication issues, try again later (treat this like an RPC_CALL_FAIL).", "PERSISTENT_TIMESTAMP_OUTDATED"], ["SendMediaInvalidError", "ServerError", "The specified media is invalid.", "SEND_MEDIA_INVALID"], ["SignInFailedError", "ServerError", "Failure while signing in.", "SIGN_IN_FAILED"], ["TranslateReqFailedError", "ServerError", "Translation failed, please try again later.", "TRANSLATE_REQ_FAILED"], ["TranslationTimeoutError", "ServerError", "A timeout occurred while translating the specified text.", "TRANSLATION_TIMEOUT"], ["MsgWaitTimeoutError", "TimedOutError", "Spent too much time waiting for a previous query in the invokeAfterMsg request queue, aborting!", "MSG_WAIT_TIMEOUT"], ["AnonymousReactionsDisabledError", "ForbiddenError", "Sorry, anonymous administrators cannot leave reactions or participate in polls.", "ANONYMOUS_REACTIONS_DISABLED"]];
  for (const [n, b, d, c] of __ERRS) {
    exports2[n] = { [n]: class extends RPCBaseErrors_1[b] {
      constructor(args) {
        const message = d + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
        super(message, args.request);
        this.message = message;
        this.errorMessage = c;
      }
    } }[n];
  }

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

  class TimeoutError extends RPCBaseErrors_1.TimedOutError {
    constructor(args) {
      const message = "Timeout while fetching data." + RPCBaseErrors_1.RPCError._fmtRequest(args.request);
      super(message, args.request);
      this.message = message;
      this.errorMessage = "Timeout";
    }
  }
  exports2.TimeoutError = TimeoutError;

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
    ["ABOUT_TOO_LONG", exports2.AboutTooLongError],
    ["ACCESS_TOKEN_EXPIRED", exports2.AccessTokenExpiredError],
    ["ACCESS_TOKEN_INVALID", exports2.AccessTokenInvalidError],
    ["AD_EXPIRED", exports2.AdExpiredError],
    ["ADDRESS_INVALID", exports2.AddressInvalidError],
    ["ADMIN_ID_INVALID", exports2.AdminIdInvalidError],
    ["ADMIN_RANK_EMOJI_NOT_ALLOWED", exports2.AdminRankEmojiNotAllowedError],
    ["ADMIN_RANK_INVALID", exports2.AdminRankInvalidError],
    ["ADMIN_RIGHTS_EMPTY", exports2.AdminRightsEmptyError],
    ["ADMINS_TOO_MUCH", exports2.AdminsTooMuchError],
    ["AI_COMPOSE_TASK_MISSING", exports2.AiComposeTaskMissingError],
    ["AICOMPOSE_FLOOD_PREMIUM", exports2.AicomposeFloodPremiumError],
    ["AICOMPOSE_TONE_INVALID", exports2.AicomposeToneInvalidError],
    ["AICOMPOSE_TONE_TITLE_INVALID", exports2.AicomposeToneTitleInvalidError],
    ["ALBUM_PHOTOS_TOO_MANY", exports2.AlbumPhotosTooManyError],
    ["API_ID_INVALID", exports2.ApiIdInvalidError],
    ["API_ID_PUBLISHED_FLOOD", exports2.ApiIdPublishedFloodError],
    ["ARTICLE_TITLE_EMPTY", exports2.ArticleTitleEmptyError],
    ["AUDIO_CONTENT_URL_EMPTY", exports2.AudioContentUrlEmptyError],
    ["AUDIO_TITLE_EMPTY", exports2.AudioTitleEmptyError],
    ["AUTH_BYTES_INVALID", exports2.AuthBytesInvalidError],
    ["AUTH_TOKEN_ALREADY_ACCEPTED", exports2.AuthTokenAlreadyAcceptedError],
    ["AUTH_TOKEN_EXCEPTION", exports2.AuthTokenExceptionError],
    ["AUTH_TOKEN_EXPIRED", exports2.AuthTokenExpiredError],
    ["AUTH_TOKEN_INVALID", exports2.AuthTokenInvalidError],
    ["AUTH_TOKEN_INVALIDX", exports2.AuthTokenInvalidxError],
    ["AUTOARCHIVE_NOT_AVAILABLE", exports2.AutoarchiveNotAvailableError],
    ["BALANCE_TOO_LOW", exports2.BalanceTooLowError],
    ["BANK_CARD_NUMBER_INVALID", exports2.BankCardNumberInvalidError],
    ["BANNED_RIGHTS_INVALID", exports2.BannedRightsInvalidError],
    ["BIRTHDAY_ALREADY", exports2.BirthdayAlreadyError],
    ["BIRTHDAY_INVALID", exports2.BirthdayInvalidError],
    ["BOOST_NOT_MODIFIED", exports2.BoostNotModifiedError],
    ["BOOST_PEER_INVALID", exports2.BoostPeerInvalidError],
    ["BOOSTS_EMPTY", exports2.BoostsEmptyError],
    ["BOOSTS_REQUIRED", exports2.BoostsRequiredError],
    ["BOT_ALREADY_DISABLED", exports2.BotAlreadyDisabledError],
    ["BOT_APP_BOT_INVALID", exports2.BotAppBotInvalidError],
    ["BOT_APP_INVALID", exports2.BotAppInvalidError],
    ["BOT_APP_SHORTNAME_INVALID", exports2.BotAppShortnameInvalidError],
    ["BOT_BUSINESS_MISSING", exports2.BotBusinessMissingError],
    ["BOT_CHANNELS_NA", exports2.BotChannelsNaError],
    ["BOT_COMMAND_DESCRIPTION_INVALID", exports2.BotCommandDescriptionInvalidError],
    ["BOT_COMMAND_INVALID", exports2.BotCommandInvalidError],
    ["BOT_CREATE_LIMIT_EXCEEDED", exports2.BotCreateLimitExceededError],
    ["BOT_DOMAIN_INVALID", exports2.BotDomainInvalidError],
    ["BOT_FALLBACK_UNSUPPORTED", exports2.BotFallbackUnsupportedError],
    ["BOT_GAMES_DISABLED", exports2.BotGamesDisabledError],
    ["BOT_GROUPS_BLOCKED", exports2.BotGroupsBlockedError],
    ["BOT_ID_INVALID", exports2.BotIdInvalidError],
    ["BOT_INLINE_DISABLED", exports2.BotInlineDisabledError],
    ["BOT_INVALID", exports2.BotInvalidError],
    ["BOT_INVOICE_INVALID", exports2.BotInvoiceInvalidError],
    ["BOT_NOT_CONNECTED_YET", exports2.BotNotConnectedYetError],
    ["BOT_ONESIDE_NOT_AVAIL", exports2.BotOnesideNotAvailError],
    ["BOT_PAYMENTS_DISABLED", exports2.BotPaymentsDisabledError],
    ["BOT_RESPONSE_TIMEOUT", exports2.BotResponseTimeoutError],
    ["BOT_SCORE_NOT_MODIFIED", exports2.BotScoreNotModifiedError],
    ["BOT_WEBVIEW_DISABLED", exports2.BotWebviewDisabledError],
    ["BOTS_TOO_MUCH", exports2.BotsTooMuchError],
    ["BROADCAST_ID_INVALID", exports2.BroadcastIdInvalidError],
    ["BROADCAST_PUBLIC_VOTERS_FORBIDDEN", exports2.BroadcastPublicVotersForbiddenError],
    ["BROADCAST_REQUIRED", exports2.BroadcastRequiredError],
    ["BUSINESS_CONNECTION_INVALID", exports2.BusinessConnectionInvalidError],
    ["BUSINESS_CONNECTION_NOT_ALLOWED", exports2.BusinessConnectionNotAllowedError],
    ["BUSINESS_PEER_INVALID", exports2.BusinessPeerInvalidError],
    ["BUSINESS_PEER_USAGE_MISSING", exports2.BusinessPeerUsageMissingError],
    ["BUSINESS_RECIPIENTS_EMPTY", exports2.BusinessRecipientsEmptyError],
    ["BUSINESS_WORK_HOURS_EMPTY", exports2.BusinessWorkHoursEmptyError],
    ["BUSINESS_WORK_HOURS_PERIOD_INVALID", exports2.BusinessWorkHoursPeriodInvalidError],
    ["BUTTON_COPY_TEXT_INVALID", exports2.ButtonCopyTextInvalidError],
    ["BUTTON_DATA_INVALID", exports2.ButtonDataInvalidError],
    ["BUTTON_ID_INVALID", exports2.ButtonIdInvalidError],
    ["BUTTON_INVALID", exports2.ButtonInvalidError],
    ["BUTTON_POS_INVALID", exports2.ButtonPosInvalidError],
    ["BUTTON_TEXT_INVALID", exports2.ButtonTextInvalidError],
    ["BUTTON_TYPE_INVALID", exports2.ButtonTypeInvalidError],
    ["BUTTON_URL_INVALID", exports2.ButtonUrlInvalidError],
    ["BUTTON_USER_INVALID", exports2.ButtonUserInvalidError],
    ["BUTTON_USER_PRIVACY_RESTRICTED", exports2.ButtonUserPrivacyRestrictedError],
    ["CALL_ALREADY_ACCEPTED", exports2.CallAlreadyAcceptedError],
    ["CALL_ALREADY_DECLINED", exports2.CallAlreadyDeclinedError],
    ["CALL_NOT_ACTIVE", exports2.CallNotActiveError],
    ["CALL_OCCUPY_FAILED", exports2.CallOccupyFailedError],
    ["CALL_PEER_INVALID", exports2.CallPeerInvalidError],
    ["CALL_PROTOCOL_FLAGS_INVALID", exports2.CallProtocolFlagsInvalidError],
    ["CALL_PROTOCOL_LAYER_INVALID", exports2.CallProtocolLayerInvalidError],
    ["CDN_METHOD_INVALID", exports2.CdnMethodInvalidError],
    ["CHANNEL_FORUM_MISSING", exports2.ChannelForumMissingError],
    ["CHANNEL_ID_INVALID", exports2.ChannelIdInvalidError],
    ["CHANNEL_INVALID", exports2.ChannelInvalidError],
    ["CHANNEL_MONOFORUM_UNSUPPORTED", exports2.ChannelMonoforumUnsupportedError],
    ["CHANNEL_PARICIPANT_MISSING", exports2.ChannelParicipantMissingError],
    ["CHANNEL_PRIVATE", exports2.ChannelPrivateError],
    ["CHANNEL_TOO_BIG", exports2.ChannelTooBigError],
    ["CHANNEL_TOO_LARGE", exports2.ChannelTooLargeError],
    ["CHANNELS_ADMIN_LOCATED_TOO_MUCH", exports2.ChannelsAdminLocatedTooMuchError],
    ["CHANNELS_ADMIN_PUBLIC_TOO_MUCH", exports2.ChannelsAdminPublicTooMuchError],
    ["CHANNELS_TOO_MUCH", exports2.ChannelsTooMuchError],
    ["CHARGE_ALREADY_REFUNDED", exports2.ChargeAlreadyRefundedError],
    ["CHARGE_ID_EMPTY", exports2.ChargeIdEmptyError],
    ["CHARGE_ID_INVALID", exports2.ChargeIdInvalidError],
    ["CHAT_ABOUT_NOT_MODIFIED", exports2.ChatAboutNotModifiedError],
    ["CHAT_ABOUT_TOO_LONG", exports2.ChatAboutTooLongError],
    ["CHAT_ADMIN_REQUIRED", exports2.ChatAdminRequiredError],
    ["CHAT_DISCUSSION_UNALLOWED", exports2.ChatDiscussionUnallowedError],
    ["CHAT_FORWARDS_RESTRICTED", exports2.ChatForwardsRestrictedError],
    ["CHAT_ID_EMPTY", exports2.ChatIdEmptyError],
    ["CHAT_ID_INVALID", exports2.ChatIdInvalidError],
    ["CHAT_INVALID", exports2.ChatInvalidError],
    ["CHAT_INVITE_PERMANENT", exports2.ChatInvitePermanentError],
    ["CHAT_LINK_EXISTS", exports2.ChatLinkExistsError],
    ["CHAT_MEMBER_ADD_FAILED", exports2.ChatMemberAddFailedError],
    ["CHAT_NOT_MODIFIED", exports2.ChatNotModifiedError],
    ["CHAT_PUBLIC_REQUIRED", exports2.ChatPublicRequiredError],
    ["CHAT_RESTRICTED", exports2.ChatRestrictedError],
    ["CHAT_REVOKE_DATE_UNSUPPORTED", exports2.ChatRevokeDateUnsupportedError],
    ["CHAT_SEND_INLINE_FORBIDDEN", exports2.ChatSendInlineForbiddenError],
    ["CHAT_TITLE_EMPTY", exports2.ChatTitleEmptyError],
    ["CHAT_TOO_BIG", exports2.ChatTooBigError],
    ["CHAT_WRITE_FORBIDDEN", exports2.ChatWriteForbiddenError],
    ["CHATLINK_SLUG_EMPTY", exports2.ChatlinkSlugEmptyError],
    ["CHATLINK_SLUG_EXPIRED", exports2.ChatlinkSlugExpiredError],
    ["CHATLINKS_TOO_MUCH", exports2.ChatlinksTooMuchError],
    ["CHATLIST_EXCLUDE_INVALID", exports2.ChatlistExcludeInvalidError],
    ["CHATLISTS_TOO_MUCH", exports2.ChatlistsTooMuchError],
    ["CODE_EMPTY", exports2.CodeEmptyError],
    ["CODE_HASH_INVALID", exports2.CodeHashInvalidError],
    ["CODE_INVALID", exports2.CodeInvalidError],
    ["COLLECTIBLE_INVALID", exports2.CollectibleInvalidError],
    ["COLLECTIBLE_NOT_FOUND", exports2.CollectibleNotFoundError],
    ["COLLECTION_ID_INVALID", exports2.CollectionIdInvalidError],
    ["COLOR_INVALID", exports2.ColorInvalidError],
    ["CONNECTION_API_ID_INVALID", exports2.ConnectionApiIdInvalidError],
    ["CONNECTION_APP_VERSION_EMPTY", exports2.ConnectionAppVersionEmptyError],
    ["CONNECTION_ID_INVALID", exports2.ConnectionIdInvalidError],
    ["CONNECTION_LAYER_INVALID", exports2.ConnectionLayerInvalidError],
    ["CONTACT_ADD_MISSING", exports2.ContactAddMissingError],
    ["CONTACT_ID_INVALID", exports2.ContactIdInvalidError],
    ["CONTACT_MISSING", exports2.ContactMissingError],
    ["CONTACT_NAME_EMPTY", exports2.ContactNameEmptyError],
    ["CONTACT_REQ_MISSING", exports2.ContactReqMissingError],
    ["CREATE_CALL_FAILED", exports2.CreateCallFailedError],
    ["CREDENTIAL_INVALID", exports2.CredentialInvalidError],
    ["CURRENCY_TOTAL_AMOUNT_INVALID", exports2.CurrencyTotalAmountInvalidError],
    ["CUSTOM_REACTIONS_TOO_MANY", exports2.CustomReactionsTooManyError],
    ["DATA_HASH_SIZE_INVALID", exports2.DataHashSizeInvalidError],
    ["DATA_INVALID", exports2.DataInvalidError],
    ["DATA_JSON_INVALID", exports2.DataJsonInvalidError],
    ["DATA_TOO_LONG", exports2.DataTooLongError],
    ["DATE_EMPTY", exports2.DateEmptyError],
    ["DC_ID_INVALID", exports2.DcIdInvalidError],
    ["DH_G_A_INVALID", exports2.DhGAInvalidError],
    ["DOCUMENT_INVALID", exports2.DocumentInvalidError],
    ["EFFECT_CHAT_INVALID", exports2.EffectChatInvalidError],
    ["EFFECT_ID_INVALID", exports2.EffectIdInvalidError],
    ["EMAIL_HASH_EXPIRED", exports2.EmailHashExpiredError],
    ["EMAIL_INSTALL_MISSING", exports2.EmailInstallMissingError],
    ["EMAIL_INVALID", exports2.EmailInvalidError],
    ["EMAIL_NOT_ALLOWED", exports2.EmailNotAllowedError],
    ["EMAIL_NOT_SETUP", exports2.EmailNotSetupError],
    ["EMAIL_UNCONFIRMED", EmailUnconfirmedError],
    ["EMAIL_VERIFY_EXPIRED", exports2.EmailVerifyExpiredError],
    ["EMOJI_INVALID", exports2.EmojiInvalidError],
    ["EMOJI_MARKUP_INVALID", exports2.EmojiMarkupInvalidError],
    ["EMOJI_NOT_MODIFIED", exports2.EmojiNotModifiedError],
    ["EMOTICON_EMPTY", exports2.EmoticonEmptyError],
    ["EMOTICON_INVALID", exports2.EmoticonInvalidError],
    ["EMOTICON_STICKERPACK_MISSING", exports2.EmoticonStickerpackMissingError],
    ["ENCRYPTED_MESSAGE_INVALID", exports2.EncryptedMessageInvalidError],
    ["ENCRYPTION_ALREADY_ACCEPTED", exports2.EncryptionAlreadyAcceptedError],
    ["ENCRYPTION_ALREADY_DECLINED", exports2.EncryptionAlreadyDeclinedError],
    ["ENCRYPTION_DECLINED", exports2.EncryptionDeclinedError],
    ["ENCRYPTION_ID_INVALID", exports2.EncryptionIdInvalidError],
    ["ENTITIES_TOO_LONG", exports2.EntitiesTooLongError],
    ["ENTITY_BOUNDS_INVALID", exports2.EntityBoundsInvalidError],
    ["ENTITY_DATE_FORMAT_INVALID", exports2.EntityDateFormatInvalidError],
    ["ENTITY_DATE_INVALID", exports2.EntityDateInvalidError],
    ["ENTITY_DATE_TOO_LONG", exports2.EntityDateTooLongError],
    ["ENTITY_MENTION_USER_INVALID", exports2.EntityMentionUserInvalidError],
    ["ERROR_TEXT_EMPTY", exports2.ErrorTextEmptyError],
    ["EXPIRE_DATE_INVALID", exports2.ExpireDateInvalidError],
    ["EXPIRES_AT_INVALID", exports2.ExpiresAtInvalidError],
    ["EXPORT_CARD_INVALID", exports2.ExportCardInvalidError],
    ["EXTENDED_MEDIA_AMOUNT_INVALID", exports2.ExtendedMediaAmountInvalidError],
    ["EXTENDED_MEDIA_EMPTY", exports2.ExtendedMediaEmptyError],
    ["EXTENDED_MEDIA_INVALID", exports2.ExtendedMediaInvalidError],
    ["EXTENDED_MEDIA_PEER_INVALID", exports2.ExtendedMediaPeerInvalidError],
    ["EXTERNAL_URL_INVALID", exports2.ExternalUrlInvalidError],
    ["FILE_CONTENT_TYPE_INVALID", exports2.FileContentTypeInvalidError],
    ["FILE_EMTPY", exports2.FileEmtpyError],
    ["FILE_ID_INVALID", exports2.FileIdInvalidError],
    ["FILE_PART_EMPTY", exports2.FilePartEmptyError],
    ["FILE_PART_INVALID", exports2.FilePartInvalidError],
    ["FILE_PART_LENGTH_INVALID", exports2.FilePartLengthInvalidError],
    ["FILE_PART_SIZE_CHANGED", exports2.FilePartSizeChangedError],
    ["FILE_PART_SIZE_INVALID", exports2.FilePartSizeInvalidError],
    ["FILE_PART_TOO_BIG", exports2.FilePartTooBigError],
    ["FILE_PART_TOO_SMALL", exports2.FilePartTooSmallError],
    ["FILE_PARTS_INVALID", exports2.FilePartsInvalidError],
    ["FILE_REFERENCE_EMPTY", FileReferenceEmptyError],
    ["FILE_REFERENCE_EXPIRED", FileReferenceExpiredError],
    ["FILE_REFERENCE_INVALID", FileReferenceInvalidError],
    ["FILE_TITLE_EMPTY", exports2.FileTitleEmptyError],
    ["FILE_TOKEN_INVALID", exports2.FileTokenInvalidError],
    ["FILTER_ID_INVALID", exports2.FilterIdInvalidError],
    ["FILTER_INCLUDE_EMPTY", exports2.FilterIncludeEmptyError],
    ["FILTER_NOT_SUPPORTED", exports2.FilterNotSupportedError],
    ["FILTER_TITLE_EMPTY", exports2.FilterTitleEmptyError],
    ["FIRSTNAME_INVALID", exports2.FirstnameInvalidError],
    ["FOLDER_ID_EMPTY", exports2.FolderIdEmptyError],
    ["FOLDER_ID_INVALID", exports2.FolderIdInvalidError],
    ["FORM_EXPIRED", exports2.FormExpiredError],
    ["FORM_ID_EMPTY", exports2.FormIdEmptyError],
    ["FORM_SUBMIT_DUPLICATE", exports2.FormSubmitDuplicateError],
    ["FORM_UNSUPPORTED", exports2.FormUnsupportedError],
    ["FORUM_ENABLED", exports2.ForumEnabledError],
    ["FRESH_CHANGE_ADMINS_FORBIDDEN", exports2.FreshChangeAdminsForbiddenError],
    ["FROM_MESSAGE_BOT_DISABLED", exports2.FromMessageBotDisabledError],
    ["FROM_PEER_INVALID", exports2.FromPeerInvalidError],
    ["FROZEN_PARTICIPANT_MISSING", exports2.FrozenParticipantMissingError],
    ["GAME_BOT_INVALID", exports2.GameBotInvalidError],
    ["GENERAL_MODIFY_ICON_FORBIDDEN", exports2.GeneralModifyIconForbiddenError],
    ["GEO_POINT_INVALID", exports2.GeoPointInvalidError],
    ["GIF_CONTENT_TYPE_INVALID", exports2.GifContentTypeInvalidError],
    ["GIF_ID_INVALID", exports2.GifIdInvalidError],
    ["GIFT_MONTHS_INVALID", exports2.GiftMonthsInvalidError],
    ["GIFT_SLUG_EXPIRED", exports2.GiftSlugExpiredError],
    ["GIFT_SLUG_INVALID", exports2.GiftSlugInvalidError],
    ["GIFT_STARS_INVALID", exports2.GiftStarsInvalidError],
    ["GRAPH_EXPIRED_RELOAD", exports2.GraphExpiredReloadError],
    ["GRAPH_INVALID_RELOAD", exports2.GraphInvalidReloadError],
    ["GRAPH_OUTDATED_RELOAD", exports2.GraphOutdatedReloadError],
    ["GROUPCALL_ALREADY_DISCARDED", exports2.GroupcallAlreadyDiscardedError],
    ["GROUPCALL_FORBIDDEN", exports2.GroupcallForbiddenError],
    ["GROUPCALL_INVALID", exports2.GroupcallInvalidError],
    ["GROUPCALL_JOIN_MISSING", exports2.GroupcallJoinMissingError],
    ["GROUPCALL_NOT_MODIFIED", exports2.GroupcallNotModifiedError],
    ["GROUPCALL_SSRC_DUPLICATE_MUCH", exports2.GroupcallSsrcDuplicateMuchError],
    ["GROUPED_MEDIA_INVALID", exports2.GroupedMediaInvalidError],
    ["HASH_INVALID", exports2.HashInvalidError],
    ["HASH_SIZE_INVALID", exports2.HashSizeInvalidError],
    ["HASHTAG_INVALID", exports2.HashtagInvalidError],
    ["HIDE_REQUESTER_MISSING", exports2.HideRequesterMissingError],
    ["ID_EXPIRED", exports2.IdExpiredError],
    ["ID_INVALID", exports2.IdInvalidError],
    ["IMAGE_PROCESS_FAILED", exports2.ImageProcessFailedError],
    ["IMPORT_FILE_INVALID", exports2.ImportFileInvalidError],
    ["IMPORT_FORMAT_DATE_INVALID", exports2.ImportFormatDateInvalidError],
    ["IMPORT_FORMAT_UNRECOGNIZED", exports2.ImportFormatUnrecognizedError],
    ["IMPORT_ID_INVALID", exports2.ImportIdInvalidError],
    ["IMPORT_TOKEN_INVALID", exports2.ImportTokenInvalidError],
    ["INLINE_RESULT_EXPIRED", exports2.InlineResultExpiredError],
    ["INPUT_CHATLIST_INVALID", exports2.InputChatlistInvalidError],
    ["INPUT_FILE_INVALID", exports2.InputFileInvalidError],
    ["INPUT_FILTER_INVALID", exports2.InputFilterInvalidError],
    ["INPUT_PEERS_EMPTY", exports2.InputPeersEmptyError],
    ["INPUT_PURPOSE_INVALID", exports2.InputPurposeInvalidError],
    ["INPUT_STARS_AMOUNT_INVALID", exports2.InputStarsAmountInvalidError],
    ["INPUT_STARS_NANOS_INVALID", exports2.InputStarsNanosInvalidError],
    ["INPUT_TEXT_EMPTY", exports2.InputTextEmptyError],
    ["INPUT_TEXT_TOO_LONG", exports2.InputTextTooLongError],
    ["INPUT_USER_DEACTIVATED", exports2.InputUserDeactivatedError],
    ["INVITE_FORBIDDEN_WITH_JOINAS", exports2.InviteForbiddenWithJoinasError],
    ["INVITE_HASH_EMPTY", exports2.InviteHashEmptyError],
    ["INVITE_HASH_EXPIRED", exports2.InviteHashExpiredError],
    ["INVITE_HASH_INVALID", exports2.InviteHashInvalidError],
    ["INVITE_REQUEST_SENT", exports2.InviteRequestSentError],
    ["INVITE_REVOKED_MISSING", exports2.InviteRevokedMissingError],
    ["INVITE_SLUG_EMPTY", exports2.InviteSlugEmptyError],
    ["INVITE_SLUG_EXPIRED", exports2.InviteSlugExpiredError],
    ["INVITE_SLUG_INVALID", exports2.InviteSlugInvalidError],
    ["INVITES_TOO_MUCH", exports2.InvitesTooMuchError],
    ["INVOICE_INVALID", exports2.InvoiceInvalidError],
    ["INVOICE_PAYLOAD_INVALID", exports2.InvoicePayloadInvalidError],
    ["JOIN_AS_PEER_INVALID", exports2.JoinAsPeerInvalidError],
    ["LANG_CODE_INVALID", exports2.LangCodeInvalidError],
    ["LANG_CODE_NOT_SUPPORTED", exports2.LangCodeNotSupportedError],
    ["LANG_PACK_INVALID", exports2.LangPackInvalidError],
    ["LANGUAGE_INVALID", exports2.LanguageInvalidError],
    ["LASTNAME_INVALID", exports2.LastnameInvalidError],
    ["LIMIT_INVALID", exports2.LimitInvalidError],
    ["LIMIT_PER_POST_INVALID", exports2.LimitPerPostInvalidError],
    ["LINK_NOT_MODIFIED", exports2.LinkNotModifiedError],
    ["LOCATION_INVALID", exports2.LocationInvalidError],
    ["MANAGER_INVALID", exports2.ManagerInvalidError],
    ["MANAGER_PERMISSION_MISSING", exports2.ManagerPermissionMissingError],
    ["MAX_DATE_INVALID", exports2.MaxDateInvalidError],
    ["MAX_ID_INVALID", exports2.MaxIdInvalidError],
    ["MAX_QTS_INVALID", exports2.MaxQtsInvalidError],
    ["MD5_CHECKSUM_INVALID", exports2.Md5ChecksumInvalidError],
    ["MEDIA_ALREADY_PAID", exports2.MediaAlreadyPaidError],
    ["MEDIA_CAPTION_TOO_LONG", exports2.MediaCaptionTooLongError],
    ["MEDIA_EMPTY", exports2.MediaEmptyError],
    ["MEDIA_FILE_INVALID", exports2.MediaFileInvalidError],
    ["MEDIA_GROUPED_INVALID", exports2.MediaGroupedInvalidError],
    ["MEDIA_INVALID", exports2.MediaInvalidError],
    ["MEDIA_NEW_INVALID", exports2.MediaNewInvalidError],
    ["MEDIA_PREV_INVALID", exports2.MediaPrevInvalidError],
    ["MEDIA_TTL_INVALID", exports2.MediaTtlInvalidError],
    ["MEDIA_TYPE_INVALID", exports2.MediaTypeInvalidError],
    ["MEDIA_VIDEO_STORY_MISSING", exports2.MediaVideoStoryMissingError],
    ["MEGAGROUP_GEO_REQUIRED", exports2.MegagroupGeoRequiredError],
    ["MEGAGROUP_ID_INVALID", exports2.MegagroupIdInvalidError],
    ["MEGAGROUP_PREHISTORY_HIDDEN", exports2.MegagroupPrehistoryHiddenError],
    ["MEGAGROUP_REQUIRED", exports2.MegagroupRequiredError],
    ["MESSAGE_EDIT_TIME_EXPIRED", exports2.MessageEditTimeExpiredError],
    ["MESSAGE_EMPTY", exports2.MessageEmptyError],
    ["MESSAGE_ID_INVALID", exports2.MessageIdInvalidError],
    ["MESSAGE_IDS_EMPTY", exports2.MessageIdsEmptyError],
    ["MESSAGE_NOT_MODIFIED", exports2.MessageNotModifiedError],
    ["MESSAGE_NOT_READ_YET", exports2.MessageNotReadYetError],
    ["MESSAGE_POLL_CLOSED", exports2.MessagePollClosedError],
    ["MESSAGE_REQUIRED", exports2.MessageRequiredError],
    ["MESSAGE_TOO_LONG", exports2.MessageTooLongError],
    ["MESSAGE_TOO_OLD", exports2.MessageTooOldError],
    ["METHOD_INVALID", exports2.MethodInvalidError],
    ["MIN_DATE_INVALID", exports2.MinDateInvalidError],
    ["MONTH_INVALID", exports2.MonthInvalidError],
    ["MSG_ID_INVALID", exports2.MsgIdInvalidError],
    ["MSG_TOO_OLD", exports2.MsgTooOldError],
    ["MSG_VOICE_MISSING", exports2.MsgVoiceMissingError],
    ["MSG_VOICE_TOO_LONG", exports2.MsgVoiceTooLongError],
    ["MSG_WAIT_FAILED", exports2.MsgWaitError],
    ["MULTI_MEDIA_TOO_LONG", exports2.MultiMediaTooLongError],
    ["NAME_INVALID", exports2.NameInvalidError],
    ["NEED_ACTION_MISSING", exports2.NeedActionMissingError],
    ["NEW_SALT_INVALID", exports2.NewSaltInvalidError],
    ["NEW_SETTINGS_EMPTY", exports2.NewSettingsEmptyError],
    ["NEW_SETTINGS_INVALID", exports2.NewSettingsInvalidError],
    ["NEXT_OFFSET_INVALID", exports2.NextOffsetInvalidError],
    ["NO_PAYMENT_NEEDED", exports2.NoPaymentNeededError],
    ["NOGENERAL_HIDE_FORBIDDEN", exports2.NogeneralHideForbiddenError],
    ["NOT_ELIGIBLE", exports2.NotEligibleError],
    ["NOT_JOINED", exports2.NotJoinedError],
    ["OFFSET_INVALID", exports2.OffsetInvalidError],
    ["OFFSET_PEER_ID_INVALID", exports2.OffsetPeerIdInvalidError],
    ["OPTION_INVALID", exports2.OptionInvalidError],
    ["OPTIONS_TOO_MUCH", exports2.OptionsTooMuchError],
    ["ORDER_INVALID", exports2.OrderInvalidError],
    ["PACK_SHORT_NAME_INVALID", exports2.PackShortNameInvalidError],
    ["PACK_SHORT_NAME_OCCUPIED", exports2.PackShortNameOccupiedError],
    ["PACK_TITLE_INVALID", exports2.PackTitleInvalidError],
    ["PACK_TYPE_INVALID", exports2.PackTypeInvalidError],
    ["PARENT_PEER_INVALID", exports2.ParentPeerInvalidError],
    ["PARTICIPANT_ID_INVALID", exports2.ParticipantIdInvalidError],
    ["PARTICIPANT_JOIN_MISSING", exports2.ParticipantJoinMissingError],
    ["PARTICIPANT_VERSION_OUTDATED", exports2.ParticipantVersionOutdatedError],
    ["PARTICIPANTS_TOO_FEW", exports2.ParticipantsTooFewError],
    ["PASSKEY_ORIGIN_MISMATCH", exports2.PasskeyOriginMismatchError],
    ["PASSWORD_EMPTY", exports2.PasswordEmptyError],
    ["PASSWORD_HASH_INVALID", exports2.PasswordHashInvalidError],
    ["PASSWORD_MISSING", exports2.PasswordMissingError],
    ["PASSWORD_RECOVERY_EXPIRED", exports2.PasswordRecoveryExpiredError],
    ["PASSWORD_RECOVERY_NA", exports2.PasswordRecoveryNaError],
    ["PASSWORD_REQUIRED", exports2.PasswordRequiredError],
    ["PAYMENT_CREDENTIALS_INVALID", exports2.PaymentCredentialsInvalidError],
    ["PAYMENT_PROVIDER_INVALID", exports2.PaymentProviderInvalidError],
    ["PAYMENT_REQUIRED", exports2.PaymentRequiredError],
    ["PEER_HISTORY_EMPTY", exports2.PeerHistoryEmptyError],
    ["PEER_ID_INVALID", exports2.PeerIdInvalidError],
    ["PEER_ID_NOT_SUPPORTED", exports2.PeerIdNotSupportedError],
    ["PEER_TYPES_INVALID", exports2.PeerTypesInvalidError],
    ["PEERS_LIST_EMPTY", exports2.PeersListEmptyError],
    ["PERSISTENT_TIMESTAMP_EMPTY", exports2.PersistentTimestampEmptyError],
    ["PERSISTENT_TIMESTAMP_INVALID", exports2.PersistentTimestampInvalidError],
    ["PHONE_CODE_EMPTY", exports2.PhoneCodeEmptyError],
    ["PHONE_CODE_EXPIRED", exports2.PhoneCodeExpiredError],
    ["PHONE_CODE_HASH_EMPTY", exports2.PhoneCodeHashEmptyError],
    ["PHONE_CODE_INVALID", exports2.PhoneCodeInvalidError],
    ["PHONE_HASH_EXPIRED", exports2.PhoneHashExpiredError],
    ["PHONE_NOT_OCCUPIED", exports2.PhoneNotOccupiedError],
    ["PHONE_NUMBER_APP_SIGNUP_FORBIDDEN", exports2.PhoneNumberAppSignupForbiddenError],
    ["PHONE_NUMBER_BANNED", exports2.PhoneNumberBannedError],
    ["PHONE_NUMBER_FLOOD", exports2.PhoneNumberFloodError],
    ["PHONE_NUMBER_INVALID", exports2.PhoneNumberInvalidError],
    ["PHONE_NUMBER_OCCUPIED", exports2.PhoneNumberOccupiedError],
    ["PHONE_NUMBER_UNOCCUPIED", exports2.PhoneNumberUnoccupiedError],
    ["PHONE_PASSWORD_PROTECTED", exports2.PhonePasswordProtectedError],
    ["PHOTO_CONTENT_TYPE_INVALID", exports2.PhotoContentTypeInvalidError],
    ["PHOTO_CONTENT_URL_EMPTY", exports2.PhotoContentUrlEmptyError],
    ["PHOTO_CROP_FILE_MISSING", exports2.PhotoCropFileMissingError],
    ["PHOTO_CROP_SIZE_SMALL", exports2.PhotoCropSizeSmallError],
    ["PHOTO_EXT_INVALID", exports2.PhotoExtInvalidError],
    ["PHOTO_FILE_MISSING", exports2.PhotoFileMissingError],
    ["PHOTO_ID_INVALID", exports2.PhotoIdInvalidError],
    ["PHOTO_INVALID", exports2.PhotoInvalidError],
    ["PHOTO_INVALID_DIMENSIONS", exports2.PhotoInvalidDimensionsError],
    ["PHOTO_SAVE_FILE_INVALID", exports2.PhotoSaveFileInvalidError],
    ["PHOTO_THUMB_URL_EMPTY", exports2.PhotoThumbUrlEmptyError],
    ["PIN_RESTRICTED", exports2.PinRestrictedError],
    ["PINNED_DIALOGS_TOO_MUCH", exports2.PinnedDialogsTooMuchError],
    ["PINNED_TOO_MUCH", exports2.PinnedTooMuchError],
    ["PINNED_TOPIC_NOT_MODIFIED", exports2.PinnedTopicNotModifiedError],
    ["POLL_ANSWER_INVALID", exports2.PollAnswerInvalidError],
    ["POLL_ANSWERS_INVALID", exports2.PollAnswersInvalidError],
    ["POLL_OPTION_DUPLICATE", exports2.PollOptionDuplicateError],
    ["POLL_OPTION_INVALID", exports2.PollOptionInvalidError],
    ["POLL_QUESTION_INVALID", exports2.PollQuestionInvalidError],
    ["PREMIUM_ACCOUNT_REQUIRED", exports2.PremiumAccountRequiredError],
    ["PREMIUM_PURPOSE_INVALID", exports2.PremiumPurposeInvalidError],
    ["PRICING_CHAT_INVALID", exports2.PricingChatInvalidError],
    ["PRIVACY_KEY_INVALID", exports2.PrivacyKeyInvalidError],
    ["PRIVACY_TOO_LONG", exports2.PrivacyTooLongError],
    ["PRIVACY_VALUE_INVALID", exports2.PrivacyValueInvalidError],
    ["PUBLIC_BROADCAST_EXPECTED", exports2.PublicBroadcastExpectedError],
    ["PUBLIC_KEY_INVALID", exports2.PublicKeyInvalidError],
    ["PUBLIC_KEY_REQUIRED", exports2.PublicKeyRequiredError],
    ["PURPOSE_INVALID", exports2.PurposeInvalidError],
    ["QUERY_ID_EMPTY", exports2.QueryIdEmptyError],
    ["QUERY_ID_INVALID", exports2.QueryIdInvalidError],
    ["QUERY_TOO_SHORT", exports2.QueryTooShortError],
    ["QUICK_REPLIES_BOT_NOT_ALLOWED", exports2.QuickRepliesBotNotAllowedError],
    ["QUICK_REPLIES_TOO_MUCH", exports2.QuickRepliesTooMuchError],
    ["QUIZ_ANSWER_MISSING", exports2.QuizAnswerMissingError],
    ["QUIZ_CORRECT_ANSWER_INVALID", exports2.QuizCorrectAnswerInvalidError],
    ["QUIZ_CORRECT_ANSWERS_EMPTY", exports2.QuizCorrectAnswersEmptyError],
    ["QUIZ_CORRECT_ANSWERS_TOO_MUCH", exports2.QuizCorrectAnswersTooMuchError],
    ["QUIZ_MULTIPLE_INVALID", exports2.QuizMultipleInvalidError],
    ["QUOTE_TEXT_INVALID", exports2.QuoteTextInvalidError],
    ["RAISE_HAND_FORBIDDEN", exports2.RaiseHandForbiddenError],
    ["RANDOM_ID_DUPLICATE", exports2.RandomIdDuplicateError],
    ["RANDOM_ID_EMPTY", exports2.RandomIdEmptyError],
    ["RANDOM_ID_EXPIRED", exports2.RandomIdExpiredError],
    ["RANDOM_ID_INVALID", exports2.RandomIdInvalidError],
    ["RANDOM_LENGTH_INVALID", exports2.RandomLengthInvalidError],
    ["RANGES_INVALID", exports2.RangesInvalidError],
    ["REACTION_EMPTY", exports2.ReactionEmptyError],
    ["REACTION_INVALID", exports2.ReactionInvalidError],
    ["REACTIONS_COUNT_INVALID", exports2.ReactionsCountInvalidError],
    ["REACTIONS_TOO_MANY", exports2.ReactionsTooManyError],
    ["RECEIPT_EMPTY", exports2.ReceiptEmptyError],
    ["REPLY_MARKUP_BUY_EMPTY", exports2.ReplyMarkupBuyEmptyError],
    ["REPLY_MARKUP_GAME_EMPTY", exports2.ReplyMarkupGameEmptyError],
    ["REPLY_MARKUP_INVALID", exports2.ReplyMarkupInvalidError],
    ["REPLY_MARKUP_TOO_LONG", exports2.ReplyMarkupTooLongError],
    ["REPLY_MESSAGE_ID_INVALID", exports2.ReplyMessageIdInvalidError],
    ["REPLY_MESSAGES_TOO_MUCH", exports2.ReplyMessagesTooMuchError],
    ["REPLY_TO_INVALID", exports2.ReplyToInvalidError],
    ["REPLY_TO_MONOFORUM_PEER_INVALID", exports2.ReplyToMonoforumPeerInvalidError],
    ["REPLY_TO_USER_INVALID", exports2.ReplyToUserInvalidError],
    ["REQUEST_MSG_EXPIRED", exports2.RequestMsgExpiredError],
    ["REQUEST_TOKEN_INVALID", exports2.RequestTokenInvalidError],
    ["RESELL_STARS_TOO_FEW", exports2.ResellStarsTooFewError],
    ["RESELL_STARS_TOO_MUCH", exports2.ResellStarsTooMuchError],
    ["RESET_REQUEST_MISSING", exports2.ResetRequestMissingError],
    ["RESULT_ID_DUPLICATE", exports2.ResultIdDuplicateError],
    ["RESULT_ID_EMPTY", exports2.ResultIdEmptyError],
    ["RESULT_ID_INVALID", exports2.ResultIdInvalidError],
    ["RESULT_TYPE_INVALID", exports2.ResultTypeInvalidError],
    ["RESULTS_TOO_MUCH", exports2.ResultsTooMuchError],
    ["REVOTE_NOT_ALLOWED", exports2.RevoteNotAllowedError],
    ["RIGHTS_NOT_MODIFIED", exports2.RightsNotModifiedError],
    ["RINGTONE_INVALID", exports2.RingtoneInvalidError],
    ["RINGTONE_MIME_INVALID", exports2.RingtoneMimeInvalidError],
    ["RSA_DECRYPT_FAILED", exports2.RsaDecryptFailedError],
    ["SAVED_ID_EMPTY", exports2.SavedIdEmptyError],
    ["SCHEDULE_BOT_NOT_ALLOWED", exports2.ScheduleBotNotAllowedError],
    ["SCHEDULE_DATE_INVALID", exports2.ScheduleDateInvalidError],
    ["SCHEDULE_DATE_TOO_LATE", exports2.ScheduleDateTooLateError],
    ["SCHEDULE_STATUS_PRIVATE", exports2.ScheduleStatusPrivateError],
    ["SCHEDULE_TOO_MUCH", exports2.ScheduleTooMuchError],
    ["SCORE_INVALID", exports2.ScoreInvalidError],
    ["SEARCH_QUERY_EMPTY", exports2.SearchQueryEmptyError],
    ["SEARCH_WITH_LINK_NOT_SUPPORTED", exports2.SearchWithLinkNotSupportedError],
    ["SECONDS_INVALID", exports2.SecondsInvalidError],
    ["SECURE_SECRET_REQUIRED", exports2.SecureSecretRequiredError],
    ["SELF_DELETE_RESTRICTED", exports2.SelfDeleteRestrictedError],
    ["SEND_AS_PEER_INVALID", exports2.SendAsPeerInvalidError],
    ["SEND_MESSAGE_GAME_INVALID", exports2.SendMessageGameInvalidError],
    ["SEND_MESSAGE_MEDIA_INVALID", exports2.SendMessageMediaInvalidError],
    ["SEND_MESSAGE_TYPE_INVALID", exports2.SendMessageTypeInvalidError],
    ["SETTINGS_INVALID", exports2.SettingsInvalidError],
    ["SHA256_HASH_INVALID", exports2.Sha256HashInvalidError],
    ["SHORT_NAME_INVALID", exports2.ShortNameInvalidError],
    ["SHORT_NAME_OCCUPIED", exports2.ShortNameOccupiedError],
    ["SHORTCUT_INVALID", exports2.ShortcutInvalidError],
    ["SLOTS_EMPTY", exports2.SlotsEmptyError],
    ["SLOWMODE_MULTI_MSGS_DISABLED", exports2.SlowmodeMultiMsgsDisabledError],
    ["SLUG_INVALID", exports2.SlugInvalidError],
    ["SMS_CODE_CREATE_FAILED", exports2.SmsCodeCreateFailedError],
    ["SMSJOB_ID_INVALID", exports2.SmsjobIdInvalidError],
    ["SRP_A_INVALID", exports2.SrpAInvalidError],
    ["SRP_ID_INVALID", exports2.SrpIdInvalidError],
    ["SRP_PASSWORD_CHANGED", exports2.SrpPasswordChangedError],
    ["STARGIFT_ALREADY_CONVERTED", exports2.StargiftAlreadyConvertedError],
    ["STARGIFT_ALREADY_REFUNDED", exports2.StargiftAlreadyRefundedError],
    ["STARGIFT_ALREADY_UPGRADED", exports2.StargiftAlreadyUpgradedError],
    ["STARGIFT_ATTRIBUTE_INVALID", exports2.StargiftAttributeInvalidError],
    ["STARGIFT_INVALID", exports2.StargiftInvalidError],
    ["STARGIFT_MESSAGE_INVALID", exports2.StargiftMessageInvalidError],
    ["STARGIFT_NOT_FOUND", exports2.StargiftNotFoundError],
    ["STARGIFT_NOT_OWNER", exports2.StargiftNotOwnerError],
    ["STARGIFT_NOT_UNIQUE", exports2.StargiftNotUniqueError],
    ["STARGIFT_OBJECT_INVALID", exports2.StargiftObjectInvalidError],
    ["STARGIFT_OFFER_INVALID", exports2.StargiftOfferInvalidError],
    ["STARGIFT_OFFER_NOT_ALLOWED", exports2.StargiftOfferNotAllowedError],
    ["STARGIFT_OWNER_INVALID", exports2.StargiftOwnerInvalidError],
    ["STARGIFT_PEER_INVALID", exports2.StargiftPeerInvalidError],
    ["STARGIFT_RESELL_CURRENCY_NOT_ALLOWED", exports2.StargiftResellCurrencyNotAllowedError],
    ["STARGIFT_SLUG_INVALID", exports2.StargiftSlugInvalidError],
    ["STARGIFT_UPGRADE_UNAVAILABLE", exports2.StargiftUpgradeUnavailableError],
    ["STARGIFT_USAGE_LIMITED", exports2.StargiftUsageLimitedError],
    ["STARGIFT_USER_USAGE_LIMITED", exports2.StargiftUserUsageLimitedError],
    ["STARREF_AWAITING_END", exports2.StarrefAwaitingEndError],
    ["STARREF_EXPIRED", exports2.StarrefExpiredError],
    ["STARREF_HASH_REVOKED", exports2.StarrefHashRevokedError],
    ["STARREF_PERMILLE_INVALID", exports2.StarrefPermilleInvalidError],
    ["STARREF_PERMILLE_TOO_LOW", exports2.StarrefPermilleTooLowError],
    ["STARS_AMOUNT_INVALID", exports2.StarsAmountInvalidError],
    ["STARS_INVOICE_INVALID", exports2.StarsInvoiceInvalidError],
    ["STARS_PAYMENT_REQUIRED", exports2.StarsPaymentRequiredError],
    ["START_PARAM_EMPTY", exports2.StartParamEmptyError],
    ["START_PARAM_INVALID", exports2.StartParamInvalidError],
    ["START_PARAM_TOO_LONG", exports2.StartParamTooLongError],
    ["STICKER_DOCUMENT_INVALID", exports2.StickerDocumentInvalidError],
    ["STICKER_EMOJI_INVALID", exports2.StickerEmojiInvalidError],
    ["STICKER_FILE_INVALID", exports2.StickerFileInvalidError],
    ["STICKER_GIF_DIMENSIONS", exports2.StickerGifDimensionsError],
    ["STICKER_ID_INVALID", exports2.StickerIdInvalidError],
    ["STICKER_INVALID", exports2.StickerInvalidError],
    ["STICKER_MIME_INVALID", exports2.StickerMimeInvalidError],
    ["STICKER_PNG_DIMENSIONS", exports2.StickerPngDimensionsError],
    ["STICKER_PNG_NOPNG", exports2.StickerPngNopngError],
    ["STICKER_TGS_NODOC", exports2.StickerTgsNodocError],
    ["STICKER_TGS_NOTGS", exports2.StickerTgsNotgsError],
    ["STICKER_THUMB_PNG_NOPNG", exports2.StickerThumbPngNopngError],
    ["STICKER_THUMB_TGS_NOTGS", exports2.StickerThumbTgsNotgsError],
    ["STICKER_VIDEO_BIG", exports2.StickerVideoBigError],
    ["STICKER_VIDEO_NODOC", exports2.StickerVideoNodocError],
    ["STICKER_VIDEO_NOWEBM", exports2.StickerVideoNowebmError],
    ["STICKERPACK_STICKERS_TOO_MUCH", exports2.StickerpackStickersTooMuchError],
    ["STICKERS_EMPTY", exports2.StickersEmptyError],
    ["STICKERS_TOO_MUCH", exports2.StickersTooMuchError],
    ["STICKERSET_INVALID", exports2.StickersetInvalidError],
    ["STORIES_NEVER_CREATED", exports2.StoriesNeverCreatedError],
    ["STORIES_TOO_MUCH", exports2.StoriesTooMuchError],
    ["STORY_ID_EMPTY", exports2.StoryIdEmptyError],
    ["STORY_ID_INVALID", exports2.StoryIdInvalidError],
    ["STORY_NOT_MODIFIED", exports2.StoryNotModifiedError],
    ["STORY_PERIOD_INVALID", exports2.StoryPeriodInvalidError],
    ["SUBSCRIPTION_EXPORT_MISSING", exports2.SubscriptionExportMissingError],
    ["SUBSCRIPTION_ID_INVALID", exports2.SubscriptionIdInvalidError],
    ["SUBSCRIPTION_PERIOD_INVALID", exports2.SubscriptionPeriodInvalidError],
    ["SUGGESTED_POST_AMOUNT_INVALID", exports2.SuggestedPostAmountInvalidError],
    ["SUGGESTED_POST_PEER_INVALID", exports2.SuggestedPostPeerInvalidError],
    ["SWITCH_PM_TEXT_EMPTY", exports2.SwitchPmTextEmptyError],
    ["SWITCH_WEBVIEW_URL_INVALID", exports2.SwitchWebviewUrlInvalidError],
    ["TAKEOUT_INVALID", exports2.TakeoutInvalidError],
    ["TAKEOUT_REQUIRED", exports2.TakeoutRequiredError],
    ["TASK_ALREADY_EXISTS", exports2.TaskAlreadyExistsError],
    ["TEMP_AUTH_KEY_ALREADY_BOUND", exports2.TempAuthKeyAlreadyBoundError],
    ["TEMP_AUTH_KEY_EMPTY", exports2.TempAuthKeyEmptyError],
    ["TERMS_URL_INVALID", exports2.TermsUrlInvalidError],
    ["TEXTDRAFT_PEER_INVALID", exports2.TextdraftPeerInvalidError],
    ["THEME_FILE_INVALID", exports2.ThemeFileInvalidError],
    ["THEME_FORMAT_INVALID", exports2.ThemeFormatInvalidError],
    ["THEME_INVALID", exports2.ThemeInvalidError],
    ["THEME_MIME_INVALID", exports2.ThemeMimeInvalidError],
    ["THEME_PARAMS_INVALID", exports2.ThemeParamsInvalidError],
    ["THEME_SLUG_INVALID", exports2.ThemeSlugInvalidError],
    ["THEME_TITLE_INVALID", exports2.ThemeTitleInvalidError],
    ["TIMEZONE_INVALID", exports2.TimezoneInvalidError],
    ["TITLE_INVALID", exports2.TitleInvalidError],
    ["TMP_PASSWORD_DISABLED", exports2.TmpPasswordDisabledError],
    ["TMP_PASSWORD_INVALID", exports2.TmpPasswordInvalidError],
    ["TO_ID_INVALID", exports2.ToIdInvalidError],
    ["TO_LANG_INVALID", exports2.ToLangInvalidError],
    ["TODO_ITEM_DUPLICATE", exports2.TodoItemDuplicateError],
    ["TODO_ITEMS_EMPTY", exports2.TodoItemsEmptyError],
    ["TODO_ITEMS_TOO_MUCH", exports2.TodoItemsTooMuchError],
    ["TODO_NOT_MODIFIED", exports2.TodoNotModifiedError],
    ["TOKEN_EMPTY", exports2.TokenEmptyError],
    ["TOKEN_INVALID", exports2.TokenInvalidError],
    ["TOKEN_TYPE_INVALID", exports2.TokenTypeInvalidError],
    ["TOPIC_CLOSE_SEPARATELY", exports2.TopicCloseSeparatelyError],
    ["TOPIC_CLOSED", exports2.TopicClosedError],
    ["TOPIC_DELETED", exports2.TopicDeletedError],
    ["TOPIC_HIDE_SEPARATELY", exports2.TopicHideSeparatelyError],
    ["TOPIC_ID_INVALID", exports2.TopicIdInvalidError],
    ["TOPIC_NOT_MODIFIED", exports2.TopicNotModifiedError],
    ["TOPIC_TITLE_EMPTY", exports2.TopicTitleEmptyError],
    ["TOPICS_EMPTY", exports2.TopicsEmptyError],
    ["TRANSACTION_ID_INVALID", exports2.TransactionIdInvalidError],
    ["TRANSCRIPTION_FAILED", exports2.TranscriptionFailedError],
    ["TRANSLATE_REQ_QUOTA_EXCEEDED", exports2.TranslateReqQuotaExceededError],
    ["TTL_DAYS_INVALID", exports2.TtlDaysInvalidError],
    ["TTL_MEDIA_INVALID", exports2.TtlMediaInvalidError],
    ["TTL_PERIOD_INVALID", exports2.TtlPeriodInvalidError],
    ["TYPES_EMPTY", exports2.TypesEmptyError],
    ["UNSUPPORTED", exports2.UnsupportedError],
    ["UNTIL_DATE_INVALID", exports2.UntilDateInvalidError],
    ["URL_EXPIRED", exports2.UrlExpiredError],
    ["URL_INVALID", exports2.UrlInvalidError],
    ["USAGE_LIMIT_INVALID", exports2.UsageLimitInvalidError],
    ["USER_ADMIN_INVALID", exports2.UserAdminInvalidError],
    ["USER_ALREADY_INVITED", exports2.UserAlreadyInvitedError],
    ["USER_ALREADY_PARTICIPANT", exports2.UserAlreadyParticipantError],
    ["USER_BANNED_IN_CHANNEL", exports2.UserBannedInChannelError],
    ["USER_BLOCKED", exports2.UserBlockedError],
    ["USER_BOT", exports2.UserBotError],
    ["USER_BOT_INVALID", exports2.UserBotInvalidError],
    ["USER_BOT_REQUIRED", exports2.UserBotRequiredError],
    ["USER_BOT_TO_BOT_DISABLED", exports2.UserBotToBotDisabledError],
    ["USER_CHANNELS_TOO_MUCH", exports2.UserChannelsTooMuchError],
    ["USER_CREATOR", exports2.UserCreatorError],
    ["USER_GIFT_UNAVAILABLE", exports2.UserGiftUnavailableError],
    ["USER_ID_INVALID", exports2.UserIdInvalidError],
    ["USER_INVALID", exports2.UserInvalidError],
    ["USER_IS_BLOCKED", exports2.UserIsBlockedError],
    ["USER_IS_BOT", exports2.UserIsBotError],
    ["USER_KICKED", exports2.UserKickedError],
    ["USER_NOT_MUTUAL_CONTACT", exports2.UserNotMutualContactError],
    ["USER_NOT_PARTICIPANT", exports2.UserNotParticipantError],
    ["USER_PUBLIC_MISSING", exports2.UserPublicMissingError],
    ["USER_VOLUME_INVALID", exports2.UserVolumeInvalidError],
    ["USERNAME_INVALID", exports2.UsernameInvalidError],
    ["USERNAME_NOT_MODIFIED", exports2.UsernameNotModifiedError],
    ["USERNAME_NOT_OCCUPIED", exports2.UsernameNotOccupiedError],
    ["USERNAME_OCCUPIED", exports2.UsernameOccupiedError],
    ["USERNAME_PURCHASE_AVAILABLE", exports2.UsernamePurchaseAvailableError],
    ["USERNAME_SUFFIX_MISSING", exports2.UsernameSuffixMissingError],
    ["USERNAMES_ACTIVE_TOO_MUCH", exports2.UsernamesActiveTooMuchError],
    ["USERPIC_UPLOAD_REQUIRED", exports2.UserpicUploadRequiredError],
    ["USERS_TOO_FEW", exports2.UsersTooFewError],
    ["USERS_TOO_MUCH", exports2.UsersTooMuchError],
    ["VENUE_ID_INVALID", exports2.VenueIdInvalidError],
    ["VIDEO_CONTENT_TYPE_INVALID", exports2.VideoContentTypeInvalidError],
    ["VIDEO_DURATION_INVALID", exports2.VideoDurationInvalidError],
    ["VIDEO_FILE_INVALID", exports2.VideoFileInvalidError],
    ["VIDEO_PAUSE_FORBIDDEN", exports2.VideoPauseForbiddenError],
    ["VIDEO_STOP_FORBIDDEN", exports2.VideoStopForbiddenError],
    ["VIDEO_TITLE_EMPTY", exports2.VideoTitleEmptyError],
    ["VOICE_MESSAGES_FORBIDDEN", exports2.VoiceMessagesForbiddenError],
    ["WALLPAPER_FILE_INVALID", exports2.WallpaperFileInvalidError],
    ["WALLPAPER_INVALID", exports2.WallpaperInvalidError],
    ["WALLPAPER_MIME_INVALID", exports2.WallpaperMimeInvalidError],
    ["WALLPAPER_NOT_FOUND", exports2.WallpaperNotFoundError],
    ["WC_CONVERT_URL_INVALID", exports2.WcConvertUrlInvalidError],
    ["WEBAPP_REQ_ID_INVALID", exports2.WebappReqIdInvalidError],
    ["WEBAUTH_TOKEN_EXPIRED", exports2.WebauthTokenExpiredError],
    ["WEBDOCUMENT_INVALID", exports2.WebdocumentInvalidError],
    ["WEBDOCUMENT_MIME_INVALID", exports2.WebdocumentMimeInvalidError],
    ["WEBDOCUMENT_SIZE_TOO_BIG", exports2.WebdocumentSizeTooBigError],
    ["WEBDOCUMENT_URL_EMPTY", exports2.WebdocumentUrlEmptyError],
    ["WEBDOCUMENT_URL_INVALID", exports2.WebdocumentUrlInvalidError],
    ["WEBPAGE_CURL_FAILED", exports2.WebpageCurlFailedError],
    ["WEBPAGE_MEDIA_EMPTY", exports2.WebpageMediaEmptyError],
    ["WEBPAGE_NOT_FOUND", exports2.WebpageNotFoundError],
    ["WEBPAGE_URL_INVALID", exports2.WebpageUrlInvalidError],
    ["WEBPUSH_AUTH_INVALID", exports2.WebpushAuthInvalidError],
    ["WEBPUSH_KEY_INVALID", exports2.WebpushKeyInvalidError],
    ["WEBPUSH_TOKEN_INVALID", exports2.WebpushTokenInvalidError],
    ["YOU_BLOCKED_USER", exports2.YouBlockedUserError],
    ["BOT_METHOD_INVALID", exports2.BotMethodInvalidError],
    ["CONNECTION_DEVICE_MODEL_EMPTY", exports2.ConnectionDeviceModelEmptyError],
    ["CONNECTION_LANG_PACK_INVALID", exports2.ConnectionLangPackInvalidError],
    ["CONNECTION_NOT_INITED", exports2.ConnectionNotInitedError],
    ["CONNECTION_SYSTEM_EMPTY", exports2.ConnectionSystemEmptyError],
    ["CONNECTION_SYSTEM_LANG_CODE_EMPTY", exports2.ConnectionSystemLangCodeEmptyError],
    ["INPUT_CONSTRUCTOR_INVALID", exports2.InputConstructorInvalidError],
    ["INPUT_FETCH_ERROR", exports2.InputFetchErrorError],
    ["INPUT_FETCH_FAIL", exports2.InputFetchFailError],
    ["INPUT_LAYER_INVALID", exports2.InputLayerInvalidError],
    ["INPUT_METHOD_INVALID", exports2.InputMethodInvalidError],
    ["INPUT_REQUEST_TOO_LONG", exports2.InputRequestTooLongError],
    ["PEER_FLOOD", exports2.PeerFloodError],
    ["STICKERSET_NOT_MODIFIED", exports2.StickersetNotModifiedError],
    ["AUTH_KEY_UNREGISTERED", exports2.AuthKeyUnregisteredError],
    ["AUTH_KEY_INVALID", exports2.AuthKeyInvalidError],
    ["AUTH_KEY_PERM_EMPTY", exports2.AuthKeyPermEmptyError],
    ["SESSION_EXPIRED", exports2.SessionExpiredError],
    ["SESSION_PASSWORD_NEEDED", exports2.SessionPasswordNeededError],
    ["SESSION_REVOKED", exports2.SessionRevokedError],
    ["USER_DEACTIVATED", exports2.UserDeactivatedError],
    ["USER_DEACTIVATED_BAN", exports2.UserDeactivatedBanError],
    ["ACCESS_DENIED", exports2.AccessDeniedError],
    ["ALLOW_PAYMENT_REQUIRED", AllowPaymentRequiredError],
    ["BOT_ACCESS_FORBIDDEN", exports2.BotAccessForbiddenError],
    ["BOT_FORUM_CREATE_FORBIDDEN", exports2.BotForumCreateForbiddenError],
    ["BOT_GUARD_NOT_SUPPORTED", exports2.BotGuardNotSupportedError],
    ["BOT_VERIFIER_FORBIDDEN", exports2.BotVerifierForbiddenError],
    ["BROADCAST_FORBIDDEN", exports2.BroadcastForbiddenError],
    ["CHANNEL_PUBLIC_GROUP_NA", exports2.ChannelPublicGroupNaError],
    ["CHAT_ACTION_FORBIDDEN", exports2.ChatActionForbiddenError],
    ["CHAT_ADMIN_INVITE_REQUIRED", exports2.ChatAdminInviteRequiredError],
    ["CHAT_GUEST_SEND_FORBIDDEN", exports2.ChatGuestSendForbiddenError],
    ["CHAT_SEND_AUDIOS_FORBIDDEN", exports2.ChatSendAudiosForbiddenError],
    ["CHAT_SEND_DOCS_FORBIDDEN", exports2.ChatSendDocsForbiddenError],
    ["CHAT_SEND_GAME_FORBIDDEN", exports2.ChatSendGameForbiddenError],
    ["CHAT_SEND_GIFS_FORBIDDEN", exports2.ChatSendGifsForbiddenError],
    ["CHAT_SEND_MEDIA_FORBIDDEN", exports2.ChatSendMediaForbiddenError],
    ["CHAT_SEND_PHOTOS_FORBIDDEN", exports2.ChatSendPhotosForbiddenError],
    ["CHAT_SEND_PLAIN_FORBIDDEN", exports2.ChatSendPlainForbiddenError],
    ["CHAT_SEND_POLL_FORBIDDEN", exports2.ChatSendPollForbiddenError],
    ["CHAT_SEND_ROUNDVIDEOS_FORBIDDEN", exports2.ChatSendRoundvideosForbiddenError],
    ["CHAT_SEND_STICKERS_FORBIDDEN", exports2.ChatSendStickersForbiddenError],
    ["CHAT_SEND_VIDEOS_FORBIDDEN", exports2.ChatSendVideosForbiddenError],
    ["CHAT_SEND_VOICES_FORBIDDEN", exports2.ChatSendVoicesForbiddenError],
    ["CHAT_SEND_WEBPAGE_FORBIDDEN", exports2.ChatSendWebpageForbiddenError],
    ["CHAT_TYPE_INVALID", exports2.ChatTypeInvalidError],
    ["EDIT_BOT_INVITE_FORBIDDEN", exports2.EditBotInviteForbiddenError],
    ["GROUPCALL_ALREADY_STARTED", exports2.GroupcallAlreadyStartedError],
    ["GROUPCALL_CHANGE_FORBIDDEN", exports2.GroupcallChangeForbiddenError],
    ["INLINE_BOT_REQUIRED", exports2.InlineBotRequiredError],
    ["MESSAGE_AUTHOR_REQUIRED", exports2.MessageAuthorRequiredError],
    ["MESSAGE_DELETE_FORBIDDEN", exports2.MessageDeleteForbiddenError],
    ["POLL_VOTE_REQUIRED", exports2.PollVoteRequiredError],
    ["PRIVACY_PREMIUM_REQUIRED", exports2.PrivacyPremiumRequiredError],
    ["PUBLIC_CHANNEL_MISSING", exports2.PublicChannelMissingError],
    ["RIGHT_FORBIDDEN", exports2.RightForbiddenError],
    ["SENSITIVE_CHANGE_FORBIDDEN", exports2.SensitiveChangeForbiddenError],
    ["USER_DELETED", exports2.UserDeletedError],
    ["USER_DISALLOWED_STARGIFTS", exports2.UserDisallowedStargiftsError],
    ["USER_PERMISSION_DENIED", exports2.UserPermissionDeniedError],
    ["USER_PRIVACY_RESTRICTED", exports2.UserPrivacyRestrictedError],
    ["USER_RESTRICTED", exports2.UserRestrictedError],
    ["YOUR_PRIVACY_RESTRICTED", exports2.YourPrivacyRestrictedError],
    ["CHAT_FORBIDDEN", exports2.ChatForbiddenError],
    ["API_GIFT_RESTRICTED_UPDATE_APP", exports2.ApiGiftRestrictedUpdateAppError],
    ["BUSINESS_ADDRESS_ACTIVE", exports2.BusinessAddressActiveError],
    ["CALL_PROTOCOL_COMPAT_LAYER_INVALID", exports2.CallProtocolCompatLayerInvalidError],
    ["EDIT_MESSAGE_TEMP_RESTRICTED", exports2.EditMessageTempRestrictedError],
    ["FILEREF_UPGRADE_NEEDED", exports2.FilerefUpgradeNeededError],
    ["FRESH_CHANGE_PHONE_FORBIDDEN", exports2.FreshChangePhoneForbiddenError],
    ["FRESH_RESET_AUTHORISATION_FORBIDDEN", exports2.FreshResetAuthorisationForbiddenError],
    ["PAYMENT_UNSUPPORTED", exports2.PaymentUnsupportedError],
    ["PHONE_PASSWORD_FLOOD", exports2.PhonePasswordFloodError],
    ["POLL_COUNTRY_RESTRICTED", exports2.PollCountryRestrictedError],
    ["POLL_MEMBER_RESTRICTED", exports2.PollMemberRestrictedError],
    ["PRECHECKOUT_FAILED", exports2.PrecheckoutFailedError],
    ["PREMIUM_CURRENTLY_UNAVAILABLE", exports2.PremiumCurrentlyUnavailableError],
    ["SEND_CODE_UNAVAILABLE", exports2.SendCodeUnavailableError],
    ["STARGIFT_EXPORT_IN_PROGRESS", exports2.StargiftExportInProgressError],
    ["STARS_FORM_AMOUNT_MISMATCH", exports2.StarsFormAmountMismatchError],
    ["STICKERSET_OWNER_ANONYMOUS", exports2.StickersetOwnerAnonymousError],
    ["TRANSLATIONS_DISABLED", exports2.TranslationsDisabledError],
    ["UPDATE_APP_TO_LOGIN", exports2.UpdateAppToLoginError],
    ["USERPIC_PRIVACY_REQUIRED", exports2.UserpicPrivacyRequiredError],
    ["AUTH_KEY_DUPLICATED", exports2.AuthKeyDuplicatedError],
    ["FROZEN_METHOD_INVALID", exports2.FrozenMethodInvalidError],
    ["AICOMPOSE_TIMEOUT", exports2.AicomposeTimeoutError],
    ["AUTH_KEY_UNSYNCHRONIZED", exports2.AuthKeyUnsynchronizedError],
    ["AUTH_RESTART", AuthRestartError],
    ["CDN_UPLOAD_TIMEOUT", exports2.CdnUploadTimeoutError],
    ["CHAT_ID_GENERATE_FAILED", exports2.ChatIdGenerateFailedError],
    ["OAUTH_REQUEST_INVALID", exports2.OauthRequestInvalidError],
    ["PERSISTENT_TIMESTAMP_OUTDATED", exports2.PersistentTimestampOutdatedError],
    ["SEND_MEDIA_INVALID", exports2.SendMediaInvalidError],
    ["SIGN_IN_FAILED", exports2.SignInFailedError],
    ["TRANSLATE_REQ_FAILED", exports2.TranslateReqFailedError],
    ["TRANSLATION_TIMEOUT", exports2.TranslationTimeoutError],
    ["Timeout", TimeoutError],
    ["MSG_WAIT_TIMEOUT", exports2.MsgWaitTimeoutError],
    ["ANONYMOUS_REACTIONS_DISABLED", exports2.AnonymousReactionsDisabledError]
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
