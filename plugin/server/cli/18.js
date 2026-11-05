  stories: '{"stories.ActivateStealthMode":{"d":"Activates stories stealth mode, see here » for more info.","p":{"flags":"Flags, see TL conditional fields","past":"Whether to erase views from any stories opened in the past stories_stealth_past_period seconds », as specified by the client configuration.","future":"Whether to hide future story views for the next stories_stealth_future_period seconds », as specified by the client configuration."},"e":[["400","PREMIUM_ACCOUNT_REQUIRED","A premium account is required to execute this action."]]},"stories.CanSendStory":{"d":"Check whether we can post stories as the specified peer.","p":{"peer":"The peer from which we wish to post stories."},"e":[["400","BOOSTS_REQUIRED","The specified channel must first be boosted by its users in order to perform this action."],["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHAT_ADMIN_REQUIRED","You must be an admin in this chat to do this."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.CreateAlbum":{"d":"Creates a story album.","p":{"peer":"The owned peer where to create the album.","title":"Album name.","stories":"Stories to add to the album."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.DeleteAlbum":{"d":"Delete a story album.","p":{"peer":"Owned peer where the album is located.","albumid":"ID of the album to delete."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.DeleteStories":{"d":"Deletes some posted stories.","p":{"peer":"Channel/user from where to delete stories.","id":"IDs of stories to delete."},"e":[["403","BOT_ACCESS_FORBIDDEN","The specified method can be used over a business connection for some operations, but the…"],["400","BUSINESS_CONNECTION_INVALID","The connection_id passed to the wrapping invokeWithBusinessConnection call is invalid."],["400","CHANNEL_INVALID","The provided channel is invalid."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.EditStory":{"d":"Edit an uploaded story","p":{"flags":"Flags, see TL conditional fields","peer":"Peer where the story was posted.","id":"ID of story to edit.","media":"If specified, replaces the story media.","mediaareas":"Media areas associated to the story, see here » for more info.","caption":"If specified, replaces the story caption.","entities":"Message entities for styled text in the caption, if allowed by the stories_entities client configuration parameter ».","privacyrules":"If specified, alters the privacy settings » of the story, changing who can or can\'t view the story.","music":"If set, the new audio track to play as background music for the story."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_NOT_MODIFIED","The new story information you passed is equal to the previous story information, thus it…"]]},"stories.ExportStoryLink":{"d":"Generate a story deep link for a specific story","p":{"peer":"Peer where the story was posted","id":"Story ID"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_ID_EMPTY","You specified no story IDs."],["400","USER_PUBLIC_MISSING","Cannot generate a link to stories posted by a peer without a username."]]},"stories.GetAlbumStories":{"d":"Get stories in a story album ».","p":{"peer":"Peer where the album is posted.","albumid":"ID of the album.","offset":"Offset for pagination.","limit":"Maximum number of results to return, see pagination"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.GetAlbums":{"d":"Get story albums created by a peer.","p":{"peer":"The peer.","hash":"The hash from a previously returned stories.albums, to avoid returning any results if they haven\'t changed."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.GetAllReadPeerStories":{"d":"Obtain the latest read story ID for all peers when first logging in, returned as a list of updateReadStories updates, see here » for more info."},"stories.GetAllStories":{"d":"Fetch the List of active (or active and hidden) stories, see here » for more info on watching stories.","p":{"flags":"Flags, see TL conditional fields","next":"If next and state are both set, uses the passed state to paginate to the next results; if neither state nor next are set, fetches the initial page;…","hidden":"If set, fetches the hidden active story list, otherwise fetches the active story list, see here » for more info on the full flow.","state":"If next and state are both set, uses the passed state to paginate to the next results; if neither state nor next are set, fetches the initial page;…"}},"stories.GetChatsToSend":{"d":"Obtain a list of channels where the user can post stories"},"stories.GetPeerMaxIDs":{"d":"Get compact active story summaries » for a set of peers.","p":{"id":"Peers whose active story summaries » should be fetched."}},"stories.GetPeerStories":{"d":"Fetch the full active story list of a specific peer.","p":{"peer":"Peer whose stories should be fetched"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven\'t joined this channel/supergroup."],["400","MSG_ID_INVALID","Invalid message ID provided."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.GetPinnedStories":{"d":"Fetch the stories pinned on a peer\'s profile.","p":{"peer":"Peer whose pinned stories should be fetched","offsetid":"Offsets for pagination, for more info click here","limit":"Maximum number of results to return, see pagination"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","USER_ID_INVALID","The provided user ID is invalid."]]},"stories.GetStoriesArchive":{"d":"Fetch the story archive » of a peer we control.","p":{"peer":"Peer whose archived stories should be fetched","offsetid":"Offsets for pagination, for more info click here","limit":"Maximum number of results to return, see pagination"},"e":[["400","CHAT_ADMIN_REQUIRED","You must be an admin in this chat to do this."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.GetStoriesByID":{"d":"Obtain full info about a set of stories by their IDs.","p":{"peer":"Peer where the stories were posted","id":"Story IDs"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven\'t joined this channel/supergroup."],["400","MSG_ID_INVALID","Invalid message ID provided."],["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.GetStoriesViews":{"d":"Obtain info about the view count, forward count, reactions and recent viewers of one or more stories.","p":{"peer":"Peer whose stories should be fetched","id":"Story IDs"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven\'t joined this channel/supergroup."],["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_ID_EMPTY","You specified no story IDs."]]},"stories.GetStoryReactionsList":{"d":"Get the reaction and interaction list of a story posted to a channel, along with the sender of each reaction.","p":{"flags":"Flags, see TL conditional fields","forwardsfirst":"If set, returns forwards and reposts first, then reactions, then other views; otherwise returns interactions sorted just by interaction date.","peer":"Channel","id":"Story ID","reaction":"Get only reactions of this type","offset":"Offset for pagination (taken from the next_offset field of the returned stories.StoryReactionsList); empty in the first request.","limit":"Maximum number of results to return, see pagination"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.GetStoryViewsList":{"d":"Obtain the list of users that have viewed a specific story we posted","p":{"flags":"Flags, see TL conditional fields","justcontacts":"Whether to only fetch view reaction/views made by our contacts","reactionsfirst":"Whether to return storyView info about users that reacted to the story (i.e. if set, the server will first sort results by view date as usual, and…","forwardsfirst":"If set, returns forwards and reposts first, then reactions, then other views; otherwise returns interactions sorted just by interaction date.","peer":"Peer where the story was posted","q":"Search for specific peers","id":"Story ID","offset":"Offset for pagination, obtained from stories.storyViewsList.next_offset","limit":"Maximum number of results to return, see pagination"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_ID_INVALID","The specified story ID is invalid."]]},"stories.IncrementStoryViews":{"d":"Increment the view counter of one or more stories.","p":{"peer":"Peer where the stories were posted.","id":"IDs of the stories (maximum 200 at a time)."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_ID_EMPTY","You specified no story IDs."]]},"stories.ReadStories":{"d":"Mark all stories up to a certain ID as read, for a given peer; will emit an updateReadStories update to all logged-in sessions.","p":{"peer":"The peer whose stories should be marked as read.","maxid":"Mark all stories up to and including this ID as read"},"e":[["400","MAX_ID_INVALID","The provided max ID is invalid."],["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORIES_NEVER_CREATED","This peer hasn\'t ever posted any stories."]]},"stories.ReorderAlbums":{"d":"Reorder story albums on a profile ».","p":{"peer":"Peer where the albums are located.","order":"New order of the albums."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.Report":{"d":"Report a story.","p":{"peer":"The peer that uploaded the story.","id":"IDs of the stories to report.","option":"Menu option, intially empty","message":"Comment for report moderation"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.SearchPosts":{"d":"Globally search for stories using a hashtag or a location media area, see here » for more info on the full flow.","p":{"flags":"Flags, see TL conditional fields","hashtag":"Hashtag (without the #)","area":"A mediaAreaGeoPoint or a mediaAreaVenue. Note mediaAreaGeoPoint areas may be searched only if they have an associated address.","peer":"If set, returns only stories posted by this peer.","offset":"Offset for pagination: initially an empty string, then the next_offset from the previously returned stories.foundStories.","limit":"Maximum number of results to return, see pagination"},"e":[["400","HASHTAG_INVALID","The specified hashtag is invalid."]]},"stories.SendReaction":{"d":"React to a story.","p":{"flags":"Flags, see TL conditional fields","addtorecent":"Whether to add this reaction to the recent reactions list ».","peer":"The peer that sent the story","storyid":"ID of the story to react to","reaction":"Reaction"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","REACTION_INVALID","The specified reaction is invalid."],["400","STORIES_NEVER_CREATED","This peer hasn\'t ever posted any stories."],["400","STORY_ID_EMPTY","You specified no story IDs."]]},"stories.SendStory":{"d":"Uploads a Telegram Story.","p":{"flags":"Flags, see TL conditional fields","pinned":"Whether to add the story to the profile automatically upon expiration. If not set, the story will only be added to the archive, see here » for more…","noforwards":"If set, disables forwards, screenshots, and downloads.","fwdmodified":"Set this flag when reposting stories with fwd_from_id+fwd_from_story, if the media was modified before reposting.","peer":"The peer to send the story as.","media":"The story media.","mediaareas":"Media areas associated to the story, see here » for more info.","caption":"Story caption.","entities":"Message entities for styled text, if allowed by the stories_entities client configuration parameter ».","privacyrules":"Privacy rules for the story, indicating who can or can\'t view the story.","randomid":"Unique client message ID required to prevent message resending. See here » for more info on random ID deduplication and updateMessageID mapping.","period":"Period after which the story is moved to archive (and to the profile if pinned is set), in seconds; must be one of 6 * 3600, 12 * 3600, 86400, or 2 *…","fwdfromid":"If set, indicates that this story is a repost of story with ID fwd_from_story posted by the peer in fwd_from_id.","fwdfromstory":"If set, indicates that this story is a repost of story with ID fwd_from_story posted by the peer in fwd_from_id.","albums":"If set, adds the story to the specified albums.","music":"If set, the audio track to play as background music for the story."},"e":[["400","BOOSTS_REQUIRED","The specified channel must first be boosted by its users in order to perform this action."],["403","BOT_ACCESS_FORBIDDEN","The specified method can be used over a business connection for some operations, but the…"],["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHAT_ADMIN_REQUIRED","You must be an admin in this chat to do this."]]},"stories.StartLive":{"d":"Start a live story, optionally using RTMP livestream mode, see here » for the full flow.","p":{"flags":"Flags, see TL conditional fields","pinned":"Whether to pin the live story on the peer\'s profile","noforwards":"Whether viewers must be prevented from forwarding or saving the live story","rtmpstream":"Create the live story in RTMP livestream mode », where one external streamer publishes all audio and video","peer":"User, supergroup or channel that will own the live story; basic groups cannot post live stories","caption":"Live story caption","entities":"Message entities for styled text","privacyrules":"Privacy rules defining who can view the live story","randomid":"Client-generated random ID used to prevent duplicate live stories. See here » for more info on random ID deduplication and updateMessageID mapping.","messagesenabled":"Whether the in-call message overlay » should be enabled","sendpaidmessagesstars":"Minimum Telegram Stars donation required from users other than the live story owner for each comment; the owner may always comment without donating,…"},"e":[["400","CHANNEL_MONOFORUM_UNSUPPORTED","Monoforums do not support this feature."],["400","CHAT_ADMIN_REQUIRED","You must be an admin in this chat to do this."],["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_LIVE_ALREADY_%d","This peer already has an active live story, and its ID is equal to %d."]]},"stories.ToggleAllStoriesHidden":{"d":"Hide the active stories of a specific peer, preventing them from being displayed on the action bar on the homescreen.","p":{"hidden":"Whether to hide or unhide all active stories of the peer"}},"stories.TogglePeerStoriesHidden":{"d":"Hide the active stories of a user, preventing them from being displayed on the action bar on the homescreen, see here » for more info.","p":{"peer":"Peer whose stories should be (un)hidden.","hidden":"Whether to hide or unhide stories."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.TogglePinned":{"d":"Pin or unpin one or more stories","p":{"peer":"Peer where to pin or unpin stories","id":"IDs of stories to pin or unpin","pinned":"Whether to pin or unpin the stories"},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]},"stories.TogglePinnedToTop":{"d":"Pin some stories to the top of the profile, see here » for more info.","p":{"peer":"Peer where to pin stories.","id":"IDs of the stories to pin (max stories_pinned_to_top_count_max)."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."],["400","STORY_ID_INVALID","The specified story ID is invalid."]]},"stories.UpdateAlbum":{"d":"Rename a story albums », or add, delete or reorder stories in it.","p":{"flags":"Flags, see TL conditional fields","peer":"Peer where the album is posted.","albumid":"Album ID.","title":"New album title.","deletestories":"If set, deletes the specified stories from the album.","addstories":"If set, adds the specified stories to the album.","order":"If set, reorders the stories in the album by their IDs."},"e":[["400","PEER_ID_INVALID","The provided peer id is invalid."]]}}',
  updates: `{"updates.GetChannelDifference":{"d":"Returns the difference between the current state of updates of a certain channel and transmitted.","p":{"flags":"Flags, see TL conditional fields","force":"Set to true to skip some possibly unneeded updates and reduce server-side load","channel":"The channel","filter":"Messsage filter","pts":"Persistent timestamp (see updates)","limit":"How many updates to fetch, max 100000Ordinary (non-bot) users are supposed to pass 10-100"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["406","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["403","CHANNEL_PUBLIC_GROUP_NA","channel/supergroup not available."],["400","CHAT_NOT_MODIFIED","No changes were made to chat information because the new information you passed is…"]]},"updates.GetDifference":{"d":"Get new updates.","p":{"flags":"Flags, see TL conditional fields","pts":"PTS, see updates.","ptslimit":"PTS limit","ptstotallimit":"For fast updating: if provided and pts + pts_total_limit < remote pts, updates.differenceTooLong will be returned.Simply tells the server to not…","date":"date, see updates.","qts":"QTS, see updates.","qtslimit":"QTS limit"},"e":[["400","CDN_METHOD_INVALID","You can't call this method in a CDN DC."],["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["400","CHAT_NOT_MODIFIED","No changes were made to chat information because the new information you passed is…"]]},"updates.GetState":{"d":"Returns a current state of updates."}}`,
  upload: `{"upload.GetCdnFile":{"d":"Download a CDN file.","p":{"filetoken":"File token","offset":"Offset of chunk to download","limit":"Length of chunk to download"},"e":[["400","FILE_TOKEN_INVALID","The master DC did not accept the file_token (e.g., the token has expired)."],["404","METHOD_INVALID","The specified method is invalid."]]},"upload.GetCdnFileHashes":{"d":"Get SHA256 hashes for verifying downloaded CDN files","p":{"filetoken":"File","offset":"Offset from which to start getting hashes"},"e":[["400","CDN_METHOD_INVALID","You can't call this method in a CDN DC."],["400","FILE_TOKEN_INVALID","The master DC did not accept the file_token (e.g., the token has expired)."],["400","RSA_DECRYPT_FAILED","Internal RSA decryption failed."]]},"upload.GetFile":{"d":"Returns content of a whole file or its part.","p":{"flags":"Flags, see TL conditional fields","precise":"Disable some checks on limit and offset values, useful for example to stream videos by keyframes","cdnsupported":"Whether the current client supports CDN downloads","location":"File location","offset":"Number of bytes to be skipped","limit":"Number of bytes to be returned"},"e":[["400","CDN_METHOD_INVALID","You can't call this method in a CDN DC."],["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["406","FILEREF_UPGRADE_NEEDED","The client has to be updated in order to support file references."]]},"upload.GetFileHashes":{"d":"Get SHA256 hashes for verifying downloaded files","p":{"location":"File","offset":"Offset from which to get file hashes"},"e":[["400","LOCATION_INVALID","The provided location is invalid."]]},"upload.GetWebFile":{"d":"Returns content of a web file, by proxying the request through telegram, see the webfile docs for more info.","p":{"location":"The file to download","offset":"Number of bytes to be skipped","limit":"Number of bytes to be returned"},"e":[["400","DOCUMENT_INVALID","The specified document is invalid."],["400","LOCATION_INVALID","The provided location is invalid."]]},"upload.ReuploadCdnFile":{"d":"Request a reupload of a certain file to a CDN DC.","p":{"filetoken":"File token","requesttoken":"Request token"},"e":[["400","CDN_METHOD_INVALID","You can't call this method in a CDN DC."],["500","CDN_UPLOAD_TIMEOUT","A server-side timeout occurred while reuploading the file to the CDN DC."],["400","FILE_TOKEN_INVALID","The master DC did not accept the file_token (e.g., the token has expired)."],["400","LOCATION_INVALID","The provided location is invalid."]]},"upload.SaveBigFilePart":{"d":"Saves a part of a large file (over 10 MB in size) to be later passed to one of the methods.","p":{"fileid":"Random file id, created by the client","filepart":"Part sequence number","filetotalparts":"Total number of parts","bytes":"Binary data, part contents"},"e":[["400","FILE_PARTS_INVALID","The number of file parts is invalid."],["400","FILE_PART_EMPTY","The provided file part is empty."],["400","FILE_PART_INVALID","The file part number is invalid."],["400","FILE_PART_SIZE_CHANGED","Provided file part size has changed."]]},"upload.SaveFilePart":{"d":"Saves a part of file for further sending to one of the methods.","p":{"fileid":"Random file identifier created by the client","filepart":"Numerical order of a part","bytes":"Binary data, content of a part"},"e":[["400","FILE_PART_EMPTY","The provided file part is empty."],["400","FILE_PART_INVALID","The file part number is invalid."],["400","MSG_ID_INVALID","Invalid message ID provided."]]}}`,
  users: `{"users.GetFullUser":{"d":"Returns extended user info by ID.","p":{"id":"User ID"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["400","MSG_ID_INVALID","Invalid message ID provided."],["400","USERNAME_OCCUPIED","The provided username is already occupied."]]},"users.GetRequirementsToContact":{"d":"Check whether we can write to the specified users, used to implement bulk checks for Premium-only messages » and paid messages ».","p":{"id":"Users to check."}},"users.GetSavedMusic":{"d":"Get songs pinned to the user's profile, see here » for more info.","p":{"id":"The ID of the user.","offset":"Offset for pagination.","limit":"Maximum number of results to return, see pagination","hash":"Hash » of the IDs of previously added songs, to avoid returning any result if there was no change."},"e":[["400","USER_ID_INVALID","The provided user ID is invalid."]]},"users.GetSavedMusicByID":{"d":"Check if the passed songs are still pinned to the user's profile, or refresh the file references of songs pinned on a user's profile see here » for more info.","p":{"id":"The ID of the user.","documents":"The songs (here, file_reference can be empty to refresh file references)."},"e":[["400","USER_ID_INVALID","The provided user ID is invalid."]]},"users.GetUsers":{"d":"Returns basic user info according to their identifiers.","p":{"id":"List of user identifiers"},"e":[["400","CHANNEL_INVALID","The provided channel is invalid."],["400","CHANNEL_MONOFORUM_UNSUPPORTED","Monoforums do not support this feature."],["400","CHANNEL_PRIVATE","You haven't joined this channel/supergroup."],["400","FROM_MESSAGE_BOT_DISABLED","Bots can't use fromMessage min constructors."]]},"users.SetSecureValueErrors":{"d":"Notify the user that the sent passport data contains some errors The user will not be able to re-submit their Passport data to you until the errors are fixed (the contents of the field for which you returned the error must change).","p":{"id":"The user","errors":"Errors"},"e":[["400","DATA_HASH_SIZE_INVALID","The size of the specified secureValueErrorData.data_hash is invalid."],["400","HASH_SIZE_INVALID","The size of the specified secureValueError.hash is invalid."],["400","USER_BOT_REQUIRED","This method can only be called by a bot."],["400","USER_ID_INVALID","The provided user ID is invalid."]]},"users.SuggestBirthday":{"d":"Suggest a birthday to another user, see here » for more info on birthdays in the API.","p":{"id":"The user that will receive the suggested birthday date.","birthday":"The birthday to suggest."},"e":[["400","BIRTHDAY_ALREADY","The target user already has a birthday set."],["400","USER_ID_INVALID","The provided user ID is invalid."]]}}`
};

// src/tl-docs.ts
var cache = new Map;
var namespaceOf = (className) => {
  const i = className.indexOf(".");
  return i < 0 ? "" : className.slice(0, i);
};
function namespaceDocs(ns) {
  let parsed = cache.get(ns);
  if (!parsed) {
    parsed = TL_DOCS[ns] ? JSON.parse(TL_DOCS[ns]) : {};
    cache.set(ns, parsed);
  }
  return parsed;
}
function methodDoc(className) {
  return namespaceDocs(namespaceOf(className))[className];
}
var normParam = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
function paramDoc(className, paramName) {
  return methodDoc(className)?.p?.[normParam(paramName)];
}
function docsUrl(className) {
  const i = className.indexOf(".");
  const name = i < 0 ? className : className.slice(i + 1);
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const path2 = i < 0 ? lower : `${className.slice(0, i)}.${lower}`;
  return `https://core.telegram.org/method/${path2}`;
}

// src/commands/generated.ts
var defByClassName = new Map;
for (const d of import_api_definitions.default) {
  if (!d.isFunction)
    continue;
  defByClassName.set(d.namespace ? `${d.namespace}.${d.name}` : d.name, d);
}
var PEER_TYPES = new Set(["InputPeer", "InputUser", "InputChannel"]);
var CURSOR_NAMES = new Set([
  "offsetId",
  "offsetDate",
  "addOffset",
  "offsetRate",
  "offsetTopic",
  "offset",
  "maxId",
  "minId",
  "maxDate",
  "minDate",
  "hash"
]);
function isCursorDefault(p) {
  return !p.optional && !p.isVector && (p.type === "int" || p.type === "long") && CURSOR_NAMES.has(p.name);
}
function paramsOf(className) {
  const d = defByClassName.get(className);
  if (!d)
    return [];
  const out = [];
  for (const [name, a] of Object.entries(d.argsConfig)) {
    if (a.flagIndicator)
      continue;
    const type = a.type ?? "X";
    out.push({ name, kebab: kebabCase(name), type, isVector: a.isVector, optional: a.isFlag, trueFlag: type === "true" });
  }
  return out;
}
function access(className) {
  const reason = apiRefusalReason(className);
  if (reason)
    return { kind: "refused", reason };
  return { kind: isApiReadMethod(className) ? "read" : "write" };
}
function returnType(className) {
  return defByClassName.get(className)?.result ?? "";
}
function paramState(p) {
  return isCursorDefault(p) ? "default 0" : p.optional ? "optional" : "required";
}
function optionFor(p, className) {
  const desc = paramDoc(className, p.name);
  const tag = `${p.type}${p.isVector ? "[]" : ""}, ${paramState(p)}${desc ? ` — ${desc}` : ""}`;
  if (p.trueFlag) {
    const o = new Option(`--${p.kebab}`, tag);
    o.negate = false;
    return o;
  }
  return new Option(`--${p.kebab} <value>`, tag);
}
function examplePlaceholder(p) {
  if (PEER_TYPES.has(p.type))
    return "@username";
  if (p.isVector)
    return p.type === "string" ? "a,b" : "1,2";
  switch (p.type) {
    case "int":
    case "double":
      return p.name === "limit" ? "20" : "1";
    case "long":
    case "int128":
    case "int256":
      return "0";
    case "Bool":
      return "true";
    case "string":
      return p.name.toLowerCase().includes("url") ? "https://example.com" : "text";
    case "bytes":
      return "aGVsbG8=";
    default:
      return "'{…}'";
  }
}
function exampleInvocation(nsKebab, methodKebab, className) {
  const parts = [`telegram ${nsKebab ? `${nsKebab} ` : ""}${methodKebab}`];
  for (const p of paramsOf(className)) {
    const include = !p.optional && !p.trueFlag && p.name !== "randomId" && !isCursorDefault(p) || p.name === "limit";
    if (include)
      parts.push(`--${p.kebab} ${examplePlaceholder(p)}`);
  }
  return parts.join(" ");
}
var ACCESS_NOTE = {
  read: "read — runs without write access (telegram_read over MCP)",
  write: "write — needs `telegram write-access on` (telegram_write over MCP)",
  refused: "refused — always refused"
};
function leafHelpText(nsKebab, methodKebab, className) {
  const doc = methodDoc(className);
  const acc = access(className);
  const lines = [""];
  lines.push(`Access: ${acc.kind === "refused" ? `refused — ${acc.reason}` : ACCESS_NOTE[acc.kind]}`);
  const rt = returnType(className);
  if (rt)
    lines.push(`Returns: ${rt} (raw TL object, JSON)`);
  lines.push("");
  lines.push("Example:");
  lines.push(`  ${exampleInvocation(nsKebab, methodKebab, className)}`);
  lines.push("");
  lines.push('Peer/user/channel flags take an ID, @username, "me" or a chat title. Bytes: base64 or "hex:…".');
  lines.push('Vectors: a comma list or JSON array. Constructor flags and --json-params take JSON ({"_chat":"@x"}).');
  if (doc?.e?.length) {
    lines.push("", "Common errors:");
    for (const [code, name, msg] of doc.e)
      lines.push(`  ${name}${code ? ` (${code})` : ""}${msg ? ` — ${msg}` : ""}`);
  }
  lines.push("", "FLOOD_WAIT_X means wait X seconds and retry. Full docs: " + docsUrl(className));
  return lines.join(`
`);
}
function coerceScalar(p, raw) {
  if (PEER_TYPES.has(p.type))
    return typeof raw === "string" ? { _chat: raw } : raw;
  switch (p.type) {
    case "int":
    case "double": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n))
        throw new Error(`--${p.kebab} expects a number`);
      return n;
    }
    case "long":
    case "int128":
    case "int256":
      return { _bigint: String(raw) };
    case "Bool": {
      if (typeof raw === "boolean")
        return raw;
      const s = String(raw).toLowerCase();
      if (s === "true" || s === "1")
        return true;
      if (s === "false" || s === "0")
        return false;
      throw new Error(`--${p.kebab} expects true or false`);
    }
    case "string":
      return String(raw);
    case "bytes": {
      const s = String(raw);
      if (s.startsWith("hex:"))
        return { _hex: s.slice(4) };
      if (s.startsWith("base64:"))
        return { _base64: s.slice(7) };
      return { _base64: s };
    }
    default:
      if (typeof raw !== "string")
        return raw;
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`--${p.kebab} (${p.type}) expects a JSON value, e.g. '{"_chat":"@x"}' or '{"className":"…"}'`);
      }
  }
}
function coerce(p, raw) {
  if (!p.isVector)
    return coerceScalar(p, raw);
  const list = raw.trim().startsWith("[") ? JSON.parse(raw) : raw.split(",").map((s) => s.trim()).filter((s) => s.length);
  if (!Array.isArray(list))
    throw new Error(`--${p.kebab} must be a JSON array or a comma-separated list`);
  return list.map((v) => coerceScalar(p, v));
}
function baseJsonParams(opts) {
  const jp = opts.jsonParams;
  if (jp === undefined)
    return {};
  const raw = jp === "-" ? readStdinOnce() : String(jp);
  if (!raw.trim())
    return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid --json-params JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("--json-params must be a JSON object");
  }
  return parsed;
}
function buildParams(className, opts) {
  const params = baseJsonParams(opts);
  const missing = [];
  for (const p of paramsOf(className)) {
    const v = opts[p.name];
    if (p.trueFlag) {
      if (v === true)
        params[p.name] = true;
    } else if (v !== undefined) {
      params[p.name] = coerce(p, String(v));
    } else if (isCursorDefault(p) && !(p.name in params)) {
      params[p.name] = coerceScalar(p, "0");
    }
    if (!p.optional && !p.trueFlag && p.name !== "randomId" && !isCursorDefault(p) && !(p.name in params)) {
      missing.push(`--${p.kebab}`);
    }
  }
  if (missing.length) {
    throw new Error(`Missing required option(s): ${missing.join(", ")} (or supply them via --json-params).`);
  }
  return params;
}
function listDescription(className) {
  const mark = `[${access(className).kind}]`;
  const d = methodDoc(className)?.d ?? "";
  const short = d.length > 66 ? d.slice(0, 65).replace(/\s+\S*$/, "") + "…" : d;
  return `${mark} ${short}`.trim();
}
function buildLeaf(nsKebab, methodKebab, className, withFlags) {
  const refusal = apiRefusalReason(className);
  const leaf = new Command(methodKebab).description(listDescription(className));
  if (!withFlags) {
    leaf.allowUnknownOption(true).allowExcessArguments(true).action(() => leaf.help());
    return leaf;
  }
  leaf.description(`[${access(className).kind}] ${methodDoc(className)?.d ?? ""}`.trim());
  for (const p of paramsOf(className))
    leaf.addOption(optionFor(p, className));
  leaf.option("--json-params <json>", 'Extra params as a JSON object ("-" reads JSON from stdin); typed flags override it');
  leaf.option("--json", "Accepted for consistency; API output is always JSON");
  leaf.option("--write", "Acknowledge this is a write (optional; writes still need write access)");
  leaf.addHelpText("after", () => leafHelpText(nsKebab, methodKebab, className));
  const auditCommand = nsKebab ? `${nsKebab} ${methodKebab}` : methodKebab;
  leaf.action(async (opts) => {
    if (refusal) {
      console.error(colors_default.red(refusal));
      process.exit(1);
      return;
    }
    let params;
    try {
      params = buildParams(className, opts);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
      return;
    }
    await runApiMethod(className, params, { auditCommand });
  });
  return leaf;
}
function buildNamespaceGroup(nsKebab, focusMethod) {
  const methods = namespaceMethodList(nsKebab);
  const group = new Command(nsKebab).description(`${nsKebab}.* — ${methods.length} TL API methods`);
  for (const [, methodKebab, className] of methods) {
    group.addCommand(buildLeaf(nsKebab, methodKebab, className, methodKebab === focusMethod));
  }
  group.action(() => group.help());
  return group;
}
function wrapNamespaceList() {
  const tokens = namespaceCounts().map(({ ns, count }) => `${ns} ${count}`);
  const lines = [];
  let line = " ";
  for (const t of tokens) {
    if ((line + " " + t).length > 92) {
      lines.push(line);
      line = " ";
    }
    line += " " + t;
  }
  if (line.trim())
    lines.push(line);
  return lines;
}
function generatedSummaryLines() {
  return [
    "Telegram API — a dedicated command for every TL method (telegram <namespace> <method>):",
    ...wrapNamespaceList(),
    "Drill down: `telegram <namespace> --help` lists a namespace's methods (each marked",
    "  [read]/[write]/[refused] with a one-line description); `telegram <namespace> <method> --help`",
    "  shows params, an example and the docs link. `telegram schema [<ns>|<ns> <method>]` prints JSON.",
    `  Root-level API methods are top-level commands too (e.g. ${rootMethods().slice(0, 3).map((m) => m[1]).join(", ")}, … — ${rootMethods().length}).`
  ];
}
function clashPointer(ns) {
  const lines = [
    "",
    `Generated API methods (telegram ${ns} <method>, picked only on an exact method name):`
  ];
  for (const [, methodKebab, className] of namespaceMethodList(ns)) {
    lines.push(`  ${methodKebab}  ${listDescription(className)}`);
  }
  lines.push(`Run \`telegram ${ns} <method> --help\` for a method's flags, access and docs link.`);
  return lines.join(`
`);
}
function methodSchema(nsKebab, methodKebab, className) {
  const acc = access(className);
  return {
    command: `${nsKebab ? `${nsKebab} ` : ""}${methodKebab}`,
    className,
    access: acc.kind,
    ...acc.reason ? { refusedReason: acc.reason } : {},
    returns: returnType(className),
    description: methodDoc(className)?.d ?? "",
    docsUrl: docsUrl(className),
    params: paramsOf(className).map((p) => ({
      flag: `--${p.kebab}`,
      name: p.name,
      type: `${p.type}${p.isVector ? "[]" : ""}`,
      required: !p.optional && !p.trueFlag && !isCursorDefault(p) && p.name !== "randomId",
      ...isCursorDefault(p) ? { default: "0" } : {},
      ...paramDoc(className, p.name) ? { description: paramDoc(className, p.name) } : {}
    })),
    example: exampleInvocation(nsKebab, methodKebab, className)
  };
}
function namespaceSchema(nsKebab) {
  return namespaceMethodList(nsKebab).map(([, methodKebab, className]) => ({
    command: `${nsKebab} ${methodKebab}`,
    className,
    access: access(className).kind,
    description: methodDoc(className)?.d ?? ""
  }));
}
function allNamespacesSchema() {
  return {
    namespaces: namespaceCounts().map(({ ns, count }) => ({ namespace: ns, methods: count })),
    rootMethods: rootMethods().map((m) => m[1])
  };
}
function buildHelpCommand(program2) {
  const help = new Command("help").description("Show help for a command or namespace, or run a help.* API method (e.g. help get-config)").argument("[topic]", "command name, namespace, or help.* method").allowUnknownOption(true).action((topic) => {
    if (!topic) {
      program2.outputHelp();
      return;
    }
    const curated = program2.commands.find((c) => c.name() === topic);
    if (curated) {
      curated.outputHelp();
      return;
    }
    if (isGeneratedNamespace(topic)) {
      buildNamespaceGroup(topic).outputHelp();
      return;
    }
    const rootClass = rootMethodClassName(topic);
    if (rootClass) {
      buildLeaf("", topic, rootClass, true).outputHelp();
      return;
    }
    console.error(`Unknown help topic "${topic}". Run "telegram --help" or "telegram help-all".`);
    process.exit(1);
  });
  return help;
}
function registerGeneratedCommands(program2, argv) {
  program2.addHelpText("after", () => `
` + generatedSummaryLines().join(`
`));
  for (const { ns } of namespaceCounts()) {
    const curated = program2.commands.find((c) => c.name() === ns);
    if (curated)
      curated.addHelpText("after", () => clashPointer(ns));
  }
  const cmd = argv[2];
  if (!cmd || cmd.startsWith("-"))
    return;
  const next = argv[3];
  const method = next && !next.startsWith("-") ? next : undefined;
  if (isGeneratedNamespace(cmd)) {
    const curated = program2.commands.find((c) => c.name() === cmd);
    if (curated) {
      if (method) {
        const className = methodClassName(cmd, method);
        if (className)
          curated.addCommand(buildLeaf(cmd, method, className, true));
      }
    } else {
      program2.addCommand(buildNamespaceGroup(cmd, method));
    }
    return;
  }
  const rootClass = rootMethodClassName(cmd);
  if (rootClass)
    program2.addCommand(buildLeaf("", cmd, rootClass, true));
}
// src/commands/schema.ts
var schemaCommand = new Command("schema").description("Print JSON describing the generated API commands (namespaces, methods, params, access)").argument("[target...]", "a namespace, a namespace + method, or a <namespace>.<Method> / root method").addHelpText("after", [
  "",
  "Examples:",
  "  telegram schema                       list namespaces + root methods",
  "  telegram schema messages              list a namespace's methods (access + description)",
  "  telegram schema messages get-history  full schema for one method (params, example, docs)",
  "  telegram schema ping                  a root-level method"
].join(`
`)).action((target) => {
  const out = (obj) => console.log(JSON.stringify(obj, null, 2));
  const fail2 = (msg) => {
    console.error(msg);
    process.exit(1);
  };
  if (target.length === 0)
    return out(allNamespacesSchema());
  let ns, methodToken;
  if (target.length === 1 && target[0].includes(".")) {
    const dot = target[0].indexOf(".");
    ns = target[0].slice(0, dot);
    methodToken = target[0].slice(dot + 1);
  } else {
    [ns, methodToken] = target;
  }
  if (methodToken === undefined) {
    if (isGeneratedNamespace(ns))
      return out(namespaceSchema(ns));
    const rootClass = rootMethodClassName(ns);
    if (rootClass)
      return out(methodSchema("", ns, rootClass));
    return fail2(`Unknown namespace or root method "${ns}". Run "telegram schema" for the list.`);
  }
  if (!isGeneratedNamespace(ns))
    return fail2(`Unknown namespace "${ns}". Run "telegram schema" for the list.`);
  const methodKebab = methodToken.includes("-") ? methodToken : kebabCase(methodToken);
  const className = methodClassName(ns, methodKebab);
  if (!className)
    return fail2(`Unknown method "${ns} ${methodKebab}". Run "telegram schema ${ns}" for its methods.`);
  return out(methodSchema(ns, methodKebab, className));
});
// src/index.ts
process.stdout.on("error", (err) => {
  if (err.code === "EPIPE")
    process.exit(0);
  throw err;
});
var program2 = new Command;
program2.name("tg").description("Fast Telegram CLI for reading, searching, and sending messages").version(VERSION);
program2.helpCommand(false);
program2.addCommand(authCommand);
program2.addCommand(onboardCommand);
program2.addCommand(logoutCommand);
program2.addCommand(checkCommand);
program2.addCommand(whoamiCommand);
program2.addCommand(chatsCommand);
program2.addCommand(readCommand);
program2.addCommand(getCommand);
program2.addCommand(infoCommand);
program2.addCommand(topicsCommand);
program2.addCommand(linkCommand);
program2.addCommand(contactsCommand);
program2.addCommand(searchCommand);
program2.addCommand(inboxCommand);
program2.addCommand(buttonsCommand);
program2.addCommand(pinnedCommand);
program2.addCommand(reactionsCommand);
program2.addCommand(storiesCommand);
program2.addCommand(avatarCommand);
program2.addCommand(inlineCommand);
program2.addCommand(watchCommand);
program2.addCommand(draftsCommand);
program2.addCommand(adminLogCommand);
program2.addCommand(profilePhotosCommand);
program2.addCommand(permissionsCommand);
program2.addCommand(statsCommand);
program2.addCommand(scheduledCommand);
program2.addCommand(sessionsCommand);
program2.addCommand(starsCommand);
program2.addCommand(invitesCommand);
program2.addCommand(contactCommand);
program2.addCommand(membersCommand);
program2.addCommand(adminsCommand);
program2.addCommand(groupsCommand);
program2.addCommand(kickCommand);
program2.addCommand(promoteCommand);
program2.addCommand(transferOwnerCommand);
program2.addCommand(muteCommand);
program2.addCommand(unmuteCommand);
program2.addCommand(foldersCommand);
program2.addCommand(folderCommand);
program2.addCommand(folderAddCommand);
program2.addCommand(folderRemoveCommand);
program2.addCommand(sendCommand);
program2.addCommand(replyCommand);
program2.addCommand(sendFileCommand);
program2.addCommand(clickCommand);
program2.addCommand(reactCommand);
program2.addCommand(forwardCommand);
program2.addCommand(pinCommand);
program2.addCommand(unpinCommand);
program2.addCommand(editCommand);
program2.addCommand(deleteCommand);
program2.addCommand(markReadCommand);
program2.addCommand(pollCommand);
program2.addCommand(voteCommand);
program2.addCommand(blockCommand);
program2.addCommand(unblockCommand);
program2.addCommand(addContactCommand);
program2.addCommand(delContactCommand);
program2.addCommand(joinCommand);
program2.addCommand(leaveCommand);
program2.addCommand(inviteLinkCommand);
program2.addCommand(archiveCommand);
program2.addCommand(unarchiveCommand);
program2.addCommand(createGroupCommand);
program2.addCommand(createChannelCommand);
program2.addCommand(editPermissionsCommand);
program2.addCommand(topicCommand);
program2.addCommand(pinChatCommand);
program2.addCommand(unpinChatCommand);
program2.addCommand(markUnreadCommand);
program2.addCommand(deleteDialogCommand);
program2.addCommand(typingCommand);
program2.addCommand(setNameCommand);
program2.addCommand(setBioCommand);
program2.addCommand(setUsernameCommand);
program2.addCommand(setAvatarCommand);
program2.addCommand(writeAccessCommand);
program2.addCommand(apiCommand);
program2.addCommand(schemaCommand);
program2.addCommand(syncCommand);
program2.addCommand(downloadCommand);
program2.addCommand(updateCommand);
program2.addCommand(skillCommand);
program2.command("mcp").description("Run as an MCP server over stdio, or over HTTP with --http (tools: telegram_help, telegram_read, telegram_write)").option("--http", "Serve MCP over HTTP (POST /mcp, bearer token) for remote hosts such as Grok Bot").option("--host <host>", "With --http: address to listen on", "127.0.0.1").option("--port <port>", "With --http: port to listen on", "8787").option("--read-only", "Serve only telegram_help and telegram_read, never telegram_write").option("--token", "Print the HTTP bearer token (created on first use, kept in the secret store)").option("--rotate-token", "Replace the HTTP bearer token; clients using the old one stop working").action((options) => {
  const commands = program2.commands.map((c) => c.name());
  if (options.token || options.rotateToken) {
    const token = mcpToken({ create: true, rotate: options.rotateToken });
    if (!token) {
      console.error(isSecretStoreAvailable() ? "Could not save the token in the secret store; the previous token, if any, is unchanged." : "No secret store for the token (macOS Keychain, Linux Secret Service, Windows DPAPI or 1Password).");
      process.exit(1);
    }
    console.log(token);
    return;
  }
  if (options.http) {
    const port = Number(options.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(`Invalid --port "${options.port}"`);
      process.exit(2);
    }
    startMcpHttpServer(commands, { host: options.host, port, readOnly: options.readOnly });
    return;
  }
  startMcpServer(commands, { readOnly: options.readOnly });
});
program2.command("help-all").description("Print every command with its arguments and flags (compact reference)").option("-g, --grep <text>", "Only commands whose name, description or flags mention this text").action((options) => {
  const needle = options.grep?.toLowerCase();
  const lines = [];
  const emit = (cmd, name) => {
    if (cmd.commands.length) {
      for (const sub of cmd.commands)
        emit(sub, `${name} ${sub.name()}`);
      return;
    }
    const desc = cmd.description();
    const haystack = [name, desc, ...cmd.options.map((o) => `${o.flags} ${o.description}`)].join(" ").toLowerCase();
    if (needle && !haystack.includes(needle))
      return;
    const args2 = cmd.registeredArguments.map((a) => a.required ? `<${a.name()}${a.variadic ? "..." : ""}>` : `[${a.name()}${a.variadic ? "..." : ""}]`).join(" ");
    lines.push(`${name}${args2 ? " " + args2 : ""} — ${desc}`);
    for (const opt of cmd.options) {
      if (opt.long === "--json" || opt.long === "--markdown")
        continue;
      const def = opt.defaultValue !== undefined && typeof opt.defaultValue !== "boolean" ? ` (default ${opt.defaultValue})` : "";
      lines.push(`  ${opt.flags} — ${opt.description}${def}`);
    }
  };
  for (const cmd of program2.commands) {
    if (cmd.name() !== "help-all")
      emit(cmd, cmd.name());
  }
  lines.push("", "Most read commands accept --json; --markdown where noted in `<cmd> --help`.");
  lines.push("", ...generatedSummaryLines());
  console.log(lines.join(`
`));
});
program2.addCommand(buildHelpCommand(program2));
var NOT_IN_MOCK = new Set(["auth", "onboard", "logout", "write-access", "update"]);
program2.hook("preAction", (_program, command) => {
  if (isMock() && NOT_IN_MOCK.has(command.name())) {
    console.error(`"${command.name()}" does nothing in mock mode (TG_MOCK is set): the fake account needs no login and its writes need no approval. Unset TG_MOCK to use a real account.`);
    process.exit(2);
  }
});
try {
  profile();
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (process.argv[2] === BACKGROUND_CHECK_COMMAND) {
  runBackgroundCheck();
} else {
  maybeNotifyUpdate();
  registerGeneratedCommands(program2, process.argv);
  if (import_node_worker_threads2.isMainThread) {
    program2.parse(process.argv, { from: "node" });
  } else {
    readWorkerStdin().then((text2) => {
      primeStdin(text2);
      return program2.parseAsync(process.argv, { from: "node" });
    }).then(() => process.exit(process.exitCode ?? 0), (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  }
}
function readWorkerStdin() {
  return new Promise((resolve4) => {
    let text2 = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      text2 += chunk;
    });
    process.stdin.on("end", () => resolve4(text2));
    process.stdin.on("error", () => resolve4(text2));
  });
}
