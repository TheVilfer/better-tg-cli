  function _toDate(value) {
    return value instanceof Date ? Math.floor(value.getTime() / 1000) : value;
  }
  async function exportChatInvite(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.ExportChatInvite({
      peer,
      title: params.title,
      expireDate: _toDate(params.expireDate),
      usageLimit: params.usageLimit,
      requestNeeded: params.requestNeeded,
      legacyRevokePermanent: params.legacyRevokePermanent,
      subscriptionPricing: params.subscriptionPricing
    }));
  }
  async function editExportedChatInvite(client, entity, link, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.EditExportedChatInvite({
      peer,
      link,
      revoked: params.revoked,
      expireDate: _toDate(params.expireDate),
      usageLimit: params.usageLimit,
      requestNeeded: params.requestNeeded,
      title: params.title
    }));
  }
  async function getExportedChatInvite(client, entity, link) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.getExportedChatInvite({
      peer,
      link
    });
  }
  async function deleteExportedChatInvite(client, entity, link) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.deleteExportedChatInvite({
      peer,
      link
    });
  }
  async function deleteRevokedExportedChatInvites(client, entity, admin) {
    const peer = await client.getInputEntity(entity);
    const adminId = admin ? await client.getInputEntity(admin) : new tl_1.Api.InputUserSelf;
    return client.invoke(new tl_1.Api.messages.DeleteRevokedExportedChatInvites({
      peer,
      adminId
    }));
  }
  async function getAdminsWithInvites(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.getAdminsWithInvites({ peer });
  }

  class _ExportedChatInvitesIter extends requestIter_1.RequestIter {
    async _init(params) {
      const peer = await this.client.getInputEntity(params.entity);
      const adminId = params.admin ? await this.client.getInputEntity(params.admin) : new tl_1.Api.InputUserSelf;
      this.request = new tl_1.Api.messages.GetExportedChatInvites({
        peer,
        adminId,
        revoked: params.revoked,
        limit: 0
      });
    }
    async _loadNextChunk() {
      if (!this.request) {
        return true;
      }
      this.request.limit = Math.min(this.left, _MAX_INVITES_CHUNK_SIZE);
      const result = await this.client.invoke(this.request);
      this.total = result.count;
      if (!result.invites.length) {
        return true;
      }
      for (const invite of result.invites) {
        this.buffer?.push(invite);
      }
      const last = result.invites[result.invites.length - 1];
      if (!(last instanceof tl_1.Api.ChatInviteExported)) {
        return true;
      }
      this.request.offsetDate = last.date;
      this.request.offsetLink = last.link;
      if (result.invites.length < this.request.limit) {
        return true;
      }
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
  }
  exports2._ExportedChatInvitesIter = _ExportedChatInvitesIter;
  function iterExportedChatInvites(client, entity, params = {}) {
    return new _ExportedChatInvitesIter(client, params.limit ?? Number.MAX_SAFE_INTEGER, {}, { entity, ...params });
  }
  async function getExportedChatInvites(client, entity, params = {}) {
    return await iterExportedChatInvites(client, entity, params).collect();
  }

  class _ChatInviteImportersIter extends requestIter_1.RequestIter {
    async _init(params) {
      const peer = await this.client.getInputEntity(params.entity);
      this.request = new tl_1.Api.messages.GetChatInviteImporters({
        peer,
        link: params.link,
        requested: params.requested,
        subscriptionExpired: params.subscriptionExpired,
        q: params.search,
        offsetDate: 0,
        offsetUser: new tl_1.Api.InputUserEmpty,
        limit: 0
      });
    }
    async _loadNextChunk() {
      if (!this.request) {
        return true;
      }
      this.request.limit = Math.min(this.left, _MAX_IMPORTERS_CHUNK_SIZE);
      const result = await this.client.invoke(this.request);
      this.total = result.count;
      if (!result.importers.length) {
        return true;
      }
      for (const importer of result.importers) {
        this.buffer?.push(importer);
      }
      const last = result.importers[result.importers.length - 1];
      this.request.offsetDate = last.date;
      this.request.offsetUser = await this.client.getInputEntity(last.userId);
      if (result.importers.length < this.request.limit) {
        return true;
      }
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
  }
  exports2._ChatInviteImportersIter = _ChatInviteImportersIter;
  function iterChatInviteImporters(client, entity, params = {}) {
    return new _ChatInviteImportersIter(client, params.limit ?? Number.MAX_SAFE_INTEGER, {}, { entity, ...params });
  }
  async function getChatInviteImporters(client, entity, params = {}) {
    return await iterChatInviteImporters(client, entity, params).collect();
  }
  async function hideChatJoinRequest(client, entity, user, params = {}) {
    const peer = await client.getInputEntity(entity);
    const userId = await client.getInputEntity(user);
    return client.invoke(new tl_1.Api.messages.HideChatJoinRequest({
      peer,
      userId,
      approved: params.approved
    }));
  }
  async function hideAllChatJoinRequests(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.HideAllChatJoinRequests({
      peer,
      approved: params.approved,
      link: params.link
    }));
  }
  async function checkChatInvite(client, link) {
    return client.api.messages.checkChatInvite({
      hash: _parseInviteHash(link)
    });
  }
});

// node_modules/teleproto/client/chats.js
var require_chats = __commonJS((exports2) => {
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
  exports2._AdminLogIter = exports2._ParticipantsIter = undefined;
  exports2.iterParticipants = iterParticipants;
  exports2.getParticipants = getParticipants;
  exports2.kickParticipant = kickParticipant;
  exports2.editBanned = editBanned;
  exports2.editAdmin = editAdmin;
  exports2.editChatDefaultBannedRights = editChatDefaultBannedRights;
  exports2.getParticipant = getParticipant;
  exports2.editTitle = editTitle;
  exports2.editPhoto = editPhoto;
  exports2.editChatAbout = editChatAbout;
  exports2.toggleSlowMode = toggleSlowMode;
  exports2.createChannel = createChannel;
  exports2.createChat = createChat;
  exports2.joinChannel = joinChannel;
  exports2.importChatInvite = importChatInvite;
  exports2.leaveChannel = leaveChannel;
  exports2.deleteHistory = deleteHistory;
  exports2.editPeerFolders = editPeerFolders;
  exports2.setTyping = setTyping;
  exports2.iterAdminLog = iterAdminLog;
  exports2.getAdminLog = getAdminLog;
  var uploads_1 = require_uploads();
  var inviteLinks_1 = require_inviteLinks();
  var Helpers_1 = require_Helpers();
  var requestIter_1 = require_requestIter();
  var helpers = __importStar(require_Helpers());
  var utils = __importStar(require_Utils());
  var tl_1 = require_tl();
  var big_integer_1 = __importDefault(require_BigInteger());
  var Utils_1 = require_Utils();
  var _MAX_PARTICIPANTS_CHUNK_SIZE = 200;
  var _MAX_ADMIN_LOG_CHUNK_SIZE = 100;

  class _ChatAction {
    static {
      this._str_mapping = {
        typing: new tl_1.Api.SendMessageTypingAction,
        contact: new tl_1.Api.SendMessageChooseContactAction,
        game: new tl_1.Api.SendMessageGamePlayAction,
        location: new tl_1.Api.SendMessageGeoLocationAction,
        "record-audio": new tl_1.Api.SendMessageRecordAudioAction,
        "record-voice": new tl_1.Api.SendMessageRecordAudioAction,
        "record-round": new tl_1.Api.SendMessageRecordRoundAction,
        "record-video": new tl_1.Api.SendMessageRecordVideoAction,
        audio: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
        voice: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
        song: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
        round: new tl_1.Api.SendMessageUploadRoundAction({ progress: 1 }),
        video: new tl_1.Api.SendMessageUploadVideoAction({ progress: 1 }),
        photo: new tl_1.Api.SendMessageUploadPhotoAction({ progress: 1 }),
        document: new tl_1.Api.SendMessageUploadDocumentAction({ progress: 1 }),
        file: new tl_1.Api.SendMessageUploadDocumentAction({ progress: 1 }),
        cancel: new tl_1.Api.SendMessageCancelAction
      };
    }
    constructor(client, chat, action, params = {
      delay: 4,
      autoCancel: true
    }) {
      this._client = client;
      this._chat = chat;
      this._action = action;
      this._delay = params.delay;
      this.autoCancel = params.autoCancel;
      this._request = undefined;
      this._task = null;
      this._running = false;
    }
    async start() {
      this._request = new tl_1.Api.messages.SetTyping({
        peer: this._chat,
        action: this._action
      });
      this._running = true;
      this._update();
    }
    async stop() {
      this._running = false;
      if (this.autoCancel) {
        await this._client.invoke(new tl_1.Api.messages.SetTyping({
          peer: this._chat,
          action: new tl_1.Api.SendMessageCancelAction
        }));
      }
    }
    async _update() {
      while (this._running) {
        if (this._request != null) {
          await this._client.invoke(this._request);
        }
        await (0, Helpers_1.sleep)(this._delay * 1000);
      }
    }
    progress(current, total) {
      if ("progress" in this._action) {
        this._action.progress = 100 * Math.round(current / total);
      }
    }
  }

  class _ParticipantsIter extends requestIter_1.RequestIter {
    async _init({ entity, filter, offset, search, showTotal }) {
      if (!offset) {
        offset = 0;
      }
      if (filter && filter.constructor === Function) {
        if ([
          tl_1.Api.ChannelParticipantsBanned,
          tl_1.Api.ChannelParticipantsKicked,
          tl_1.Api.ChannelParticipantsSearch,
          tl_1.Api.ChannelParticipantsContacts
        ].includes(filter)) {
          filter = new filter({
            q: ""
          });
        } else {
          filter = new filter;
        }
      }
      entity = await this.client.getInputEntity(entity);
      const ty = helpers._entityType(entity);
      if (search && (filter || ty != helpers._EntityType.CHANNEL)) {
        search = search.toLowerCase();
        this.filterEntity = (entity2) => {
          return utils.getDisplayName(entity2).toLowerCase().includes(search) || ("username" in entity2 ? entity2.username || "" : "").toLowerCase().includes(search);
        };
      } else {
        this.filterEntity = (entity2) => true;
      }
      this.request = undefined;
      if (ty == helpers._EntityType.CHANNEL) {
        if (showTotal) {
          const channel = await this.client.api.channels.getFullChannel({ channel: utils.getInputChannel(entity) });
          if (channel.fullChat instanceof tl_1.Api.ChannelFull) {
            this.total = channel.fullChat.participantsCount;
          }
        }
        if (this.total && this.total <= 0) {
          return false;
        }
        this.request = new tl_1.Api.channels.GetParticipants({
          channel: entity,
          filter: filter || new tl_1.Api.ChannelParticipantsSearch({
            q: search || ""
          }),
          offset,
          limit: _MAX_PARTICIPANTS_CHUNK_SIZE,
          hash: big_integer_1.default.zero
        });
      } else if (ty == helpers._EntityType.CHAT) {
        if (!("chatId" in entity)) {
          throw new Error("Found chat without id " + JSON.stringify(entity));
        }
        const full = await this.client.api.messages.getFullChat({
          chatId: entity.chatId
        });
        if (full.fullChat instanceof tl_1.Api.ChatFull) {
          if (!(full.fullChat.participants instanceof tl_1.Api.ChatParticipantsForbidden)) {
            this.total = full.fullChat.participants.participants.length;
          } else {
            this.total = 0;
            return false;
          }
          const users = new Map;
          for (const user of full.users) {
            users.set(user.id.toString(), user);
          }
          for (const participant of full.fullChat.participants.participants) {
            const user = users.get(participant.userId.toString());
            if (!user || !this.filterEntity(user)) {
              continue;
            }
            user.participant = participant;
            this.buffer?.push(user);
          }
          return true;
        }
      } else {
        this.total = 1;
        if (this.limit != 0) {
          const user = await this.client.getEntity(entity);
          if (this.filterEntity(user)) {
            user.participant = undefined;
            this.buffer?.push(user);
          }
        }
        return true;
      }
    }
    async _loadNextChunk() {
      while (this.request) {
        const request = this.request;
        request.limit = Math.min(this.left, _MAX_PARTICIPANTS_CHUNK_SIZE);
        const participants = await this.client.invoke(request);
        if (participants instanceof tl_1.Api.channels.ChannelParticipantsNotModified || !participants.participants.length) {
          this.request = undefined;
          return true;
        }
        request.offset += participants.participants.length;
        const users = new Map;
        for (const user of participants.users) {
          users.set(user.id.toString(), user);
        }
        for (const participant of participants.participants) {
          const userId = "userId" in participant ? participant.userId : ("peer" in participant) && participant.peer instanceof tl_1.Api.PeerUser ? participant.peer.userId : undefined;
          const user = userId && users.get(userId.toString());
          if (!user || this.filterEntity && !this.filterEntity(user)) {
            continue;
          }
          user.participant = participant;
          this.buffer?.push(user);
        }
        if (this.buffer?.length)
          return;
      }
      return true;
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
  }
  exports2._ParticipantsIter = _ParticipantsIter;

  class _AdminLogIter extends requestIter_1.RequestIter {
    async _init(params) {
      const { entity, search, admins, minId, maxId, limit, ...filterArgs } = params;
      let eventsFilter = undefined;
      if (Object.values(filterArgs).find((element) => element === true)) {
        eventsFilter = new tl_1.Api.ChannelAdminLogEventsFilter({
          ...filterArgs
        });
      }
      this.entity = await this.client.getInputEntity(entity);
      let adminList = undefined;
      if (admins) {
        adminList = [];
        for (const admin of admins) {
          adminList.push(await this.client.getInputEntity(admin));
        }
      }
      this.request = new tl_1.Api.channels.GetAdminLog({
        channel: this.entity,
        q: search || "",
        minId: minId ?? big_integer_1.default.zero,
        maxId: maxId ?? big_integer_1.default.zero,
        limit: 0,
        eventsFilter,
        admins: adminList
      });
    }
    async _loadNextChunk() {
      if (!this.request) {
        return true;
      }
      this.request.limit = Math.min(this.left, _MAX_ADMIN_LOG_CHUNK_SIZE);
      const r = await this.client.invoke(this.request);
      if (!r.events.length) {
        return true;
      }
      const entities = new Map;
      for (const entity of [...r.users, ...r.chats]) {
        entities.set(utils.getPeerId(entity), entity);
      }
      const eventIds = [];
      for (const e of r.events) {
        eventIds.push(e.id);
      }
      this.request.maxId = (0, Helpers_1.getMinBigInt)(eventIds);
      for (const ev of r.events) {
        if (ev.action instanceof tl_1.Api.ChannelAdminLogEventActionEditMessage) {
          try {
            ev.action.prevMessage._finishInit?.(this.client, entities, this.entity);
            ev.action.newMessage._finishInit?.(this.client, entities, this.entity);
          } catch (e) {}
        }
        this.buffer?.push(ev);
      }
      if (r.events.length < this.request.limit) {
        return true;
      }
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
  }
  exports2._AdminLogIter = _AdminLogIter;
  function iterParticipants(client, entity, { limit, offset, search, filter, showTotal = true }) {
    return new _ParticipantsIter(client, limit ?? Number.MAX_SAFE_INTEGER, {}, {
      entity,
      filter,
      offset: offset ?? 0,
      search,
      showTotal
    });
  }
  async function getParticipants(client, entity, params) {
    const it = client.iterParticipants(entity, params);
    return await it.collect();
  }
  async function kickParticipant(client, entity, participant) {
    const peer = await client.getInputEntity(entity);
    const user = await client.getInputEntity(participant);
    let resp;
    let request;
    const type = helpers._entityType(peer);
    if (type === helpers._EntityType.CHAT) {
      request = new tl_1.Api.messages.DeleteChatUser({
        chatId: (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(entity)),
        userId: (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(participant))
      });
      resp = await client.invoke(request);
    } else if (type === helpers._EntityType.CHANNEL) {
      if (user instanceof tl_1.Api.InputPeerSelf) {
        request = new tl_1.Api.channels.LeaveChannel({
          channel: peer
        });
        resp = await client.invoke(request);
      } else {
        request = new tl_1.Api.channels.EditBanned({
          channel: peer,
          participant: user,
          bannedRights: new tl_1.Api.ChatBannedRights({
            untilDate: 0,
            viewMessages: true
          })
        });
        resp = await client.invoke(request);
        await (0, Helpers_1.sleep)(500);
        await client.invoke(new tl_1.Api.channels.EditBanned({
          channel: peer,
          participant: user,
          bannedRights: new tl_1.Api.ChatBannedRights({ untilDate: 0 })
        }));
      }
    } else {
      throw new Error("You must pass either a channel or a chat");
    }
    return client._getResponseMessage(request, resp, entity);
  }
  function _toBannedRights(params) {
    if (params instanceof tl_1.Api.ChatBannedRights) {
      return params;
    }
    const { untilDate, ...rights } = params;
    return new tl_1.Api.ChatBannedRights({
      ...rights,
      untilDate: untilDate instanceof Date ? Math.floor(untilDate.getTime() / 1000) : untilDate || 0
    });
  }
  async function editBanned(client, entity, participant, params = { viewMessages: true }) {
    const channel = await client.getInputEntity(entity);
    const peer = await client.getInputEntity(participant);
    return client.invoke(new tl_1.Api.channels.EditBanned({
      channel,
      participant: peer,
      bannedRights: _toBannedRights(params)
    }));
  }
  async function editAdmin(client, entity, participant, params) {
    const peer = await client.getInputEntity(entity);
    const user = await client.getInputEntity(participant);
    const type = helpers._entityType(peer);
    if (type === helpers._EntityType.CHAT) {
      const isAdmin = params instanceof tl_1.Api.ChatAdminRights || Object.entries(params).some(([key, value]) => key !== "rank" && value === true);
      return client.invoke(new tl_1.Api.messages.EditChatAdmin({
        chatId: (0, Helpers_1.returnBigInt)(utils.getPeerId(peer, false)),
        userId: user,
        isAdmin
      }));
    }
    let rights;
    let rank;
    if (params instanceof tl_1.Api.ChatAdminRights) {
      rights = params;
    } else {
      const { rank: paramsRank, ...flags } = params;
      rank = paramsRank;
      rights = new tl_1.Api.ChatAdminRights({ ...flags });
    }
    return client.invoke(new tl_1.Api.channels.EditAdmin({
      channel: peer,
      userId: user,
      adminRights: rights,
      rank
    }));
  }
  async function editChatDefaultBannedRights(client, entity, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.EditChatDefaultBannedRights({
      peer,
      bannedRights: _toBannedRights(params)
    }));
  }
  async function getParticipant(client, entity, participant) {
    const channel = await client.getInputEntity(entity);
    if (helpers._entityType(channel) !== helpers._EntityType.CHANNEL) {
      throw new Error("getParticipant is only available for channels and supergroups; use getParticipants for small group chats");
    }
    const peer = await client.getInputEntity(participant);
    return client.api.channels.getParticipant({
      channel: utils.getInputChannel(channel),
      participant: peer
    });
  }
  async function editTitle(client, entity, title) {
    const peer = await client.getInputEntity(entity);
    if (helpers._entityType(peer) === helpers._EntityType.CHAT) {
      return client.invoke(new tl_1.Api.messages.EditChatTitle({
        chatId: (0, Helpers_1.returnBigInt)(utils.getPeerId(peer, false)),
        title
      }));
    }
    return client.api.channels.editTitle({ channel: utils.getInputChannel(peer), title });
  }
  async function editPhoto(client, entity, photo) {
    const peer = await client.getInputEntity(entity);
    let chatPhoto;
    if (photo == undefined) {
      chatPhoto = new tl_1.Api.InputChatPhotoEmpty;
    } else if (photo instanceof tl_1.Api.InputChatPhotoEmpty || photo instanceof tl_1.Api.InputChatUploadedPhoto || photo instanceof tl_1.Api.InputChatPhoto) {
      chatPhoto = photo;
    } else {
      const { fileHandle } = await (0, uploads_1._fileToMedia)(client, {
        file: photo,
        asImage: true
      });
      if (!fileHandle) {
        throw new Error(`Cannot use ${photo} as a chat photo`);
      }
      chatPhoto = new tl_1.Api.InputChatUploadedPhoto({ file: fileHandle });
    }
    if (helpers._entityType(peer) === helpers._EntityType.CHAT) {
      return client.invoke(new tl_1.Api.messages.EditChatPhoto({
        chatId: (0, Helpers_1.returnBigInt)(utils.getPeerId(peer, false)),
        photo: chatPhoto
      }));
    }
    return client.invoke(new tl_1.Api.channels.EditPhoto({ channel: peer, photo: chatPhoto }));
  }
  async function editChatAbout(client, entity, about) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.editChatAbout({ peer, about });
  }
  async function toggleSlowMode(client, entity, seconds = 0) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.toggleSlowMode({
      channel: utils.getInputChannel(channel),
      seconds
    });
  }
  async function createChannel(client, params) {
    const result = await client.invoke(new tl_1.Api.channels.CreateChannel({
      title: params.title,
      about: params.about || "",
      broadcast: !params.megagroup,
      megagroup: params.megagroup,
      forum: params.forum,
      forImport: params.forImport,
      geoPoint: params.geoPoint,
      address: params.address,
      ttlPeriod: params.ttlPeriod
    }));
    if ("chats" in result) {
      for (const chat of result.chats) {
        if (chat instanceof tl_1.Api.Channel) {
          return chat;
        }
      }
    }
    throw new Error("Could not find the created channel in the response");
  }
  async function createChat(client, params) {
    const users = [];
    for (const user of params.users) {
      users.push(await client.getInputEntity(user));
    }
    const result = await client.invoke(new tl_1.Api.messages.CreateChat({
      title: params.title,
      users,
      ttlPeriod: params.ttlPeriod
    }));
    if ("chats" in result.updates) {
      for (const chat of result.updates.chats) {
        if (chat instanceof tl_1.Api.Chat) {
          return { chat, missingInvitees: result.missingInvitees };
        }
      }
    }
    throw new Error("Could not find the created chat in the response");
  }
  async function joinChannel(client, entity) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.joinChannel({ channel: utils.getInputChannel(channel) });
  }
  async function importChatInvite(client, link) {
    return client.api.messages.importChatInvite({
      hash: (0, inviteLinks_1._parseInviteHash)(link)
    });
  }
  async function leaveChannel(client, entity) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.leaveChannel({ channel: utils.getInputChannel(channel) });
  }
  async function deleteHistory(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    if (helpers._entityType(peer) === helpers._EntityType.CHANNEL) {
      return client.api.channels.deleteHistory({
        channel: utils.getInputChannel(peer),
        maxId: params.maxId ?? 0,
        forEveryone: params.revoke
      });
    }
    return client.api.messages.deleteHistory({
      peer,
      maxId: params.maxId ?? 0,
      revoke: params.revoke,
      justClear: params.justClear,
      minDate: params.minDate,
      maxDate: params.maxDate
    });
  }
  async function editPeerFolders(client, entity, folderId) {
    const entities = Array.isArray(entity) ? entity : [entity];
    const folderPeers = [];
    for (const e of entities) {
      folderPeers.push(new tl_1.Api.InputFolderPeer({
        peer: await client.getInputEntity(e),
        folderId
      }));
    }
    return client.invoke(new tl_1.Api.folders.EditPeerFolders({ folderPeers }));
  }
  async function setTyping(client, entity, action = "typing", params = {}) {
    const peer = await client.getInputEntity(entity);
    let resolved;
    if (typeof action === "string") {
      resolved = _ChatAction._str_mapping[action];
      if (!resolved) {
        throw new Error(`Unknown chat action: ${action}`);
      }
    } else {
      resolved = action;
    }
    return client.invoke(new tl_1.Api.messages.SetTyping({
      peer,
      action: resolved,
      topMsgId: params.topMsgId
    }));
  }
  function iterAdminLog(client, entity, params = {}) {
    return new _AdminLogIter(client, params.limit ?? Number.MAX_SAFE_INTEGER, {}, {
      entity,
      ...params
    });
  }
  async function getAdminLog(client, entity, params = {}) {
    return await iterAdminLog(client, entity, params).collect();
  }
});

// node_modules/teleproto/client/communities.js
var require_communities = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CommunityPeerLinkRequestsIter = undefined;
  exports2.createCommunity = createCommunity;
  exports2.getCommunity = getCommunity;
  exports2.getJoinedCommunities = getJoinedCommunities;
  exports2.getCommunityPeers = getCommunityPeers;
  exports2.setCommunityPeerLink = setCommunityPeerLink;
  exports2.setCommunityCollapsed = setCommunityCollapsed;
  exports2.iterCommunityPeerLinkRequests = iterCommunityPeerLinkRequests;
  exports2.getCommunityPeerLinkRequests = getCommunityPeerLinkRequests;
  exports2.setCommunityPeerLinkRequestApproval = setCommunityPeerLinkRequestApproval;
  exports2.setAllCommunityPeerLinkRequestsApproval = setAllCommunityPeerLinkRequestsApproval;
  exports2.setCommunityParticipantBanned = setCommunityParticipantBanned;
  exports2.getCommunityParticipantJoinedChats = getCommunityParticipantJoinedChats;
  exports2.pinCommunity = pinCommunity;
  exports2.getCommunityNotifySettings = getCommunityNotifySettings;
  exports2.updateCommunityNotifySettings = updateCommunityNotifySettings;
  var tl_1 = require_tl();
  var Utils_1 = require_Utils();
  var requestIter_1 = require_requestIter();
  var Helpers_1 = require_Helpers();
  async function createCommunity(client, params) {
    const result = await client.invoke(new tl_1.Api.communities.Create({
      title: params.title,
      peer: await client.getInputEntity(params.peer),
      about: params.about,
      hidden: params.hidden
    }));
    if (result instanceof tl_1.Api.Updates || result instanceof tl_1.Api.UpdatesCombined) {
      const community = result.chats.find((chat) => chat instanceof tl_1.Api.Community);
      if (community)
        return community;
    }
    throw new Error("Telegram did not return the created community");
  }
  async function getCommunity(client, community) {
    const result = await client.invoke(new tl_1.Api.channels.GetFullChannel({
      channel: (0, Utils_1.getInputChannel)(await client.getInputEntity(community))
    }));
    if (!(result.fullChat instanceof tl_1.Api.CommunityFull)) {
      throw new Error("The entity is not a community");
    }
    return result;
  }
  async function getJoinedCommunities(client) {
    const result = await client.invoke(new tl_1.Api.communities.GetJoinedCommunities);
    const communities = new Helpers_1.TotalList;
    for (const chat of result.chats) {
      if (chat instanceof tl_1.Api.Community || chat instanceof tl_1.Api.CommunityForbidden) {
        communities.push(chat);
      }
    }
    communities.total = result instanceof tl_1.Api.messages.ChatsSlice ? result.count : communities.length;
    return communities;
  }
  async function getCommunityPeers(client, community) {
    const result = await getCommunity(client, community);
    const entities = new Map([...result.chats, ...result.users].map((entity) => [(0, Utils_1.getPeerId)(entity), entity]));
    return result.fullChat.linkedPeers.map((peer) => Object.assign(peer, {
      entity: entities.get((0, Utils_1.getPeerId)(peer.peer))
    }));
  }
  async function setCommunityPeerLink(client, community, peer, action) {
    if (!["visible", "hidden", "deleted"].includes(action)) {
      throw new Error("Community peer link action must be visible, hidden or deleted");
    }
    return client.invoke(new tl_1.Api.communities.TogglePeerLink({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
      peer: await client.getInputEntity(peer),
      visible: action === "visible" || undefined,
      hidden: action === "hidden" || undefined,
      deleted: action === "deleted" || undefined
    }));
  }
  async function setCommunityCollapsed(client, community, collapsed) {
    return client.invoke(new tl_1.Api.communities.ToggleCommunityCollapsedInDialogs({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
      collapsed: collapsed || undefined
    }));
  }

  class CommunityPeerLinkRequestsIter extends requestIter_1.RequestIter {
    constructor() {
      super(...arguments);
      this.offsets = new Set;
    }
    async _init({ community, offset }) {
      this.offsets.clear();
      this.request = new tl_1.Api.communities.GetPeerLinkRequests({
        community: (0, Utils_1.getInputChannel)(await this.client.getInputEntity(community)),
        offset,
        limit: Math.min(this.left || 1, 100)
      });
      if (this.left === 0) {
        this.total = (await this.client.invoke(this.request)).totalCount;
        return true;
      }
    }
    async _loadNextChunk() {
      while (this.request) {
        const request = this.request;
        this.offsets.add(request.offset);
        request.limit = Math.min(this.left, 100);
        const result = await this.client.invoke(request);
        this.total = result.totalCount;
        const entities = new Map([...result.chats, ...result.users].map((entity) => [(0, Utils_1.getPeerId)(entity), entity]));
        const users = new Map(result.users.map((user) => [user.id.toString(), user]));
        for (const entry of result.requests) {
          const requestedBy = users.get(entry.requestedBy.toString());
          this.buffer.push(Object.assign(entry, {
            entity: entities.get((0, Utils_1.getPeerId)(entry.peer)),
            requestedByUser: requestedBy instanceof tl_1.Api.User ? requestedBy : undefined
          }));
        }
        if (!result.nextOffset || this.offsets.has(result.nextOffset)) {
          this.request = undefined;
          return true;
        }
        request.offset = result.nextOffset;
        if (this.buffer.length)
          return;
      }
      return true;
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
  }
  exports2.CommunityPeerLinkRequestsIter = CommunityPeerLinkRequestsIter;
  function iterCommunityPeerLinkRequests(client, community, params = {}) {
    return new CommunityPeerLinkRequestsIter(client, params.limit, {
      waitTime: params.waitTime
    }, { community, offset: params.offset ?? "" });
  }
  async function getCommunityPeerLinkRequests(client, community, params = {}) {
    return await iterCommunityPeerLinkRequests(client, community, params).collect();
  }
  async function setCommunityPeerLinkRequestApproval(client, community, peer, approved) {
    return client.invoke(new tl_1.Api.communities.TogglePeerLinkRequestApproval({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
      peer: await client.getInputEntity(peer),
      reject: !approved || undefined
    }));
  }
  async function setAllCommunityPeerLinkRequestsApproval(client, community, approved) {
    return client.invoke(new tl_1.Api.communities.ToggleAllPeerLinkRequestApproval({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
      reject: !approved || undefined
    }));
  }
  async function setCommunityParticipantBanned(client, community, participant, banned) {
    return client.invoke(new tl_1.Api.communities.ToggleParticipantBanned({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
      participant: await client.getInputEntity(participant),
      unban: !banned || undefined
    }));
  }
  async function getCommunityParticipantJoinedChats(client, community, participant) {
    return client.invoke(new tl_1.Api.communities.GetParticipantJoinedChats({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community)),
      participant: await client.getInputEntity(participant)
    }));
  }
  async function pinCommunity(client, community, pinned = true) {
    return client.invoke(new tl_1.Api.messages.ToggleDialogPin({
      peer: new tl_1.Api.InputDialogPeerCommunity({
        community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community))
      }),
      pinned: pinned || undefined
    }));
  }
  async function getCommunityNotifySettings(client, community) {
    return client.getNotifySettings(new tl_1.Api.InputNotifyCommunity({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community))
    }));
  }
  async function updateCommunityNotifySettings(client, community, params) {
    return client.updateNotifySettings(new tl_1.Api.InputNotifyCommunity({
      community: (0, Utils_1.getInputChannel)(await client.getInputEntity(community))
    }), params);
  }
});

// node_modules/teleproto/client/account.js
var require_account = __commonJS((exports2) => {
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
  exports2.updateProfile = updateProfile;
  exports2.updateUsername = updateUsername;
  exports2.updateStatus = updateStatus;
  exports2.uploadProfilePhoto = uploadProfilePhoto;
  exports2.updateProfilePhoto = updateProfilePhoto;
  exports2.deleteProfilePhotos = deleteProfilePhotos;
  exports2.getUserPhotos = getUserPhotos;
  exports2.getAuthorizations = getAuthorizations;
  exports2.resetAuthorization = resetAuthorization;
  exports2.getPrivacy = getPrivacy;
  exports2.setPrivacy = setPrivacy;
  exports2.getNotifySettings = getNotifySettings;
  exports2.updateNotifySettings = updateNotifySettings;
  exports2.getAccountTTL = getAccountTTL;
  exports2.setAccountTTL = setAccountTTL;
  exports2.getGlobalPrivacySettings = getGlobalPrivacySettings;
  exports2.setGlobalPrivacySettings = setGlobalPrivacySettings;
  var Helpers_1 = require_Helpers();
  var utils = __importStar(require_Utils());
  var tl_1 = require_tl();
  var uploads_1 = require_uploads();
  async function updateProfile(client, params) {
    return client.api.account.updateProfile({
      firstName: params.firstName,
      lastName: params.lastName,
      about: params.about
    });
  }
  async function updateUsername(client, username) {
    return client.api.account.updateUsername({ username });
  }
  async function updateStatus(client, online = true) {
    return client.api.account.updateStatus({ offline: !online });
  }
  async function _toInputFile(client, file) {
    const { fileHandle } = await (0, uploads_1._fileToMedia)(client, {
      file,
      asImage: true
    });
    if (!fileHandle) {
      throw new Error(`Cannot upload ${file} as a profile photo`);
    }
    return fileHandle;
  }
  async function uploadProfilePhoto(client, params) {
    return client.invoke(new tl_1.Api.photos.UploadProfilePhoto({
      file: params.file ? await _toInputFile(client, params.file) : undefined,
      video: params.video ? await _toInputFile(client, params.video) : undefined,
      videoStartTs: params.videoStartTs,
      videoEmojiMarkup: params.videoEmojiMarkup,
      fallback: params.fallback,
      bot: params.bot ? await client.getInputEntity(params.bot) : undefined
    }));
  }
  async function updateProfilePhoto(client, photo, params = {}) {
    return client.invoke(new tl_1.Api.photos.UpdateProfilePhoto({
      id: utils.getInputPhoto(photo),
      fallback: params.fallback,
      bot: params.bot ? await client.getInputEntity(params.bot) : undefined
    }));
  }
  async function deleteProfilePhotos(client, photos) {
    return client.invoke(new tl_1.Api.photos.DeletePhotos({
      id: photos.map((photo) => utils.getInputPhoto(photo))
    }));
  }
  async function getUserPhotos(client, entity, params = {}) {
    const user = await client.getInputEntity(entity);
    const result = await client.invoke(new tl_1.Api.photos.GetUserPhotos({
      userId: user,
      offset: params.offset ?? 0,
      maxId: params.maxId,
      limit: params.limit ?? 100
    }));
    const photos = new Helpers_1.TotalList;
    photos.push(...result.photos);
    photos.total = result instanceof tl_1.Api.photos.PhotosSlice ? result.count : result.photos.length;
    return photos;
  }
  async function getAuthorizations(client) {
    return client.api.account.getAuthorizations({});
  }
  async function resetAuthorization(client, hash) {
    if (hash == undefined || hash.isZero()) {
      return client.api.auth.resetAuthorizations({});
    }
    return client.api.account.resetAuthorization({ hash });
  }
  async function getPrivacy(client, key) {
    return client.invoke(new tl_1.Api.account.GetPrivacy({ key }));
  }
  async function setPrivacy(client, key, rules) {
    return client.invoke(new tl_1.Api.account.SetPrivacy({ key, rules }));
  }
  async function getNotifySettings(client, entity) {
    return client.invoke(new tl_1.Api.account.GetNotifySettings({
      peer: await client._getInputNotify(entity)
    }));
  }
  async function updateNotifySettings(client, entity, params) {
    return client.invoke(new tl_1.Api.account.UpdateNotifySettings({
      peer: await client._getInputNotify(entity),
      settings: new tl_1.Api.InputPeerNotifySettings({
        showPreviews: params.showPreviews,
        silent: params.silent,
        muteUntil: params.muteUntil,
        sound: params.sound,
        storiesMuted: params.storiesMuted,
        storiesHideSender: params.storiesHideSender,
        storiesSound: params.storiesSound
      })
    }));
  }
  async function getAccountTTL(client) {
    const result = await client.api.account.getAccountTTL({});
    return result.days;
  }
  async function setAccountTTL(client, days) {
    return client.invoke(new tl_1.Api.account.SetAccountTTL({
      ttl: new tl_1.Api.AccountDaysTTL({ days })
    }));
  }
  async function getGlobalPrivacySettings(client) {
    return client.api.account.getGlobalPrivacySettings({});
  }
  async function setGlobalPrivacySettings(client, settings) {
    return client.invoke(new tl_1.Api.account.SetGlobalPrivacySettings({ settings }));
  }
});

// node_modules/teleproto/client/contacts.js
var require_contacts = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getContacts = getContacts;
  exports2.addContact = addContact;
  exports2.deleteContacts = deleteContacts;
  exports2.importContacts = importContacts;
  exports2.block = block;
  exports2.unblock = unblock;
  exports2.getBlocked = getBlocked;
  var Helpers_1 = require_Helpers();
  var tl_1 = require_tl();
  var big_integer_1 = __importDefault(require_BigInteger());
  async function getContacts(client) {
    const result = await client.api.contacts.getContacts({
      hash: big_integer_1.default.zero
    });
    if (result instanceof tl_1.Api.contacts.ContactsNotModified) {
      return [];
    }
    return result.users.filter((user) => user instanceof tl_1.Api.User);
  }
  function _toNote(note) {
    if (note == undefined) {
      return;
    }
    if (typeof note === "string") {
      return new tl_1.Api.TextWithEntities({ text: note, entities: [] });
    }
    return note;
  }
  async function addContact(client, entity, params) {
    const user = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.contacts.AddContact({
      id: user,
      firstName: params.firstName,
      lastName: params.lastName || "",
      phone: params.phone || "",
      addPhonePrivacyException: params.addPhonePrivacyException,
      note: _toNote(params.note)
    }));
  }
  async function deleteContacts(client, users) {
    const list = Array.isArray(users) ? users : [users];
    const ids = [];
    for (const user of list) {
      ids.push(await client.getInputEntity(user));
    }
    return client.invoke(new tl_1.Api.contacts.DeleteContacts({ id: ids }));
  }
  async function importContacts(client, contacts) {
    return client.invoke(new tl_1.Api.contacts.ImportContacts({
      contacts: contacts.map((contact, i) => new tl_1.Api.InputPhoneContact({
        clientId: (0, Helpers_1.returnBigInt)(contact.clientId ?? i),
        phone: contact.phone,
        firstName: contact.firstName,
        lastName: contact.lastName || "",
        note: _toNote(contact.note)
      }))
    }));
  }
  async function block(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.contacts.block({
      id: peer,
      myStoriesFrom: params.myStoriesFrom
    });
  }
  async function unblock(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.contacts.unblock({
      id: peer,
      myStoriesFrom: params.myStoriesFrom
    });
  }
  async function getBlocked(client, params = {}) {
    const result = await client.api.contacts.getBlocked({
      offset: params.offset ?? 0,
      limit: params.limit ?? 100,
      myStoriesFrom: params.myStoriesFrom
    });
    const blocked = new Helpers_1.TotalList;
    blocked.push(...result.blocked);
    blocked.total = result instanceof tl_1.Api.contacts.BlockedSlice ? result.count : result.blocked.length;
    return blocked;
  }
});

// node_modules/teleproto/tl/custom/draft.js
var require_draft = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Draft = undefined;
  var Utils_1 = require_Utils();
  var api_1 = require_api2();

  class Draft {
    constructor(client, entity, draft) {
      this._client = client;
      this._peer = (0, Utils_1.getPeer)(entity);
      this._entity = entity;
      this._inputEntity = entity ? (0, Utils_1.getInputPeer)(entity) : undefined;
      if (!draft || !(draft instanceof api_1.Api.DraftMessage)) {
        draft = new api_1.Api.DraftMessage({
          message: "",
          date: -1
        });
      }
      if (!(draft instanceof api_1.Api.DraftMessageEmpty)) {
        this.linkPreview = !draft.noWebpage;
        this._text = client.parseMode ? client.parseMode.unparse(draft.message, draft.entities || []) : draft.message;
        this._rawText = draft.message;
        this.date = draft.date;
        const replyTo = draft.replyTo;
        if (replyTo != null) {
          if ("replyToMsgId" in replyTo) {
            this.replyToMsgId = replyTo.replyToMsgId;
          }
        }
      }
    }
    get entity() {
      return this._entity;
    }
    get inputEntity() {
      if (!this._inputEntity) {
        this._inputEntity = this._client._entityCache.get(this._peer);
      }
      return this._inputEntity;
    }
  }
  exports2.Draft = Draft;
});

// node_modules/teleproto/tl/custom/dialog.js
var require_dialog = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Dialog = undefined;
  var api_1 = require_api2();
  var Utils_1 = require_Utils();
  var draft_1 = require_draft();
  var Helpers_1 = require_Helpers();

  class Dialog {
    constructor(client, dialog, entities, message) {
      this._client = client;
      this.dialog = dialog;
      this.pinned = !!dialog.pinned;
      this.folderId = dialog instanceof api_1.Api.Dialog ? dialog.folderId : undefined;
      this.archived = this.folderId != null;
      this.message = message;
      this.date = this.message?.date;
      const peer = dialog instanceof api_1.Api.DialogCommunity ? new api_1.Api.PeerChannel({ channelId: dialog.communityId }) : dialog.peer;
      this.entity = entities.get((0, Utils_1.getPeerId)(peer));
      this.inputEntity = (0, Utils_1.getInputPeer)(this.entity);
      if (this.entity) {
        this.id = (0, Helpers_1.returnBigInt)((0, Utils_1.getPeerId)(this.entity));
        this.name = this.title = (0, Utils_1.getDisplayName)(this.entity);
      }
      this.unreadCount = dialog instanceof api_1.Api.Dialog ? dialog.unreadCount : 0;
      this.unreadMentionsCount = dialog instanceof api_1.Api.Dialog ? dialog.unreadMentionsCount : 0;
      if (!this.entity) {
        throw new Error("Entity not found for dialog");
      }
      this.draft = new draft_1.Draft(client, this.entity, dialog instanceof api_1.Api.Dialog ? dialog.draft : undefined);
      this.isUser = this.entity instanceof api_1.Api.User;
      this.isGroup = !!(this.entity instanceof api_1.Api.Chat || this.entity instanceof api_1.Api.ChatForbidden || this.entity instanceof api_1.Api.Channel && this.entity.megagroup);
      this.isChannel = this.entity instanceof api_1.Api.Channel;
      this.isCommunity = dialog instanceof api_1.Api.DialogCommunity;
    }
    get inputDialog() {
      return this.isCommunity ? new api_1.Api.InputDialogPeerCommunity({ community: (0, Utils_1.getInputChannel)(this.inputEntity) }) : new api_1.Api.InputDialogPeer({ peer: this.inputEntity });
    }
    async setCollapsed(collapsed) {
      if (!this.isCommunity)
        throw new Error("The dialog is not a community");
      const result = await this._client.setCommunityCollapsed(this.inputEntity, collapsed);
      if (this.entity instanceof api_1.Api.Community) {
        this.entity.collapsedInDialogs = collapsed || undefined;
      }
      return result;
    }
    async send(params) {
      return this._client.sendMessage(this.inputEntity, typeof params === "string" ? { message: params } : params);
    }
    async markAsRead(params) {
      return this._client.markAsRead(this.inputEntity, undefined, params);
    }
    async archive() {
      this.archived = true;
      this.folderId = 1;
      return this._client.editPeerFolders(this.inputEntity, 1);
    }
    async unarchive() {
      this.archived = false;
      this.folderId = 0;
      return this._client.editPeerFolders(this.inputEntity, 0);
    }
    async pin(pinned = true) {
      const result = await this._client.invoke(new api_1.Api.messages.ToggleDialogPin({
        peer: this.inputDialog,
        pinned: pinned || undefined
      }));
      this.pinned = pinned;
      return result;
    }
    async unpin() {
      return this.pin(false);
    }
    async delete(params) {
      if (this.isChannel || this.isCommunity) {
        return this._client.leaveChannel(this.inputEntity);
      }
      return this._client.deleteHistory(this.inputEntity, params);
    }
  }
  exports2.Dialog = Dialog;
});

// node_modules/teleproto/client/dialogs.js
var require_dialogs = __commonJS((exports2) => {
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
  exports2._DialogsIter = undefined;
  exports2.iterDialogs = iterDialogs;
  exports2.getDialogs = getDialogs;
  var tl_1 = require_tl();
  var requestIter_1 = require_requestIter();
  var utils = __importStar(require_Utils());
  var dialog_1 = require_dialog();
  var big_integer_1 = __importDefault(require_BigInteger());
  var _MAX_CHUNK_SIZE = 100;
  function _dialogMessageKey(peer, messageId) {
    return "" + [
      peer instanceof tl_1.Api.PeerChannel ? peer.channelId : undefined,
      messageId
    ];
  }

  class _DialogsIter extends requestIter_1.RequestIter {
    constructor() {
      super(...arguments);
      this.includeCommunities = false;
    }
    async _init({ offsetDate, offsetId, offsetPeer, ignorePinned, ignoreMigrated, folder, includeCommunities }) {
      this.request = new tl_1.Api.messages.GetDialogs({
        offsetDate: offsetDate ?? 0,
        offsetId,
        offsetPeer,
        limit: 1,
        hash: big_integer_1.default.zero,
        excludePinned: ignorePinned,
        folderId: folder
      });
      if (this.limit <= 0) {
        const dialogs = await this.client.invoke(this.request);
        if ("count" in dialogs) {
          this.total = dialogs.count;
        } else {
          this.total = dialogs.dialogs.length;
        }
        return true;
      }
      this.seen = new Set;
      this.filterDate = offsetDate;
      this.ignoreMigrated = ignoreMigrated;
      this.lastOffset = undefined;
      this.includeCommunities = !!includeCommunities;
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
    async _loadNextChunk() {
      if (!this.request || !this.seen || !this.buffer) {
        return;
      }
      while (true) {
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        const r = await this.client.invoke(this.request);
        if (r instanceof tl_1.Api.messages.DialogsNotModified) {
          return;
        }
        if ("count" in r) {
          this.total = r.count;
        } else {
          this.total = r.dialogs.length;
        }
        const entities = new Map;
        const messages = new Map;
        for (const entity of [...r.users, ...r.chats]) {
          if (entity instanceof tl_1.Api.UserEmpty || entity instanceof tl_1.Api.ChatEmpty) {
            continue;
          }
          entities.set(utils.getPeerId(entity), entity);
        }
        for (const m of r.messages) {
          let message = m;
          try {
            if (message && "_finishInit" in message) {
              message._finishInit(this.client, entities, undefined);
            }
          } catch (e) {
            this.client._log.error("Got error while trying to finish init message with id " + m.id, e);
            if (this.client._errorHandler) {
              await this.client._errorHandler(e);
            }
          }
          messages.set(_dialogMessageKey(message.peerId, message.id), message);
        }
        for (const d of r.dialogs) {
          if (d instanceof tl_1.Api.DialogFolder || !this.includeCommunities && d instanceof tl_1.Api.DialogCommunity) {
            continue;
          }
          const peer = d instanceof tl_1.Api.DialogCommunity ? new tl_1.Api.PeerChannel({ channelId: d.communityId }) : d.peer;
          const message = d instanceof tl_1.Api.Dialog ? messages.get(_dialogMessageKey(d.peer, d.topMessage)) : undefined;
          if (this.filterDate != null && d instanceof tl_1.Api.Dialog) {
            const date = message?.date;
            if (date == undefined || date > this.filterDate) {
              continue;
            }
          }
          const peerId = utils.getPeerId(peer);
          if (!this.seen.has(peerId)) {
            this.seen.add(peerId);
            if (!entities.has(peerId)) {
              continue;
            }
            const cd = new dialog_1.Dialog(this.client, d, entities, message);
            if (!this.ignoreMigrated || !(cd.entity instanceof tl_1.Api.Chat && cd.entity.migratedTo)) {
              this.buffer.push(cd);
            }
          }
        }
        if (r.dialogs.length < this.request.limit || !(r instanceof tl_1.Api.messages.DialogsSlice)) {
          return true;
        }
        const lastDialog = [...r.dialogs].reverse().find((dialog) => dialog instanceof tl_1.Api.Dialog);
        if (!lastDialog) {
          if (this.request.excludePinned)
            return true;
          this.request.excludePinned = true;
          if (this.buffer.length)
            return;
          continue;
        }
        const lastMessage = messages.get(_dialogMessageKey(lastDialog.peer, lastDialog.topMessage));
        const offsetEntity = entities.get(utils.getPeerId(lastDialog.peer));
        const offsetPeer = offsetEntity ? utils.getInputPeer(offsetEntity) : await this.client.getInputEntity(lastDialog.peer);
        const offset = `${utils.getPeerId(lastDialog.peer)}:${lastDialog.topMessage}`;
        if (this.lastOffset === offset)
          return true;
        this.lastOffset = offset;
        this.request.excludePinned = true;
        this.request.offsetId = lastDialog.topMessage;
        this.request.offsetDate = lastMessage ? lastMessage.date : 0;
        this.request.offsetPeer = offsetPeer;
        if (this.buffer.length)
          return;
      }
    }
  }
  exports2._DialogsIter = _DialogsIter;
  function iterDialogs(client, { limit = undefined, offsetDate = undefined, offsetId = 0, offsetPeer = new tl_1.Api.InputPeerEmpty, ignorePinned = false, ignoreMigrated = false, folder = undefined, archived = undefined, includeCommunities }) {
    if (archived != null) {
      folder = archived ? 1 : 0;
    }
    return new _DialogsIter(client, limit, {}, {
      offsetDate,
      offsetId,
      offsetPeer,
      ignorePinned,
      ignoreMigrated,
      folder,
      includeCommunities
    });
  }
  async function getDialogs(client, params) {
    return await client.iterDialogs(params).collect();
  }
});

// node_modules/teleproto/client/2fa.js
var require_2fa = __commonJS((exports2) => {
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
  exports2.updateTwoFaSettings = updateTwoFaSettings;
  var Helpers_1 = require_Helpers();
  var Password_1 = require_Password();
  var tl_1 = require_tl();
  var errors = __importStar(require_errors());
  async function updateTwoFaSettings(client, { isCheckPassword, currentPassword, newPassword, hint = "", email, emailCodeCallback, onEmailCodeError }) {
    if (!newPassword && !currentPassword) {
      throw new Error("Neither `currentPassword` nor `newPassword` is present");
    }
    if (email && !(emailCodeCallback && onEmailCodeError)) {
      throw new Error("`email` present without `emailCodeCallback` and `onEmailCodeError`");
    }
    const pwd = await client.api.account.getPassword();
    if (!(pwd.newAlgo instanceof tl_1.Api.PasswordKdfAlgoUnknown)) {
      pwd.newAlgo.salt1 = Buffer.concat([
        pwd.newAlgo.salt1,
        (0, Helpers_1.generateRandomBytes)(32)
      ]);
    }
    if (!pwd.hasPassword && currentPassword) {
      currentPassword = undefined;
    }
    const password = currentPassword ? await (0, Password_1.computeCheck)(pwd, currentPassword) : new tl_1.Api.InputCheckPasswordEmpty;
    if (isCheckPassword) {
      await client.invoke(new tl_1.Api.auth.CheckPassword({ password }));
      return;
    }
    if (pwd.newAlgo instanceof tl_1.Api.PasswordKdfAlgoUnknown) {
      throw new Error("Unknown password encryption method");
    }
    try {
      await client.invoke(new tl_1.Api.account.UpdatePasswordSettings({
        password,
        newSettings: new tl_1.Api.account.PasswordInputSettings({
          newAlgo: pwd.newAlgo,
          newPasswordHash: newPassword ? await (0, Password_1.computeDigest)(pwd.newAlgo, newPassword) : Buffer.alloc(0),
          hint,
          email,
          newSecureSettings: undefined
        })
      }));
    } catch (e) {
      if (e instanceof errors.EmailUnconfirmedError) {
        while (true) {
          try {
            const code = await emailCodeCallback(e.codeLength);
            if (!code) {
              throw new Error("Code is empty");
            }
            await client.api.account.confirmPasswordEmail({ code });
            break;
          } catch (err) {
            onEmailCodeError(err);
          }
        }
      } else {
        throw e;
      }
    }
  }
});

// node_modules/teleproto/client/forums.js
var require_forums = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createForumTopic = createForumTopic;
  exports2.editForumTopic = editForumTopic;
  exports2.updatePinnedForumTopic = updatePinnedForumTopic;
  exports2.reorderPinnedForumTopics = reorderPinnedForumTopics;
  exports2.getForumTopics = getForumTopics;
  exports2.getForumTopicsByID = getForumTopicsByID;
  exports2.toggleForum = toggleForum;
  exports2.toggleViewForumAsMessages = toggleViewForumAsMessages;
  var Helpers_1 = require_Helpers();
  var tl_1 = require_tl();
  var Utils_1 = require_Utils();
  async function createForumTopic(client, entity, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.CreateForumTopic({
      peer,
      title: params.title,
      iconColor: params.iconColor,
      iconEmojiId: params.iconEmojiId,
      titleMissing: params.titleMissing,
      randomId: (0, Helpers_1.generateRandomBigInt)(),
      sendAs: params.sendAs ? await client.getInputEntity(params.sendAs) : undefined
    }));
  }
  async function editForumTopic(client, entity, topicId, params) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.EditForumTopic({
      peer,
      topicId,
      title: params.title,
      iconEmojiId: params.iconEmojiId,
      closed: params.closed,
      hidden: params.hidden
    }));
  }
  async function updatePinnedForumTopic(client, entity, topicId, pinned) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.UpdatePinnedForumTopic({
      peer,
      topicId,
      pinned
    }));
  }
  async function reorderPinnedForumTopics(client, entity, order, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.ReorderPinnedForumTopics({
      peer,
      order,
      force: params.force
    }));
  }
  async function getForumTopics(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.GetForumTopics({
      peer,
      q: params.search,
      offsetDate: params.offsetDate ?? 0,
      offsetId: params.offsetId ?? 0,
      offsetTopic: params.offsetTopic ?? 0,
      limit: params.limit ?? 100
    }));
  }
  async function getForumTopicsByID(client, entity, topicIds) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.messages.GetForumTopicsByID({
      peer,
      topics: Array.isArray(topicIds) ? topicIds : [topicIds]
    }));
  }
  async function toggleForum(client, entity, enabled, tabs = false) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.toggleForum({
      channel: (0, Utils_1.getInputChannel)(channel),
      enabled,
      tabs
    });
  }
  async function toggleViewForumAsMessages(client, entity, enabled) {
    const channel = await client.getInputEntity(entity);
    return client.api.channels.toggleViewForumAsMessages({
      channel: (0, Utils_1.getInputChannel)(channel),
      enabled
    });
  }
});

// node_modules/teleproto/client/stories.js
var require_stories = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.sendStory = sendStory;
  exports2.editStory = editStory;
  exports2.deleteStories = deleteStories;
  exports2.toggleStoriesPinned = toggleStoriesPinned;
  exports2.canSendStory = canSendStory;
  exports2.getAllStories = getAllStories;
  exports2.getPeerStories = getPeerStories;
  exports2.getStoriesByID = getStoriesByID;
  exports2.getPinnedStories = getPinnedStories;
  exports2.getStoriesArchive = getStoriesArchive;
  exports2.readStories = readStories;
  exports2.incrementStoryViews = incrementStoryViews;
  exports2.getStoryViewsList = getStoryViewsList;
  exports2.exportStoryLink = exportStoryLink;
  exports2.sendStoryReaction = sendStoryReaction;
  var Helpers_1 = require_Helpers();
  var tl_1 = require_tl();
  var uploads_1 = require_uploads();
  var messageParse_1 = require_messageParse();
  async function _toStoryMedia(client, media) {
    const converted = await (0, uploads_1._fileToMedia)(client, { file: media });
    if (!converted.media) {
      throw new Error(`Cannot use ${media} as story media`);
    }
    return converted.media;
  }
  async function sendStory(client, entity, params) {
    const peer = await client.getInputEntity(entity);
    let caption = params.caption;
    let entities = params.entities;
    if (caption != null && entities == undefined) {
      [caption, entities] = await (0, messageParse_1._parseMessageText)(client, caption, params.parseMode);
    }
    return client.invoke(new tl_1.Api.stories.SendStory({
      peer,
      media: await _toStoryMedia(client, params.media),
      caption,
      entities,
      privacyRules: params.privacyRules ?? [
        new tl_1.Api.InputPrivacyValueAllowAll
      ],
      pinned: params.pinned,
      noforwards: params.noforwards,
      period: params.period,
      mediaAreas: params.mediaAreas,
      fwdFromId: params.fwdFromId ? await client.getInputEntity(params.fwdFromId) : undefined,
      fwdFromStory: params.fwdFromStory,
      fwdModified: params.fwdModified,
      albums: params.albums,
      music: params.music,
      randomId: (0, Helpers_1.generateRandomBigInt)()
    }));
  }
  async function editStory(client, entity, storyId, params) {
    const peer = await client.getInputEntity(entity);
    let caption = params.caption;
    let entities = params.entities;
    if (caption != null && entities == undefined) {
      [caption, entities] = await (0, messageParse_1._parseMessageText)(client, caption, params.parseMode);
    }
    return client.invoke(new tl_1.Api.stories.EditStory({
      peer,
      id: storyId,
      media: params.media ? await _toStoryMedia(client, params.media) : undefined,
      caption,
      entities,
      privacyRules: params.privacyRules,
      mediaAreas: params.mediaAreas,
      music: params.music
    }));
  }
  async function deleteStories(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.DeleteStories({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    }));
  }
  async function toggleStoriesPinned(client, entity, ids, pinned = true) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.TogglePinned({
      peer,
      id: Array.isArray(ids) ? ids : [ids],
      pinned
    }));
  }
  async function canSendStory(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.canSendStory({ peer });
  }
  async function getAllStories(client, params = {}) {
    return client.api.stories.getAllStories({
      next: params.next,
      hidden: params.hidden,
      state: params.state
    });
  }
  async function getPeerStories(client, entity) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getPeerStories({ peer });
  }
  async function getStoriesByID(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getStoriesByID({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
  }
  async function getPinnedStories(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getPinnedStories({
      peer,
      offsetId: params.offsetId ?? 0,
      limit: params.limit ?? 100
    });
  }
  async function getStoriesArchive(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.getStoriesArchive({
      peer,
      offsetId: params.offsetId ?? 0,
      limit: params.limit ?? 100
    });
  }
  async function readStories(client, entity, maxId) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.readStories({
      peer,
      maxId: maxId ?? 0
    });
  }
  async function incrementStoryViews(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.incrementStoryViews({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
  }
  async function getStoryViewsList(client, entity, storyId, params = {}) {
    const peer = await client.getInputEntity(entity);
    return client.invoke(new tl_1.Api.stories.GetStoryViewsList({
      peer,
      id: storyId,
      justContacts: params.justContacts,
      reactionsFirst: params.reactionsFirst,
      forwardsFirst: params.forwardsFirst,
      q: params.search,
      offset: params.offset ?? "",
      limit: params.limit ?? 100
    }));
  }
  async function exportStoryLink(client, entity, storyId) {
    const peer = await client.getInputEntity(entity);
    return client.api.stories.exportStoryLink({ peer, id: storyId });
  }
  async function sendStoryReaction(client, entity, storyId, reaction, params = {}) {
    const peer = await client.getInputEntity(entity);
    let resolved;
    if (reaction == undefined) {
      resolved = new tl_1.Api.ReactionEmpty;
    } else if (typeof reaction === "string") {
      resolved = new tl_1.Api.ReactionEmoji({ emoticon: reaction });
    } else if (reaction instanceof tl_1.Api.ReactionEmoji || reaction instanceof tl_1.Api.ReactionCustomEmoji || reaction instanceof tl_1.Api.ReactionPaid || reaction instanceof tl_1.Api.ReactionEmpty) {
      resolved = reaction;
    } else {
      resolved = new tl_1.Api.ReactionCustomEmoji({
        documentId: reaction
      });
    }
    return client.invoke(new tl_1.Api.stories.SendReaction({
      peer,
      storyId,
      reaction: resolved,
      addToRecent: params.addToRecent
    }));
  }
});

// node_modules/teleproto/client/folders.js
var require_folders = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.getDialogFilters = getDialogFilters;
  exports2.updateDialogFilter = updateDialogFilter;
  exports2.updateDialogFiltersOrder = updateDialogFiltersOrder;
  var tl_1 = require_tl();
  async function getDialogFilters(client) {
    return client.api.messages.getDialogFilters({});
  }
  async function updateDialogFilter(client, id, filter) {
    return client.invoke(new tl_1.Api.messages.UpdateDialogFilter({
      id,
      filter
    }));
  }
  async function updateDialogFiltersOrder(client, order) {
    return client.api.messages.updateDialogFiltersOrder({ order });
  }
});

// node_modules/teleproto/client/stickers.js
var require_stickers = __commonJS((exports2) => {
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
  exports2.getStickerSet = getStickerSet;
  exports2.getAllStickers = getAllStickers;
  exports2.installStickerSet = installStickerSet;
  exports2.uninstallStickerSet = uninstallStickerSet;
  exports2.getRecentStickers = getRecentStickers;
  exports2.saveRecentSticker = saveRecentSticker;
  exports2.clearRecentStickers = clearRecentStickers;
  exports2.getFavedStickers = getFavedStickers;
  exports2.faveSticker = faveSticker;
  exports2.getCustomEmojiDocuments = getCustomEmojiDocuments;
  var big_integer_1 = __importDefault(require_BigInteger());
  var utils = __importStar(require_Utils());
  var tl_1 = require_tl();
  function _toInputStickerSet(set) {
    if (typeof set === "string") {
      return new tl_1.Api.InputStickerSetShortName({ shortName: set });
    }
    return set;
  }
  async function getStickerSet(client, set) {
    return client.invoke(new tl_1.Api.messages.GetStickerSet({
      stickerset: _toInputStickerSet(set),
      hash: 0
    }));
  }
  async function getAllStickers(client) {
    return client.api.messages.getAllStickers({ hash: big_integer_1.default.zero });
  }
  async function installStickerSet(client, set, params = {}) {
    return client.invoke(new tl_1.Api.messages.InstallStickerSet({
      stickerset: _toInputStickerSet(set),
      archived: params.archived ?? false
    }));
  }
  async function uninstallStickerSet(client, set) {
    return client.invoke(new tl_1.Api.messages.UninstallStickerSet({
      stickerset: _toInputStickerSet(set)
    }));
  }
  async function getRecentStickers(client, params = {}) {
    return client.api.messages.getRecentStickers({
      hash: big_integer_1.default.zero,
      attached: params.attached
    });
  }
  async function saveRecentSticker(client, document, params = {}) {
    return client.invoke(new tl_1.Api.messages.SaveRecentSticker({
      id: utils.getInputDocument(document),
      unsave: params.unsave ?? false,
      attached: params.attached
    }));
  }
  async function clearRecentStickers(client, params = {}) {
    return client.api.messages.clearRecentStickers({
      attached: params.attached
    });
  }
  async function getFavedStickers(client) {
    return client.api.messages.getFavedStickers({ hash: big_integer_1.default.zero });
  }
  async function faveSticker(client, document, params = {}) {
    return client.invoke(new tl_1.Api.messages.FaveSticker({
      id: utils.getInputDocument(document),
      unfave: params.unfave ?? false
    }));
  }
  async function getCustomEmojiDocuments(client, documentIds) {
    return client.api.messages.getCustomEmojiDocuments({
      documentId: documentIds
    });
  }
});

// node_modules/teleproto/tl/runtime/apiProxy.js
var require_apiProxy = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createApiProxy = createApiProxy;
  function upperFirst(value) {
    return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
  }
  function asRequestClass(value) {
    return typeof value === "function" && value.classType === "request" ? value : undefined;
  }
  function createApiProxy(api, invoke) {
    const lookup = (name) => {
      const parts = name.split(".");
      if (parts.length === 1)
        return asRequestClass(api[upperFirst(name)]);
      if (parts.length !== 2)
        return;
      const ns = api[parts[0]];
      return ns && typeof ns === "object" ? asRequestClass(ns[upperFirst(parts[1])]) : undefined;
    };
    const call = async (request, options) => {
      if (request && "classType" in request && request.classType === "request") {
        return invoke(request, options?.dcId, options);
      }
      const tag = request?._;
      const Ctor = typeof tag === "string" ? lookup(tag) : undefined;
      if (!Ctor)
        throw new TypeError(`Unknown raw API method: ${String(tag)}`);
      return invoke(new Ctor(request), options?.dcId, options);
    };
    const namespaceProxy = (ns, root = false) => {
      const cache = new Map;
      return new Proxy(Object.create(null), {
        get(_target, key) {
          if (typeof key !== "string" || key === "then")
            return;
          if (root && key === "call")
            return call;
          if (cache.has(key))
            return cache.get(key);
          const Ctor = asRequestClass(ns[upperFirst(key)]);
          if (Ctor) {
            const method = async (params, opts) => {
              const options = Ctor.hasParameters ? opts : opts ?? params;
              return invoke(new Ctor(Ctor.hasParameters ? params : {}), options?.dcId, options);
            };
            cache.set(key, method);
            return method;
          }
          const value = ns[key];
          if (root && value && typeof value === "object" && Object.values(value).some(asRequestClass)) {
            const proxy = namespaceProxy(value);
            cache.set(key, proxy);
            return proxy;
          }
          return;
        }
      });
    };
    return namespaceProxy(api, true);
  }
});

// node_modules/teleproto/extensions/html.js
var require_html = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.HTMLParser = undefined;
  var big_integer_1 = __importDefault(require_BigInteger());
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();

  class HTMLParser {
    static {
      this._tag = /<(\/?)([a-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
    }
    static {
      this._ref = /&(#x?[0-9a-f]+;?|[a-z][a-z0-9]*;?)/gi;
    }
    static {
      this._attr = /([a-z0-9-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s/>]+))?/gi;
    }
    static {
      this._esc = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;"
      };
    }
    static parse(html) {
      if (!html) {
        return [html, []];
      }
      const pieces = [];
      let length = 0;
      const entities = [];
      const open = [];
      const append = (chunk) => {
        if (chunk) {
          pieces.push(chunk);
          length += chunk.length;
        }
      };
      let cursor = 0;
      for (const match of html.matchAll(HTMLParser._tag)) {
        const at = match.index ?? 0;
        append(HTMLParser._decode(html.slice(cursor, at)));
        cursor = at + match[0].length;
        const [, slash, rawName, rawAttrs] = match;
        const name = rawName.toLowerCase();
        if (slash) {
          for (let i = open.length - 1;i >= 0; i--) {
            if (open[i].name === name) {
              const tag = open.splice(i, 1)[0];
              if (tag.entity) {
                tag.entity.length = length - tag.start;
                entities.push(tag.entity);
              }
              break;
            }
          }
          continue;
        }
        if (name === "br") {
          append(`
`);
          continue;
        }
        if (rawAttrs.trimEnd().endsWith("/")) {
          continue;
        }
        const attrs = HTMLParser._readAttributes(rawAttrs);
        open.push({ name, start: length, entity: HTMLParser._entityFor(name, attrs, length, open) });
      }
      append(HTMLParser._decode(html.slice(cursor)));
      return [(0, Helpers_1.stripText)(pieces.join(""), entities), entities];
    }
    static unparse(text, entities, _offset, _length) {
      if (!text) {
        return text;
      }
      if (!entities?.length) {
        return HTMLParser._escapeHtml(text);
      }
      const marks = entities.flatMap((entity, order) => {
        const markup = HTMLParser._markupFor(entity, text);
        if (!markup) {
          return [];
        }
        const end = entity.offset + entity.length;
        return [
          { at: entity.offset, open: true, span: entity.length, order, html: markup[0] },
          { at: end, open: false, span: entity.length, order, html: markup[1] }
        ];
      });
      marks.sort((a, b) => {
        if (a.at !== b.at)
          return a.at - b.at;
        if (a.open !== b.open)
          return a.open ? 1 : -1;
        if (a.span !== b.span)
          return a.open ? b.span - a.span : a.span - b.span;
        return a.open ? a.order - b.order : b.order - a.order;
      });
      const out = [];
      let last = 0;
      for (const mark of marks) {
        if (mark.at > last) {
          out.push(HTMLParser._escapeHtml(text.slice(last, mark.at)));
          last = mark.at;
        }
        out.push(mark.html);
      }
      out.push(HTMLParser._escapeHtml(text.slice(last)));
      return out.join("");
    }
    static _decode(text) {
      if (!text.includes("&")) {
        return text;
      }
      return text.replace(HTMLParser._ref, (whole, ref) => {
        if (ref[0] === "#") {
          const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
          return code <= 1114111 && (code < 55296 || code > 57343) ? String.fromCodePoint(code) : whole;
        }
        return ENTITIES.get(ref) ?? whole;
      });
    }
    static _escapeHtml(text) {
      return text.replace(/[&<>"']/g, (c) => HTMLParser._esc[c]);
    }
    static _readAttributes(source) {
      const attrs = {};
      for (const m of source.matchAll(HTMLParser._attr)) {
        const raw = m[2] ?? "";
        const value = raw[0] === '"' || raw[0] === "'" ? raw.slice(1, -1) : raw;
        attrs[m[1].toLowerCase()] = HTMLParser._decode(value);
      }
      return attrs;
    }
    static _entityFor(name, attrs, offset, stack) {
      switch (name) {
        case "b":
        case "strong":
          return new tl_1.Api.MessageEntityBold({ offset, length: 0 });
        case "i":
        case "em":
          return new tl_1.Api.MessageEntityItalic({ offset, length: 0 });
        case "u":
        case "ins":
          return new tl_1.Api.MessageEntityUnderline({ offset, length: 0 });
        case "s":
        case "del":
        case "strike":
          return new tl_1.Api.MessageEntityStrike({ offset, length: 0 });
        case "spoiler":
        case "tg-spoiler":
          return new tl_1.Api.MessageEntitySpoiler({ offset, length: 0 });
        case "span":
          return attrs.class?.split(/\s+/).includes("tg-spoiler") ? new tl_1.Api.MessageEntitySpoiler({ offset, length: 0 }) : undefined;
        case "blockquote":
          return new tl_1.Api.MessageEntityBlockquote(attrs.expandable !== undefined ? { offset, length: 0, collapsed: true } : { offset, length: 0 });
        case "pre":
          return new tl_1.Api.MessageEntityPre({ offset, length: 0, language: "" });
        case "code": {
          const pre = stack.find((t) => t.entity instanceof tl_1.Api.MessageEntityPre);
          if (pre) {
            const cls = attrs.class;
            if (cls?.startsWith("language-")) {
              pre.entity.language = cls.slice("language-".length);
            }
            return;
          }
          return new tl_1.Api.MessageEntityCode({ offset, length: 0 });
        }
        case "a": {
          const href = attrs.href;
          if (!href) {
            return;
          }
          if (href.startsWith("mailto:")) {
            return new tl_1.Api.MessageEntityEmail({ offset, length: 0 });
          }
          const mention = href.match(/^tg:\/\/user\?id=(\d+)/);
          if (mention) {
            return new tl_1.Api.MessageEntityMentionName({
              offset,
              length: 0,
              userId: (0, big_integer_1.default)(mention[1])
            });
          }
          return new tl_1.Api.MessageEntityTextUrl({ offset, length: 0, url: href });
        }
        case "tg-emoji":
          return new tl_1.Api.MessageEntityCustomEmoji({
            offset,
            length: 0,
            documentId: (0, big_integer_1.default)(attrs["emoji-id"] || "0")
          });
        case "tg-date":
          return new tl_1.Api.MessageEntityFormattedDate({
            offset,
            length: 0,
            date: parseInt(attrs.timestamp ?? "0", 10) || 0,
            relative: attrs.relative !== undefined,
            shortTime: attrs["short-time"] !== undefined,
            longTime: attrs["long-time"] !== undefined,
            shortDate: attrs["short-date"] !== undefined,
            longDate: attrs["long-date"] !== undefined,
            dayOfWeek: attrs["day-of-week"] !== undefined
          });
        default:
          return;
      }
    }
    static _markupFor(entity, text) {
      const body = () => HTMLParser._escapeHtml(text.slice(entity.offset, entity.offset + entity.length));
      switch (entity.className) {
        case "MessageEntityBold":
          return ["<strong>", "</strong>"];
        case "MessageEntitySpoiler":
          return ["<tg-spoiler>", "</tg-spoiler>"];
        case "MessageEntityItalic":
          return ["<em>", "</em>"];
        case "MessageEntityCode":
          return ["<code>", "</code>"];
        case "MessageEntityUnderline":
          return ["<u>", "</u>"];
        case "MessageEntityStrike":
          return ["<del>", "</del>"];
        case "MessageEntityBlockquote":
          return [entity.collapsed ? "<blockquote expandable>" : "<blockquote>", "</blockquote>"];
        case "MessageEntityPre":
          return entity.language ? [`<pre><code class="language-${HTMLParser._escapeHtml(entity.language)}">`, "</code></pre>"] : ["<pre>", "</pre>"];
        case "MessageEntityEmail":
          return [`<a href="mailto:${body()}">`, "</a>"];
        case "MessageEntityUrl":
          return [`<a href="${body()}">`, "</a>"];
        case "MessageEntityTextUrl":
          return [`<a href="${HTMLParser._escapeHtml(entity.url)}">`, "</a>"];
        case "MessageEntityMentionName":
          return [`<a href="tg://user?id=${entity.userId}">`, "</a>"];
        case "MessageEntityCustomEmoji":
          return [`<tg-emoji emoji-id="${entity.documentId}">`, "</tg-emoji>"];
        case "MessageEntityFormattedDate": {
          const flags = [
            entity.relative && "relative",
            entity.shortTime && "short-time",
            entity.longTime && "long-time",
            entity.shortDate && "short-date",
            entity.longDate && "long-date",
            entity.dayOfWeek && "day-of-week"
          ].filter(Boolean).join(" ");
          return [`<tg-date timestamp="${entity.date}"${flags ? " " + flags : ""}>`, "</tg-date>"];
        }
        default:
          return null;
      }
    }
  }
  exports2.HTMLParser = HTMLParser;
  var ENTITIES = new Map(Object.entries({
    AElig: "Æ",
    "AElig;": "Æ",
    AMP: "&",
    "AMP;": "&",
    Aacute: "Á",
    "Aacute;": "Á",
    "Abreve;": "Ă",
    Acirc: "Â",
    "Acirc;": "Â",
    "Acy;": "А",
    "Afr;": "\uD835\uDD04",
    Agrave: "À",
    "Agrave;": "À",
    "Alpha;": "Α",
    "Amacr;": "Ā",
    "And;": "⩓",
    "Aogon;": "Ą",
    "Aopf;": "\uD835\uDD38",
    "ApplyFunction;": "⁡",
    Aring: "Å",
    "Aring;": "Å",
    "Ascr;": "\uD835\uDC9C",
    "Assign;": "≔",
    Atilde: "Ã",
    "Atilde;": "Ã",
    Auml: "Ä",
    "Auml;": "Ä",
    "Backslash;": "∖",
    "Barv;": "⫧",
    "Barwed;": "⌆",
    "Bcy;": "Б",
    "Because;": "∵",
    "Bernoullis;": "ℬ",
    "Beta;": "Β",
    "Bfr;": "\uD835\uDD05",
    "Bopf;": "\uD835\uDD39",
    "Breve;": "˘",
    "Bscr;": "ℬ",
    "Bumpeq;": "≎",
    "CHcy;": "Ч",
    COPY: "©",
    "COPY;": "©",
    "Cacute;": "Ć",
    "Cap;": "⋒",
    "CapitalDifferentialD;": "ⅅ",
    "Cayleys;": "ℭ",
    "Ccaron;": "Č",
    Ccedil: "Ç",
    "Ccedil;": "Ç",
    "Ccirc;": "Ĉ",
    "Cconint;": "∰",
    "Cdot;": "Ċ",
    "Cedilla;": "¸",
    "CenterDot;": "·",
    "Cfr;": "ℭ",
    "Chi;": "Χ",
    "CircleDot;": "⊙",
    "CircleMinus;": "⊖",
    "CirclePlus;": "⊕",
    "CircleTimes;": "⊗",
    "ClockwiseContourIntegral;": "∲",
    "CloseCurlyDoubleQuote;": "”",
    "CloseCurlyQuote;": "’",
    "Colon;": "∷",
    "Colone;": "⩴",
    "Congruent;": "≡",
    "Conint;": "∯",
    "ContourIntegral;": "∮",
    "Copf;": "ℂ",
    "Coproduct;": "∐",
    "CounterClockwiseContourIntegral;": "∳",
    "Cross;": "⨯",
    "Cscr;": "\uD835\uDC9E",
    "Cup;": "⋓",
    "CupCap;": "≍",
    "DD;": "ⅅ",
    "DDotrahd;": "⤑",
    "DJcy;": "Ђ",
    "DScy;": "Ѕ",
    "DZcy;": "Џ",
    "Dagger;": "‡",
    "Darr;": "↡",
    "Dashv;": "⫤",
    "Dcaron;": "Ď",
    "Dcy;": "Д",
    "Del;": "∇",
    "Delta;": "Δ",
    "Dfr;": "\uD835\uDD07",
    "DiacriticalAcute;": "´",
    "DiacriticalDot;": "˙",
    "DiacriticalDoubleAcute;": "˝",
    "DiacriticalGrave;": "`",
    "DiacriticalTilde;": "˜",
    "Diamond;": "⋄",
    "DifferentialD;": "ⅆ",
    "Dopf;": "\uD835\uDD3B",
    "Dot;": "¨",
    "DotDot;": "⃜",
    "DotEqual;": "≐",
    "DoubleContourIntegral;": "∯",
    "DoubleDot;": "¨",
    "DoubleDownArrow;": "⇓",
    "DoubleLeftArrow;": "⇐",
    "DoubleLeftRightArrow;": "⇔",
    "DoubleLeftTee;": "⫤",
    "DoubleLongLeftArrow;": "⟸",
    "DoubleLongLeftRightArrow;": "⟺",
    "DoubleLongRightArrow;": "⟹",
    "DoubleRightArrow;": "⇒",
    "DoubleRightTee;": "⊨",
    "DoubleUpArrow;": "⇑",
    "DoubleUpDownArrow;": "⇕",
    "DoubleVerticalBar;": "∥",
    "DownArrow;": "↓",
    "DownArrowBar;": "⤓",
    "DownArrowUpArrow;": "⇵",
    "DownBreve;": "̑",
    "DownLeftRightVector;": "⥐",
    "DownLeftTeeVector;": "⥞",
    "DownLeftVector;": "↽",
    "DownLeftVectorBar;": "⥖",
    "DownRightTeeVector;": "⥟",
    "DownRightVector;": "⇁",
    "DownRightVectorBar;": "⥗",
    "DownTee;": "⊤",
    "DownTeeArrow;": "↧",
    "Downarrow;": "⇓",
    "Dscr;": "\uD835\uDC9F",
    "Dstrok;": "Đ",
    "ENG;": "Ŋ",
    ETH: "Ð",
    "ETH;": "Ð",
    Eacute: "É",
    "Eacute;": "É",
    "Ecaron;": "Ě",
    Ecirc: "Ê",
    "Ecirc;": "Ê",
    "Ecy;": "Э",
    "Edot;": "Ė",
    "Efr;": "\uD835\uDD08",
    Egrave: "È",
    "Egrave;": "È",
    "Element;": "∈",
    "Emacr;": "Ē",
    "EmptySmallSquare;": "◻",
    "EmptyVerySmallSquare;": "▫",
    "Eogon;": "Ę",
    "Eopf;": "\uD835\uDD3C",
    "Epsilon;": "Ε",
    "Equal;": "⩵",
    "EqualTilde;": "≂",
    "Equilibrium;": "⇌",
    "Escr;": "ℰ",
    "Esim;": "⩳",
    "Eta;": "Η",
    Euml: "Ë",
    "Euml;": "Ë",
    "Exists;": "∃",
    "ExponentialE;": "ⅇ",
    "Fcy;": "Ф",
    "Ffr;": "\uD835\uDD09",
    "FilledSmallSquare;": "◼",
    "FilledVerySmallSquare;": "▪",
    "Fopf;": "\uD835\uDD3D",
    "ForAll;": "∀",
    "Fouriertrf;": "ℱ",
    "Fscr;": "ℱ",
    "GJcy;": "Ѓ",
    GT: ">",
    "GT;": ">",
    "Gamma;": "Γ",
    "Gammad;": "Ϝ",
    "Gbreve;": "Ğ",
    "Gcedil;": "Ģ",
    "Gcirc;": "Ĝ",
    "Gcy;": "Г",
    "Gdot;": "Ġ",
    "Gfr;": "\uD835\uDD0A",
    "Gg;": "⋙",
    "Gopf;": "\uD835\uDD3E",
    "GreaterEqual;": "≥",
    "GreaterEqualLess;": "⋛",
    "GreaterFullEqual;": "≧",
    "GreaterGreater;": "⪢",
    "GreaterLess;": "≷",
    "GreaterSlantEqual;": "⩾",
    "GreaterTilde;": "≳",
    "Gscr;": "\uD835\uDCA2",
    "Gt;": "≫",
    "HARDcy;": "Ъ",
    "Hacek;": "ˇ",
    "Hat;": "^",
    "Hcirc;": "Ĥ",
    "Hfr;": "ℌ",
    "HilbertSpace;": "ℋ",
    "Hopf;": "ℍ",
    "HorizontalLine;": "─",
    "Hscr;": "ℋ",
    "Hstrok;": "Ħ",
    "HumpDownHump;": "≎",
    "HumpEqual;": "≏",
    "IEcy;": "Е",
    "IJlig;": "Ĳ",
    "IOcy;": "Ё",
    Iacute: "Í",
    "Iacute;": "Í",
    Icirc: "Î",
    "Icirc;": "Î",
    "Icy;": "И",
    "Idot;": "İ",
    "Ifr;": "ℑ",
    Igrave: "Ì",
    "Igrave;": "Ì",
    "Im;": "ℑ",
    "Imacr;": "Ī",
    "ImaginaryI;": "ⅈ",
    "Implies;": "⇒",
    "Int;": "∬",
    "Integral;": "∫",
    "Intersection;": "⋂",
    "InvisibleComma;": "⁣",
    "InvisibleTimes;": "⁢",
    "Iogon;": "Į",
    "Iopf;": "\uD835\uDD40",
    "Iota;": "Ι",
    "Iscr;": "ℐ",
    "Itilde;": "Ĩ",
    "Iukcy;": "І",
    Iuml: "Ï",
    "Iuml;": "Ï",
    "Jcirc;": "Ĵ",
    "Jcy;": "Й",
    "Jfr;": "\uD835\uDD0D",
    "Jopf;": "\uD835\uDD41",
    "Jscr;": "\uD835\uDCA5",
    "Jsercy;": "Ј",
    "Jukcy;": "Є",
    "KHcy;": "Х",
    "KJcy;": "Ќ",
    "Kappa;": "Κ",
    "Kcedil;": "Ķ",
    "Kcy;": "К",
    "Kfr;": "\uD835\uDD0E",
    "Kopf;": "\uD835\uDD42",
    "Kscr;": "\uD835\uDCA6",
    "LJcy;": "Љ",
    LT: "<",
    "LT;": "<",
    "Lacute;": "Ĺ",
    "Lambda;": "Λ",
    "Lang;": "⟪",
    "Laplacetrf;": "ℒ",
    "Larr;": "↞",
    "Lcaron;": "Ľ",
    "Lcedil;": "Ļ",
    "Lcy;": "Л",
    "LeftAngleBracket;": "⟨",
    "LeftArrow;": "←",
    "LeftArrowBar;": "⇤",
    "LeftArrowRightArrow;": "⇆",
    "LeftCeiling;": "⌈",
    "LeftDoubleBracket;": "⟦",
    "LeftDownTeeVector;": "⥡",
    "LeftDownVector;": "⇃",
    "LeftDownVectorBar;": "⥙",
    "LeftFloor;": "⌊",
    "LeftRightArrow;": "↔",
    "LeftRightVector;": "⥎",
    "LeftTee;": "⊣",
    "LeftTeeArrow;": "↤",
    "LeftTeeVector;": "⥚",
    "LeftTriangle;": "⊲",
    "LeftTriangleBar;": "⧏",
    "LeftTriangleEqual;": "⊴",
    "LeftUpDownVector;": "⥑",
    "LeftUpTeeVector;": "⥠",
    "LeftUpVector;": "↿",
    "LeftUpVectorBar;": "⥘",
    "LeftVector;": "↼",
    "LeftVectorBar;": "⥒",
    "Leftarrow;": "⇐",
    "Leftrightarrow;": "⇔",
    "LessEqualGreater;": "⋚",
    "LessFullEqual;": "≦",
    "LessGreater;": "≶",
    "LessLess;": "⪡",
    "LessSlantEqual;": "⩽",
    "LessTilde;": "≲",
    "Lfr;": "\uD835\uDD0F",
    "Ll;": "⋘",
    "Lleftarrow;": "⇚",
    "Lmidot;": "Ŀ",
    "LongLeftArrow;": "⟵",
    "LongLeftRightArrow;": "⟷",
    "LongRightArrow;": "⟶",
    "Longleftarrow;": "⟸",
    "Longleftrightarrow;": "⟺",
    "Longrightarrow;": "⟹",
    "Lopf;": "\uD835\uDD43",
    "LowerLeftArrow;": "↙",
    "LowerRightArrow;": "↘",
    "Lscr;": "ℒ",
    "Lsh;": "↰",
    "Lstrok;": "Ł",
    "Lt;": "≪",
    "Map;": "⤅",
    "Mcy;": "М",
    "MediumSpace;": " ",
    "Mellintrf;": "ℳ",
    "Mfr;": "\uD835\uDD10",
    "MinusPlus;": "∓",
    "Mopf;": "\uD835\uDD44",
    "Mscr;": "ℳ",
    "Mu;": "Μ",
    "NJcy;": "Њ",
    "Nacute;": "Ń",
    "Ncaron;": "Ň",
    "Ncedil;": "Ņ",
    "Ncy;": "Н",
    "NegativeMediumSpace;": "​",
    "NegativeThickSpace;": "​",
    "NegativeThinSpace;": "​",
    "NegativeVeryThinSpace;": "​",
    "NestedGreaterGreater;": "≫",
    "NestedLessLess;": "≪",
    "NewLine;": `
`,
    "Nfr;": "\uD835\uDD11",
    "NoBreak;": "⁠",
    "NonBreakingSpace;": " ",
    "Nopf;": "ℕ",
    "Not;": "⫬",
    "NotCongruent;": "≢",
    "NotCupCap;": "≭",
    "NotDoubleVerticalBar;": "∦",
    "NotElement;": "∉",
    "NotEqual;": "≠",
    "NotEqualTilde;": "≂̸",
    "NotExists;": "∄",
    "NotGreater;": "≯",
    "NotGreaterEqual;": "≱",
    "NotGreaterFullEqual;": "≧̸",
    "NotGreaterGreater;": "≫̸",
    "NotGreaterLess;": "≹",
    "NotGreaterSlantEqual;": "⩾̸",
    "NotGreaterTilde;": "≵",
    "NotHumpDownHump;": "≎̸",
    "NotHumpEqual;": "≏̸",
    "NotLeftTriangle;": "⋪",
    "NotLeftTriangleBar;": "⧏̸",
    "NotLeftTriangleEqual;": "⋬",
    "NotLess;": "≮",
    "NotLessEqual;": "≰",
    "NotLessGreater;": "≸",
    "NotLessLess;": "≪̸",
    "NotLessSlantEqual;": "⩽̸",
    "NotLessTilde;": "≴",
    "NotNestedGreaterGreater;": "⪢̸",
    "NotNestedLessLess;": "⪡̸",
    "NotPrecedes;": "⊀",
    "NotPrecedesEqual;": "⪯̸",
    "NotPrecedesSlantEqual;": "⋠",
    "NotReverseElement;": "∌",
    "NotRightTriangle;": "⋫",
    "NotRightTriangleBar;": "⧐̸",
    "NotRightTriangleEqual;": "⋭",
    "NotSquareSubset;": "⊏̸",
    "NotSquareSubsetEqual;": "⋢",
    "NotSquareSuperset;": "⊐̸",
    "NotSquareSupersetEqual;": "⋣",
    "NotSubset;": "⊂⃒",
    "NotSubsetEqual;": "⊈",
    "NotSucceeds;": "⊁",
    "NotSucceedsEqual;": "⪰̸",
    "NotSucceedsSlantEqual;": "⋡",
    "NotSucceedsTilde;": "≿̸",
    "NotSuperset;": "⊃⃒",
    "NotSupersetEqual;": "⊉",
    "NotTilde;": "≁",
    "NotTildeEqual;": "≄",
    "NotTildeFullEqual;": "≇",
    "NotTildeTilde;": "≉",
    "NotVerticalBar;": "∤",
    "Nscr;": "\uD835\uDCA9",
    Ntilde: "Ñ",
    "Ntilde;": "Ñ",
    "Nu;": "Ν",
    "OElig;": "Œ",
    Oacute: "Ó",
    "Oacute;": "Ó",
    Ocirc: "Ô",
    "Ocirc;": "Ô",
    "Ocy;": "О",
    "Odblac;": "Ő",
    "Ofr;": "\uD835\uDD12",
    Ograve: "Ò",
    "Ograve;": "Ò",
    "Omacr;": "Ō",
    "Omega;": "Ω",
    "Omicron;": "Ο",
    "Oopf;": "\uD835\uDD46",
    "OpenCurlyDoubleQuote;": "“",
    "OpenCurlyQuote;": "‘",
    "Or;": "⩔",
    "Oscr;": "\uD835\uDCAA",
    Oslash: "Ø",
    "Oslash;": "Ø",
    Otilde: "Õ",
    "Otilde;": "Õ",
    "Otimes;": "⨷",
    Ouml: "Ö",
    "Ouml;": "Ö",
    "OverBar;": "‾",
    "OverBrace;": "⏞",
    "OverBracket;": "⎴",
    "OverParenthesis;": "⏜",
    "PartialD;": "∂",
    "Pcy;": "П",
    "Pfr;": "\uD835\uDD13",
    "Phi;": "Φ",
    "Pi;": "Π",
    "PlusMinus;": "±",
    "Poincareplane;": "ℌ",
    "Popf;": "ℙ",
    "Pr;": "⪻",
    "Precedes;": "≺",
    "PrecedesEqual;": "⪯",
    "PrecedesSlantEqual;": "≼",
    "PrecedesTilde;": "≾",
    "Prime;": "″",
    "Product;": "∏",
    "Proportion;": "∷",
    "Proportional;": "∝",
    "Pscr;": "\uD835\uDCAB",
    "Psi;": "Ψ",
    QUOT: '"',
    "QUOT;": '"',
    "Qfr;": "\uD835\uDD14",
    "Qopf;": "ℚ",
    "Qscr;": "\uD835\uDCAC",
    "RBarr;": "⤐",
    REG: "®",
    "REG;": "®",
    "Racute;": "Ŕ",
    "Rang;": "⟫",
    "Rarr;": "↠",
    "Rarrtl;": "⤖",
    "Rcaron;": "Ř",
    "Rcedil;": "Ŗ",
    "Rcy;": "Р",
    "Re;": "ℜ",
    "ReverseElement;": "∋",
    "ReverseEquilibrium;": "⇋",
    "ReverseUpEquilibrium;": "⥯",
    "Rfr;": "ℜ",
    "Rho;": "Ρ",
    "RightAngleBracket;": "⟩",
    "RightArrow;": "→",
    "RightArrowBar;": "⇥",
    "RightArrowLeftArrow;": "⇄",
    "RightCeiling;": "⌉",
    "RightDoubleBracket;": "⟧",
    "RightDownTeeVector;": "⥝",
    "RightDownVector;": "⇂",
    "RightDownVectorBar;": "⥕",
    "RightFloor;": "⌋",
    "RightTee;": "⊢",
    "RightTeeArrow;": "↦",
    "RightTeeVector;": "⥛",
    "RightTriangle;": "⊳",
    "RightTriangleBar;": "⧐",
    "RightTriangleEqual;": "⊵",
    "RightUpDownVector;": "⥏",
    "RightUpTeeVector;": "⥜",
    "RightUpVector;": "↾",
    "RightUpVectorBar;": "⥔",
    "RightVector;": "⇀",
    "RightVectorBar;": "⥓",
    "Rightarrow;": "⇒",
    "Ropf;": "ℝ",
    "RoundImplies;": "⥰",
    "Rrightarrow;": "⇛",
    "Rscr;": "ℛ",
    "Rsh;": "↱",
    "RuleDelayed;": "⧴",
    "SHCHcy;": "Щ",
    "SHcy;": "Ш",
    "SOFTcy;": "Ь",
    "Sacute;": "Ś",
    "Sc;": "⪼",
    "Scaron;": "Š",
    "Scedil;": "Ş",
    "Scirc;": "Ŝ",
    "Scy;": "С",
    "Sfr;": "\uD835\uDD16",
    "ShortDownArrow;": "↓",
    "ShortLeftArrow;": "←",
    "ShortRightArrow;": "→",
    "ShortUpArrow;": "↑",
    "Sigma;": "Σ",
    "SmallCircle;": "∘",
    "Sopf;": "\uD835\uDD4A",
    "Sqrt;": "√",
    "Square;": "□",
    "SquareIntersection;": "⊓",
    "SquareSubset;": "⊏",
    "SquareSubsetEqual;": "⊑",
    "SquareSuperset;": "⊐",
    "SquareSupersetEqual;": "⊒",
    "SquareUnion;": "⊔",
    "Sscr;": "\uD835\uDCAE",
    "Star;": "⋆",
    "Sub;": "⋐",
    "Subset;": "⋐",
    "SubsetEqual;": "⊆",
    "Succeeds;": "≻",
    "SucceedsEqual;": "⪰",
    "SucceedsSlantEqual;": "≽",
    "SucceedsTilde;": "≿",
    "SuchThat;": "∋",
    "Sum;": "∑",
    "Sup;": "⋑",
    "Superset;": "⊃",
    "SupersetEqual;": "⊇",
    "Supset;": "⋑",
    THORN: "Þ",
    "THORN;": "Þ",
    "TRADE;": "™",
    "TSHcy;": "Ћ",
    "TScy;": "Ц",
    "Tab;": "\t",
    "Tau;": "Τ",
    "Tcaron;": "Ť",
    "Tcedil;": "Ţ",
    "Tcy;": "Т",
    "Tfr;": "\uD835\uDD17",
    "Therefore;": "∴",
    "Theta;": "Θ",
    "ThickSpace;": "  ",
    "ThinSpace;": " ",
    "Tilde;": "∼",
    "TildeEqual;": "≃",
    "TildeFullEqual;": "≅",
    "TildeTilde;": "≈",
    "Topf;": "\uD835\uDD4B",
    "TripleDot;": "⃛",
    "Tscr;": "\uD835\uDCAF",
    "Tstrok;": "Ŧ",
    Uacute: "Ú",
    "Uacute;": "Ú",
    "Uarr;": "↟",
    "Uarrocir;": "⥉",
    "Ubrcy;": "Ў",
    "Ubreve;": "Ŭ",
    Ucirc: "Û",
    "Ucirc;": "Û",
    "Ucy;": "У",
    "Udblac;": "Ű",
    "Ufr;": "\uD835\uDD18",
    Ugrave: "Ù",
    "Ugrave;": "Ù",
    "Umacr;": "Ū",
    "UnderBar;": "_",
    "UnderBrace;": "⏟",
    "UnderBracket;": "⎵",
    "UnderParenthesis;": "⏝",
    "Union;": "⋃",
    "UnionPlus;": "⊎",
    "Uogon;": "Ų",
    "Uopf;": "\uD835\uDD4C",
    "UpArrow;": "↑",
    "UpArrowBar;": "⤒",
    "UpArrowDownArrow;": "⇅",
    "UpDownArrow;": "↕",
    "UpEquilibrium;": "⥮",
    "UpTee;": "⊥",
    "UpTeeArrow;": "↥",
    "Uparrow;": "⇑",
    "Updownarrow;": "⇕",
    "UpperLeftArrow;": "↖",
    "UpperRightArrow;": "↗",
    "Upsi;": "ϒ",
    "Upsilon;": "Υ",
    "Uring;": "Ů",
    "Uscr;": "\uD835\uDCB0",
    "Utilde;": "Ũ",
    Uuml: "Ü",
    "Uuml;": "Ü",
    "VDash;": "⊫",
    "Vbar;": "⫫",
    "Vcy;": "В",
    "Vdash;": "⊩",
    "Vdashl;": "⫦",
    "Vee;": "⋁",
    "Verbar;": "‖",
    "Vert;": "‖",
    "VerticalBar;": "∣",
    "VerticalLine;": "|",
    "VerticalSeparator;": "❘",
    "VerticalTilde;": "≀",
    "VeryThinSpace;": " ",
    "Vfr;": "\uD835\uDD19",
    "Vopf;": "\uD835\uDD4D",
    "Vscr;": "\uD835\uDCB1",
    "Vvdash;": "⊪",
    "Wcirc;": "Ŵ",
    "Wedge;": "⋀",
    "Wfr;": "\uD835\uDD1A",
    "Wopf;": "\uD835\uDD4E",
    "Wscr;": "\uD835\uDCB2",
    "Xfr;": "\uD835\uDD1B",
    "Xi;": "Ξ",
    "Xopf;": "\uD835\uDD4F",
    "Xscr;": "\uD835\uDCB3",
    "YAcy;": "Я",
    "YIcy;": "Ї",
    "YUcy;": "Ю",
    Yacute: "Ý",
    "Yacute;": "Ý",
    "Ycirc;": "Ŷ",
    "Ycy;": "Ы",
    "Yfr;": "\uD835\uDD1C",
    "Yopf;": "\uD835\uDD50",
    "Yscr;": "\uD835\uDCB4",
    "Yuml;": "Ÿ",
    "ZHcy;": "Ж",
    "Zacute;": "Ź",
    "Zcaron;": "Ž",
    "Zcy;": "З",
    "Zdot;": "Ż",
    "ZeroWidthSpace;": "​",
    "Zeta;": "Ζ",
    "Zfr;": "ℨ",
    "Zopf;": "ℤ",
    "Zscr;": "\uD835\uDCB5",
    aacute: "á",
    "aacute;": "á",
    "abreve;": "ă",
    "ac;": "∾",
    "acE;": "∾̳",
    "acd;": "∿",
    acirc: "â",
    "acirc;": "â",
    acute: "´",
    "acute;": "´",
    "acy;": "а",
    aelig: "æ",
    "aelig;": "æ",
    "af;": "⁡",
    "afr;": "\uD835\uDD1E",
    agrave: "à",
    "agrave;": "à",
    "alefsym;": "ℵ",
    "aleph;": "ℵ",
    "alpha;": "α",
    "amacr;": "ā",
    "amalg;": "⨿",
    amp: "&",
    "amp;": "&",
    "and;": "∧",
    "andand;": "⩕",
    "andd;": "⩜",
    "andslope;": "⩘",
    "andv;": "⩚",
    "ang;": "∠",
    "ange;": "⦤",
    "angle;": "∠",
    "angmsd;": "∡",
    "angmsdaa;": "⦨",
    "angmsdab;": "⦩",
    "angmsdac;": "⦪",
    "angmsdad;": "⦫",
    "angmsdae;": "⦬",
    "angmsdaf;": "⦭",
    "angmsdag;": "⦮",
    "angmsdah;": "⦯",
    "angrt;": "∟",
    "angrtvb;": "⊾",
    "angrtvbd;": "⦝",
    "angsph;": "∢",
    "angst;": "Å",
    "angzarr;": "⍼",
    "aogon;": "ą",
    "aopf;": "\uD835\uDD52",
    "ap;": "≈",
    "apE;": "⩰",
    "apacir;": "⩯",
    "ape;": "≊",
    "apid;": "≋",
    "apos;": "'",
    "approx;": "≈",
    "approxeq;": "≊",
    aring: "å",
    "aring;": "å",
    "ascr;": "\uD835\uDCB6",
    "ast;": "*",
    "asymp;": "≈",
    "asympeq;": "≍",
    atilde: "ã",
    "atilde;": "ã",
    auml: "ä",
    "auml;": "ä",
    "awconint;": "∳",
    "awint;": "⨑",
    "bNot;": "⫭",
    "backcong;": "≌",
    "backepsilon;": "϶",
    "backprime;": "‵",
    "backsim;": "∽",
    "backsimeq;": "⋍",
    "barvee;": "⊽",
    "barwed;": "⌅",
    "barwedge;": "⌅",
    "bbrk;": "⎵",
    "bbrktbrk;": "⎶",
    "bcong;": "≌",
    "bcy;": "б",
    "bdquo;": "„",
    "becaus;": "∵",
    "because;": "∵",
    "bemptyv;": "⦰",
    "bepsi;": "϶",
    "bernou;": "ℬ",
    "beta;": "β",
    "beth;": "ℶ",
    "between;": "≬",
    "bfr;": "\uD835\uDD1F",
    "bigcap;": "⋂",
    "bigcirc;": "◯",
    "bigcup;": "⋃",
    "bigodot;": "⨀",
    "bigoplus;": "⨁",
    "bigotimes;": "⨂",
    "bigsqcup;": "⨆",
    "bigstar;": "★",
    "bigtriangledown;": "▽",
    "bigtriangleup;": "△",
    "biguplus;": "⨄",
    "bigvee;": "⋁",
    "bigwedge;": "⋀",
    "bkarow;": "⤍",
    "blacklozenge;": "⧫",
    "blacksquare;": "▪",
    "blacktriangle;": "▴",
    "blacktriangledown;": "▾",
    "blacktriangleleft;": "◂",
    "blacktriangleright;": "▸",
    "blank;": "␣",
    "blk12;": "▒",
    "blk14;": "░",
    "blk34;": "▓",
    "block;": "█",
    "bne;": "=⃥",
    "bnequiv;": "≡⃥",
    "bnot;": "⌐",
    "bopf;": "\uD835\uDD53",
    "bot;": "⊥",
    "bottom;": "⊥",
    "bowtie;": "⋈",
    "boxDL;": "╗",
    "boxDR;": "╔",
    "boxDl;": "╖",
    "boxDr;": "╓",
    "boxH;": "═",
    "boxHD;": "╦",
    "boxHU;": "╩",
    "boxHd;": "╤",
    "boxHu;": "╧",
    "boxUL;": "╝",
    "boxUR;": "╚",
    "boxUl;": "╜",
    "boxUr;": "╙",
    "boxV;": "║",
    "boxVH;": "╬",
    "boxVL;": "╣",
    "boxVR;": "╠",
    "boxVh;": "╫",
    "boxVl;": "╢",
    "boxVr;": "╟",
    "boxbox;": "⧉",
    "boxdL;": "╕",
    "boxdR;": "╒",
    "boxdl;": "┐",
    "boxdr;": "┌",
    "boxh;": "─",
    "boxhD;": "╥",
    "boxhU;": "╨",
    "boxhd;": "┬",
    "boxhu;": "┴",
    "boxminus;": "⊟",
    "boxplus;": "⊞",
    "boxtimes;": "⊠",
    "boxuL;": "╛",
    "boxuR;": "╘",
    "boxul;": "┘",
    "boxur;": "└",
    "boxv;": "│",
    "boxvH;": "╪",
    "boxvL;": "╡",
    "boxvR;": "╞",
    "boxvh;": "┼",
    "boxvl;": "┤",
    "boxvr;": "├",
    "bprime;": "‵",
    "breve;": "˘",
    brvbar: "¦",
    "brvbar;": "¦",
    "bscr;": "\uD835\uDCB7",
    "bsemi;": "⁏",
    "bsim;": "∽",
    "bsime;": "⋍",
    "bsol;": "\\",
    "bsolb;": "⧅",
    "bsolhsub;": "⟈",
    "bull;": "•",
    "bullet;": "•",
    "bump;": "≎",
    "bumpE;": "⪮",
    "bumpe;": "≏",
    "bumpeq;": "≏",
    "cacute;": "ć",
    "cap;": "∩",
    "capand;": "⩄",
    "capbrcup;": "⩉",
    "capcap;": "⩋",
    "capcup;": "⩇",
    "capdot;": "⩀",
    "caps;": "∩︀",
    "caret;": "⁁",
    "caron;": "ˇ",
    "ccaps;": "⩍",
    "ccaron;": "č",
    ccedil: "ç",
    "ccedil;": "ç",
    "ccirc;": "ĉ",
    "ccups;": "⩌",
    "ccupssm;": "⩐",
    "cdot;": "ċ",
    cedil: "¸",
    "cedil;": "¸",
    "cemptyv;": "⦲",
    cent: "¢",
    "cent;": "¢",
    "centerdot;": "·",
    "cfr;": "\uD835\uDD20",
    "chcy;": "ч",
    "check;": "✓",
    "checkmark;": "✓",
    "chi;": "χ",
    "cir;": "○",
    "cirE;": "⧃",
    "circ;": "ˆ",
    "circeq;": "≗",
    "circlearrowleft;": "↺",
    "circlearrowright;": "↻",
    "circledR;": "®",
    "circledS;": "Ⓢ",
    "circledast;": "⊛",
    "circledcirc;": "⊚",
    "circleddash;": "⊝",
    "cire;": "≗",
    "cirfnint;": "⨐",
    "cirmid;": "⫯",
    "cirscir;": "⧂",
    "clubs;": "♣",
    "clubsuit;": "♣",
    "colon;": ":",
    "colone;": "≔",
    "coloneq;": "≔",
    "comma;": ",",
    "commat;": "@",
    "comp;": "∁",
    "compfn;": "∘",
    "complement;": "∁",
    "complexes;": "ℂ",
    "cong;": "≅",
    "congdot;": "⩭",
    "conint;": "∮",
    "copf;": "\uD835\uDD54",
    "coprod;": "∐",
    copy: "©",
    "copy;": "©",
    "copysr;": "℗",
    "crarr;": "↵",
    "cross;": "✗",
    "cscr;": "\uD835\uDCB8",
    "csub;": "⫏",
    "csube;": "⫑",
    "csup;": "⫐",
    "csupe;": "⫒",
    "ctdot;": "⋯",
    "cudarrl;": "⤸",
    "cudarrr;": "⤵",
    "cuepr;": "⋞",
    "cuesc;": "⋟",
    "cularr;": "↶",
    "cularrp;": "⤽",
    "cup;": "∪",
    "cupbrcap;": "⩈",
    "cupcap;": "⩆",
    "cupcup;": "⩊",
    "cupdot;": "⊍",
    "cupor;": "⩅",
    "cups;": "∪︀",
    "curarr;": "↷",
    "curarrm;": "⤼",
    "curlyeqprec;": "⋞",
    "curlyeqsucc;": "⋟",
    "curlyvee;": "⋎",
    "curlywedge;": "⋏",
    curren: "¤",
    "curren;": "¤",
    "curvearrowleft;": "↶",
    "curvearrowright;": "↷",
    "cuvee;": "⋎",
    "cuwed;": "⋏",
    "cwconint;": "∲",
    "cwint;": "∱",
    "cylcty;": "⌭",
    "dArr;": "⇓",
    "dHar;": "⥥",
    "dagger;": "†",
    "daleth;": "ℸ",
    "darr;": "↓",
    "dash;": "‐",
    "dashv;": "⊣",
    "dbkarow;": "⤏",
    "dblac;": "˝",
    "dcaron;": "ď",
    "dcy;": "д",
    "dd;": "ⅆ",
    "ddagger;": "‡",
    "ddarr;": "⇊",
    "ddotseq;": "⩷",
    deg: "°",
    "deg;": "°",
    "delta;": "δ",
    "demptyv;": "⦱",
    "dfisht;": "⥿",
    "dfr;": "\uD835\uDD21",
    "dharl;": "⇃",
    "dharr;": "⇂",
    "diam;": "⋄",
    "diamond;": "⋄",
    "diamondsuit;": "♦",
    "diams;": "♦",
    "die;": "¨",
    "digamma;": "ϝ",
    "disin;": "⋲",
    "div;": "÷",
    divide: "÷",
    "divide;": "÷",
    "divideontimes;": "⋇",
    "divonx;": "⋇",
    "djcy;": "ђ",
    "dlcorn;": "⌞",
    "dlcrop;": "⌍",
    "dollar;": "$",
    "dopf;": "\uD835\uDD55",
    "dot;": "˙",
    "doteq;": "≐",
    "doteqdot;": "≑",
    "dotminus;": "∸",
    "dotplus;": "∔",
    "dotsquare;": "⊡",
    "doublebarwedge;": "⌆",
    "downarrow;": "↓",
    "downdownarrows;": "⇊",
    "downharpoonleft;": "⇃",
    "downharpoonright;": "⇂",
    "drbkarow;": "⤐",
    "drcorn;": "⌟",
    "drcrop;": "⌌",
    "dscr;": "\uD835\uDCB9",
    "dscy;": "ѕ",
    "dsol;": "⧶",
    "dstrok;": "đ",
    "dtdot;": "⋱",
    "dtri;": "▿",
    "dtrif;": "▾",
    "duarr;": "⇵",
    "duhar;": "⥯",
    "dwangle;": "⦦",
    "dzcy;": "џ",
    "dzigrarr;": "⟿",
    "eDDot;": "⩷",
    "eDot;": "≑",
    eacute: "é",
    "eacute;": "é",
    "easter;": "⩮",
    "ecaron;": "ě",
    "ecir;": "≖",
    ecirc: "ê",
    "ecirc;": "ê",
    "ecolon;": "≕",
    "ecy;": "э",
    "edot;": "ė",
    "ee;": "ⅇ",
    "efDot;": "≒",
    "efr;": "\uD835\uDD22",
    "eg;": "⪚",
    egrave: "è",
    "egrave;": "è",
    "egs;": "⪖",
    "egsdot;": "⪘",
    "el;": "⪙",
    "elinters;": "⏧",
    "ell;": "ℓ",
    "els;": "⪕",
    "elsdot;": "⪗",
    "emacr;": "ē",
    "empty;": "∅",
    "emptyset;": "∅",
    "emptyv;": "∅",
    "emsp13;": " ",
    "emsp14;": " ",
    "emsp;": " ",
    "eng;": "ŋ",
    "ensp;": " ",
    "eogon;": "ę",
    "eopf;": "\uD835\uDD56",
    "epar;": "⋕",
    "eparsl;": "⧣",
    "eplus;": "⩱",
    "epsi;": "ε",
    "epsilon;": "ε",
    "epsiv;": "ϵ",
    "eqcirc;": "≖",
    "eqcolon;": "≕",
    "eqsim;": "≂",
    "eqslantgtr;": "⪖",
    "eqslantless;": "⪕",
    "equals;": "=",
    "equest;": "≟",
    "equiv;": "≡",
    "equivDD;": "⩸",
    "eqvparsl;": "⧥",
    "erDot;": "≓",
    "erarr;": "⥱",
    "escr;": "ℯ",
    "esdot;": "≐",
    "esim;": "≂",
    "eta;": "η",
    eth: "ð",
    "eth;": "ð",
    euml: "ë",
    "euml;": "ë",
    "euro;": "€",
    "excl;": "!",
    "exist;": "∃",
    "expectation;": "ℰ",
    "exponentiale;": "ⅇ",
    "fallingdotseq;": "≒",
    "fcy;": "ф",
    "female;": "♀",
    "ffilig;": "ﬃ",
    "fflig;": "ﬀ",
    "ffllig;": "ﬄ",
    "ffr;": "\uD835\uDD23",
    "filig;": "ﬁ",
    "fjlig;": "fj",
    "flat;": "♭",
    "fllig;": "ﬂ",
    "fltns;": "▱",
    "fnof;": "ƒ",
    "fopf;": "\uD835\uDD57",
    "forall;": "∀",
    "fork;": "⋔",
    "forkv;": "⫙",
    "fpartint;": "⨍",
    frac12: "½",
    "frac12;": "½",
    "frac13;": "⅓",
    frac14: "¼",
    "frac14;": "¼",
    "frac15;": "⅕",
    "frac16;": "⅙",
    "frac18;": "⅛",
    "frac23;": "⅔",
    "frac25;": "⅖",
    frac34: "¾",
    "frac34;": "¾",
    "frac35;": "⅗",
    "frac38;": "⅜",
    "frac45;": "⅘",
    "frac56;": "⅚",
    "frac58;": "⅝",
    "frac78;": "⅞",
    "frasl;": "⁄",
    "frown;": "⌢",
    "fscr;": "\uD835\uDCBB",
    "gE;": "≧",
    "gEl;": "⪌",
    "gacute;": "ǵ",
    "gamma;": "γ",
    "gammad;": "ϝ",
    "gap;": "⪆",
    "gbreve;": "ğ",
    "gcirc;": "ĝ",
    "gcy;": "г",
    "gdot;": "ġ",
    "ge;": "≥",
    "gel;": "⋛",
    "geq;": "≥",
    "geqq;": "≧",
    "geqslant;": "⩾",
    "ges;": "⩾",
    "gescc;": "⪩",
    "gesdot;": "⪀",
    "gesdoto;": "⪂",
    "gesdotol;": "⪄",
    "gesl;": "⋛︀",
    "gesles;": "⪔",
    "gfr;": "\uD835\uDD24",
    "gg;": "≫",
    "ggg;": "⋙",
    "gimel;": "ℷ",
    "gjcy;": "ѓ",
    "gl;": "≷",
    "glE;": "⪒",
    "gla;": "⪥",
    "glj;": "⪤",
    "gnE;": "≩",
    "gnap;": "⪊",
    "gnapprox;": "⪊",
    "gne;": "⪈",
    "gneq;": "⪈",
    "gneqq;": "≩",
    "gnsim;": "⋧",
    "gopf;": "\uD835\uDD58",
    "grave;": "`",
    "gscr;": "ℊ",
    "gsim;": "≳",
    "gsime;": "⪎",
    "gsiml;": "⪐",
    gt: ">",
    "gt;": ">",
    "gtcc;": "⪧",
    "gtcir;": "⩺",
    "gtdot;": "⋗",
    "gtlPar;": "⦕",
    "gtquest;": "⩼",
    "gtrapprox;": "⪆",
    "gtrarr;": "⥸",
    "gtrdot;": "⋗",
    "gtreqless;": "⋛",
    "gtreqqless;": "⪌",
    "gtrless;": "≷",
    "gtrsim;": "≳",
    "gvertneqq;": "≩︀",
    "gvnE;": "≩︀",
    "hArr;": "⇔",
    "hairsp;": " ",
    "half;": "½",
    "hamilt;": "ℋ",
    "hardcy;": "ъ",
    "harr;": "↔",
    "harrcir;": "⥈",
    "harrw;": "↭",
    "hbar;": "ℏ",
    "hcirc;": "ĥ",
    "hearts;": "♥",
    "heartsuit;": "♥",
    "hellip;": "…",
    "hercon;": "⊹",
    "hfr;": "\uD835\uDD25",
    "hksearow;": "⤥",
    "hkswarow;": "⤦",
    "hoarr;": "⇿",
    "homtht;": "∻",
    "hookleftarrow;": "↩",
    "hookrightarrow;": "↪",
    "hopf;": "\uD835\uDD59",
    "horbar;": "―",
    "hscr;": "\uD835\uDCBD",
    "hslash;": "ℏ",
    "hstrok;": "ħ",
    "hybull;": "⁃",
    "hyphen;": "‐",
    iacute: "í",
    "iacute;": "í",
    "ic;": "⁣",
    icirc: "î",
    "icirc;": "î",
    "icy;": "и",
    "iecy;": "е",
    iexcl: "¡",
    "iexcl;": "¡",
    "iff;": "⇔",
    "ifr;": "\uD835\uDD26",
    igrave: "ì",
    "igrave;": "ì",
    "ii;": "ⅈ",
    "iiiint;": "⨌",
    "iiint;": "∭",
    "iinfin;": "⧜",
    "iiota;": "℩",
    "ijlig;": "ĳ",
    "imacr;": "ī",
    "image;": "ℑ",
    "imagline;": "ℐ",
    "imagpart;": "ℑ",
    "imath;": "ı",
    "imof;": "⊷",
    "imped;": "Ƶ",
    "in;": "∈",
    "incare;": "℅",
    "infin;": "∞",
    "infintie;": "⧝",
    "inodot;": "ı",
    "int;": "∫",
    "intcal;": "⊺",
    "integers;": "ℤ",
    "intercal;": "⊺",
    "intlarhk;": "⨗",
    "intprod;": "⨼",
    "iocy;": "ё",
    "iogon;": "į",
    "iopf;": "\uD835\uDD5A",
    "iota;": "ι",
    "iprod;": "⨼",
    iquest: "¿",
    "iquest;": "¿",
    "iscr;": "\uD835\uDCBE",
    "isin;": "∈",
    "isinE;": "⋹",
    "isindot;": "⋵",
    "isins;": "⋴",
    "isinsv;": "⋳",
    "isinv;": "∈",
    "it;": "⁢",
    "itilde;": "ĩ",
    "iukcy;": "і",
    iuml: "ï",
    "iuml;": "ï",
    "jcirc;": "ĵ",
    "jcy;": "й",
    "jfr;": "\uD835\uDD27",
    "jmath;": "ȷ",
    "jopf;": "\uD835\uDD5B",
    "jscr;": "\uD835\uDCBF",
    "jsercy;": "ј",
    "jukcy;": "є",
    "kappa;": "κ",
    "kappav;": "ϰ",
    "kcedil;": "ķ",
    "kcy;": "к",
    "kfr;": "\uD835\uDD28",
    "kgreen;": "ĸ",
    "khcy;": "х",
    "kjcy;": "ќ",
    "kopf;": "\uD835\uDD5C",
    "kscr;": "\uD835\uDCC0",
    "lAarr;": "⇚",
    "lArr;": "⇐",
    "lAtail;": "⤛",
    "lBarr;": "⤎",
    "lE;": "≦",
    "lEg;": "⪋",
    "lHar;": "⥢",
    "lacute;": "ĺ",
    "laemptyv;": "⦴",
    "lagran;": "ℒ",
    "lambda;": "λ",
    "lang;": "⟨",
    "langd;": "⦑",
    "langle;": "⟨",
    "lap;": "⪅",
    laquo: "«",
    "laquo;": "«",
    "larr;": "←",
    "larrb;": "⇤",
    "larrbfs;": "⤟",
    "larrfs;": "⤝",
    "larrhk;": "↩",
    "larrlp;": "↫",
    "larrpl;": "⤹",
    "larrsim;": "⥳",
    "larrtl;": "↢",
    "lat;": "⪫",
    "latail;": "⤙",
    "late;": "⪭",
    "lates;": "⪭︀",
    "lbarr;": "⤌",
    "lbbrk;": "❲",
    "lbrace;": "{",
    "lbrack;": "[",
    "lbrke;": "⦋",
    "lbrksld;": "⦏",
    "lbrkslu;": "⦍",
    "lcaron;": "ľ",
    "lcedil;": "ļ",
    "lceil;": "⌈",
    "lcub;": "{",
    "lcy;": "л",
    "ldca;": "⤶",
    "ldquo;": "“",
    "ldquor;": "„",
    "ldrdhar;": "⥧",
    "ldrushar;": "⥋",
    "ldsh;": "↲",
    "le;": "≤",
    "leftarrow;": "←",
    "leftarrowtail;": "↢",
    "leftharpoondown;": "↽",
    "leftharpoonup;": "↼",
    "leftleftarrows;": "⇇",
    "leftrightarrow;": "↔",
    "leftrightarrows;": "⇆",
    "leftrightharpoons;": "⇋",
    "leftrightsquigarrow;": "↭",
    "leftthreetimes;": "⋋",
    "leg;": "⋚",
    "leq;": "≤",
    "leqq;": "≦",
    "leqslant;": "⩽",
    "les;": "⩽",
    "lescc;": "⪨",
    "lesdot;": "⩿",
    "lesdoto;": "⪁",
    "lesdotor;": "⪃",
    "lesg;": "⋚︀",
    "lesges;": "⪓",
    "lessapprox;": "⪅",
    "lessdot;": "⋖",
    "lesseqgtr;": "⋚",
    "lesseqqgtr;": "⪋",
    "lessgtr;": "≶",
    "lesssim;": "≲",
    "lfisht;": "⥼",
    "lfloor;": "⌊",
    "lfr;": "\uD835\uDD29",
    "lg;": "≶",
    "lgE;": "⪑",
    "lhard;": "↽",
    "lharu;": "↼",
    "lharul;": "⥪",
    "lhblk;": "▄",
    "ljcy;": "љ",
    "ll;": "≪",
    "llarr;": "⇇",
    "llcorner;": "⌞",
    "llhard;": "⥫",
    "lltri;": "◺",
    "lmidot;": "ŀ",
    "lmoust;": "⎰",
    "lmoustache;": "⎰",
    "lnE;": "≨",
    "lnap;": "⪉",
    "lnapprox;": "⪉",
    "lne;": "⪇",
    "lneq;": "⪇",
    "lneqq;": "≨",
    "lnsim;": "⋦",
    "loang;": "⟬",
    "loarr;": "⇽",
    "lobrk;": "⟦",
    "longleftarrow;": "⟵",
    "longleftrightarrow;": "⟷",
    "longmapsto;": "⟼",
    "longrightarrow;": "⟶",
    "looparrowleft;": "↫",
    "looparrowright;": "↬",
    "lopar;": "⦅",
    "lopf;": "\uD835\uDD5D",
    "loplus;": "⨭",
    "lotimes;": "⨴",
    "lowast;": "∗",
    "lowbar;": "_",
    "loz;": "◊",
    "lozenge;": "◊",
    "lozf;": "⧫",
    "lpar;": "(",
    "lparlt;": "⦓",
    "lrarr;": "⇆",
    "lrcorner;": "⌟",
    "lrhar;": "⇋",
    "lrhard;": "⥭",
    "lrm;": "‎",
    "lrtri;": "⊿",
    "lsaquo;": "‹",
    "lscr;": "\uD835\uDCC1",
    "lsh;": "↰",
    "lsim;": "≲",
    "lsime;": "⪍",
    "lsimg;": "⪏",
    "lsqb;": "[",
    "lsquo;": "‘",
    "lsquor;": "‚",
    "lstrok;": "ł",
    lt: "<",
    "lt;": "<",
    "ltcc;": "⪦",
    "ltcir;": "⩹",
    "ltdot;": "⋖",
    "lthree;": "⋋",
    "ltimes;": "⋉",
    "ltlarr;": "⥶",
    "ltquest;": "⩻",
    "ltrPar;": "⦖",
    "ltri;": "◃",
    "ltrie;": "⊴",
    "ltrif;": "◂",
    "lurdshar;": "⥊",
    "luruhar;": "⥦",
    "lvertneqq;": "≨︀",
    "lvnE;": "≨︀",
    "mDDot;": "∺",
    macr: "¯",
    "macr;": "¯",
    "male;": "♂",
    "malt;": "✠",
    "maltese;": "✠",
    "map;": "↦",
    "mapsto;": "↦",
    "mapstodown;": "↧",
    "mapstoleft;": "↤",
    "mapstoup;": "↥",
    "marker;": "▮",
    "mcomma;": "⨩",
    "mcy;": "м",
    "mdash;": "—",
    "measuredangle;": "∡",
    "mfr;": "\uD835\uDD2A",
    "mho;": "℧",
    micro: "µ",
    "micro;": "µ",
    "mid;": "∣",
    "midast;": "*",
    "midcir;": "⫰",
    middot: "·",
    "middot;": "·",
    "minus;": "−",
    "minusb;": "⊟",
    "minusd;": "∸",
    "minusdu;": "⨪",
    "mlcp;": "⫛",
    "mldr;": "…",
    "mnplus;": "∓",
    "models;": "⊧",
    "mopf;": "\uD835\uDD5E",
    "mp;": "∓",
    "mscr;": "\uD835\uDCC2",
    "mstpos;": "∾",
    "mu;": "μ",
    "multimap;": "⊸",
    "mumap;": "⊸",
    "nGg;": "⋙̸",
    "nGt;": "≫⃒",
    "nGtv;": "≫̸",
    "nLeftarrow;": "⇍",
    "nLeftrightarrow;": "⇎",
    "nLl;": "⋘̸",
    "nLt;": "≪⃒",
    "nLtv;": "≪̸",
    "nRightarrow;": "⇏",
    "nVDash;": "⊯",
    "nVdash;": "⊮",
    "nabla;": "∇",
    "nacute;": "ń",
    "nang;": "∠⃒",
    "nap;": "≉",
    "napE;": "⩰̸",
    "napid;": "≋̸",
    "napos;": "ŉ",
    "napprox;": "≉",
    "natur;": "♮",
    "natural;": "♮",
    "naturals;": "ℕ",
    nbsp: " ",
    "nbsp;": " ",
    "nbump;": "≎̸",
    "nbumpe;": "≏̸",
    "ncap;": "⩃",
    "ncaron;": "ň",
    "ncedil;": "ņ",
    "ncong;": "≇",
    "ncongdot;": "⩭̸",
    "ncup;": "⩂",
    "ncy;": "н",
    "ndash;": "–",
    "ne;": "≠",
    "neArr;": "⇗",
    "nearhk;": "⤤",
    "nearr;": "↗",
    "nearrow;": "↗",
    "nedot;": "≐̸",
    "nequiv;": "≢",
    "nesear;": "⤨",
    "nesim;": "≂̸",
    "nexist;": "∄",
    "nexists;": "∄",
    "nfr;": "\uD835\uDD2B",
    "ngE;": "≧̸",
    "nge;": "≱",
    "ngeq;": "≱",
    "ngeqq;": "≧̸",
    "ngeqslant;": "⩾̸",
    "nges;": "⩾̸",
    "ngsim;": "≵",
    "ngt;": "≯",
    "ngtr;": "≯",
    "nhArr;": "⇎",
    "nharr;": "↮",
    "nhpar;": "⫲",
    "ni;": "∋",
    "nis;": "⋼",
    "nisd;": "⋺",
    "niv;": "∋",
    "njcy;": "њ",
    "nlArr;": "⇍",
    "nlE;": "≦̸",
    "nlarr;": "↚",
    "nldr;": "‥",
    "nle;": "≰",
    "nleftarrow;": "↚",
    "nleftrightarrow;": "↮",
    "nleq;": "≰",
    "nleqq;": "≦̸",
    "nleqslant;": "⩽̸",
    "nles;": "⩽̸",
    "nless;": "≮",
    "nlsim;": "≴",
    "nlt;": "≮",
    "nltri;": "⋪",
    "nltrie;": "⋬",
    "nmid;": "∤",
    "nopf;": "\uD835\uDD5F",
    not: "¬",
    "not;": "¬",
    "notin;": "∉",
    "notinE;": "⋹̸",
    "notindot;": "⋵̸",
    "notinva;": "∉",
    "notinvb;": "⋷",
    "notinvc;": "⋶",
    "notni;": "∌",
    "notniva;": "∌",
    "notnivb;": "⋾",
    "notnivc;": "⋽",
    "npar;": "∦",
    "nparallel;": "∦",
    "nparsl;": "⫽⃥",
    "npart;": "∂̸",
    "npolint;": "⨔",
    "npr;": "⊀",
    "nprcue;": "⋠",
    "npre;": "⪯̸",
    "nprec;": "⊀",
    "npreceq;": "⪯̸",
    "nrArr;": "⇏",
    "nrarr;": "↛",
    "nrarrc;": "⤳̸",
    "nrarrw;": "↝̸",
    "nrightarrow;": "↛",
    "nrtri;": "⋫",
    "nrtrie;": "⋭",
    "nsc;": "⊁",
    "nsccue;": "⋡",
    "nsce;": "⪰̸",
    "nscr;": "\uD835\uDCC3",
    "nshortmid;": "∤",
    "nshortparallel;": "∦",
    "nsim;": "≁",
    "nsime;": "≄",
    "nsimeq;": "≄",
    "nsmid;": "∤",
    "nspar;": "∦",
    "nsqsube;": "⋢",
    "nsqsupe;": "⋣",
    "nsub;": "⊄",
    "nsubE;": "⫅̸",
    "nsube;": "⊈",
    "nsubset;": "⊂⃒",
    "nsubseteq;": "⊈",
    "nsubseteqq;": "⫅̸",
    "nsucc;": "⊁",
    "nsucceq;": "⪰̸",
    "nsup;": "⊅",
    "nsupE;": "⫆̸",
    "nsupe;": "⊉",
    "nsupset;": "⊃⃒",
    "nsupseteq;": "⊉",
    "nsupseteqq;": "⫆̸",
    "ntgl;": "≹",
    ntilde: "ñ",
    "ntilde;": "ñ",
    "ntlg;": "≸",
    "ntriangleleft;": "⋪",
    "ntrianglelefteq;": "⋬",
    "ntriangleright;": "⋫",
    "ntrianglerighteq;": "⋭",
    "nu;": "ν",
    "num;": "#",
    "numero;": "№",
    "numsp;": " ",
    "nvDash;": "⊭",
    "nvHarr;": "⤄",
    "nvap;": "≍⃒",
    "nvdash;": "⊬",
    "nvge;": "≥⃒",
    "nvgt;": ">⃒",
    "nvinfin;": "⧞",
    "nvlArr;": "⤂",
    "nvle;": "≤⃒",
    "nvlt;": "<⃒",
    "nvltrie;": "⊴⃒",
    "nvrArr;": "⤃",
    "nvrtrie;": "⊵⃒",
    "nvsim;": "∼⃒",
    "nwArr;": "⇖",
    "nwarhk;": "⤣",
    "nwarr;": "↖",
    "nwarrow;": "↖",
    "nwnear;": "⤧",
    "oS;": "Ⓢ",
    oacute: "ó",
    "oacute;": "ó",
    "oast;": "⊛",
    "ocir;": "⊚",
    ocirc: "ô",
    "ocirc;": "ô",
    "ocy;": "о",
    "odash;": "⊝",
    "odblac;": "ő",
    "odiv;": "⨸",
    "odot;": "⊙",
    "odsold;": "⦼",
    "oelig;": "œ",
    "ofcir;": "⦿",
    "ofr;": "\uD835\uDD2C",
    "ogon;": "˛",
    ograve: "ò",
    "ograve;": "ò",
    "ogt;": "⧁",
    "ohbar;": "⦵",
    "ohm;": "Ω",
    "oint;": "∮",
    "olarr;": "↺",
    "olcir;": "⦾",
    "olcross;": "⦻",
    "oline;": "‾",
    "olt;": "⧀",
    "omacr;": "ō",
    "omega;": "ω",
    "omicron;": "ο",
    "omid;": "⦶",
    "ominus;": "⊖",
    "oopf;": "\uD835\uDD60",
    "opar;": "⦷",
    "operp;": "⦹",
    "oplus;": "⊕",
    "or;": "∨",
    "orarr;": "↻",
    "ord;": "⩝",
    "order;": "ℴ",
    "orderof;": "ℴ",
    ordf: "ª",
    "ordf;": "ª",
    ordm: "º",
    "ordm;": "º",
    "origof;": "⊶",
    "oror;": "⩖",
    "orslope;": "⩗",
    "orv;": "⩛",
    "oscr;": "ℴ",
    oslash: "ø",
    "oslash;": "ø",
    "osol;": "⊘",
    otilde: "õ",
    "otilde;": "õ",
    "otimes;": "⊗",
    "otimesas;": "⨶",
    ouml: "ö",
    "ouml;": "ö",
    "ovbar;": "⌽",
    "par;": "∥",
    para: "¶",
    "para;": "¶",
    "parallel;": "∥",
    "parsim;": "⫳",
    "parsl;": "⫽",
    "part;": "∂",
    "pcy;": "п",
    "percnt;": "%",
    "period;": ".",
    "permil;": "‰",
    "perp;": "⊥",
    "pertenk;": "‱",
    "pfr;": "\uD835\uDD2D",
    "phi;": "φ",
    "phiv;": "ϕ",
    "phmmat;": "ℳ",
    "phone;": "☎",
    "pi;": "π",
    "pitchfork;": "⋔",
    "piv;": "ϖ",
    "planck;": "ℏ",
    "planckh;": "ℎ",
    "plankv;": "ℏ",
    "plus;": "+",
    "plusacir;": "⨣",
    "plusb;": "⊞",
    "pluscir;": "⨢",
    "plusdo;": "∔",
    "plusdu;": "⨥",
    "pluse;": "⩲",
    plusmn: "±",
    "plusmn;": "±",
    "plussim;": "⨦",
    "plustwo;": "⨧",
    "pm;": "±",
    "pointint;": "⨕",
    "popf;": "\uD835\uDD61",
    pound: "£",
    "pound;": "£",
    "pr;": "≺",
    "prE;": "⪳",
    "prap;": "⪷",
    "prcue;": "≼",
    "pre;": "⪯",
    "prec;": "≺",
    "precapprox;": "⪷",
    "preccurlyeq;": "≼",
    "preceq;": "⪯",
    "precnapprox;": "⪹",
    "precneqq;": "⪵",
    "precnsim;": "⋨",
    "precsim;": "≾",
    "prime;": "′",
    "primes;": "ℙ",
    "prnE;": "⪵",
    "prnap;": "⪹",
    "prnsim;": "⋨",
    "prod;": "∏",
    "profalar;": "⌮",
    "profline;": "⌒",
    "profsurf;": "⌓",
    "prop;": "∝",
    "propto;": "∝",
    "prsim;": "≾",
    "prurel;": "⊰",
    "pscr;": "\uD835\uDCC5",
    "psi;": "ψ",
    "puncsp;": " ",
    "qfr;": "\uD835\uDD2E",
    "qint;": "⨌",
    "qopf;": "\uD835\uDD62",
    "qprime;": "⁗",
    "qscr;": "\uD835\uDCC6",
    "quaternions;": "ℍ",
    "quatint;": "⨖",
    "quest;": "?",
    "questeq;": "≟",
    quot: '"',
    "quot;": '"',
    "rAarr;": "⇛",
    "rArr;": "⇒",
    "rAtail;": "⤜",
    "rBarr;": "⤏",
    "rHar;": "⥤",
    "race;": "∽̱",
    "racute;": "ŕ",
    "radic;": "√",
    "raemptyv;": "⦳",
    "rang;": "⟩",
    "rangd;": "⦒",
    "range;": "⦥",
    "rangle;": "⟩",
    raquo: "»",
    "raquo;": "»",
    "rarr;": "→",
    "rarrap;": "⥵",
    "rarrb;": "⇥",
    "rarrbfs;": "⤠",
    "rarrc;": "⤳",
    "rarrfs;": "⤞",
    "rarrhk;": "↪",
    "rarrlp;": "↬",
    "rarrpl;": "⥅",
    "rarrsim;": "⥴",
    "rarrtl;": "↣",
    "rarrw;": "↝",
    "ratail;": "⤚",
    "ratio;": "∶",
    "rationals;": "ℚ",
    "rbarr;": "⤍",
    "rbbrk;": "❳",
    "rbrace;": "}",
    "rbrack;": "]",
    "rbrke;": "⦌",
    "rbrksld;": "⦎",
    "rbrkslu;": "⦐",
    "rcaron;": "ř",
    "rcedil;": "ŗ",
    "rceil;": "⌉",
    "rcub;": "}",
    "rcy;": "р",
    "rdca;": "⤷",
    "rdldhar;": "⥩",
    "rdquo;": "”",
    "rdquor;": "”",
    "rdsh;": "↳",
    "real;": "ℜ",
    "realine;": "ℛ",
    "realpart;": "ℜ",
    "reals;": "ℝ",
    "rect;": "▭",
    reg: "®",
    "reg;": "®",
    "rfisht;": "⥽",
    "rfloor;": "⌋",
    "rfr;": "\uD835\uDD2F",
    "rhard;": "⇁",
    "rharu;": "⇀",
    "rharul;": "⥬",
    "rho;": "ρ",
    "rhov;": "ϱ",
    "rightarrow;": "→",
    "rightarrowtail;": "↣",
    "rightharpoondown;": "⇁",
    "rightharpoonup;": "⇀",
    "rightleftarrows;": "⇄",
    "rightleftharpoons;": "⇌",
    "rightrightarrows;": "⇉",
    "rightsquigarrow;": "↝",
    "rightthreetimes;": "⋌",
    "ring;": "˚",
    "risingdotseq;": "≓",
    "rlarr;": "⇄",
    "rlhar;": "⇌",
    "rlm;": "‏",
    "rmoust;": "⎱",
    "rmoustache;": "⎱",
    "rnmid;": "⫮",
    "roang;": "⟭",
    "roarr;": "⇾",
    "robrk;": "⟧",
    "ropar;": "⦆",
    "ropf;": "\uD835\uDD63",
    "roplus;": "⨮",
    "rotimes;": "⨵",
    "rpar;": ")",
    "rpargt;": "⦔",
    "rppolint;": "⨒",
    "rrarr;": "⇉",
    "rsaquo;": "›",
    "rscr;": "\uD835\uDCC7",
    "rsh;": "↱",
    "rsqb;": "]",
    "rsquo;": "’",
    "rsquor;": "’",
    "rthree;": "⋌",
    "rtimes;": "⋊",
    "rtri;": "▹",
    "rtrie;": "⊵",
    "rtrif;": "▸",
    "rtriltri;": "⧎",
    "ruluhar;": "⥨",
    "rx;": "℞",
    "sacute;": "ś",
    "sbquo;": "‚",
    "sc;": "≻",
    "scE;": "⪴",
    "scap;": "⪸",
    "scaron;": "š",
    "sccue;": "≽",
    "sce;": "⪰",
    "scedil;": "ş",
    "scirc;": "ŝ",
    "scnE;": "⪶",
    "scnap;": "⪺",
    "scnsim;": "⋩",
    "scpolint;": "⨓",
    "scsim;": "≿",
    "scy;": "с",
    "sdot;": "⋅",
    "sdotb;": "⊡",
    "sdote;": "⩦",
    "seArr;": "⇘",
    "searhk;": "⤥",
    "searr;": "↘",
    "searrow;": "↘",
    sect: "§",
    "sect;": "§",
    "semi;": ";",
    "seswar;": "⤩",
    "setminus;": "∖",
    "setmn;": "∖",
    "sext;": "✶",
    "sfr;": "\uD835\uDD30",
    "sfrown;": "⌢",
    "sharp;": "♯",
    "shchcy;": "щ",
    "shcy;": "ш",
    "shortmid;": "∣",
    "shortparallel;": "∥",
    shy: "­",
    "shy;": "­",
    "sigma;": "σ",
    "sigmaf;": "ς",
    "sigmav;": "ς",
    "sim;": "∼",
    "simdot;": "⩪",
    "sime;": "≃",
    "simeq;": "≃",
    "simg;": "⪞",
    "simgE;": "⪠",
    "siml;": "⪝",
    "simlE;": "⪟",
    "simne;": "≆",
    "simplus;": "⨤",
    "simrarr;": "⥲",
    "slarr;": "←",
    "smallsetminus;": "∖",
    "smashp;": "⨳",
    "smeparsl;": "⧤",
    "smid;": "∣",
    "smile;": "⌣",
    "smt;": "⪪",
    "smte;": "⪬",
    "smtes;": "⪬︀",
    "softcy;": "ь",
    "sol;": "/",
    "solb;": "⧄",
    "solbar;": "⌿",
    "sopf;": "\uD835\uDD64",
    "spades;": "♠",
    "spadesuit;": "♠",
    "spar;": "∥",
    "sqcap;": "⊓",
    "sqcaps;": "⊓︀",
    "sqcup;": "⊔",
    "sqcups;": "⊔︀",
    "sqsub;": "⊏",
    "sqsube;": "⊑",
    "sqsubset;": "⊏",
    "sqsubseteq;": "⊑",
    "sqsup;": "⊐",
    "sqsupe;": "⊒",
    "sqsupset;": "⊐",
    "sqsupseteq;": "⊒",
    "squ;": "□",
    "square;": "□",
    "squarf;": "▪",
    "squf;": "▪",
    "srarr;": "→",
    "sscr;": "\uD835\uDCC8",
    "ssetmn;": "∖",
    "ssmile;": "⌣",
    "sstarf;": "⋆",
    "star;": "☆",
    "starf;": "★",
    "straightepsilon;": "ϵ",
    "straightphi;": "ϕ",
    "strns;": "¯",
    "sub;": "⊂",
    "subE;": "⫅",
    "subdot;": "⪽",
    "sube;": "⊆",
    "subedot;": "⫃",
    "submult;": "⫁",
    "subnE;": "⫋",
    "subne;": "⊊",
    "subplus;": "⪿",
    "subrarr;": "⥹",
    "subset;": "⊂",
    "subseteq;": "⊆",
    "subseteqq;": "⫅",
    "subsetneq;": "⊊",
    "subsetneqq;": "⫋",
    "subsim;": "⫇",
    "subsub;": "⫕",
    "subsup;": "⫓",
    "succ;": "≻",
    "succapprox;": "⪸",
    "succcurlyeq;": "≽",
    "succeq;": "⪰",
    "succnapprox;": "⪺",
    "succneqq;": "⪶",
    "succnsim;": "⋩",
    "succsim;": "≿",
    "sum;": "∑",
    "sung;": "♪",
    sup1: "¹",
    "sup1;": "¹",
    sup2: "²",
    "sup2;": "²",
    sup3: "³",
    "sup3;": "³",
    "sup;": "⊃",
    "supE;": "⫆",
    "supdot;": "⪾",
    "supdsub;": "⫘",
    "supe;": "⊇",
    "supedot;": "⫄",
    "suphsol;": "⟉",
    "suphsub;": "⫗",
    "suplarr;": "⥻",
    "supmult;": "⫂",
    "supnE;": "⫌",
    "supne;": "⊋",
    "supplus;": "⫀",
    "supset;": "⊃",
    "supseteq;": "⊇",
    "supseteqq;": "⫆",
    "supsetneq;": "⊋",
    "supsetneqq;": "⫌",
    "supsim;": "⫈",
    "supsub;": "⫔",
    "supsup;": "⫖",
    "swArr;": "⇙",
    "swarhk;": "⤦",
    "swarr;": "↙",
    "swarrow;": "↙",
    "swnwar;": "⤪",
    szlig: "ß",
    "szlig;": "ß",
    "target;": "⌖",
    "tau;": "τ",
    "tbrk;": "⎴",
    "tcaron;": "ť",
    "tcedil;": "ţ",
    "tcy;": "т",
    "tdot;": "⃛",
    "telrec;": "⌕",
    "tfr;": "\uD835\uDD31",
    "there4;": "∴",
    "therefore;": "∴",
    "theta;": "θ",
    "thetasym;": "ϑ",
    "thetav;": "ϑ",
    "thickapprox;": "≈",
    "thicksim;": "∼",
    "thinsp;": " ",
    "thkap;": "≈",
    "thksim;": "∼",
    thorn: "þ",
    "thorn;": "þ",
    "tilde;": "˜",
    times: "×",
    "times;": "×",
    "timesb;": "⊠",
    "timesbar;": "⨱",
    "timesd;": "⨰",
    "tint;": "∭",
    "toea;": "⤨",
    "top;": "⊤",
    "topbot;": "⌶",
    "topcir;": "⫱",
    "topf;": "\uD835\uDD65",
    "topfork;": "⫚",
    "tosa;": "⤩",
    "tprime;": "‴",
    "trade;": "™",
    "triangle;": "▵",
    "triangledown;": "▿",
    "triangleleft;": "◃",
    "trianglelefteq;": "⊴",
    "triangleq;": "≜",
    "triangleright;": "▹",
    "trianglerighteq;": "⊵",
    "tridot;": "◬",
    "trie;": "≜",
    "triminus;": "⨺",
    "triplus;": "⨹",
    "trisb;": "⧍",
    "tritime;": "⨻",
    "trpezium;": "⏢",
    "tscr;": "\uD835\uDCC9",
    "tscy;": "ц",
    "tshcy;": "ћ",
    "tstrok;": "ŧ",
    "twixt;": "≬",
    "twoheadleftarrow;": "↞",
    "twoheadrightarrow;": "↠",
    "uArr;": "⇑",
    "uHar;": "⥣",
    uacute: "ú",
    "uacute;": "ú",
    "uarr;": "↑",
    "ubrcy;": "ў",
    "ubreve;": "ŭ",
    ucirc: "û",
    "ucirc;": "û",
    "ucy;": "у",
    "udarr;": "⇅",
    "udblac;": "ű",
    "udhar;": "⥮",
    "ufisht;": "⥾",
    "ufr;": "\uD835\uDD32",
    ugrave: "ù",
    "ugrave;": "ù",
    "uharl;": "↿",
    "uharr;": "↾",
    "uhblk;": "▀",
    "ulcorn;": "⌜",
    "ulcorner;": "⌜",
    "ulcrop;": "⌏",
    "ultri;": "◸",
    "umacr;": "ū",
    uml: "¨",
    "uml;": "¨",
    "uogon;": "ų",
    "uopf;": "\uD835\uDD66",
    "uparrow;": "↑",
    "updownarrow;": "↕",
    "upharpoonleft;": "↿",
    "upharpoonright;": "↾",
    "uplus;": "⊎",
    "upsi;": "υ",
    "upsih;": "ϒ",
    "upsilon;": "υ",
    "upuparrows;": "⇈",
    "urcorn;": "⌝",
    "urcorner;": "⌝",
    "urcrop;": "⌎",
    "uring;": "ů",
    "urtri;": "◹",
    "uscr;": "\uD835\uDCCA",
    "utdot;": "⋰",
    "utilde;": "ũ",
    "utri;": "▵",
    "utrif;": "▴",
    "uuarr;": "⇈",
    uuml: "ü",
    "uuml;": "ü",
    "uwangle;": "⦧",
    "vArr;": "⇕",
    "vBar;": "⫨",
    "vBarv;": "⫩",
    "vDash;": "⊨",
    "vangrt;": "⦜",
    "varepsilon;": "ϵ",
    "varkappa;": "ϰ",
    "varnothing;": "∅",
    "varphi;": "ϕ",
    "varpi;": "ϖ",
    "varpropto;": "∝",
    "varr;": "↕",
    "varrho;": "ϱ",
    "varsigma;": "ς",
    "varsubsetneq;": "⊊︀",
    "varsubsetneqq;": "⫋︀",
    "varsupsetneq;": "⊋︀",
    "varsupsetneqq;": "⫌︀",
    "vartheta;": "ϑ",
    "vartriangleleft;": "⊲",
    "vartriangleright;": "⊳",
    "vcy;": "в",
    "vdash;": "⊢",
    "vee;": "∨",
    "veebar;": "⊻",
    "veeeq;": "≚",
    "vellip;": "⋮",
    "verbar;": "|",
    "vert;": "|",
    "vfr;": "\uD835\uDD33",
    "vltri;": "⊲",
    "vnsub;": "⊂⃒",
    "vnsup;": "⊃⃒",
    "vopf;": "\uD835\uDD67",
    "vprop;": "∝",
    "vrtri;": "⊳",
    "vscr;": "\uD835\uDCCB",
    "vsubnE;": "⫋︀",
    "vsubne;": "⊊︀",
    "vsupnE;": "⫌︀",
    "vsupne;": "⊋︀",
    "vzigzag;": "⦚",
    "wcirc;": "ŵ",
    "wedbar;": "⩟",
    "wedge;": "∧",
    "wedgeq;": "≙",
    "weierp;": "℘",
    "wfr;": "\uD835\uDD34",
    "wopf;": "\uD835\uDD68",
    "wp;": "℘",
    "wr;": "≀",
    "wreath;": "≀",
    "wscr;": "\uD835\uDCCC",
    "xcap;": "⋂",
    "xcirc;": "◯",
    "xcup;": "⋃",
    "xdtri;": "▽",
    "xfr;": "\uD835\uDD35",
    "xhArr;": "⟺",
    "xharr;": "⟷",
    "xi;": "ξ",
    "xlArr;": "⟸",
    "xlarr;": "⟵",
    "xmap;": "⟼",
    "xnis;": "⋻",
    "xodot;": "⨀",
    "xopf;": "\uD835\uDD69",
    "xoplus;": "⨁",
    "xotime;": "⨂",
    "xrArr;": "⟹",
    "xrarr;": "⟶",
    "xscr;": "\uD835\uDCCD",
    "xsqcup;": "⨆",
    "xuplus;": "⨄",
    "xutri;": "△",
    "xvee;": "⋁",
    "xwedge;": "⋀",
    yacute: "ý",
    "yacute;": "ý",
    "yacy;": "я",
    "ycirc;": "ŷ",
    "ycy;": "ы",
    yen: "¥",
    "yen;": "¥",
    "yfr;": "\uD835\uDD36",
    "yicy;": "ї",
    "yopf;": "\uD835\uDD6A",
    "yscr;": "\uD835\uDCCE",
    "yucy;": "ю",
    yuml: "ÿ",
    "yuml;": "ÿ",
    "zacute;": "ź",
    "zcaron;": "ž",
    "zcy;": "з",
    "zdot;": "ż",
    "zeetrf;": "ℨ",
    "zeta;": "ζ",
    "zfr;": "\uD835\uDD37",
    "zhcy;": "ж",
    "zigrarr;": "⇝",
    "zopf;": "\uD835\uDD6B",
    "zscr;": "\uD835\uDCCF",
    "zwj;": "‍",
    "zwnj;": "‌"
  }));
});

// node_modules/teleproto/extensions/markdownv2.js
var require_markdownv2 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MarkdownV2Parser = undefined;
  var tl_1 = require_tl();
  var html_1 = require_html();
  var delimiters = {
    "*": "b",
    _: "i",
    __: "u",
    "~": "s",
    "||": "tg-spoiler"
  };
  function readUntil(source, start, end, escapes) {
    let value = "";
    for (let i = start;i < source.length; i++) {
      if (!escapes && source[i] === "`") {
        const marker = source.startsWith("```", i) ? "```" : "`";
        const code = readUntil(source, i + marker.length, marker, "\\`");
        if (code) {
          value += source.slice(i, code.end);
          i = code.end - 1;
          continue;
        }
      }
      if (source[i] === "\\" && i + 1 < source.length) {
        const next = source[i + 1];
        if (!escapes) {
          value += source.slice(i, i + 2);
          i++;
          continue;
        }
        if (escapes.includes(next)) {
          value += next;
          i++;
          continue;
        }
      }
      if (source.startsWith(end, i))
        return { value, end: i + end.length };
      value += source[i];
    }
    return;
  }
  function toHtml(source, links = true, quotes = true) {
    const parts = [];
    const opened = new Map;
    const escape = html_1.HTMLParser._escapeHtml;
    let i = 0;
    while (i < source.length) {
      const char = source[i];
      if (char === "\\" && source.charCodeAt(i + 1) >= 1 && source.charCodeAt(i + 1) <= 126) {
        parts.push(escape(source[i + 1]));
        i += 2;
        continue;
      }
      if (char === "\r") {
        i++;
        continue;
      }
      if (char === "`") {
        const marker2 = source.startsWith("```", i) ? "```" : "`";
        const code = readUntil(source, i + marker2.length, marker2, "\\`");
        if (code) {
          let body = code.value;
          let language = "";
          if (marker2 === "```") {
            const header = /^([\w.+-]*)\r?\n/.exec(body);
            if (header) {
              language = header[1];
              body = body.slice(header[0].length);
            }
          }
          parts.push(marker2 === "`" ? `<code>${escape(body)}</code>` : `<pre><code class="language-${escape(language)}">${escape(body)}</code></pre>`);
          i = code.end;
          continue;
        }
      }
      if (quotes && (i === 0 || source[i - 1] === `
`) && (char === ">" || source.startsWith("**>", i))) {
        const lines = [];
        let cursor = i + (char === ">" ? 0 : 2);
        while (source[cursor] === ">") {
          const newline = source.indexOf(`
`, cursor);
          const end = newline < 0 ? source.length : newline;
          lines.push(source.slice(cursor + 1, end));
          cursor = end;
          if (newline < 0 || source[newline + 1] !== ">")
            break;
          cursor++;
        }
        let body = lines.join(`
`);
        const suffix2 = /(\\*)\|\|$/.exec(body);
        let html = toHtml(body, links, false);
        const collapsed = !!suffix2 && suffix2[1].length % 2 === 0 && html.endsWith("||");
        if (collapsed)
          body = body.slice(0, -2);
        if (collapsed)
          html = toHtml(body, links, false);
        parts.push(`<blockquote${collapsed ? " expandable" : ""}>${html}</blockquote>`);
        i = cursor;
        continue;
      }
      const emoji = source.startsWith("![", i);
      if (links && (char === "[" || emoji)) {
        const label = readUntil(source, i + (emoji ? 2 : 1), "]");
        const url = label && source[label.end] === "(" ? readUntil(source, label.end + 1, ")", "\\)") : undefined;
        if (label && url) {
          const body = toHtml(label.value, false, false);
          const id = /^tg:\/\/emoji\?id=(\d+)$/.exec(url.value);
          if (emoji && id) {
            parts.push(`<tg-emoji emoji-id="${id[1]}">${body}</tg-emoji>`);
          } else {
            parts.push(`${emoji ? "!" : ""}<a href="${escape(url.value)}">${body}</a>`);
          }
          i = url.end;
          continue;
        }
      }
      const marker = source.startsWith("__", i) ? "__" : source.startsWith("||", i) ? "||" : char;
      if (source.startsWith("**", i) && source[i - 1] === "_" && source[i + 2] === "_") {
        i += 2;
        continue;
      }
      const tag = delimiters[marker];
      if (tag) {
        const at = opened.get(marker);
        if (at === undefined) {
          opened.set(marker, parts.length);
          parts.push(marker);
        } else {
          parts[at] = `<${tag}>`;
          parts.push(`</${tag}>`);
          opened.delete(marker);
        }
        i += marker.length;
        continue;
      }
      parts.push(escape(char));
      i++;
    }
    return parts.join("");
  }
  function escapeText(text) {
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
  }
  function escapeCode(text) {
    return text.replace(/[\\`]/g, "\\$&");
  }
  function escapeUrl(url) {
    return url.replace(/[\\)]/g, "\\$&");
  }
  function joinMarkup(left, right) {
    return left + (left.endsWith("_") && right.startsWith("_") ? "**" : "") + right;
  }
  function render(text, start, end, nodes) {
    let output = "";
    let cursor = start;
    for (const { entity, children } of nodes) {
      output = joinMarkup(output, escapeText(text.slice(cursor, entity.offset)));
      const raw = text.slice(entity.offset, entity.offset + entity.length);
      const body = render(text, entity.offset, entity.offset + entity.length, children);
      let value;
      const wrap = (marker) => joinMarkup(joinMarkup(marker, body), marker);
      switch (entity.className) {
        case "MessageEntityBold":
          value = wrap("*");
          break;
        case "MessageEntityItalic":
          value = wrap("_");
          break;
        case "MessageEntityUnderline":
          value = wrap("__");
          break;
        case "MessageEntityStrike":
          value = wrap("~");
          break;
        case "MessageEntitySpoiler":
          value = wrap("||");
          break;
        case "MessageEntityCode":
          value = "`" + escapeCode(raw) + "`";
          break;
        case "MessageEntityPre":
          value = "```" + (entity.language || "") + `
` + escapeCode(raw) + "```";
          break;
        case "MessageEntityBlockquote":
          value = "**>" + body.replace(/\n/g, `
>`) + (entity.collapsed ? "||" : "");
          break;
        case "MessageEntityTextUrl":
          value = `[${body}](${escapeUrl(entity.url)})`;
          break;
        case "MessageEntityUrl":
          value = `[${body}](${escapeUrl(raw)})`;
          break;
        case "MessageEntityEmail":
          value = `[${body}](${escapeUrl("mailto:" + raw)})`;
          break;
        case "MessageEntityMentionName":
          value = `[${body}](tg://user?id=${entity.userId})`;
          break;
        case "MessageEntityCustomEmoji":
          value = `![${body}](tg://emoji?id=${entity.documentId})`;
          break;
        default:
          value = body;
      }
      output = joinMarkup(output, value);
      cursor = entity.offset + entity.length;
    }
    return joinMarkup(output, escapeText(text.slice(cursor, end)));
  }

  class MarkdownV2Parser {
    static parse(message) {
      const [text, entities] = html_1.HTMLParser.parse(toHtml(message));
      return [text, entities.filter((entity) => entity.length > 0)];
    }
    static unparse(text, entities) {
      const roots = [];
      const stack = [];
      const sorted = [...entities ?? []].sort((a, b) => a.offset - b.offset || b.length - a.length || Number(b instanceof tl_1.Api.MessageEntityBlockquote) - Number(a instanceof tl_1.Api.MessageEntityBlockquote));
      for (const entity of sorted) {
        if (entity.length <= 0 || entity.offset < 0 || entity.offset + entity.length > text.length)
          continue;
        while (stack.length && entity.offset >= stack[stack.length - 1].entity.offset + stack[stack.length - 1].entity.length) {
          stack.pop();
        }
        const parent = stack[stack.length - 1];
        if (parent && entity.offset + entity.length > parent.entity.offset + parent.entity.length)
          continue;
        const node = { entity, children: [] };
        (parent ? parent.children : roots).push(node);
        stack.push(node);
      }
      return render(text, 0, text.length, roots);
    }
  }
  exports2.MarkdownV2Parser = MarkdownV2Parser;
});

// node_modules/teleproto/client/updates/context.js
var require_context = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.UpdateContext = undefined;
  var common_1 = require_common();
  var Utils_1 = require_Utils();
  var big_integer_1 = __importDefault(require_BigInteger());

  class UpdateContext extends common_1.EventCommon {
    constructor(client, peerId, entities) {
      super({ chatPeer: peerId === undefined ? undefined : (0, Utils_1.getPeer)((0, big_integer_1.default)(peerId)) });
      this._entities = entities ?? new Map;
      this._setClient(client);
    }
    get peers() {
      return this._entities;
    }
    async getChat() {
      if (!this.pendingChat) {
        this.pendingChat = super.getChat();
      }
      const pending = this.pendingChat;
      try {
        return await pending;
      } finally {
        if (this.pendingChat === pending)
          this.pendingChat = undefined;
      }
    }
  }
  exports2.UpdateContext = UpdateContext;
});

// node_modules/teleproto/client/updates/composer.js
var require_composer = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ClientUpdates = undefined;
  var events_1 = require("events");
  var tl_1 = require_tl();
  var common_1 = require_common();
  var Utils_1 = require_Utils();
  var Helpers_1 = require_Helpers();
  var network_1 = require_network();
  var context_1 = require_context();
  var dispatch_1 = require_dispatch();
  var fieldsOf = (update) => update ?? {};
  function nameOf(update) {
    const className = fieldsOf(update).className;
    if (!className) {
      return update instanceof network_1.UpdateConnectionState ? "connectionState" : undefined;
    }
    const bare = className.startsWith("Update") ? className.slice("Update".length) : className;
    return bare.charAt(0).toLowerCase() + bare.slice(1);
  }
  function expandShortMessage(update, selfId) {
    const short = update instanceof tl_1.Api.UpdateShortMessage || update instanceof tl_1.Api.UpdateShortChatMessage;
    if (!short)
      return;
    const peerId = update instanceof tl_1.Api.UpdateShortMessage ? new tl_1.Api.PeerUser({ userId: update.userId }) : new tl_1.Api.PeerChat({ chatId: update.chatId });
    const fromUser = update instanceof tl_1.Api.UpdateShortMessage ? update.userId : update.fromId;
    return new tl_1.Api.UpdateNewMessage({
      message: new tl_1.Api.Message({
        out: update.out,
        mentioned: update.mentioned,
        mediaUnread: update.mediaUnread,
        silent: update.silent,
        id: update.id,
        peerId,
        fromId: new tl_1.Api.PeerUser({
          userId: update.out && selfId ? selfId : fromUser
        }),
        message: update.message,
        date: update.date,
        fwdFrom: update.fwdFrom,
        viaBotId: update.viaBotId,
        replyTo: update.replyTo,
        entities: update.entities,
        ttlPeriod: update.ttlPeriod
      }),
      pts: update.pts,
      ptsCount: update.ptsCount
    });
  }
  function peerOf(update) {
    const fields = fieldsOf(update);
    if (fields.peer instanceof tl_1.Api.DialogPeerCommunity || fields.peer instanceof tl_1.Api.NotifyCommunity) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: fields.peer.communityId }));
    }
    const peer = fields.message?.peerId ?? (fields.peer instanceof tl_1.Api.DialogPeer || fields.peer instanceof tl_1.Api.NotifyPeer ? fields.peer.peer : undefined) ?? (fields.peer instanceof tl_1.Api.PeerUser || fields.peer instanceof tl_1.Api.PeerChat || fields.peer instanceof tl_1.Api.PeerChannel ? fields.peer : undefined);
    if (peer)
      return (0, Utils_1.getPeerId)(peer);
    if (fields.channelId) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChannel({ channelId: fields.channelId }));
    }
    if (fields.chatId) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerChat({ chatId: fields.chatId }));
    }
    if (fields.userId) {
      return (0, Utils_1.getPeerId)(new tl_1.Api.PeerUser({ userId: fields.userId }));
    }
    return;
  }

  class ClientUpdates {
    constructor(client) {
      this.chain = [];
      this.independent = new Set;
      this.registrations = new Map;
      this.watches = new Set;
      this.client = client;
    }
    use(middleware) {
      if (this.client._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      if (typeof middleware !== "function") {
        throw new TypeError("Update middleware must be a function");
      }
      this.chain.push(middleware);
      return () => this.remove(middleware);
    }
    on(target, handler, options = {}) {
      const run = compose(handler);
      if (typeof target !== "string" && !Array.isArray(target)) {
        return this.register(this.builderMiddleware(target, run, options), handler, options.independent);
      }
      const names = new Set((Array.isArray(target) ? target : [target]).map((name) => name.charAt(0).toLowerCase() + name.slice(1)));
      const matchesChat = this.chatMatcher(options);
      return this.register(async (update, next) => {
        const name = nameOf(update);
        if (!name || !names.has(name))
          return next();
        if (!await matchesChat(update))
          return next();
        if (options.func && !await options.func(update))
          return next();
        await run(update, next);
      }, handler, options.independent);
    }
    watch(chats, handler, options = {}) {
      if (this.client._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      const wanted = (0, Helpers_1.isArrayLike)(chats) ? chats : [chats];
      let offHandler;
      if (handler) {
        const events = options.events ?? ["newMessage", "newChannelMessage"];
        offHandler = typeof events === "string" || Array.isArray(events) ? this.on(events, handler, {
          chats: wanted,
          func: options.func,
          independent: options.independent
        }) : this.on(events, handler, {
          chats: wanted,
          func: options.func,
          independent: options.independent
        });
      }
      const entry = {
        chats: wanted,
        channels: new Set,
        stopped: false,
        controller: watchController(),
        retryDelay: 1000
      };
      this.watches.add(entry);
      this.arm(entry);
      return () => {
        if (entry.stopped)
          return;
        entry.stopped = true;
        this.watches.delete(entry);
        offHandler?.();
        entry.controller.abort();
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.channels.clear();
      };
    }
    async arm(entry) {
      if (entry.stopped || entry.arming || this.blockedAuthorization || !this.client.updateManager.isRunning)
        return;
      const controller = entry.controller;
      const active = () => !controller.signal.aborted && !entry.stopped;
      const task = (async () => {
        await this.client._connectedDeferred.promise;
        if (!active() || !this.client.updateManager.isRunning)
          return;
        let retry = false;
        const pending = [];
        const pendingChannels = new Set;
        const failed = async (error) => {
          if (!active())
            return;
          if (this._suspendAuthorization(error))
            return;
          const code = error.errorMessage;
          retry ||= !(error instanceof TypeError || error instanceof RangeError) && !["CHANNEL_PRIVATE", "CHANNEL_INVALID", "USERNAME_INVALID", "USERNAME_NOT_OCCUPIED", "PEER_ID_INVALID"].includes(code ?? "");
          await this.reportError(error, undefined);
        };
        for (const chat of entry.chats) {
          if (!active())
            return;
          try {
            const input = await this.client.getInputEntity(chat);
            if (!active())
              return;
            if (!(input instanceof tl_1.Api.InputPeerChannel))
              continue;
            const channelId = input.channelId.toString();
            if (entry.channels.has(channelId) || pendingChannels.has(channelId))
              continue;
            pendingChannels.add(channelId);
            const subscription = this.client.updateManager.watchChannel(channelId, new tl_1.Api.InputChannel({
              channelId: input.channelId,
              accessHash: input.accessHash
            }), controller.signal);
            pending.push(subscription.then(() => {
              if (active())
                entry.channels.add(channelId);
            }).catch(failed));
          } catch (error) {
            await failed(error);
          }
        }
        await Promise.all(pending);
        if (retry && active()) {
          entry.retryTimer = setTimeout(() => {
            entry.retryTimer = undefined;
            this.arm(entry);
          }, entry.retryDelay);
          entry.retryTimer.unref?.();
          entry.retryDelay = Math.min(entry.retryDelay * 2, 64000);
        } else {
          entry.retryDelay = 1000;
        }
      })();
      entry.arming = task;
      try {
        await task;
      } catch (error) {
        this.client._log.error(`Error arming channel watch: ${error}`);
      } finally {
        if (entry.arming === task)
          entry.arming = undefined;
      }
    }
    _pause() {
      for (const entry of this.watches) {
        entry.controller.abort();
        entry.controller = watchController();
        entry.channels.clear();
        entry.arming = undefined;
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.retryTimer = undefined;
      }
    }
    _resume() {
      if (this.blockedAuthorization)
        return;
      const alive = new Set(this.client.updateManager.watchedChannelIds());
      for (const entry of this.watches) {
        if (entry.stopped)
          continue;
        for (const channelId of [...entry.channels]) {
          if (!alive.has(channelId))
            entry.channels.delete(channelId);
        }
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.retryTimer = undefined;
        if (entry.channels.size < entry.chats.length)
          this.arm(entry);
      }
    }
    get authorizationError() {
      return this.blockedAuthorization;
    }
    _suspendAuthorization(error) {
      const code = error?.errorMessage;
      if (![
        "AUTH_KEY_UNREGISTERED",
        "AUTH_KEY_INVALID",
        "AUTH_KEY_DUPLICATED",
        "SESSION_REVOKED",
        "SESSION_EXPIRED",
        "USER_DEACTIVATED",
        "USER_DEACTIVATED_BAN"
      ].includes(code ?? ""))
        return false;
      if (!this.blockedAuthorization) {
        this.blockedAuthorization = error;
        this._pause();
        this.reportError(error);
      }
      return true;
    }
    _resumeAuthorization() {
      if (this.client._destroyed)
        return;
      this.blockedAuthorization = undefined;
      this._resume();
      this.client.updateManager.catchUp();
    }
    get watched() {
      return this.client.updateManager.watchedChannelIds();
    }
    get polling() {
      return this.client.updateManager.polling;
    }
    off(middleware) {
      this.remove(middleware);
      for (const [registered, handlers] of this.registrations) {
        if (handlers.includes(middleware))
          this.remove(registered);
      }
    }
    catch(handler) {
      this.onError = handler;
      return this;
    }
    get handlers() {
      return [...this.chain, ...this.independent];
    }
    _destroy() {
      for (const entry of this.watches) {
        entry.stopped = true;
        entry.controller.abort();
        if (entry.retryTimer)
          clearTimeout(entry.retryTimer);
        entry.channels.clear();
      }
      this.watches.clear();
      this.chain.length = 0;
      this.independent.clear();
      this.registrations.clear();
      this.onError = undefined;
      this.blockedAuthorization = undefined;
    }
    get state() {
      const state = this.client.updateManager.state;
      return state ? { ...state } : undefined;
    }
    async catchUp() {
      await this.client.updateManager.catchUp();
    }
    async dispatch(update, peers) {
      if (this.client._destroyed)
        throw new Error("Cannot dispatch through a destroyed client");
      if (peers)
        fieldsOf(update)._entities = new Map(peers);
      await (0, dispatch_1._dispatchUpdate)(this.client, { update });
    }
    async _dispatch(update) {
      if (update instanceof network_1.UpdateConnectionState && update.state === network_1.UpdateConnectionState.connected) {
        this._resume();
      }
      if (!this.chain.length && !this.independent.size)
        return;
      const expanded = expandShortMessage(update, this.client._selfInputPeer?.userId);
      if (expanded) {
        fieldsOf(expanded)._entities = fieldsOf(update)._entities;
        update = expanded;
      }
      const message = fieldsOf(update).message;
      if ((message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) && message._client !== this.client) {
        message._finishInit(this.client, fieldsOf(update)._entities ?? new Map);
      }
      if (update && typeof update === "object" && !("state" in update)) {
        Object.defineProperty(update, "state", {
          value: {},
          enumerable: false,
          writable: true
        });
      }
      this.attachContext(update);
      const chain = [...this.chain];
      const branches = [...this.independent];
      const deliver = async (handlers) => {
        try {
          await runChain(handlers, update, async () => {});
        } catch (e) {
          await this.reportError(e, update);
        }
      };
      await Promise.all([deliver(chain), ...branches.map((handler) => deliver([handler]))]);
    }
    attachContext(event, update = event) {
      if ("context" in event)
        return;
      let context;
      Object.defineProperty(event, "context", {
        get: () => context ??= new context_1.UpdateContext(this.client, peerOf(update), fieldsOf(update)._entities),
        enumerable: false
      });
    }
    register(middleware, handler, independent = false) {
      if (this.client._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      this.registrations.set(middleware, Array.isArray(handler) ? handler.slice() : [handler]);
      if (independent) {
        this.independent.add(middleware);
        return () => this.remove(middleware);
      }
      return this.use(middleware);
    }
    remove(middleware) {
      this.registrations.delete(middleware);
      this.independent.delete(middleware);
      const index = this.chain.indexOf(middleware);
      if (index >= 0)
        this.chain.splice(index, 1);
    }
    async reportError(error, update) {
      if (this.onError) {
        try {
          await this.onError(error, update);
          return;
        } catch (e) {
          error = e;
        }
      }
      if (this.client._errorHandler) {
        try {
          await this.client._errorHandler(error);
          return;
        } catch (handlerError) {
          error = handlerError;
        }
      }
      this.client._log.error(`Error in the update chain: ${error}`);
    }
    chatMatcher(options) {
      if (options.chats === undefined)
        return async () => true;
      let ids;
      const wanted = (0, Helpers_1.isArrayLike)(options.chats) ? options.chats : [options.chats];
      return async (update) => {
        if (!ids) {
          ids = new Set(await (0, common_1._intoIdSet)(this.client, wanted) ?? []);
        }
        const peer = peerOf(update);
        const listed = peer !== undefined && ids.has(peer);
        return options.blacklistChats ? !listed : listed;
      };
    }
    builderMiddleware(builder, run, options) {
      const matchesChat = this.chatMatcher(options);
      builder.client = this.client;
      return async (update, next) => {
        if (!builder.resolved)
          await builder.resolve(this.client);
        let event = builder.build(update, undefined, this.client._selfInputPeer ? this.client._selfInputPeer.userId : undefined);
        if (!event)
          return next();
        event._client = this.client;
        if ("_eventName" in event) {
          event.originalUpdate = update;
          event._entities = update._entities ?? new Map;
          event._setClient(this.client);
        }
        this.attachContext(event, update);
        if (!await builder.filter(event))
          return next();
        if (!await matchesChat(update))
          return next();
        if (options.func && !await options.func(update))
          return next();
        await run(event, next);
      };
    }
  }
  exports2.ClientUpdates = ClientUpdates;
  function compose(handler) {
    if (!Array.isArray(handler)) {
      if (typeof handler !== "function") {
        throw new TypeError("Update handler must be a function");
      }
      return handler;
    }
    const handlers = handler.slice();
    for (const item of handlers) {
      if (typeof item !== "function") {
        throw new TypeError("Update handler must be a function");
      }
    }
    return (update, next) => runChain(handlers, update, next);
  }
  async function runChain(handlers, update, next) {
    let last = -1;
    const run = async (index) => {
      if (index <= last)
        throw new Error("next() called multiple times");
      last = index;
      if (index >= handlers.length)
        return next();
      await handlers[index](update, () => run(index + 1));
    };
    await run(0);
  }
  function watchController() {
    const controller = new AbortController;
    (0, events_1.setMaxListeners)(0, controller.signal);
    return controller;
  }
});

// node_modules/teleproto/events/NewMessage.js
var require_NewMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.NewMessageEvent = exports2.NewMessage = undefined;
  var common_1 = require_common();
  var tl_1 = require_tl();

  class NewMessage extends common_1.EventBuilder {
    constructor(newMessageParams = {}) {
      let { chats, func, incoming, outgoing, fromUsers, forwards, pattern, blacklistChats = false } = newMessageParams;
      if (incoming && outgoing) {
        incoming = outgoing = undefined;
      } else if (incoming != null && outgoing == undefined) {
        outgoing = !incoming;
      } else if (outgoing != null && incoming == undefined) {
        incoming = !outgoing;
      } else if (outgoing == false && incoming == false) {
        throw new Error("Don't create an event handler if you don't want neither incoming nor outgoing!");
      }
      super({ chats, blacklistChats, func });
      this.incoming = incoming;
      this.outgoing = outgoing;
      this.fromUsers = fromUsers;
      this.forwards = forwards;
      this.pattern = pattern;
      this._noCheck = [
        incoming,
        outgoing,
        chats,
        pattern,
        fromUsers,
        forwards,
        func
      ].every((v) => v == undefined);
    }
    async _resolve(client) {
      await super._resolve(client);
      this.fromUsers = await (0, common_1._intoIdSet)(client, this.fromUsers);
    }
    build(update, callback, selfId) {
      if (update instanceof tl_1.Api.UpdateNewMessage || update instanceof tl_1.Api.UpdateNewChannelMessage) {
        if (!(update.message instanceof tl_1.Api.Message)) {
          return;
        }
        const event = new NewMessageEvent(update.message, update);
        this.addAttributes(event);
        return event;
      } else if (update instanceof tl_1.Api.UpdateShortMessage) {
        return new NewMessageEvent(new tl_1.Api.Message({
          out: update.out,
          mentioned: update.mentioned,
          mediaUnread: update.mediaUnread,
          silent: update.silent,
          id: update.id,
          peerId: new tl_1.Api.PeerUser({ userId: update.userId }),
          fromId: new tl_1.Api.PeerUser({
            userId: update.out ? selfId : update.userId
          }),
          message: update.message,
          date: update.date,
          fwdFrom: update.fwdFrom,
          viaBotId: update.viaBotId,
          replyTo: update.replyTo,
          entities: update.entities,
          ttlPeriod: update.ttlPeriod
        }), update);
      } else if (update instanceof tl_1.Api.UpdateShortChatMessage) {
        return new NewMessageEvent(new tl_1.Api.Message({
          out: update.out,
          mentioned: update.mentioned,
          mediaUnread: update.mediaUnread,
          silent: update.silent,
          id: update.id,
          peerId: new tl_1.Api.PeerChat({ chatId: update.chatId }),
          fromId: new tl_1.Api.PeerUser({
            userId: update.out ? selfId : update.fromId
          }),
          message: update.message,
          date: update.date,
          fwdFrom: update.fwdFrom,
          viaBotId: update.viaBotId,
          replyTo: update.replyTo,
          entities: update.entities,
          ttlPeriod: update.ttlPeriod
        }), update);
      }
    }
    filter(event) {
      if (this._noCheck) {
        return event;
      }
      if (this.incoming && event.message.out) {
        return;
      }
      if (this.outgoing && !event.message.out) {
        return;
      }
      if (this.forwards != null) {
        if (this.forwards != !!event.message.fwdFrom) {
          return;
        }
      }
      if (this.fromUsers != null) {
        if (!event.message.senderId || !this.fromUsers.includes(event.message.senderId.toString())) {
          return;
        }
      }
      if (this.pattern) {
        const match = event.message.message?.match(this.pattern);
        if (!match) {
          return;
        }
        event.message.patternMatch = match;
      }
      return super.filter(event);
    }
    addAttributes(update) {}
  }
  exports2.NewMessage = NewMessage;

  class NewMessageEvent extends common_1.EventCommon {
    constructor(message, originalUpdate) {
      super({
        msgId: message.id,
        chatPeer: message.peerId,
        broadcast: message.post
      });
      this.originalUpdate = originalUpdate;
      this.message = message;
    }
    _setClient(client) {
      super._setClient(client);
      const m = this.message;
      try {
        m._finishInit(client, this.originalUpdate._entities || new Map, undefined);
      } catch (e) {
        client._log.error("Got error while trying to finish init message with id " + m.id, e);
        if (client._errorHandler) {
          client._errorHandler(e);
        }
      }
    }
    get patternMatch() {
      return this.message.patternMatch;
    }
    async reply(params) {
      if (!this._client)
        return;
      return this._client.sendMessage(this.message.peerId, {
        message: params.message,
        parseMode: params.parseMode,
        formattingEntities: params.formattingEntities,
        file: params.file,
        linkPreview: params.linkPreview,
        silent: params.silent,
        replyTo: this.message.id
      });
    }
    async respond(params) {
      if (!this._client)
        return;
      return this._client.sendMessage(this.message.peerId, {
        message: params.message,
        parseMode: params.parseMode,
        formattingEntities: params.formattingEntities,
        file: params.file,
        linkPreview: params.linkPreview,
        silent: params.silent
      });
    }
    async delete(params = {}) {
      if (!this._client)
        return;
      return this._client.deleteMessages(this.message.peerId, [this.message.id], params);
    }
    async forward(chat) {
      if (!this._client)
        return;
      return this._client.forwardMessages(chat, {
        messages: [this.message.id],
        fromPeer: this.message.peerId
      });
    }
    async edit(params) {
      if (!this._client)
        return;
      return this._client.editMessage(this.message.peerId, {
        message: this.message.id,
        text: params.message,
        parseMode: params.parseMode,
        formattingEntities: params.formattingEntities,
        file: params.file
      });
    }
    async markRead() {
      if (!this._client)
        return;
      return this._client.markAsRead(this.message.peerId, this.message.id);
    }
    async pin(params) {
      if (!this._client)
        return;
      return this._client.pinMessage(this.message.peerId, this.message.id, params);
    }
    async unpin() {
      if (!this._client)
        return;
      await this._client.unpinMessage(this.message.peerId, this.message.id);
    }
  }
  exports2.NewMessageEvent = NewMessageEvent;
});

// node_modules/teleproto/events/EditedMessage.js
var require_EditedMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.EditedMessageEvent = exports2.EditedMessage = undefined;
  var tl_1 = require_tl();
  var NewMessage_1 = require_NewMessage();

  class EditedMessage extends NewMessage_1.NewMessage {
    constructor(editedMessageParams) {
      super(editedMessageParams);
    }
    build(update, callback, selfId) {
      if (update instanceof tl_1.Api.UpdateEditChannelMessage || update instanceof tl_1.Api.UpdateEditMessage) {
        if (!(update.message instanceof tl_1.Api.Message)) {
          return;
        }
        const event = new EditedMessageEvent(update.message, update);
        this.addAttributes(event);
        return event;
      }
    }
  }
  exports2.EditedMessage = EditedMessage;

  class EditedMessageEvent extends NewMessage_1.NewMessageEvent {
    constructor(message, originalUpdate) {
      super(message, originalUpdate);
    }
  }
  exports2.EditedMessageEvent = EditedMessageEvent;
});

// node_modules/teleproto/events/UserUpdate.js
var require_UserUpdate = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.UserUpdateEvent = exports2.UserUpdate = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();
  var big_integer_1 = __importDefault(require_BigInteger());

  class UserUpdate extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.chats,
        blacklistChats: params.blacklistChats,
        func: params.func
      });
    }
    async _resolve(client) {
      this.chats = await (0, common_1._intoIdSet)(client, this.chats);
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateUserStatus) {
        return new UserUpdateEvent(update);
      }
      if (update instanceof tl_1.Api.UpdateUserTyping || update instanceof tl_1.Api.UpdateChatUserTyping || update instanceof tl_1.Api.UpdateChannelUserTyping) {
        return new UserUpdateEvent(update);
      }
      return;
    }
    filter(event) {
      if (this.chats != null) {
        const userId = event.userId?.toString();
        if (!userId || !this.chats.includes(userId)) {
          if (!this.blacklistChats) {
            return;
          }
        } else if (this.blacklistChats) {
          return;
        }
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.UserUpdate = UserUpdate;

  class UserUpdateEvent extends common_1.EventCommonSender {
    constructor(update) {
      let chatPeer;
      let userId;
      if (update instanceof tl_1.Api.UpdateUserStatus) {
        userId = update.userId;
        chatPeer = new tl_1.Api.PeerUser({ userId: update.userId });
      } else if (update instanceof tl_1.Api.UpdateUserTyping) {
        userId = update.userId;
        chatPeer = new tl_1.Api.PeerUser({ userId: update.userId });
      } else if (update instanceof tl_1.Api.UpdateChatUserTyping) {
        userId = update.fromId instanceof tl_1.Api.PeerUser ? update.fromId.userId : big_integer_1.default.zero;
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else {
        userId = update.fromId instanceof tl_1.Api.PeerUser ? update.fromId.userId : big_integer_1.default.zero;
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
      }
      super({ chatPeer });
      this._eventName = "UserUpdate";
      this.originalUpdate = update;
      this._userId = userId;
      if (update instanceof tl_1.Api.UpdateUserStatus) {
        this._status = update.status;
      } else {
        this._action = update.action;
        if (update instanceof tl_1.Api.UpdateChatUserTyping) {
          this._chatId = update.chatId;
        } else if (update instanceof tl_1.Api.UpdateChannelUserTyping) {
          this._chatId = update.channelId;
        }
      }
    }
    get userId() {
      return this._userId;
    }
    get status() {
      return this._status;
    }
    get action() {
      return this._action;
    }
    get online() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusOnline;
    }
    get offline() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusOffline;
    }
    get until() {
      if (this._status instanceof tl_1.Api.UserStatusOnline) {
        return new Date(this._status.expires * 1000);
      }
      return;
    }
    get lastSeen() {
      if (this._status instanceof tl_1.Api.UserStatusOffline) {
        return new Date(this._status.wasOnline * 1000);
      }
      return;
    }
    get recently() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusRecently;
    }
    get withinWeeks() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusLastWeek;
    }
    get withinMonths() {
      if (!this._status)
        return;
      return this._status instanceof tl_1.Api.UserStatusLastMonth;
    }
    get typing() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageTypingAction;
    }
    get cancel() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageCancelAction;
    }
    get recording() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordVideoAction || this._action instanceof tl_1.Api.SendMessageRecordAudioAction || this._action instanceof tl_1.Api.SendMessageRecordRoundAction;
    }
    get uploading() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageUploadVideoAction || this._action instanceof tl_1.Api.SendMessageUploadAudioAction || this._action instanceof tl_1.Api.SendMessageUploadPhotoAction || this._action instanceof tl_1.Api.SendMessageUploadDocumentAction || this._action instanceof tl_1.Api.SendMessageUploadRoundAction;
    }
    get audio() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordAudioAction || this._action instanceof tl_1.Api.SendMessageUploadAudioAction;
    }
    get video() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordVideoAction || this._action instanceof tl_1.Api.SendMessageUploadVideoAction;
    }
    get round() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageRecordRoundAction || this._action instanceof tl_1.Api.SendMessageUploadRoundAction;
    }
    get photo() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageUploadPhotoAction;
    }
    get document() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageUploadDocumentAction;
    }
    get geo() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageGeoLocationAction;
    }
    get contact() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageChooseContactAction;
    }
    get playing() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageGamePlayAction;
    }
    get sticker() {
      if (!this._action)
        return;
      return this._action instanceof tl_1.Api.SendMessageChooseStickerAction;
    }
    get uploadProgress() {
      if (this._action instanceof tl_1.Api.SendMessageUploadVideoAction || this._action instanceof tl_1.Api.SendMessageUploadAudioAction || this._action instanceof tl_1.Api.SendMessageUploadPhotoAction || this._action instanceof tl_1.Api.SendMessageUploadDocumentAction || this._action instanceof tl_1.Api.SendMessageUploadRoundAction) {
        return this._action.progress;
      }
      return;
    }
    async getUser() {
      if (!this._client)
        return;
      try {
        const result = await this._client.getEntity(new tl_1.Api.PeerUser({ userId: this._userId }));
        if (result instanceof tl_1.Api.User) {
          return result;
        }
      } catch {
        return;
      }
      return;
    }
    async getInputUser() {
      if (!this._client)
        return;
      try {
        return await this._client.getInputEntity(new tl_1.Api.PeerUser({ userId: this._userId }));
      } catch {
        return;
      }
    }
  }
  exports2.UserUpdateEvent = UserUpdateEvent;
});

// node_modules/teleproto/events/MessageRead.js
var require_MessageRead = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MessageReadEvent = exports2.MessageRead = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class MessageRead extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.chats,
        blacklistChats: params.blacklistChats,
        func: params.func
      });
      this._inbox = params.inbox;
    }
    async _resolve(client) {
      await super._resolve(client);
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateReadHistoryInbox || update instanceof tl_1.Api.UpdateReadHistoryOutbox || update instanceof tl_1.Api.UpdateReadChannelInbox || update instanceof tl_1.Api.UpdateReadChannelOutbox || update instanceof tl_1.Api.UpdateReadMessagesContents || update instanceof tl_1.Api.UpdateChannelReadMessagesContents) {
        return new MessageReadEvent(update);
      }
      return;
    }
    filter(event) {
      if (this._inbox !== undefined) {
        if (this._inbox !== event.inbox) {
          return;
        }
      }
      if (this.chats !== undefined && event.chatId) {
        const chatIdStr = event.chatId.toString();
        const inside = this.chats.includes(chatIdStr);
        if (inside === this.blacklistChats) {
          return;
        }
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.MessageRead = MessageRead;

  class MessageReadEvent extends common_1.EventCommon {
    constructor(update) {
      let chatPeer;
      let isOutbox = false;
      let isContents = false;
      let maxId = 0;
      let messageIds = [];
      if (update instanceof tl_1.Api.UpdateReadHistoryInbox) {
        chatPeer = update.peer;
        isOutbox = false;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadHistoryOutbox) {
        chatPeer = update.peer;
        isOutbox = true;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadChannelInbox) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
        isOutbox = false;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadChannelOutbox) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
        isOutbox = true;
        maxId = update.maxId;
      } else if (update instanceof tl_1.Api.UpdateReadMessagesContents) {
        isContents = true;
        messageIds = update.messages;
        maxId = messageIds.length > 0 ? Math.max(...messageIds) : 0;
      } else if (update instanceof tl_1.Api.UpdateChannelReadMessagesContents) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
        isContents = true;
        messageIds = update.messages;
        maxId = messageIds.length > 0 ? Math.max(...messageIds) : 0;
      }
      super({ chatPeer });
      this._eventName = "MessageRead";
      this.originalUpdate = update;
      this._outbox = isOutbox;
      this._contents = isContents;
      this._maxId = maxId;
      this._messageIds = messageIds;
    }
    get maxId() {
      return this._maxId;
    }
    get outbox() {
      return this._outbox;
    }
    get inbox() {
      return !this._outbox;
    }
    get contents() {
      return this._contents;
    }
    get messageIds() {
      return this._messageIds;
    }
    get isRead() {
      return this._maxId > 0 || this._messageIds.length > 0;
    }
    async getMessages() {
      if (!this._client || this._messageIds.length === 0) {
        return;
      }
      if (!this.chatId) {
        return;
      }
      try {
        return await this._client.getMessages(this.chatId, {
          ids: this._messageIds
        });
      } catch {
        return;
      }
    }
  }
  exports2.MessageReadEvent = MessageReadEvent;
});

// node_modules/teleproto/events/DeletedMessage.js
var require_DeletedMessage = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.DeletedMessageEvent = exports2.DeletedMessage = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class DeletedMessage extends common_1.EventBuilder {
    constructor(eventParams = {}) {
      super(eventParams);
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateDeleteChannelMessages) {
        return new DeletedMessageEvent(update.messages, update, new tl_1.Api.PeerChannel({ channelId: update.channelId }));
      } else if (update instanceof tl_1.Api.UpdateDeleteMessages) {
        return new DeletedMessageEvent(update.messages, update);
      }
      return;
    }
  }
  exports2.DeletedMessage = DeletedMessage;

  class DeletedMessageEvent extends common_1.EventCommon {
    constructor(deletedIds, originalUpdate, peer) {
      super({
        chatPeer: peer,
        msgId: Array.isArray(deletedIds) && deletedIds.length > 0 ? deletedIds[0] : undefined
      });
      this.originalUpdate = originalUpdate;
      this.deletedIds = deletedIds;
      this.peer = peer;
    }
    get deletedId() {
      return this.deletedIds.length > 0 ? this.deletedIds[0] : undefined;
    }
    get isChannel() {
      return this.originalUpdate instanceof tl_1.Api.UpdateDeleteChannelMessages;
    }
  }
  exports2.DeletedMessageEvent = DeletedMessageEvent;
});

// node_modules/teleproto/events/ChatAction.js
var require_ChatAction = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.ChatActionEvent = exports2.ChatAction = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class ChatAction extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.chats,
        blacklistChats: params.blacklistChats,
        func: params.func
      });
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateChatParticipantAdd || update instanceof tl_1.Api.UpdateChatParticipantDelete || update instanceof tl_1.Api.UpdateChatParticipant || update instanceof tl_1.Api.UpdateChannelParticipant) {
        return new ChatActionEvent(update);
      }
      if (update instanceof tl_1.Api.UpdatePinnedMessages || update instanceof tl_1.Api.UpdatePinnedChannelMessages) {
        return new ChatActionEvent(update);
      }
      if (update instanceof tl_1.Api.UpdateNewMessage || update instanceof tl_1.Api.UpdateNewChannelMessage) {
        const msg = update.message;
        if (msg instanceof tl_1.Api.MessageService && msg.action) {
          if (msg.action instanceof tl_1.Api.MessageActionChatCreate || msg.action instanceof tl_1.Api.MessageActionChannelCreate || msg.action instanceof tl_1.Api.MessageActionChatEditTitle || msg.action instanceof tl_1.Api.MessageActionChatEditPhoto || msg.action instanceof tl_1.Api.MessageActionChatDeletePhoto || msg.action instanceof tl_1.Api.MessageActionChatAddUser || msg.action instanceof tl_1.Api.MessageActionChatDeleteUser || msg.action instanceof tl_1.Api.MessageActionChatJoinedByLink || msg.action instanceof tl_1.Api.MessageActionPinMessage || msg.action instanceof tl_1.Api.MessageActionChatJoinedByRequest) {
            return new ChatActionEvent(update, msg);
          }
        }
      }
      return;
    }
  }
  exports2.ChatAction = ChatAction;

  class ChatActionEvent extends common_1.EventCommon {
    constructor(update, actionMessage) {
      let chatPeer;
      if (update instanceof tl_1.Api.UpdateChatParticipantAdd) {
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else if (update instanceof tl_1.Api.UpdateChatParticipantDelete) {
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else if (update instanceof tl_1.Api.UpdateChatParticipant) {
        chatPeer = new tl_1.Api.PeerChat({ chatId: update.chatId });
      } else if (update instanceof tl_1.Api.UpdateChannelParticipant) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
      } else if (update instanceof tl_1.Api.UpdatePinnedMessages) {
        chatPeer = update.peer;
      } else if (update instanceof tl_1.Api.UpdatePinnedChannelMessages) {
        chatPeer = new tl_1.Api.PeerChannel({ channelId: update.channelId });
      } else if (actionMessage) {
        chatPeer = actionMessage.peerId;
      }
      super({ chatPeer });
      this._eventName = "ChatAction";
      this.originalUpdate = update;
      this._actionMessage = actionMessage;
      this._userIds = [];
      this._pinnedIds = [];
      this._pinned = false;
      this._created = false;
      this._parseUpdate(update, actionMessage);
    }
    _parseUpdate(update, actionMessage) {
      if (update instanceof tl_1.Api.UpdateChatParticipantAdd) {
        this._userIds = [update.userId];
        this._addedBy = update.inviterId;
      } else if (update instanceof tl_1.Api.UpdateChatParticipantDelete) {
        this._userIds = [update.userId];
      } else if (update instanceof tl_1.Api.UpdateChatParticipant) {
        this._userIds = [update.userId];
        if (update.newParticipant && !update.prevParticipant) {
          this._addedBy = update.actorId;
        } else if (!update.newParticipant && update.prevParticipant) {
          this._kickedBy = update.actorId;
        }
      } else if (update instanceof tl_1.Api.UpdateChannelParticipant) {
        this._userIds = [update.userId];
        if (update.newParticipant && !update.prevParticipant) {
          this._addedBy = update.actorId;
        } else if (!update.newParticipant && update.prevParticipant) {
          this._kickedBy = update.actorId;
        }
      }
      if (update instanceof tl_1.Api.UpdatePinnedMessages) {
        this._pinnedIds = update.messages;
        this._pinned = update.pinned ?? true;
      } else if (update instanceof tl_1.Api.UpdatePinnedChannelMessages) {
        this._pinnedIds = update.messages;
        this._pinned = update.pinned ?? true;
      }
      if (actionMessage?.action) {
        const action = actionMessage.action;
        if (action instanceof tl_1.Api.MessageActionChatCreate) {
          this._created = true;
          this._newTitle = action.title;
          this._userIds = action.users;
        } else if (action instanceof tl_1.Api.MessageActionChannelCreate) {
          this._created = true;
          this._newTitle = action.title;
        } else if (action instanceof tl_1.Api.MessageActionChatEditTitle) {
          this._newTitle = action.title;
        } else if (action instanceof tl_1.Api.MessageActionChatEditPhoto) {
          this._newPhoto = action.photo;
        } else if (action instanceof tl_1.Api.MessageActionChatAddUser) {
          this._userIds = action.users;
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            this._addedBy = actionMessage.fromId.userId;
          }
        } else if (action instanceof tl_1.Api.MessageActionChatDeleteUser) {
          this._userIds = [action.userId];
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            if (!action.userId.eq(actionMessage.fromId.userId)) {
              this._kickedBy = actionMessage.fromId.userId;
            }
          }
        } else if (action instanceof tl_1.Api.MessageActionChatJoinedByLink) {
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            this._userIds = [actionMessage.fromId.userId];
          }
          this._addedBy = action.inviterId;
        } else if (action instanceof tl_1.Api.MessageActionChatJoinedByRequest) {
          if (actionMessage.fromId instanceof tl_1.Api.PeerUser) {
            this._userIds = [actionMessage.fromId.userId];
          }
        } else if (action instanceof tl_1.Api.MessageActionPinMessage) {
          if (actionMessage.replyTo instanceof tl_1.Api.MessageReplyHeader && actionMessage.replyTo.replyToMsgId !== undefined) {
            this._pinnedIds = [actionMessage.replyTo.replyToMsgId];
          }
          this._pinned = true;
        }
      }
    }
    get actionMessage() {
      return this._actionMessage;
    }
    get userJoined() {
      const action = this._actionMessage?.action;
      return action instanceof tl_1.Api.MessageActionChatJoinedByLink || action instanceof tl_1.Api.MessageActionChatJoinedByRequest || this.originalUpdate instanceof tl_1.Api.UpdateChatParticipant && !!this.originalUpdate.newParticipant && !this.originalUpdate.prevParticipant || this.originalUpdate instanceof tl_1.Api.UpdateChannelParticipant && !!this.originalUpdate.newParticipant && !this.originalUpdate.prevParticipant;
    }
    get userAdded() {
      return this._actionMessage?.action instanceof tl_1.Api.MessageActionChatAddUser || this.originalUpdate instanceof tl_1.Api.UpdateChatParticipantAdd;
    }
    get userLeft() {
      const action = this._actionMessage?.action;
      if (action instanceof tl_1.Api.MessageActionChatDeleteUser) {
        if (this._actionMessage?.fromId instanceof tl_1.Api.PeerUser) {
          return action.userId.eq(this._actionMessage.fromId.userId);
        }
      }
      if (this.originalUpdate instanceof tl_1.Api.UpdateChatParticipant || this.originalUpdate instanceof tl_1.Api.UpdateChannelParticipant) {
        return !this.originalUpdate.newParticipant && !!this.originalUpdate.prevParticipant && this.originalUpdate.userId.eq(this.originalUpdate.actorId);
      }
      return false;
    }
    get userKicked() {
      const action = this._actionMessage?.action;
      if (action instanceof tl_1.Api.MessageActionChatDeleteUser) {
        if (this._actionMessage?.fromId instanceof tl_1.Api.PeerUser) {
          return !action.userId.eq(this._actionMessage.fromId.userId);
        }
      }
      if (this.originalUpdate instanceof tl_1.Api.UpdateChatParticipant || this.originalUpdate instanceof tl_1.Api.UpdateChannelParticipant) {
        return !this.originalUpdate.newParticipant && !!this.originalUpdate.prevParticipant && !this.originalUpdate.userId.eq(this.originalUpdate.actorId);
      }
      return this.originalUpdate instanceof tl_1.Api.UpdateChatParticipantDelete;
    }
    get userIds() {
      return this._userIds;
    }
    get userId() {
      return this._userIds.length > 0 ? this._userIds[0] : undefined;
    }
    get addedBy() {
      return this._addedBy;
    }
    get kickedBy() {
      return this._kickedBy;
    }
    get created() {
      return this._created;
    }
    get newTitle() {
      return this._newTitle;
    }
    get newPhoto() {
      return this._newPhoto !== undefined || this._actionMessage?.action instanceof tl_1.Api.MessageActionChatEditPhoto;
    }
    get photoDeleted() {
      return this._actionMessage?.action instanceof tl_1.Api.MessageActionChatDeletePhoto;
    }
    get photo() {
      return this._newPhoto;
    }
    get newPin() {
      return this._pinned && this._pinnedIds.length > 0;
    }
    get unpin() {
      return !this._pinned && this._pinnedIds.length > 0;
    }
    get pinnedMessageIds() {
      return this._pinnedIds;
    }
    get pinnedMessageId() {
      return this._pinnedIds.length > 0 ? this._pinnedIds[0] : undefined;
    }
    async getPinnedMessages() {
      if (!this._client || this._pinnedIds.length === 0 || !this.chatId) {
        return;
      }
      try {
        return await this._client.getMessages(this.chatId, {
          ids: this._pinnedIds
        });
      } catch {
        return;
      }
    }
    async getPinnedMessage() {
      const messages = await this.getPinnedMessages();
      return messages && messages.length > 0 ? messages[0] : undefined;
    }
    async getUsers() {
      if (!this._client || this._userIds.length === 0) {
        return;
      }
      try {
        const users = [];
        for (const userId of this._userIds) {
          const entity = await this._client.getEntity(new tl_1.Api.PeerUser({ userId }));
          if (entity instanceof tl_1.Api.User) {
            users.push(entity);
          }
        }
        return users.length > 0 ? users : undefined;
      } catch {
        return;
      }
    }
    async getUser() {
      const users = await this.getUsers();
      return users && users.length > 0 ? users[0] : undefined;
    }
    async respond(params) {
      if (!this._client || !this.chatId)
        return;
      return this._client.sendMessage(this.chatId, params);
    }
  }
  exports2.ChatActionEvent = ChatActionEvent;
});

// node_modules/teleproto/events/InlineQuery.js
var require_InlineQuery = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.InlineQueryEvent = exports2.InlineBuilder = exports2.InlineQuery = undefined;
  var tl_1 = require_tl();
  var common_1 = require_common();

  class InlineQuery extends common_1.EventBuilder {
    constructor(params = {}) {
      super({
        chats: params.users,
        blacklistChats: params.blacklistUsers,
        func: params.func
      });
      this._blacklistUsers = params.blacklistUsers ?? false;
      if (params.pattern) {
        this._pattern = typeof params.pattern === "string" ? new RegExp(params.pattern) : params.pattern;
      }
    }
    async _resolve(client) {
      await super._resolve(client);
      this._users = this.chats;
    }
    build(update) {
      if (update instanceof tl_1.Api.UpdateBotInlineQuery) {
        return new InlineQueryEvent(update);
      }
      if (update instanceof tl_1.Api.UpdateBotInlineSend) {
        return new InlineQueryEvent(update);
      }
      return;
    }
    filter(event) {
      if (this._users !== undefined) {
        const userIdStr = event.userId?.toString();
        if (!userIdStr)
          return;
        const inside = this._users.includes(userIdStr);
        if (inside === this._blacklistUsers) {
          return;
        }
      }
      if (this._pattern && event.text) {
        const match = event.text.match(this._pattern);
        if (!match) {
          return;
        }
        event._patternMatch = match;
      }
      if (this.func && !this.func(event)) {
        return;
      }
      return event;
    }
  }
  exports2.InlineQuery = InlineQuery;

  class InlineBuilder {
    constructor() {
      this._resultId = 0;
    }
    _nextId() {
      return String(this._resultId++);
    }
    article(title, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageText({
        message: params.text ?? "",
        entities: params.entities,
        noWebpage: params.linkPreview === false,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "article",
        title,
        description: params.description,
        url: params.url,
        thumb: params.thumb,
        content: params.content,
        sendMessage
      });
    }
    photo(photo, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaAuto({
        message: params.text ?? "",
        entities: params.entities,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResultPhoto({
        id: params.id ?? this._nextId(),
        type: "photo",
        photo,
        sendMessage
      });
    }
    document(document, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaAuto({
        message: params.text ?? "",
        entities: params.entities,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResultDocument({
        id: params.id ?? this._nextId(),
        type: params.type ?? "file",
        title: params.title,
        description: params.description,
        document,
        sendMessage
      });
    }
    game(shortName, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageGame({
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResultGame({
        id: params.id ?? this._nextId(),
        shortName,
        sendMessage
      });
    }
    geo(geoPoint, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaGeo({
        geoPoint,
        heading: params.heading,
        period: params.period,
        proximityNotificationRadius: params.proximityNotificationRadius,
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "geo",
        title: params.title,
        description: params.description,
        sendMessage
      });
    }
    venue(geoPoint, title, address, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaVenue({
        geoPoint,
        title,
        address,
        provider: params.provider ?? "",
        venueId: params.venueId ?? "",
        venueType: params.venueType ?? "",
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "venue",
        title,
        description: params.description,
        sendMessage
      });
    }
    contact(phoneNumber, firstName, params = {}) {
      const sendMessage = new tl_1.Api.InputBotInlineMessageMediaContact({
        phoneNumber,
        firstName,
        lastName: params.lastName ?? "",
        vcard: params.vcard ?? "",
        replyMarkup: params.replyMarkup
      });
      return new tl_1.Api.InputBotInlineResult({
        id: params.id ?? this._nextId(),
        type: "contact",
        title: firstName,
        description: params.description,
        sendMessage
      });
    }
  }
  exports2.InlineBuilder = InlineBuilder;

  class InlineQueryEvent extends common_1.EventCommonSender {
    constructor(update) {
      super({});
      this._eventName = "InlineQuery";
      this._answered = false;
      this.originalUpdate = update;
      this._isChosen = update instanceof tl_1.Api.UpdateBotInlineSend;
      if (update instanceof tl_1.Api.UpdateBotInlineQuery) {
        this._userId = update.userId;
        this._queryId = update.queryId;
        this._text = update.query;
        this._offset = update.offset;
        this._geo = update.geo;
        this._peerType = update.peerType;
      } else {
        this._userId = update.userId;
        this._text = update.query;
        this._offset = "";
        this._geo = update.geo;
        this._resultId = update.id;
        this._msgId = update.msgId;
      }
    }
    get id() {
      return this._queryId;
    }
    get text() {
      return this._text;
    }
    get query() {
      return this._text;
    }
    get offset() {
      return this._offset;
    }
    get userId() {
      return this._userId;
    }
    get geo() {
      return this._geo;
    }
    get peerType() {
      return this._peerType;
    }
    get isChosen() {
      return this._isChosen;
    }
    get resultId() {
      return this._resultId;
    }
    get msgId() {
      return this._msgId;
    }
    get patternMatch() {
      return this._patternMatch;
    }
    get builder() {
      if (!this._builder) {
        this._builder = new InlineBuilder;
      }
      return this._builder;
    }
    get answered() {
      return this._answered;
    }
    async answer(results = [], params = {}) {
      if (!this._client || !this._queryId) {
        return false;
      }
      if (this._answered) {
        return false;
      }
      if (results.length > 50) {
        throw new Error("Cannot send more than 50 inline results");
      }
      let switchPm;
      if (params.switchPm) {
        switchPm = new tl_1.Api.InlineBotSwitchPM({
          text: params.switchPm.text,
          startParam: params.switchPm.startParam
        });
      }
      let switchWebview;
      if (params.switchWebview) {
        switchWebview = new tl_1.Api.InlineBotWebView({
          text: params.switchWebview.text,
          url: params.switchWebview.url
        });
      }
      try {
        await this._client.invoke(new tl_1.Api.messages.SetInlineBotResults({
          queryId: this._queryId,
          results,
          cacheTime: params.cacheTime ?? 0,
          gallery: params.gallery,
          private: params.private,
          nextOffset: params.nextOffset,
          switchPm,
          switchWebview
        }));
        this._answered = true;
        return true;
      } catch {
        return false;
      }
    }
    async getUser() {
      if (!this._client)
        return;
      try {
        const entity = await this._client.getEntity(new tl_1.Api.PeerUser({ userId: this._userId }));
        if (entity instanceof tl_1.Api.User) {
          return entity;
        }
      } catch {
        return;
      }
      return;
    }
  }
  exports2.InlineQueryEvent = InlineQueryEvent;
});

// node_modules/teleproto/events/Album.js
var require_Album = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.AlbumEvent = exports2.Album = undefined;
  var common_1 = require_common();
  var tl_1 = require_tl();
  var _ALBUM_DELAY = 500;

  class Album extends common_1.EventBuilder {
    constructor(albumParams) {
      let { chats, func, blacklistChats = false } = albumParams;
      super({ chats, blacklistChats, func });
    }
    build(update, dispatch) {
      if (!(("message" in update) && update.message instanceof tl_1.Api.Message)) {
        return;
      }
      const groupedId = update.message.groupedId;
      if (!groupedId) {
        return;
      }
      const albums = this.client._ALBUMS;
      const oldTimeout = albums.get(groupedId.toString());
      let oldValues = [];
      if (oldTimeout) {
        clearTimeout(oldTimeout[0]);
        oldValues.push(...oldTimeout[1]);
      }
      albums.set(groupedId.toString(), [
        setTimeout(() => {
          const values = albums.get(groupedId.toString());
          albums.delete(groupedId.toString());
          if (!values) {
            return;
          }
          const updates = values[1];
          if (!updates) {
            return;
          }
          const messages = [];
          for (const update2 of updates) {
            if ("message" in update2 && update2.message instanceof tl_1.Api.Message) {
              messages.push(update2.message);
            }
          }
          const event = new AlbumEvent(messages, values[1]);
          event._setClient(this.client);
          event._entities = messages[0]._entities;
          dispatch(event);
        }, _ALBUM_DELAY),
        [...oldValues, update]
      ]);
    }
  }
  exports2.Album = Album;

  class AlbumEvent extends common_1.EventCommon {
    constructor(messages, originalUpdates) {
      super({
        msgId: messages[0].id,
        chatPeer: messages[0].peerId,
        broadcast: messages[0].post
      });
      this.originalUpdates = originalUpdates;
      this.messages = messages;
    }
    _setClient(client) {
      super._setClient(client);
      for (let i = 0;i < this.messages.length; i++) {
        try {
          this.messages[i]._finishInit(client, this.originalUpdates[i]._entities || new Map, undefined);
        } catch (e) {
          client._log.error("Got error while trying to finish init message with id " + this.messages[i].id, e);
          if (client._errorHandler) {
            client._errorHandler(e);
          }
        }
      }
    }
  }
  exports2.AlbumEvent = AlbumEvent;
});

// node_modules/teleproto/events/CallbackQuery.js
var require_CallbackQuery = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CallbackQueryEvent = exports2.CallbackQuery = exports2.NewCallbackQueryDefaults = undefined;
  var common_1 = require_common();
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();
  exports2.NewCallbackQueryDefaults = {
    chats: [],
    fromUsers: [],
    blacklistUsers: []
  };

  class CallbackQuery extends common_1.EventBuilder {
    constructor(inlineQueryParams = {}) {
      const { chats, func, pattern } = inlineQueryParams;
      super({ chats, func, blacklistChats: false });
      this.match = pattern;
      this._noCheck = [this.chats, this.func, this.match].every((i) => i === null || i === undefined);
    }
    build(update, callback, selfId = undefined) {
      if (update instanceof tl_1.Api.UpdateBotCallbackQuery) {
        return new CallbackQueryEvent(update, update.peer, update.msgId);
      } else if (update instanceof tl_1.Api.UpdateInlineBotCallbackQuery) {
        const b = (0, Helpers_1.toSignedLittleBuffer)(update.msgId.id, 8);
        const msgId = b.readInt32LE(0);
        const peerId = b.readInt32LE(4);
        const peer = peerId < 0 ? new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(-peerId) }) : new tl_1.Api.PeerUser({ userId: (0, Helpers_1.returnBigInt)(peerId) });
        return new CallbackQueryEvent(update, peer, msgId);
      }
    }
    filter(event) {
      if (this._noCheck)
        return event;
      if (this.chats) {
        let inside = this.chats.includes(event.query.chatInstance.toString());
        if (event.chatId) {
          inside = inside || this.chats.includes(event.chatId.toString());
        }
        if (inside === this.blacklistChats) {
          return;
        }
      }
      if (this.match) {
        const data = new TextDecoder().decode(event.query.data);
        const result = this.match.exec(data);
        this.match.lastIndex = 0;
        if (result) {
          event.patternMatch = result;
        } else {
          return;
        }
      }
      if (this.func) {
        return this.func(event);
      }
      return true;
    }
  }
  exports2.CallbackQuery = CallbackQuery;

  class CallbackQueryEvent extends common_1.EventCommonSender {
    constructor(query, peer, msgId) {
      super({
        msgId,
        chatPeer: peer,
        broadcast: false
      });
      this.query = query;
      this.patternMatch = undefined;
      this._senderId = (0, Helpers_1.returnBigInt)(query.userId);
      this._message = undefined;
      this._answered = false;
    }
    _setClient(client) {
      super._setClient(client);
      const [sender, inputSender] = (0, Utils_1._getEntityPair)(this._senderId.toString(), this._entities, client._entityCache);
      this._sender = sender;
      this._inputSender = inputSender;
    }
    get id() {
      return this.query.queryId;
    }
    get messageId() {
      return this._messageId;
    }
    get data() {
      return this.query.data;
    }
    get chatInstance() {
      return this.query.chatInstance;
    }
    async getMessage() {
      if (this._message) {
        return this._message;
      }
      const chat = this.isChannel ? await this.getInputChat() : undefined;
      const messages = await this._client.getMessages(chat, {
        ids: this._messageId
      });
      this._message = messages[0];
      return this._message;
    }
    async _refetchSender() {
      if (this._entities.has(this.senderId.toString())) {
        this._sender = this._entities.get(this.senderId.toString());
      }
      if (!this._sender)
        return;
      this._inputSender = (0, Utils_1.getInputPeer)(this._chat);
      if (!this._inputSender.hasOwnProperty("accessHash")) {
        try {
          this._inputSender = this._client._entityCache.get(this._senderId);
        } catch (e) {
          const m = await this.getMessage();
          if (m) {
            this._sender = m._sender;
            this._inputSender = m._inputSender;
          }
        }
      }
    }
    async answer({ message, cacheTime, url, alert } = {}) {
      if (this._answered)
        return;
      return await this._client.invoke(new tl_1.Api.messages.SetBotCallbackAnswer({
        queryId: this.query.queryId,
        cacheTime: cacheTime ?? 0,
        alert,
        message,
        url
      })).then((res) => {
        this._answered = true;
        return res;
      });
    }
    get viaInline() {
      return this.query instanceof tl_1.Api.UpdateInlineBotCallbackQuery;
    }
    async respond(params = {}) {
      await this.answer();
      const inputChat = await this.getInputChat();
      await this._client.sendMessage(inputChat, params);
    }
    async reply(params = {}) {
      await this.answer();
      params.replyTo = this.messageId;
      const inputChat = await this.getInputChat();
      await this._client.sendMessage(inputChat, params);
    }
    async edit(params) {
      if (this.query.msgId instanceof tl_1.Api.InputBotInlineMessageID) {
        return await this._client.editMessage(this.messageId, params).then(async (res) => {
          await this.answer();
          return res;
        });
      } else {
        const inputChat = await this.getInputChat();
        return await this._client.editMessage(inputChat, params).then(async (res) => {
          await this.answer();
          return res;
        });
      }
    }
    async delete({ revoke = true } = {}) {
      if (this._client) {
        return this._client.deleteMessages(await this.getInputChat(), [this.messageId], { revoke });
      }
    }
    get sender() {
      return this._sender;
    }
  }
  exports2.CallbackQueryEvent = CallbackQueryEvent;
});

// node_modules/teleproto/events/index.js
var require_events = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.CallbackQueryEvent = exports2.CallbackQuery = exports2.AlbumEvent = exports2.Album = exports2.InlineBuilder = exports2.InlineQueryEvent = exports2.InlineQuery = exports2.ChatActionEvent = exports2.ChatAction = exports2.DeletedMessageEvent = exports2.DeletedMessage = exports2.MessageReadEvent = exports2.MessageRead = exports2.UserUpdateEvent = exports2.UserUpdate = exports2.EditedMessageEvent = exports2.EditedMessage = exports2.NewMessageEvent = exports2.NewMessage = exports2.Raw = undefined;
  var Raw_1 = require_Raw();
  Object.defineProperty(exports2, "Raw", { enumerable: true, get: function() {
    return Raw_1.Raw;
  } });
  var NewMessage_1 = require_NewMessage();
  Object.defineProperty(exports2, "NewMessage", { enumerable: true, get: function() {
    return NewMessage_1.NewMessage;
  } });
  Object.defineProperty(exports2, "NewMessageEvent", { enumerable: true, get: function() {
    return NewMessage_1.NewMessageEvent;
  } });
  var EditedMessage_1 = require_EditedMessage();
  Object.defineProperty(exports2, "EditedMessage", { enumerable: true, get: function() {
    return EditedMessage_1.EditedMessage;
  } });
  Object.defineProperty(exports2, "EditedMessageEvent", { enumerable: true, get: function() {
    return EditedMessage_1.EditedMessageEvent;
  } });
  var UserUpdate_1 = require_UserUpdate();
  Object.defineProperty(exports2, "UserUpdate", { enumerable: true, get: function() {
    return UserUpdate_1.UserUpdate;
  } });
  Object.defineProperty(exports2, "UserUpdateEvent", { enumerable: true, get: function() {
    return UserUpdate_1.UserUpdateEvent;
  } });
  var MessageRead_1 = require_MessageRead();
  Object.defineProperty(exports2, "MessageRead", { enumerable: true, get: function() {
    return MessageRead_1.MessageRead;
  } });
  Object.defineProperty(exports2, "MessageReadEvent", { enumerable: true, get: function() {
    return MessageRead_1.MessageReadEvent;
  } });
  var DeletedMessage_1 = require_DeletedMessage();
  Object.defineProperty(exports2, "DeletedMessage", { enumerable: true, get: function() {
    return DeletedMessage_1.DeletedMessage;
  } });
  Object.defineProperty(exports2, "DeletedMessageEvent", { enumerable: true, get: function() {
    return DeletedMessage_1.DeletedMessageEvent;
  } });
  var ChatAction_1 = require_ChatAction();
  Object.defineProperty(exports2, "ChatAction", { enumerable: true, get: function() {
    return ChatAction_1.ChatAction;
  } });
  Object.defineProperty(exports2, "ChatActionEvent", { enumerable: true, get: function() {
    return ChatAction_1.ChatActionEvent;
  } });
  var InlineQuery_1 = require_InlineQuery();
  Object.defineProperty(exports2, "InlineQuery", { enumerable: true, get: function() {
    return InlineQuery_1.InlineQuery;
  } });
  Object.defineProperty(exports2, "InlineQueryEvent", { enumerable: true, get: function() {
    return InlineQuery_1.InlineQueryEvent;
  } });
  Object.defineProperty(exports2, "InlineBuilder", { enumerable: true, get: function() {
    return InlineQuery_1.InlineBuilder;
  } });
  var Album_1 = require_Album();
  Object.defineProperty(exports2, "Album", { enumerable: true, get: function() {
    return Album_1.Album;
  } });
  Object.defineProperty(exports2, "AlbumEvent", { enumerable: true, get: function() {
    return Album_1.AlbumEvent;
  } });
  var CallbackQuery_1 = require_CallbackQuery();
  Object.defineProperty(exports2, "CallbackQuery", { enumerable: true, get: function() {
    return CallbackQuery_1.CallbackQuery;
  } });
  Object.defineProperty(exports2, "CallbackQueryEvent", { enumerable: true, get: function() {
    return CallbackQuery_1.CallbackQueryEvent;
  } });
});

// node_modules/teleproto/client/TelegramClient.js
var require_TelegramClient = __commonJS((exports2) => {
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
  exports2.TelegramClient = undefined;
  var telegramBaseClient_1 = require_telegramBaseClient();
  var authMethods = __importStar(require_auth());
  var botMethods = __importStar(require_bots());
  var buttonsMethods = __importStar(require_buttons());
  var downloadMethods = __importStar(require_downloads());
  var parseMethods = __importStar(require_messageParse());
  var messageMethods = __importStar(require_messages2());
  var updateMethods = __importStar(require_dispatch());
  var uploadMethods = __importStar(require_uploads());
  var userMethods = __importStar(require_users());
  var chatMethods = __importStar(require_chats());
  var communityMethods = __importStar(require_communities());
  var inviteLinkMethods = __importStar(require_inviteLinks());
  var accountMethods = __importStar(require_account());
  var contactMethods = __importStar(require_contacts());
  var dialogMethods = __importStar(require_dialogs());
  var twoFA = __importStar(require_2fa());
  var forumMethods = __importStar(require_forums());
  var storyMethods = __importStar(require_stories());
  var folderMethods = __importStar(require_folders());
  var stickerMethods = __importStar(require_stickers());
  var tl_1 = require_tl();
  var apiProxy_1 = require_apiProxy();
  var html_1 = require_html();
  var markdown_1 = require_markdown();
  var markdownv2_1 = require_markdownv2();
  var network_1 = require_network();
  var registry_1 = require_registry();
  var dispatch_1 = require_dispatch();
  var composer_1 = require_composer();

  class TelegramClient extends telegramBaseClient_1.TelegramBaseClient {
    get updates() {
      if (!this._updates)
        this._updates = new composer_1.ClientUpdates(this);
      return this._updates;
    }
    constructor(session, apiId, apiHash, clientParams) {
      super(session, apiId, apiHash, clientParams);
    }
    start(authParams) {
      return authMethods.start(this, authParams);
    }
    checkAuthorization() {
      return authMethods.checkAuthorization(this);
    }
    logOut() {
      return authMethods.logOut(this);
    }
    signInUser(apiCredentials, authParams) {
      return authMethods.signInUser(this, apiCredentials, authParams);
    }
    signInUserWithQrCode(apiCredentials, authParams) {
      return authMethods.signInUserWithQrCode(this, apiCredentials, authParams);
    }
    sendCode(apiCredentials, phoneNumber, forceSMS = false, reCaptchaCallback) {
      return authMethods.sendCode(this, apiCredentials, phoneNumber, forceSMS, reCaptchaCallback);
    }
    sendVerifyEmailCode(phoneNumber, phoneCodeHash, email) {
      return authMethods.sendVerifyEmailCode(this, phoneNumber, phoneCodeHash, email);
    }
    verifyEmail(phoneNumber, phoneCodeHash, verification) {
      return authMethods.verifyEmail(this, phoneNumber, phoneCodeHash, verification);
    }
    resetLoginEmail(phoneNumber, phoneCodeHash) {
      return authMethods.resetLoginEmail(this, phoneNumber, phoneCodeHash);
    }
    signInWithPassword(apiCredentials, authParams) {
      return authMethods.signInWithPassword(this, apiCredentials, authParams);
    }
    signInBot(apiCredentials, authParams) {
      return authMethods.signInBot(this, apiCredentials, authParams);
    }
    signInWithWebToken(apiCredentials, webAuthToken) {
      return authMethods.signInWithWebToken(this, apiCredentials, webAuthToken);
    }
    async updateTwoFaSettings({ isCheckPassword, currentPassword, newPassword, hint = "", email, emailCodeCallback, onEmailCodeError }) {
      return twoFA.updateTwoFaSettings(this, {
        isCheckPassword,
        currentPassword,
        newPassword,
        hint,
        email,
        emailCodeCallback,
        onEmailCodeError
      });
    }
    inlineQuery(bot, query, entity, offset, geoPoint) {
      return botMethods.inlineQuery(this, bot, query, entity, offset, geoPoint);
    }
    buildReplyMarkup(buttons, inlineOnly = false) {
      return buttonsMethods.buildReplyMarkup(buttons, inlineOnly);
    }
    downloadFile(inputLocation, fileParams = {}) {
      return downloadMethods.downloadFile(this, inputLocation, fileParams);
    }
    downloadProfilePhoto(entity, downloadProfilePhotoParams = {
      isBig: false
    }) {
      if (typeof downloadProfilePhotoParams === "string") {
        downloadProfilePhotoParams = {
          outputFile: downloadProfilePhotoParams
        };
      }
      return downloadMethods.downloadProfilePhoto(this, entity, downloadProfilePhotoParams);
    }
    downloadMedia(messageOrMedia, downloadParams) {
      if (typeof downloadParams === "string") {
        downloadParams = { outputFile: downloadParams };
      }
      return downloadMethods.downloadMedia(this, messageOrMedia, downloadParams?.outputFile, downloadParams?.thumb, downloadParams?.progressCallback, {
        signal: downloadParams?.signal,
        requestTimeout: downloadParams?.requestTimeout
      });
    }
    get parseMode() {
      return this._parseMode;
    }
    setParseMode(mode) {
      if (mode) {
        this._parseMode = this._sanitizeParseMode(mode);
      } else {
        this._parseMode = undefined;
      }
    }
    _sanitizeParseMode(mode) {
      if (mode === "md" || mode === "markdown") {
        return markdown_1.MarkdownParser;
      }
      if (mode === "md2" || mode === "markdownv2") {
        return markdownv2_1.MarkdownV2Parser;
      }
      if (mode == "html") {
        return html_1.HTMLParser;
      }
      if (typeof mode == "object" && "parse" in mode && "unparse" in mode) {
        return mode;
      }
      throw new Error(`Invalid parse mode type ${mode}`);
    }
    iterMessages(entity, iterParams = {}) {
      return messageMethods.iterMessages(this, entity, iterParams);
    }
    getMessages(entity, getMessagesParams = {}) {
      return messageMethods.getMessages(this, entity, getMessagesParams);
    }
    getCommentData(entity, message) {
      return messageMethods.getCommentData(this, entity, message);
    }
    sendMessage(entity, sendMessageParams = {}) {
      return messageMethods.sendMessage(this, entity, sendMessageParams);
    }
    forwardMessages(entity, forwardMessagesParams) {
      return messageMethods.forwardMessages(this, entity, forwardMessagesParams);
    }
    editMessage(entity, editMessageParams) {
      return messageMethods.editMessage(this, entity, editMessageParams);
    }
    deleteMessages(entity, messageIds, { revoke = true }) {
      return messageMethods.deleteMessages(this, entity, messageIds, {
        revoke
      });
    }
    pinMessage(entity, message, pinMessageParams) {
      return messageMethods.pinMessage(this, entity, message, pinMessageParams);
    }
    unpinMessage(entity, message, unpinMessageParams) {
      return messageMethods.unpinMessage(this, entity, message, unpinMessageParams);
    }
    markAsRead(entity, message, markAsReadParams) {
      return messageMethods.markAsRead(this, entity, message, markAsReadParams);
    }
    sendReaction(entity, messageId, reaction, big, addToRecent) {
      return messageMethods.sendReaction(this, entity, messageId, reaction, big, addToRecent);
    }
    getReactionUsers(entity, messageId, params) {
      return messageMethods.getReactionUsers(this, entity, messageId, params);
    }
    sendPoll(entity, poll, params) {
      return messageMethods.sendPoll(this, entity, poll, params);
    }
    vote(entity, message, options) {
      return messageMethods.vote(this, entity, message, options);
    }
    closePoll(entity, message) {
      return messageMethods.closePoll(this, entity, message);
    }
    getScheduledMessages(entity, ids) {
      return messageMethods.getScheduledMessages(this, entity, ids);
    }
    sendScheduledMessages(entity, ids) {
      return messageMethods.sendScheduledMessages(this, entity, ids);
    }
    deleteScheduledMessages(entity, ids) {
      return messageMethods.deleteScheduledMessages(this, entity, ids);
    }
    copyMessages(entity, copyMessagesParams) {
      return messageMethods.copyMessages(this, entity, copyMessagesParams);
    }
    saveDraft(entity, params) {
      return messageMethods.saveDraft(this, entity, params);
    }
    clearDraft(entity) {
      return messageMethods.clearDraft(this, entity);
    }
    clearAllDrafts() {
      return messageMethods.clearAllDrafts(this);
    }
    getMessageByLink(link) {
      return messageMethods.getMessageByLink(this, link);
    }
    getDiscussionMessage(entity, message) {
      return messageMethods.getDiscussionMessage(this, entity, message);
    }
    getRichMessage(entity, message) {
      return messageMethods.getRichMessage(this, entity, message);
    }
    iterDialogs(iterDialogsParams = {}) {
      return dialogMethods.iterDialogs(this, iterDialogsParams);
    }
    getDialogs(params = {}) {
      return dialogMethods.getDialogs(this, params);
    }
    iterParticipants(entity, params = {}) {
      return chatMethods.iterParticipants(this, entity, params);
    }
    getParticipants(entity, params = {}) {
      return chatMethods.getParticipants(this, entity, params);
    }
    kickParticipant(entity, participant) {
      return chatMethods.kickParticipant(this, entity, participant);
    }
    getParticipant(entity, participant) {
      return chatMethods.getParticipant(this, entity, participant);
    }
    editBanned(entity, participant, params) {
      return chatMethods.editBanned(this, entity, participant, params);
    }
    editAdmin(entity, participant, params) {
      return chatMethods.editAdmin(this, entity, participant, params);
    }
    editChatDefaultBannedRights(entity, params) {
      return chatMethods.editChatDefaultBannedRights(this, entity, params);
    }
    editTitle(entity, title) {
      return chatMethods.editTitle(this, entity, title);
    }
    editPhoto(entity, photo) {
      return chatMethods.editPhoto(this, entity, photo);
    }
    editChatAbout(entity, about) {
      return chatMethods.editChatAbout(this, entity, about);
    }
    toggleSlowMode(entity, seconds) {
      return chatMethods.toggleSlowMode(this, entity, seconds);
    }
    createChannel(params) {
      return chatMethods.createChannel(this, params);
    }
    createChat(params) {
      return chatMethods.createChat(this, params);
    }
    joinChannel(entity) {
      return chatMethods.joinChannel(this, entity);
    }
    importChatInvite(link) {
      return chatMethods.importChatInvite(this, link);
    }
    leaveChannel(entity) {
      return chatMethods.leaveChannel(this, entity);
    }
    deleteHistory(entity, params) {
      return chatMethods.deleteHistory(this, entity, params);
    }
    editPeerFolders(entity, folderId) {
      return chatMethods.editPeerFolders(this, entity, folderId);
    }
    iterAdminLog(entity, params) {
      return chatMethods.iterAdminLog(this, entity, params);
    }
    getAdminLog(entity, params) {
      return chatMethods.getAdminLog(this, entity, params);
    }
    setTyping(entity, action, params) {
      return chatMethods.setTyping(this, entity, action, params);
    }
    getCommonChats(entity, params) {
      return userMethods.getCommonChats(this, entity, params);
    }
    exportChatInvite(entity, params) {
      return inviteLinkMethods.exportChatInvite(this, entity, params);
    }
    editExportedChatInvite(entity, link, params) {
      return inviteLinkMethods.editExportedChatInvite(this, entity, link, params);
    }
    getExportedChatInvite(entity, link) {
      return inviteLinkMethods.getExportedChatInvite(this, entity, link);
    }
    deleteExportedChatInvite(entity, link) {
      return inviteLinkMethods.deleteExportedChatInvite(this, entity, link);
    }
    deleteRevokedExportedChatInvites(entity, admin) {
      return inviteLinkMethods.deleteRevokedExportedChatInvites(this, entity, admin);
    }
    getAdminsWithInvites(entity) {
      return inviteLinkMethods.getAdminsWithInvites(this, entity);
    }
    iterExportedChatInvites(entity, params) {
      return inviteLinkMethods.iterExportedChatInvites(this, entity, params);
    }
    getExportedChatInvites(entity, params) {
      return inviteLinkMethods.getExportedChatInvites(this, entity, params);
    }
    iterChatInviteImporters(entity, params) {
      return inviteLinkMethods.iterChatInviteImporters(this, entity, params);
    }
    getChatInviteImporters(entity, params) {
      return inviteLinkMethods.getChatInviteImporters(this, entity, params);
    }
    hideChatJoinRequest(entity, user, params) {
      return inviteLinkMethods.hideChatJoinRequest(this, entity, user, params);
    }
    hideAllChatJoinRequests(entity, params) {
      return inviteLinkMethods.hideAllChatJoinRequests(this, entity, params);
    }
    checkChatInvite(link) {
      return inviteLinkMethods.checkChatInvite(this, link);
    }
    updateProfile(params) {
      return accountMethods.updateProfile(this, params);
    }
    updateUsername(username) {
      return accountMethods.updateUsername(this, username);
    }
    updateStatus(online) {
      return accountMethods.updateStatus(this, online);
    }
    uploadProfilePhoto(params) {
      return accountMethods.uploadProfilePhoto(this, params);
    }
    updateProfilePhoto(photo, params) {
      return accountMethods.updateProfilePhoto(this, photo, params);
    }
    deleteProfilePhotos(photos) {
      return accountMethods.deleteProfilePhotos(this, photos);
    }
    getUserPhotos(entity, params) {
      return accountMethods.getUserPhotos(this, entity, params);
    }
    getContacts() {
      return contactMethods.getContacts(this);
    }
    addContact(entity, params) {
      return contactMethods.addContact(this, entity, params);
    }
    deleteContacts(users) {
      return contactMethods.deleteContacts(this, users);
    }
    importContacts(contacts) {
      return contactMethods.importContacts(this, contacts);
    }
    block(entity, params) {
      return contactMethods.block(this, entity, params);
    }
    unblock(entity, params) {
      return contactMethods.unblock(this, entity, params);
    }
    getBlocked(params) {
      return contactMethods.getBlocked(this, params);
    }
    resetAuthorization(hash) {
      return accountMethods.resetAuthorization(this, hash);
    }
    getAuthorizations() {
      return accountMethods.getAuthorizations(this);
    }
    getPrivacy(key) {
      return accountMethods.getPrivacy(this, key);
    }
    setPrivacy(key, rules) {
      return accountMethods.setPrivacy(this, key, rules);
    }
    getNotifySettings(entity) {
      return accountMethods.getNotifySettings(this, entity);
    }
    updateNotifySettings(entity, params) {
      return accountMethods.updateNotifySettings(this, entity, params);
    }
    getAccountTTL() {
      return accountMethods.getAccountTTL(this);
    }
    setAccountTTL(days) {
      return accountMethods.setAccountTTL(this, days);
    }
    getGlobalPrivacySettings() {
      return accountMethods.getGlobalPrivacySettings(this);
    }
    setGlobalPrivacySettings(settings) {
      return accountMethods.setGlobalPrivacySettings(this, settings);
    }
    createCommunity(params) {
      return communityMethods.createCommunity(this, params);
    }
    getCommunity(community) {
      return communityMethods.getCommunity(this, community);
    }
    getJoinedCommunities() {
      return communityMethods.getJoinedCommunities(this);
    }
    getCommunityPeers(community) {
      return communityMethods.getCommunityPeers(this, community);
    }
    setCommunityPeerLink(community, peer, action) {
      return communityMethods.setCommunityPeerLink(this, community, peer, action);
    }
    setCommunityCollapsed(community, collapsed) {
      return communityMethods.setCommunityCollapsed(this, community, collapsed);
    }
    iterCommunityPeerLinkRequests(community, params = {}) {
      return communityMethods.iterCommunityPeerLinkRequests(this, community, params);
    }
    getCommunityPeerLinkRequests(community, params = {}) {
      return communityMethods.getCommunityPeerLinkRequests(this, community, params);
    }
    setCommunityPeerLinkRequestApproval(community, peer, approved) {
      return communityMethods.setCommunityPeerLinkRequestApproval(this, community, peer, approved);
    }
    setAllCommunityPeerLinkRequestsApproval(community, approved) {
      return communityMethods.setAllCommunityPeerLinkRequestsApproval(this, community, approved);
    }
    setCommunityParticipantBanned(community, participant, banned) {
      return communityMethods.setCommunityParticipantBanned(this, community, participant, banned);
    }
    getCommunityParticipantJoinedChats(community, participant) {
      return communityMethods.getCommunityParticipantJoinedChats(this, community, participant);
    }
    pinCommunity(community, pinned = true) {
      return communityMethods.pinCommunity(this, community, pinned);
    }
    getCommunityNotifySettings(community) {
      return communityMethods.getCommunityNotifySettings(this, community);
    }
    updateCommunityNotifySettings(community, params) {
      return communityMethods.updateCommunityNotifySettings(this, community, params);
    }
    createForumTopic(entity, params) {
      return forumMethods.createForumTopic(this, entity, params);
    }
    editForumTopic(entity, topicId, params) {
      return forumMethods.editForumTopic(this, entity, topicId, params);
    }
    updatePinnedForumTopic(entity, topicId, pinned) {
      return forumMethods.updatePinnedForumTopic(this, entity, topicId, pinned);
    }
    reorderPinnedForumTopics(entity, order, params) {
      return forumMethods.reorderPinnedForumTopics(this, entity, order, params);
    }
    getForumTopics(entity, params) {
      return forumMethods.getForumTopics(this, entity, params);
    }
    getForumTopicsByID(entity, topicIds) {
      return forumMethods.getForumTopicsByID(this, entity, topicIds);
    }
    toggleForum(entity, enabled, tabs) {
      return forumMethods.toggleForum(this, entity, enabled, tabs);
    }
    toggleViewForumAsMessages(entity, enabled) {
      return forumMethods.toggleViewForumAsMessages(this, entity, enabled);
    }
    sendStory(entity, params) {
      return storyMethods.sendStory(this, entity, params);
    }
    editStory(entity, storyId, params) {
      return storyMethods.editStory(this, entity, storyId, params);
    }
    deleteStories(entity, ids) {
      return storyMethods.deleteStories(this, entity, ids);
    }
    toggleStoriesPinned(entity, ids, pinned) {
      return storyMethods.toggleStoriesPinned(this, entity, ids, pinned);
    }
    canSendStory(entity) {
      return storyMethods.canSendStory(this, entity);
    }
    getAllStories(params) {
      return storyMethods.getAllStories(this, params);
    }
    getPeerStories(entity) {
      return storyMethods.getPeerStories(this, entity);
    }
    getStoriesByID(entity, ids) {
      return storyMethods.getStoriesByID(this, entity, ids);
    }
    getPinnedStories(entity, params) {
      return storyMethods.getPinnedStories(this, entity, params);
    }
    getStoriesArchive(entity, params) {
      return storyMethods.getStoriesArchive(this, entity, params);
    }
    readStories(entity, maxId) {
      return storyMethods.readStories(this, entity, maxId);
    }
    incrementStoryViews(entity, ids) {
      return storyMethods.incrementStoryViews(this, entity, ids);
    }
    getStoryViewsList(entity, storyId, params) {
      return storyMethods.getStoryViewsList(this, entity, storyId, params);
    }
    exportStoryLink(entity, storyId) {
      return storyMethods.exportStoryLink(this, entity, storyId);
    }
    sendStoryReaction(entity, storyId, reaction, params) {
      return storyMethods.sendStoryReaction(this, entity, storyId, reaction, params);
    }
    getDialogFilters() {
      return folderMethods.getDialogFilters(this);
    }
    updateDialogFilter(id, filter) {
      return folderMethods.updateDialogFilter(this, id, filter);
    }
    updateDialogFiltersOrder(order) {
      return folderMethods.updateDialogFiltersOrder(this, order);
    }
    getStickerSet(set) {
      return stickerMethods.getStickerSet(this, set);
    }
    getAllStickers() {
      return stickerMethods.getAllStickers(this);
    }
    installStickerSet(set, params) {
      return stickerMethods.installStickerSet(this, set, params);
    }
    uninstallStickerSet(set) {
      return stickerMethods.uninstallStickerSet(this, set);
    }
    getRecentStickers(params) {
      return stickerMethods.getRecentStickers(this, params);
    }
    saveRecentSticker(document, params) {
      return stickerMethods.saveRecentSticker(this, document, params);
    }
    clearRecentStickers(params) {
      return stickerMethods.clearRecentStickers(this, params);
    }
    getFavedStickers() {
      return stickerMethods.getFavedStickers(this);
    }
    faveSticker(document, params) {
      return stickerMethods.faveSticker(this, document, params);
    }
    getCustomEmojiDocuments(documentIds) {
      return stickerMethods.getCustomEmojiDocuments(this, documentIds);
    }
    setBotCommands(commands, params) {
      return botMethods.setBotCommands(this, commands, params);
    }
    getBotCommands(params) {
      return botMethods.getBotCommands(this, params);
    }
    resetBotCommands(params) {
      return botMethods.resetBotCommands(this, params);
    }
    setBotInfo(params) {
      return botMethods.setBotInfo(this, params);
    }
    getBotInfo(params) {
      return botMethods.getBotInfo(this, params);
    }
    setBotMenuButton(user, button) {
      return botMethods.setBotMenuButton(this, user, button);
    }
    getBotMenuButton(user) {
      return botMethods.getBotMenuButton(this, user);
    }
    translateText(params) {
      return messageMethods.translateText(this, params);
    }
    getMessagesViews(entity, ids, increment) {
      return messageMethods.getMessagesViews(this, entity, ids, increment);
    }
    getOutboxReadDate(entity, message) {
      return messageMethods.getOutboxReadDate(this, entity, message);
    }
    getMessageReadParticipants(entity, message) {
      return messageMethods.getMessageReadParticipants(this, entity, message);
    }
    iterDownload(file, params) {
      return downloadMethods.iterDownload(this, file, params);
    }
    on(event) {
      return updateMethods.on(this, event);
    }
    addEventHandler(callback, event) {
      return updateMethods.addEventHandler(this, callback, event);
    }
    removeEventHandler(callback, event) {
      return updateMethods.removeEventHandler(this, callback, event);
    }
    listEventHandlers() {
      return updateMethods.listEventHandlers(this);
    }
    async catchUp() {
      return (0, dispatch_1.catchUp)(this);
    }
    uploadFile(fileParams) {
      return uploadMethods.uploadFile(this, fileParams);
    }
    sendFile(entity, sendFileParams) {
      return uploadMethods.sendFile(this, entity, sendFileParams);
    }
    invoke(request, dcId, options) {
      return userMethods.invoke(this, request, dcId ?? options?.dcId, undefined, options);
    }
    invokeWithSender(request, sender) {
      return userMethods.invoke(this, request, undefined, sender);
    }
    get api() {
      if (!this._apiProxy) {
        this._apiProxy = (0, apiProxy_1.createApiProxy)(tl_1.Api, (request, dcId, options) => this.invoke(request, dcId, options));
      }
      return this._apiProxy;
    }
    getMe(inputPeer = false) {
      return userMethods.getMe(this, inputPeer);
    }
    isBot() {
