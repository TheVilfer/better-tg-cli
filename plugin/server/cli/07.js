              release();
              signal.removeEventListener("abort", onAbort);
              resolve();
            };
            signal.addEventListener("abort", onAbort, { once: true });
            if (signal.aborted)
              onAbort();
            task.then(resolve, reject);
          });
        } else {
          await task;
        }
      } catch (error) {
        release();
        if (onAbort)
          signal?.removeEventListener("abort", onAbort);
        throw error;
      }
    }
    releaseChannel(channelId) {
      const watching = this.watchedChannels.get(channelId);
      if (!watching)
        return;
      if (watching > 1) {
        this.watchedChannels.set(channelId, watching - 1);
        return;
      }
      this.watchedChannels.delete(channelId);
      this.channelScheduler.cancel(channelId);
      const retry = this.channelFailRetryTimers.get(channelId);
      if (retry)
        clearTimeout(retry);
      this.channelFailRetryTimers.delete(channelId);
      this.channelFailTimeoutS.delete(channelId);
      const tracker = this.channels.get(channelId);
      if (tracker)
        tracker.nextPollAt = undefined;
      if (tracker?.pollTimer) {
        clearTimeout(tracker.pollTimer);
        tracker.pollTimer = undefined;
      }
    }
    watchedChannelIds() {
      return [...this.watchedChannels.keys()];
    }
    get polling() {
      return {
        ...this.channelScheduler.state,
        channels: this.watchedChannelIds().map((channelId) => {
          const tracker = this.channels.get(channelId);
          return {
            channelId,
            lastPolledAt: tracker?.lastPolledAt,
            lastDelayMs: tracker?.lastDelayMs,
            nextPollAt: tracker?.nextPollAt
          };
        })
      };
    }
    handleChannelFloodWait(request, seconds) {
      if (!this.channelRequests.has(request))
        return false;
      if (Number.isFinite(seconds) && seconds > 0)
        this.channelScheduler.pause(seconds * 1000);
      return true;
    }
    invokeChannel(channelId, create) {
      const generation = this.generation;
      const queuedAt = Date.now();
      return this.channelScheduler.schedule(channelId, async () => {
        if (!this.isCurrent(generation))
          throw new channelScheduler_1.ChannelPollCancelledError;
        if (this.client.updates.authorizationError)
          throw this.client.updates.authorizationError;
        const request = create();
        this.channelRequests.add(request);
        const tracker = this.channels.get(channelId);
        if (tracker && request instanceof tl_1.Api.updates.GetChannelDifference) {
          tracker.pts.setRequesting(true);
          tracker.lastPolledAt = Date.now();
          tracker.lastDelayMs = tracker.lastPolledAt - queuedAt;
        }
        try {
          return await this.client.invoke(request);
        } catch (error) {
          if (this.isCurrent(generation)) {
            this.client.updates._suspendAuthorization(error);
            const flood = error;
            if (/^FLOOD_(?:PREMIUM_)?WAIT(?:_|$)/.test(flood.errorMessage ?? "")) {
              this.handleChannelFloodWait(request, flood.seconds ?? 0);
            }
          }
          throw error;
        } finally {
          this.channelRequests.delete(request);
        }
      });
    }
    async readChannelPts(inputChannel) {
      const channelId = inputChannel.channelId.toString();
      const full = await this.invokeChannel(channelId, () => new tl_1.Api.channels.GetFullChannel({ channel: inputChannel }));
      this.client._entityCache.add(full);
      if (!(full.fullChat instanceof tl_1.Api.ChannelFull)) {
        throw new Error("Cannot read the channel pts to start watching it");
      }
      return full.fullChat.pts;
    }
    async ensureState() {
      if (this.initializing)
        return this.initializing;
      const generation = this.generation;
      if (this.state || !this.isCurrent(generation) || this.client.updates.authorizationError)
        return;
      const task = (async () => {
        try {
          const state = await this.client.api.updates.getState();
          if (!this.isCurrent(generation))
            return;
          this.refreshFromState(state);
          this.lastUpdateTime = Date.now();
          const pending = this.beforeState.splice(0);
          for (const update of pending)
            this.onUpdates(update);
        } catch (error) {
          if (this.isCurrent(generation))
            this.client.updates._suspendAuthorization(error);
        }
      })();
      this.initializing = task;
      try {
        await task;
      } finally {
        if (this.initializing === task)
          this.initializing = undefined;
      }
    }
    refreshFromState(state) {
      if (this.state) {
        this.state.pts = state.pts;
        this.state.qts = state.qts;
        this.state.date = state.date;
        this.state.seq = state.seq;
      } else {
        this.state = { pts: state.pts, qts: state.qts, date: state.date, seq: state.seq };
      }
      this.globalPts.init(state.pts);
      this.qts.init(state.qts);
    }
    isStale() {
      return Boolean(this.state) && Date.now() - this.lastUpdateTime > NO_UPDATES_TIMEOUT_MS;
    }
    async recoverIfStale() {
      if (!this.isStale())
        return;
      this.client._log.debug("No updates for 15 minutes, fetching difference");
      await this.fetchCommonDifference();
      this.lastUpdateTime = Date.now();
    }
    handleContainer(update) {
      const payload = { others: update.updates, entities: this.collectEntities(update.users, update.chats) };
      const remaining = [];
      for (const item of update.updates) {
        if (isCommonPtsUpdate(item) || isChannelPtsUpdate(item) || hasQts(item) || item instanceof tl_1.Api.UpdateChannelTooLong) {
          this.feedUpdate(item, payload);
        } else {
          remaining.push(item);
        }
      }
      this.applySeq({ update, updates: remaining, payload, seqStart: "seqStart" in update ? update.seqStart : update.seq, seq: update.seq });
      this.drainPendingSeq();
    }
    applySeq(entry) {
      if (!this.state)
        return;
      const { seqStart, seq, update } = entry;
      if (seqStart !== 0 && seqStart <= this.state.seq)
        return;
      if (this.fetchingDifference || seqStart !== 0 && seqStart > this.state.seq + 1) {
        if (seqStart === 0 || !this.pendingSeq.some((pending) => pending.seqStart === seqStart && pending.seq === seq)) {
          if (this.pendingSeq.length >= MAX_PENDING_SEQ)
            this.pendingSeq.shift();
          this.pendingSeq.push(entry);
        }
        if (!this.fetchingDifference)
          this.armSeqGapTimer();
        return;
      }
      for (const item of entry.updates)
        this.feedUpdate(item, entry.payload);
      if (seq !== 0)
        this.state.seq = seq;
      this.state.date = Math.max(this.state.date, update.date);
    }
    armSeqGapTimer() {
      if (this.seqGapTimer)
        return;
      this.seqGapTimer = setTimeout(() => {
        this.seqGapTimer = undefined;
        this.client._log.debug("Seq gap was not filled in time; requesting difference");
        this.scheduleCommonDifference();
      }, ptsWaiter_1.WAIT_FOR_SKIPPED_TIMEOUT_MS);
    }
    handleShortMessage(update) {
      if (!this.state) {
        this.dispatch(update, { others: null });
        return;
      }
      const applied = this.globalPts.updateAndApply(update.pts, update.ptsCount, { tag: "update", update }, (u) => {
        if (this.state)
          this.state.pts = this.globalPts.current();
        this.dispatch(u, { others: null });
      }, () => {});
      if (applied) {
        this.state.date = Math.max(this.state.date, update.date);
      }
    }
    feedUpdate(update, payload) {
      if (!this.state) {
        this.dispatch(update, payload);
        return;
      }
      if (update instanceof tl_1.Api.UpdateChannelTooLong) {
        this.recoverChannel(update);
        return;
      }
      if (isCommonPtsUpdate(update)) {
        const u = update;
        this.globalPts.updateAndApply(u.pts, u.ptsCount, { tag: "update", update }, (applied) => {
          if (this.state)
            this.state.pts = this.globalPts.current();
          this.dispatch(applied, payload);
        }, () => {});
        return;
      }
      if (isChannelPtsUpdate(update)) {
        const u = update;
        const channelId = getChannelId(update);
        if (!channelId || !u.pts || !u.ptsCount) {
          this.dispatch(update, payload);
          return;
        }
        const tracker = this.getOrCreateChannel(channelId);
        if (!tracker.pts.inited()) {
          tracker.pts.init(u.pts);
          this.dispatch(update, payload);
          return;
        }
        tracker.pts.updateAndApply(u.pts, u.ptsCount, { tag: "update", update }, (applied) => this.dispatch(applied, payload), () => {});
        return;
      }
      if (hasQts(update)) {
        this.qts.updateAndApply(update.qts, 1, { tag: "update", update }, (applied) => {
          if (this.state)
            this.state.qts = this.qts.current();
          this.dispatch(applied, payload);
        }, () => {});
        return;
      }
      this.dispatch(update, payload);
    }
    isCurrent(generation) {
      return this.running && this.generation === generation;
    }
    async recoverChannel(update, fromDifference = false) {
      const channelId = update.channelId.toString();
      const tracker = this.getOrCreateChannel(channelId);
      if (!tracker.pts.inited()) {
        if (!fromDifference) {
          this.scheduleCommonDifference();
          return;
        }
        tracker.pts.init(1);
      } else if (update.pts !== undefined && tracker.pts.current() >= update.pts) {
        return;
      }
      await this.fetchChannelDifference(channelId);
    }
    dispatch(update, payload) {
      if (!this.running)
        return;
      if (this.isDuplicateMessage(update)) {
        this.client._log.debug("Skip duplicate message update (already dispatched)");
        return;
      }
      if (update._noDispatch) {
        return;
      }
      update._entities = payload.entities ?? new Map;
      (0, dispatch_1._dispatchUpdate)(this.client, { update }).catch((e) => this.client._log.error(`Error dispatching update: ${e}`));
    }
    isDuplicateMessage(update) {
      if (!(update instanceof tl_1.Api.UpdateNewMessage) && !(update instanceof tl_1.Api.UpdateNewChannelMessage)) {
        return false;
      }
      const message = update.message;
      if (message?.id == undefined || message.peerId == undefined)
        return false;
      let peerId;
      try {
        peerId = utils.getPeerId(message.peerId);
      } catch {
        return false;
      }
      const key = `${peerId}:${message.id}`;
      if (this.recentMessageKeys.has(key))
        return true;
      this.recentMessageKeys.add(key);
      this.recentMessageQueue.push(key);
      if (this.recentMessageQueue.length > RECENT_MESSAGE_BUFFER_SIZE) {
        const old = this.recentMessageQueue.shift();
        this.recentMessageKeys.delete(old);
      }
      return false;
    }
    async saveEntities(tlo) {
      try {
        await this.client.session.processEntities(tlo);
      } catch (e) {
        this.client._log.warn(`session.processEntities failed: ${e}`);
      }
    }
    collectEntities(users, chats) {
      const entities = new Map;
      for (const x of [...users, ...chats]) {
        try {
          entities.set(utils.getPeerId(x), x);
        } catch {}
      }
      return entities;
    }
    makeGlobalWaiter(secondary = false) {
      const timer = secondary ? "qtsTimer" : "globalPtsTimer";
      const host = {
        onApplied: (pts) => {
          if (this.state)
            this.state[secondary ? "qts" : "pts"] = pts;
        },
        onWaitForSkipped: (ms) => {
          if (ms < 0) {
            if (this[timer]) {
              clearTimeout(this[timer]);
              this[timer] = undefined;
            }
            return;
          }
          if (this[timer]) {
            if (ms > 1)
              return;
            clearTimeout(this[timer]);
          }
          this[timer] = setTimeout(() => {
            this[timer] = undefined;
            this.scheduleCommonDifference();
          }, ms);
        },
        onWaitForShortPoll: () => {}
      };
      return new ptsWaiter_1.PtsWaiter(host);
    }
    getOrCreateChannel(channelId) {
      let tracker = this.channels.get(channelId);
      if (tracker)
        return tracker;
      const host = {
        onWaitForSkipped: (ms) => {
          const t = this.channels.get(channelId);
          if (!t)
            return;
          if (ms < 0) {
            if (t.timer) {
              clearTimeout(t.timer);
              t.timer = undefined;
            }
            return;
          }
          if (t.timer) {
            if (ms > 1)
              return;
            clearTimeout(t.timer);
          }
          t.timer = setTimeout(() => {
            t.timer = undefined;
            this.fetchChannelDifference(channelId);
          }, ms);
        },
        onWaitForShortPoll: () => {}
      };
      tracker = { pts: new ptsWaiter_1.PtsWaiter(host) };
      this.channels.set(channelId, tracker);
      return tracker;
    }
    scheduleCommonDifference() {
      if (!this.state) {
        this.ensureState();
        return;
      }
      if (this.fetchingDifference)
        return;
      if (this.failRetryTimer)
        return;
      this.fetchCommonDifference();
    }
    async fetchCommonDifference() {
      const generation = this.generation;
      if (!this.isCurrent(generation) || this.client.updates.authorizationError || this.fetchingDifference || this.failRetryTimer || !this.state)
        return;
      this.fetchingDifference = true;
      this.globalPts.setRequesting(true);
      this.qts.setRequesting(true);
      let failed = false;
      try {
        await this.fetchDifferenceLoop(generation);
        if (!this.isCurrent(generation))
          return;
        this.failTimeoutS = FAIL_DIFFERENCE_INITIAL_S;
      } catch (e) {
        if (!this.isCurrent(generation))
          return;
        if (this.client.updates._suspendAuthorization(e))
          return;
        const msg = e?.errorMessage;
        if (msg === "PERSISTENT_TIMESTAMP_INVALID") {
          this.client._log.warn("Common pts is invalid; reinitializing update state");
          this.state = undefined;
          this.ensureState();
        } else {
          failed = true;
          this.client._log.warn(`fetchCommonDifference: ${e}`);
        }
      } finally {
        if (this.isCurrent(generation)) {
          if (this.state) {
            this.globalPts.init(this.state.pts, true);
            this.qts.init(this.state.qts, true);
          }
          this.fetchingDifference = false;
          this.globalPts.setRequesting(false);
          this.qts.setRequesting(false);
        }
      }
      if (failed && this.running) {
        const delayMs = this.failTimeoutS * 1000;
        this.bumpFailTimeout();
        this.client._log.debug(`Retry common difference in ${delayMs}ms`);
        this.failRetryTimer = setTimeout(() => {
          this.failRetryTimer = undefined;
          this.scheduleCommonDifference();
        }, delayMs);
      }
      this.drainPendingSeq();
    }
    async fetchDifferenceLoop(generation) {
      if (!this.state)
        return;
      let fetching = true;
      while (fetching && this.isCurrent(generation)) {
        const diff = await withDeadline(this.client.api.updates.getDifference({
          pts: this.state.pts,
          date: this.state.date,
          qts: this.state.qts
        }), DIFFERENCE_DEADLINE_MS, "updates.getDifference");
        if (!this.isCurrent(generation))
          return;
        if (diff instanceof tl_1.Api.updates.DifferenceEmpty) {
          this.state.date = diff.date;
          this.state.seq = diff.seq;
          fetching = false;
        } else if (diff instanceof tl_1.Api.updates.Difference) {
          await this.processDifference(diff, generation);
          if (!this.isCurrent(generation))
            return;
          this.state = { pts: diff.state.pts, qts: diff.state.qts, date: diff.state.date, seq: diff.state.seq };
          fetching = false;
        } else if (diff instanceof tl_1.Api.updates.DifferenceSlice) {
          await this.processDifference(diff, generation);
          if (!this.isCurrent(generation))
            return;
          this.state = { pts: diff.intermediateState.pts, qts: diff.intermediateState.qts, date: diff.intermediateState.date, seq: diff.intermediateState.seq };
        } else if (diff instanceof tl_1.Api.updates.DifferenceTooLong) {
          if (diff.pts <= this.state.pts)
            throw new Error("getDifference did not advance PTS");
          this.state.pts = diff.pts;
          this.client._log.warn("getDifference: too long, some updates may be lost");
        }
      }
    }
    async processDifference(diff, generation = this.generation) {
      const entities = this.collectEntities(diff.users, diff.chats);
      this.client._entityCache.add(diff);
      await this.saveEntities(diff);
      if (!this.isCurrent(generation))
        return;
      for (const message of diff.newMessages) {
        if (message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) {
          this.dispatch(new tl_1.Api.UpdateNewMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
        }
      }
      for (const message of diff.newEncryptedMessages) {
        this.dispatch(new tl_1.Api.UpdateNewEncryptedMessage({ message, qts: 0 }), { others: null, entities });
      }
      for (const update of diff.otherUpdates) {
        if (update instanceof tl_1.Api.UpdateChannelTooLong) {
          await this.recoverChannel(update, true);
          if (!this.isCurrent(generation))
            return;
        } else if (isChannelPtsUpdate(update)) {
          this.feedUpdate(update, { others: diff.otherUpdates, entities });
        } else {
          this.dispatch(update, { others: diff.otherUpdates, entities });
        }
      }
    }
    drainPendingSeq() {
      if (!this.state || this.fetchingDifference)
        return;
      this.pendingSeq.sort((a, b) => a.seqStart - b.seqStart);
      while (this.pendingSeq.length) {
        const entry = this.pendingSeq[0];
        if (entry.seqStart !== 0 && entry.seqStart > this.state.seq + 1)
          break;
        this.pendingSeq.shift();
        this.applySeq(entry);
      }
      if (!this.pendingSeq.length && this.seqGapTimer) {
        clearTimeout(this.seqGapTimer);
        this.seqGapTimer = undefined;
      } else if (this.pendingSeq.length) {
        this.armSeqGapTimer();
      }
    }
    fetchChannelDifference(channelId, opts = {}) {
      const tracker = this.channels.get(channelId);
      if (!tracker)
        return Promise.resolve();
      if (tracker.difference)
        return tracker.difference;
      const task = this.fetchChannelDifferenceOnce(channelId, opts);
      tracker.difference = task;
      task.finally(() => {
        if (tracker.difference === task)
          tracker.difference = undefined;
      }).catch(() => {});
      return task;
    }
    async fetchChannelDifferenceOnce(channelId, opts = {}) {
      const generation = this.generation;
      if (!this.isCurrent(generation) || this.client.updates.authorizationError)
        return;
      const tracker = this.channels.get(channelId);
      if (!tracker || tracker.pts.requesting())
        return;
      if (!tracker.pts.inited())
        return;
      if (this.channelFailRetryTimers.has(channelId))
        return;
      const current = () => this.isCurrent(generation) && this.channels.get(channelId) === tracker;
      const active = () => current() && (!opts.keepAlive || this.watchedChannels.has(channelId));
      if (tracker.pollTimer) {
        clearTimeout(tracker.pollTimer);
        tracker.pollTimer = undefined;
      }
      tracker.nextPollAt = undefined;
      let failed = false;
      let serverTimeoutS;
      try {
        const inputChannel = await this.resolveChannel(channelId, tracker);
        if (!active())
          return;
        if (!inputChannel) {
          this.client._log.warn(`Cannot resolve channel ${channelId}; skipping diff`);
          return;
        }
        tracker.inputChannel = inputChannel;
        let fetching = true;
        while (fetching && active()) {
          const diff = await this.invokeChannel(channelId, () => new tl_1.Api.updates.GetChannelDifference({
            channel: inputChannel,
            filter: new tl_1.Api.ChannelMessagesFilterEmpty,
            pts: tracker.pts.current(),
            limit: CHANNEL_DIFFERENCE_LIMIT,
            force: opts.keepAlive ? undefined : true
          }));
          if (!active())
            return;
          if (diff.timeout !== undefined)
            serverTimeoutS = diff.timeout;
          if (diff instanceof tl_1.Api.updates.ChannelDifferenceEmpty) {
            if (diff.pts)
              tracker.pts.init(diff.pts, true);
            fetching = !diff.final;
          } else if (diff instanceof tl_1.Api.updates.ChannelDifference) {
            const entities = this.collectEntities(diff.users, diff.chats);
            this.client._entityCache.add(diff);
            await this.saveEntities(diff);
            if (!active())
              return;
            for (const message of diff.newMessages) {
              if (message instanceof tl_1.Api.Message || message instanceof tl_1.Api.MessageService) {
                this.dispatch(new tl_1.Api.UpdateNewChannelMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
              }
            }
            for (const update of diff.otherUpdates) {
              this.dispatch(update, { others: diff.otherUpdates, entities });
            }
            tracker.pts.init(diff.pts, true);
            fetching = !diff.final;
          } else if (diff instanceof tl_1.Api.updates.ChannelDifferenceTooLong) {
            this.client._log.warn(`Channel ${channelId} difference too long`);
            if (diff.dialog instanceof tl_1.Api.Dialog && diff.dialog.pts !== undefined) {
              tracker.pts.init(diff.dialog.pts, true);
            }
            const entities = this.collectEntities(diff.users, diff.chats);
            this.client._entityCache.add(diff);
            await this.saveEntities(diff);
            if (!active())
              return;
            const included = diff.messages.filter((m) => m instanceof tl_1.Api.Message || m instanceof tl_1.Api.MessageService);
            included.sort((a, b) => a.id - b.id);
            for (const message of included) {
              this.dispatch(new tl_1.Api.UpdateNewChannelMessage({ message, pts: 0, ptsCount: 0 }), { others: null, entities });
            }
            fetching = !diff.final;
          }
        }
        this.channelFailTimeoutS.delete(channelId);
      } catch (e) {
        if (!active() || e instanceof channelScheduler_1.ChannelPollCancelledError)
          return;
        if (this.client.updates._suspendAuthorization(e))
          return;
        const msg = e?.errorMessage;
        if (msg === "CHANNEL_PRIVATE" || msg === "CHANNEL_INVALID") {
          this.client._log.info(`Channel ${channelId} is inaccessible (${msg}); dropping difference tracking`);
          this.dropChannel(channelId);
          return;
        }
        if (msg === "PERSISTENT_TIMESTAMP_INVALID") {
          this.client._log.warn(`Channel ${channelId} pts is invalid; resetting tracker`);
          this.dropChannel(channelId);
          return;
        }
        failed = true;
        this.client._log.warn(`fetchChannelDifference ${channelId}: ${e}`);
      } finally {
        if (current())
          tracker.pts.setRequesting(false);
      }
      if (!active())
        return;
      if (!failed)
        this.scheduleChannelPoll(channelId, serverTimeoutS);
      if (failed && this.running && (!opts.keepAlive || this.watchedChannels.has(channelId))) {
        const delayMs = Math.max((this.channelFailTimeoutS.get(channelId) ?? FAIL_DIFFERENCE_INITIAL_S) * 1000, (this.channelScheduler.state.pausedUntil ?? 0) - Date.now());
        tracker.nextPollAt = Date.now() + delayMs;
        this.bumpChannelFailTimeout(channelId);
        this.client._log.debug(`Retry channel ${channelId} difference in ${delayMs}ms`);
        const timer = setTimeout(() => {
          this.channelFailRetryTimers.delete(channelId);
          this.fetchChannelDifference(channelId, opts);
        }, delayMs);
        this.channelFailRetryTimers.set(channelId, timer);
      }
    }
    async resolveChannel(channelId, tracker) {
      if (tracker.inputChannel)
        return tracker.inputChannel;
      try {
        const peer = new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(channelId) });
        const input = await this.client.getInputEntity(peer);
        if (input instanceof tl_1.Api.InputPeerChannel) {
          return new tl_1.Api.InputChannel({ channelId: input.channelId, accessHash: input.accessHash });
        }
      } catch {}
      return;
    }
    scheduleChannelPoll(channelId, serverTimeoutS) {
      if (!this.running || !this.watchedChannels.has(channelId))
        return;
      const tracker = this.channels.get(channelId);
      if (!tracker)
        return;
      if (tracker.pollTimer)
        clearTimeout(tracker.pollTimer);
      const delayMs = serverTimeoutS !== undefined && serverTimeoutS > 0 ? serverTimeoutS * 1000 : this.client._channelPollInterval;
      tracker.nextPollAt = Date.now() + delayMs;
      tracker.pollTimer = setTimeout(() => {
        tracker.pollTimer = undefined;
        this.fetchChannelDifference(channelId, { keepAlive: true });
      }, delayMs);
    }
    bumpFailTimeout() {
      if (this.failTimeoutS < FAIL_DIFFERENCE_CAP_S) {
        this.failTimeoutS = Math.min(this.failTimeoutS * 2, FAIL_DIFFERENCE_CAP_S);
      }
    }
    dropChannel(channelId) {
      this.watchedChannels.delete(channelId);
      this.channelScheduler.cancel(channelId);
      const tracker = this.channels.get(channelId);
      if (tracker) {
        if (tracker.timer)
          clearTimeout(tracker.timer);
        if (tracker.pollTimer)
          clearTimeout(tracker.pollTimer);
        tracker.pts.clearSkippedUpdates();
        this.channels.delete(channelId);
      }
      const retry = this.channelFailRetryTimers.get(channelId);
      if (retry) {
        clearTimeout(retry);
        this.channelFailRetryTimers.delete(channelId);
      }
      this.channelFailTimeoutS.delete(channelId);
    }
    bumpChannelFailTimeout(channelId) {
      const cur = this.channelFailTimeoutS.get(channelId) ?? FAIL_DIFFERENCE_INITIAL_S;
      if (cur < FAIL_DIFFERENCE_CAP_S) {
        this.channelFailTimeoutS.set(channelId, Math.min(cur * 2, FAIL_DIFFERENCE_CAP_S));
      }
    }
  }
  exports2.UpdateManager = UpdateManager;
  function withDeadline(promise, ms, what) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        promise.catch(() => {});
        reject(new Error(`${what} timed out after ${ms}ms`));
      }, ms);
      promise.then((value) => {
        clearTimeout(timer);
        resolve(value);
      }, (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
});

// node_modules/teleproto/tl/custom/forward.js
var require_forward = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.Forward = undefined;
  var chatGetter_1 = require_chatGetter();
  var senderGetter_1 = require_senderGetter();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();

  class Forward extends senderGetter_1.SenderGetter {
    constructor(client, original, entities) {
      super();
      this.originalFwd = original;
      let senderId = undefined;
      let sender = undefined;
      let inputSender = undefined;
      let peer = undefined;
      let chat = undefined;
      let inputChat = undefined;
      if (original.fromId) {
        const ty = (0, Helpers_1._entityType)(original.fromId);
        if (ty === Helpers_1._EntityType.USER) {
          senderId = (0, Utils_1.getPeerId)(original.fromId);
          [sender, inputSender] = (0, Utils_1._getEntityPair)(senderId, entities, client._entityCache);
        } else if (ty === Helpers_1._EntityType.CHANNEL || ty === Helpers_1._EntityType.CHAT) {
          peer = original.fromId;
          [chat, inputChat] = (0, Utils_1._getEntityPair)((0, Utils_1.getPeerId)(peer), entities, client._entityCache);
        }
      }
      chatGetter_1.ChatGetter.initChatClass(this, {
        chatPeer: peer,
        chat,
        inputChat
      });
      senderGetter_1.SenderGetter.initSenderClass(this, {
        senderId: senderId ? (0, Helpers_1.returnBigInt)(senderId) : undefined,
        sender,
        inputSender
      });
      this._client = client;
    }
  }
  exports2.Forward = Forward;
});

// node_modules/teleproto/tl/custom/file.js
var require_file = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.File = undefined;
  var api_1 = require_api2();
  var Utils_1 = require_Utils();

  class File {
    constructor(media) {
      this.media = media;
    }
    get id() {
      throw new Error("Unsupported");
    }
    get name() {
      return this._fromAttr(api_1.Api.DocumentAttributeFilename, "fileName");
    }
    get mimeType() {
      if (this.media instanceof api_1.Api.Photo) {
        return "image/jpeg";
      } else if (this.media instanceof api_1.Api.Document) {
        return this.media.mimeType;
      }
    }
    get width() {
      return this._fromAttr([api_1.Api.DocumentAttributeImageSize, api_1.Api.DocumentAttributeVideo], "w");
    }
    get height() {
      return this._fromAttr([api_1.Api.DocumentAttributeImageSize, api_1.Api.DocumentAttributeVideo], "h");
    }
    get duration() {
      return this._fromAttr([api_1.Api.DocumentAttributeAudio, api_1.Api.DocumentAttributeVideo], "duration");
    }
    get title() {
      return this._fromAttr(api_1.Api.DocumentAttributeAudio, "title");
    }
    get performer() {
      return this._fromAttr(api_1.Api.DocumentAttributeAudio, "performer");
    }
    get emoji() {
      return this._fromAttr(api_1.Api.DocumentAttributeSticker, "alt");
    }
    get stickerSet() {
      return this._fromAttr(api_1.Api.DocumentAttributeSticker, "stickerset");
    }
    get size() {
      if (this.media instanceof api_1.Api.Photo) {
        return (0, Utils_1._photoSizeByteCount)(this.media.sizes[this.media.sizes.length - 1]);
      } else if (this.media instanceof api_1.Api.Document) {
        return this.media.size;
      }
    }
    _fromAttr(cls, field) {
      if (this.media instanceof api_1.Api.Document) {
        for (const attr of this.media.attributes) {
          if (attr instanceof cls) {
            return attr[field];
          }
        }
      }
    }
  }
  exports2.File = File;
});

// node_modules/teleproto/tl/runtime/patches/messages.js
var require_messages = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.patchAll = patchAll;
  var api_1 = require_api2();
  function getGetter(obj, prop) {
    while (obj) {
      const getter = Object.getOwnPropertyDescriptor(obj, prop);
      if (getter && getter.get) {
        return getter.get;
      }
      obj = Object.getPrototypeOf(obj);
    }
  }
  function getSetter(obj, prop) {
    while (obj) {
      const setter = Object.getOwnPropertyDescriptor(obj, prop);
      if (setter && setter.set) {
        return setter.set;
      }
      obj = Object.getPrototypeOf(obj);
    }
  }
  function getInstanceMethods(obj) {
    const keys = {
      methods: new Set,
      setters: new Set,
      getters: new Set
    };
    let topObject = obj;
    const mapAllMethods = (property) => {
      const getter = getGetter(topObject, property);
      const setter = getSetter(topObject, property);
      if (getter) {
        keys.getters.add(property);
      } else if (setter) {
        keys.setters.add(property);
      } else if (property !== "constructor") {
        keys.methods.add(property);
      }
    };
    do {
      Object.getOwnPropertyNames(obj).map(mapAllMethods);
      obj = Object.getPrototypeOf(obj);
    } while (obj && Object.getPrototypeOf(obj));
    return keys;
  }
  function patchClass(clazz, source) {
    const { getters, setters, methods } = getInstanceMethods(source.prototype);
    for (const getter of getters) {
      Object.defineProperty(clazz.prototype, getter, {
        get: getGetter(source.prototype, getter)
      });
    }
    for (const setter of setters) {
      Object.defineProperty(clazz.prototype, setter, {
        set: getSetter(source.prototype, setter)
      });
    }
    for (const method of methods) {
      clazz.prototype[method] = source.prototype[method];
    }
  }
  function patchAll(source) {
    patchClass(api_1.Api.Message, source);
    patchClass(api_1.Api.MessageService, source);
    patchClass(api_1.Api.MessageEmpty, source);
  }
});

// node_modules/teleproto/Password.js
var require_Password = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.computeCheck = computeCheck;
  exports2.computeDigest = computeDigest;
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();
  var big_integer_1 = __importDefault(require_BigInteger());
  var cifrante_1 = require_cifrante_node();
  var SIZE_FOR_HASH = 256;
  function checkPrimeAndGood(primeBytes, g) {
    const goodPrime = Buffer.from([
      199,
      28,
      174,
      185,
      198,
      177,
      201,
      4,
      142,
      108,
      82,
      47,
      112,
      241,
      63,
      115,
      152,
      13,
      64,
      35,
      142,
      62,
      33,
      193,
      73,
      52,
      208,
      55,
      86,
      61,
      147,
      15,
      72,
      25,
      138,
      10,
      167,
      193,
      64,
      88,
      34,
      148,
      147,
      210,
      37,
      48,
      244,
      219,
      250,
      51,
      111,
      110,
      10,
      201,
      37,
      19,
      149,
      67,
      174,
      212,
      76,
      206,
      124,
      55,
      32,
      253,
      81,
      246,
      148,
      88,
      112,
      90,
      198,
      140,
      212,
      254,
      107,
      107,
      19,
      171,
      220,
      151,
      70,
      81,
      41,
      105,
      50,
      132,
      84,
      241,
      143,
      175,
      140,
      89,
      95,
      100,
      36,
      119,
      254,
      150,
      187,
      42,
      148,
      29,
      91,
      205,
      29,
      74,
      200,
      204,
      73,
      136,
      7,
      8,
      250,
      155,
      55,
      142,
      60,
      79,
      58,
      144,
      96,
      190,
      230,
      124,
      249,
      164,
      164,
      166,
      149,
      129,
      16,
      81,
      144,
      126,
      22,
      39,
      83,
      181,
      107,
      15,
      107,
      65,
      13,
      186,
      116,
      216,
      168,
      75,
      42,
      20,
      179,
      20,
      78,
      14,
      241,
      40,
      71,
      84,
      253,
      23,
      237,
      149,
      13,
      89,
      101,
      180,
      185,
      221,
      70,
      88,
      45,
      177,
      23,
      141,
      22,
      156,
      107,
      196,
      101,
      176,
      214,
      255,
      156,
      163,
      146,
      143,
      239,
      91,
      154,
      228,
      228,
      24,
      252,
      21,
      232,
      62,
      190,
      160,
      248,
      127,
      169,
      255,
      94,
      237,
      112,
      5,
      13,
      237,
      40,
      73,
      244,
      123,
      249,
      89,
      217,
      86,
      133,
      12,
      233,
      41,
      133,
      31,
      13,
      129,
      21,
      246,
      53,
      177,
      5,
      238,
      46,
      78,
      21,
      208,
      75,
      36,
      84,
      191,
      111,
      79,
      173,
      240,
      52,
      177,
      4,
      3,
      17,
      156,
      216,
      227,
      185,
      47,
      204,
      91
    ]);
    if (goodPrime.equals(primeBytes)) {
      if ([3, 4, 5, 7].includes(g)) {
        return;
      }
    }
    throw new Error("Changing passwords unsupported");
  }
  function isGoodLarge(number, p) {
    return number.greater((0, big_integer_1.default)(0)) && p.subtract(number).greater((0, big_integer_1.default)(0));
  }
  function numBytesForHash(number) {
    return Buffer.concat([Buffer.alloc(SIZE_FOR_HASH - number.length), number]);
  }
  function bigNumForHash(g) {
    return (0, Helpers_1.readBufferFromBigInt)(g, SIZE_FOR_HASH, false);
  }
  function isGoodModExpFirst(modexp, prime) {
    const diff = prime.subtract(modexp);
    const minDiffBitsCount = 2048 - 64;
    const maxModExpSize = 256;
    return !(diff.lesser((0, big_integer_1.default)(0)) || diff.bitLength().toJSNumber() < minDiffBitsCount || modexp.bitLength().toJSNumber() < minDiffBitsCount || Math.floor((modexp.bitLength().toJSNumber() + 7) / 8) > maxModExpSize);
  }
  function xor(a, b) {
    const length = Math.min(a.length, b.length);
    for (let i = 0;i < length; i++) {
      a[i] = a[i] ^ b[i];
    }
    return a;
  }
  async function pbkdf2sha512(password, salt, iterations) {
    return (0, Helpers_1.asBuffer)(await cifrante_1.kdf.pbkdf2(password, salt, { hash: "sha512", iterations, length: 64 }));
  }
  async function computeHash(algo, password) {
    const hash1 = await (0, Helpers_1.sha256)(Buffer.concat([algo.salt1, Buffer.from(password, "utf-8"), algo.salt1]));
    const hash2 = await (0, Helpers_1.sha256)(Buffer.concat([algo.salt2, hash1, algo.salt2]));
    const hash3 = await pbkdf2sha512(hash2, algo.salt1, 1e5);
    return (0, Helpers_1.sha256)(Buffer.concat([algo.salt2, hash3, algo.salt2]));
  }
  async function computeDigest(algo, password) {
    try {
      checkPrimeAndGood(algo.p, algo.g);
    } catch (e) {
      throw new Error("bad p/g in password");
    }
    const value = (0, Helpers_1.modExp)((0, big_integer_1.default)(algo.g), (0, Helpers_1.readBigIntFromBuffer)(await computeHash(algo, password), false), (0, Helpers_1.readBigIntFromBuffer)(algo.p, false));
    return bigNumForHash(value);
  }
  async function computeCheck(request, password) {
    const algo = request.currentAlgo;
    if (!(algo instanceof tl_1.Api.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow)) {
      throw new Error(`Unsupported password algorithm ${algo?.className}`);
    }
    const srp_B = request.srp_B;
    const srpId = request.srpId;
    if (!srp_B || !srpId) {
      throw new Error(`Undefined srp_b  ${request}`);
    }
    const pwHash = await computeHash(algo, password);
    const p = (0, Helpers_1.readBigIntFromBuffer)(algo.p, false);
    const g = algo.g;
    const B = (0, Helpers_1.readBigIntFromBuffer)(srp_B, false);
    try {
      checkPrimeAndGood(algo.p, g);
    } catch (e) {
      throw new Error("bad /g in password");
    }
    if (!isGoodLarge(B, p)) {
      throw new Error("bad b in check");
    }
    const x = (0, Helpers_1.readBigIntFromBuffer)(pwHash, false);
    const pForHash = numBytesForHash(algo.p);
    const gForHash = bigNumForHash((0, big_integer_1.default)(g));
    const bForHash = numBytesForHash(srp_B);
    const gX = (0, Helpers_1.modExp)((0, big_integer_1.default)(g), x, p);
    const k = (0, Helpers_1.readBigIntFromBuffer)(await (0, Helpers_1.sha256)(Buffer.concat([pForHash, gForHash])), false);
    const kgX = (0, Helpers_1.bigIntMod)(k.multiply(gX), p);
    const generateAndCheckRandom = async () => {
      const randomSize = 256;
      while (true) {
        const random = (0, Helpers_1.generateRandomBytes)(randomSize);
        const a2 = (0, Helpers_1.readBigIntFromBuffer)(random, false);
        const A = (0, Helpers_1.modExp)((0, big_integer_1.default)(g), a2, p);
        if (isGoodModExpFirst(A, p)) {
          const aForHash2 = bigNumForHash(A);
          const u2 = (0, Helpers_1.readBigIntFromBuffer)(await (0, Helpers_1.sha256)(Buffer.concat([aForHash2, bForHash])), false);
          if (u2.greater((0, big_integer_1.default)(0))) {
            return {
              a: a2,
              aForHash: aForHash2,
              u: u2
            };
          }
        }
      }
    };
    const { a, aForHash, u } = await generateAndCheckRandom();
    const gB = (0, Helpers_1.bigIntMod)(B.subtract(kgX), p);
    if (!isGoodModExpFirst(gB, p)) {
      throw new Error("bad gB");
    }
    const ux = u.multiply(x);
    const aUx = a.add(ux);
    const S = (0, Helpers_1.modExp)(gB, aUx, p);
    const [K, pSha, gSha, salt1Sha, salt2Sha] = await Promise.all([
      (0, Helpers_1.sha256)(bigNumForHash(S)),
      (0, Helpers_1.sha256)(pForHash),
      (0, Helpers_1.sha256)(gForHash),
      (0, Helpers_1.sha256)(algo.salt1),
      (0, Helpers_1.sha256)(algo.salt2)
    ]);
    const M1 = await (0, Helpers_1.sha256)(Buffer.concat([
      xor(pSha, gSha),
      salt1Sha,
      salt2Sha,
      aForHash,
      bForHash,
      K
    ]));
    return new tl_1.Api.InputCheckPasswordSRP({
      srpId,
      A: Buffer.from(aForHash),
      M1
    });
  }
});

// node_modules/teleproto/tl/custom/messageButton.js
var require_messageButton = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.MessageButton = undefined;
  var api_1 = require_api2();
  var button_1 = require_button();
  var Password_1 = require_Password();

  class MessageButton {
    constructor(client, original, chat, bot, msgId) {
      this.button = original;
      this._bot = bot;
      this._chat = chat;
      this._msgId = msgId;
      this._client = client;
    }
    get client() {
      return this._client;
    }
    get text() {
      return !(this.button instanceof button_1.Button) ? this.button.text : "";
    }
    get data() {
      const type = this._inlineType;
      if (type instanceof api_1.Api.InlineButtonTypeCallback) {
        return type.data;
      }
    }
    get inlineQuery() {
      const type = this._inlineType;
      if (type instanceof api_1.Api.InlineButtonTypeSwitchInline) {
        return type.query;
      }
    }
    get url() {
      const type = this._inlineType;
      if (type instanceof api_1.Api.InlineButtonTypeUrl) {
        return type.url;
      }
    }
    get _inlineType() {
      return this.button instanceof api_1.Api.KeyboardInlineButton ? this.button.type : undefined;
    }
    async click({ sharePhone = false, shareGeo, password }) {
      const inlineType = this._inlineType;
      if (inlineType instanceof api_1.Api.InlineButtonTypeCallback) {
        let encryptedPassword;
        if (password != null) {
          const pwd = await this.client.invoke(new api_1.Api.account.GetPassword);
          encryptedPassword = await (0, Password_1.computeCheck)(pwd, password);
        }
        const request = new api_1.Api.messages.GetBotCallbackAnswer({
          peer: this._chat,
          msgId: this._msgId,
          data: inlineType.data,
          password: encryptedPassword
        });
        try {
          return await this._client.invoke(request);
        } catch (e) {
          if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
            return null;
          }
          throw e;
        }
      } else if (inlineType instanceof api_1.Api.InlineButtonTypeSwitchInline) {
        return this._client.invoke(new api_1.Api.messages.StartBot({
          bot: this._bot,
          peer: this._chat,
          startParam: inlineType.query
        }));
      } else if (inlineType instanceof api_1.Api.InlineButtonTypeUrl) {
        return inlineType.url;
      } else if (inlineType instanceof api_1.Api.InlineButtonTypeGame) {
        const request = new api_1.Api.messages.GetBotCallbackAnswer({
          peer: this._chat,
          msgId: this._msgId,
          game: true
        });
        try {
          return await this._client.invoke(request);
        } catch (e) {
          if (e.errorMessage == "BOT_RESPONSE_TIMEOUT") {
            return null;
          }
          throw e;
        }
      } else if (this.button instanceof api_1.Api.KeyboardButton) {
        const type = this.button.type;
        if (type instanceof api_1.Api.ButtonTypeDefault) {
          return this._client.sendMessage(this._chat, {
            message: this.button.text,
            parseMode: undefined
          });
        } else if (type instanceof api_1.Api.ButtonTypeRequestPhone) {
          if (!sharePhone) {
            throw new Error("cannot click on phone buttons unless sharePhone=true");
          }
          if (sharePhone == true || typeof sharePhone == "string") {
            const me = await this._client.getMe();
            sharePhone = new api_1.Api.InputMediaContact({
              phoneNumber: (sharePhone == true ? me.phone : sharePhone) || "",
              firstName: me.firstName || "",
              lastName: me.lastName || "",
              vcard: ""
            });
          }
          return this._client.sendFile(this._chat, {
            file: sharePhone
          });
        } else if (type instanceof api_1.Api.ButtonTypeRequestGeoLocation) {
          if (!shareGeo) {
            throw new Error("cannot click on geo buttons unless shareGeo=[longitude, latitude]");
          }
          if (Array.isArray(shareGeo)) {
            shareGeo = new api_1.Api.InputMediaGeoPoint({
              geoPoint: new api_1.Api.InputGeoPoint({
                long: shareGeo[0],
                lat: shareGeo[1]
              })
            });
          }
          return this._client.sendFile(this._chat, {
            file: shareGeo
          });
        }
      }
    }
  }
  exports2.MessageButton = MessageButton;
});

// node_modules/teleproto/tl/custom/message.js
var require_message = __commonJS((exports2) => {
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
  exports2.CustomMessage = undefined;
  exports2.installMessageBehaviour = installMessageBehaviour;
  var senderGetter_1 = require_senderGetter();
  var api_1 = require_api2();
  var chatGetter_1 = require_chatGetter();
  var utils = __importStar(require_Utils());
  var forward_1 = require_forward();
  var file_1 = require_file();
  var rich = __importStar(require_richMessage());
  var Helpers_1 = require_Helpers();
  var messages_1 = require_messages();
  var messageButton_1 = require_messageButton();

  class CustomMessage extends senderGetter_1.SenderGetter {
    init({ id, peerId = undefined, date = undefined, out = undefined, mentioned = undefined, mediaUnread = undefined, silent = undefined, post = undefined, fromId = undefined, replyTo = undefined, message = undefined, fwdFrom = undefined, viaBotId = undefined, media = undefined, replyMarkup = undefined, entities = undefined, views = undefined, editDate = undefined, postAuthor = undefined, groupedId = undefined, fromScheduled = undefined, legacy = undefined, editHide = undefined, pinned = undefined, restrictionReason = undefined, forwards = undefined, replies = undefined, action = undefined, reactions = undefined, noforwards = undefined, ttlPeriod = undefined, _entities = new Map }) {
      if (!id)
        throw new Error("id is a required attribute for Message");
      let senderId = undefined;
      if (fromId) {
        senderId = utils.getPeerId(fromId);
      } else if (peerId) {
        if (post || !out && peerId instanceof api_1.Api.PeerUser) {
          senderId = utils.getPeerId(peerId);
        }
      }
      this._entities = _entities;
      this.out = out;
      this.mentioned = mentioned;
      this.mediaUnread = mediaUnread;
      this.silent = silent;
      this.post = post;
      this.post = post;
      this.fromScheduled = fromScheduled;
      this.legacy = legacy;
      this.editHide = editHide;
      this.ttlPeriod = ttlPeriod;
      this.id = id;
      this.fromId = fromId;
      this.peerId = peerId;
      this.fwdFrom = fwdFrom;
      this.viaBotId = viaBotId;
      this.replyTo = replyTo;
      this.date = date;
      this.message = message;
      this.media = media instanceof api_1.Api.MessageMediaEmpty ? media : undefined;
      this.replyMarkup = replyMarkup;
      this.entities = entities;
      this.views = views;
      this.forwards = forwards;
      this.replies = replies;
      this.editDate = editDate;
      this.pinned = pinned;
      this.postAuthor = postAuthor;
      this.groupedId = groupedId;
      this.restrictionReason = restrictionReason;
      this.action = action;
      this.noforwards = noforwards;
      this.reactions = reactions;
      this._client = undefined;
      this._text = undefined;
      this._file = undefined;
      this._replyMessage = undefined;
      this._buttons = undefined;
      this._buttonsFlat = undefined;
      this._buttonsCount = 0;
      this._viaBot = undefined;
      this._viaInputBot = undefined;
      this._actionEntities = undefined;
      chatGetter_1.ChatGetter.initChatClass(this, { chatPeer: peerId, broadcast: post });
      senderGetter_1.SenderGetter.initSenderClass(this, {
        senderId: senderId ? (0, Helpers_1.returnBigInt)(senderId) : undefined
      });
      this._forward = undefined;
    }
    constructor(args) {
      super();
      this.init(args);
    }
    _finishInit(client, entities, inputChat) {
      this._client = client;
      const cache = client._entityCache;
      if (this.senderId) {
        [this._sender, this._inputSender] = utils._getEntityPair(this.senderId.toString(), entities, cache);
      }
      if (this.chatId) {
        [this._chat, this._inputChat] = utils._getEntityPair(this.chatId.toString(), entities, cache);
      }
      if (inputChat) {
        this._inputChat = inputChat;
      }
      if (this.viaBotId) {
        [this._viaBot, this._viaInputBot] = utils._getEntityPair(this.viaBotId.toString(), entities, cache);
      }
      if (this.fwdFrom) {
        this._forward = new forward_1.Forward(this._client, this.fwdFrom, entities);
      }
      if (this.action) {
        if (this.action instanceof api_1.Api.MessageActionChatAddUser || this.action instanceof api_1.Api.MessageActionChatCreate) {
          this._actionEntities = this.action.users.map((i) => entities.get(i.toString()));
        } else if (this.action instanceof api_1.Api.MessageActionChatDeleteUser) {
          this._actionEntities = [
            entities.get(this.action.userId.toString())
          ];
        } else if (this.action instanceof api_1.Api.MessageActionChatJoinedByLink) {
          this._actionEntities = [
            entities.get(utils.getPeerId(new api_1.Api.PeerChannel({
              channelId: this.action.inviterId
            })))
          ];
        } else if (this.action instanceof api_1.Api.MessageActionChannelMigrateFrom) {
          this._actionEntities = [
            entities.get(utils.getPeerId(new api_1.Api.PeerChat({ chatId: this.action.chatId })))
          ];
        }
      }
    }
    get client() {
      return this._client;
    }
    get text() {
      if (this._text === undefined && this._client) {
        if (!this._client.parseMode) {
          this._text = this.message;
        } else {
          this._text = this._client.parseMode.unparse(this.message || "", this.entities || []);
        }
      }
      return this._text || "";
    }
    set text(value) {
      this._text = value;
      if (this._client && this._client.parseMode) {
        [this.message, this.entities] = this._client.parseMode.parse(value);
      } else {
        this.message = value;
        this.entities = [];
      }
    }
    get rawText() {
      return this.message || "";
    }
    set rawText(value) {
      this.message = value;
      this.entities = [];
      this._text = "";
    }
    get isReply() {
      return !!this.replyTo;
    }
    get forward() {
      return this._forward;
    }
    async _refetchSender() {
      await this._reloadMessage();
    }
    async _reloadMessage() {
      if (!this._client)
        return;
      let msg = undefined;
      try {
        const chat = this.isChannel ? await this.getInputChat() : undefined;
        let temp = await this._client.getMessages(chat, { ids: this.id });
        if (temp) {
          msg = temp[0];
        }
      } catch (e) {
        this._client._log.error("Got error while trying to finish init message with id " + this.id, e);
        if (this._client._errorHandler) {
          await this._client._errorHandler(e);
        }
      }
      if (msg == undefined)
        return;
      this._sender = msg._sender;
      this._inputSender = msg._inputSender;
      this._chat = msg._chat;
      this._inputChat = msg._inputChat;
      this._viaBot = msg._viaBot;
      this._viaInputBot = msg._viaInputBot;
      this._forward = msg._forward;
      this._actionEntities = msg._actionEntities;
    }
    get buttons() {
      if (!this._buttons && this.replyMarkup) {
        if (!this.inputChat) {
          return;
        }
        try {
          const bot = this._neededMarkupBot();
          this._setButtons(this.inputChat, bot);
        } catch (e) {
          return;
        }
      }
      return this._buttons;
    }
    async getButtons() {
      if (!this.buttons && this.replyMarkup) {
        const chat = await this.getInputChat();
        if (!chat)
          return;
        let bot;
        try {
          bot = this._neededMarkupBot();
        } catch (e) {
          await this._reloadMessage();
          try {
            bot = this._neededMarkupBot();
          } catch (err) {
            bot = this.viaBotId ? await this.client.getInputEntity(this.viaBotId) : await this.getInputSender();
            if (!bot)
              throw err;
          }
        }
        this._setButtons(chat, bot);
      }
      return this._buttons;
    }
    get buttonCount() {
      if (!this._buttonsCount) {
        if (this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup || this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup) {
          this._buttonsCount = this.replyMarkup.rows.map((r) => r.buttons.length).reduce(function(a, b) {
            return a + b;
          }, 0);
        } else {
          this._buttonsCount = 0;
        }
      }
      return this._buttonsCount;
    }
    get file() {
      if (!this._file) {
        const media = this.photo || this.document;
        if (media) {
          this._file = new file_1.File(media);
        }
      }
      return this._file;
    }
    get photo() {
      if (this.media instanceof api_1.Api.MessageMediaPhoto) {
        if (this.media.photo instanceof api_1.Api.Photo)
          return this.media.photo;
      } else if (this.action instanceof api_1.Api.MessageActionChatEditPhoto) {
        return this.action.photo;
      } else {
        return this.webPreview && this.webPreview.photo instanceof api_1.Api.Photo ? this.webPreview.photo : undefined;
      }
      return;
    }
    get document() {
      if (this.media instanceof api_1.Api.MessageMediaDocument) {
        if (this.media.document instanceof api_1.Api.Document)
          return this.media.document;
      } else {
        const web = this.webPreview;
        return web && web.document instanceof api_1.Api.Document ? web.document : undefined;
      }
      return;
    }
    get webPreview() {
      if (this.media instanceof api_1.Api.MessageMediaWebPage) {
        if (this.media.webpage instanceof api_1.Api.WebPage)
          return this.media.webpage;
      }
    }
    get audio() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeAudio, (attr) => !attr.voice);
    }
    get voice() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeAudio, (attr) => !!attr.voice);
    }
    get video() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeVideo);
    }
    get videoNote() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeVideo, (attr) => !!attr.roundMessage);
    }
    get gif() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeAnimated);
    }
    get sticker() {
      return this._documentByAttribute(api_1.Api.DocumentAttributeSticker);
    }
    get contact() {
      if (this.media instanceof api_1.Api.MessageMediaContact) {
        return this.media;
      }
    }
    get game() {
      if (this.media instanceof api_1.Api.MessageMediaGame) {
        return this.media.game;
      }
    }
    get geo() {
      if (this.media instanceof api_1.Api.MessageMediaGeo || this.media instanceof api_1.Api.MessageMediaGeoLive || this.media instanceof api_1.Api.MessageMediaVenue) {
        return this.media.geo;
      }
    }
    get invoice() {
      if (this.media instanceof api_1.Api.MessageMediaInvoice) {
        return this.media;
      }
    }
    get poll() {
      if (this.media instanceof api_1.Api.MessageMediaPoll) {
        return this.media;
      }
    }
    get venue() {
      if (this.media instanceof api_1.Api.MessageMediaVenue) {
        return this.media;
      }
    }
    get dice() {
      if (this.media instanceof api_1.Api.MessageMediaDice) {
        return this.media;
      }
    }
    get actionEntities() {
      return this._actionEntities;
    }
    get viaBot() {
      return this._viaBot;
    }
    get viaInputBot() {
      return this._viaInputBot;
    }
    get replyToMsgId() {
      return this.replyTo?.replyToMsgId;
    }
    get toId() {
      if (this._client && !this.out && this.isPrivate) {
        return new api_1.Api.PeerUser({
          userId: this._client._selfInputPeer?.userId
        });
      }
      return this.peerId;
    }
    get richText() {
      return this.richMessage && this.richMessage instanceof api_1.Api.RichMessage ? rich.toPlainText(this.richMessage) : undefined;
    }
    get richMarkdown() {
      return this.richMessage && this.richMessage instanceof api_1.Api.RichMessage ? rich.toMarkdown(this.richMessage) : undefined;
    }
    get richHtml() {
      return this.richMessage && this.richMessage instanceof api_1.Api.RichMessage ? rich.toHtml(this.richMessage) : undefined;
    }
    async fetchRichMessage() {
      const current = this.richMessage;
      if (!this._client || !current || !(current instanceof api_1.Api.RichMessage) || !current.part) {
        return this;
      }
      const full = await this._client.getRichMessage(await this.getInputChat(), this.id);
      if (full && full.richMessage) {
        this.richMessage = full.richMessage;
      }
      return this;
    }
    getEntitiesText(cls) {
      let ent = this.entities;
      if (!ent || ent.length == 0)
        return;
      if (cls) {
        ent = ent.filter((v) => v instanceof cls);
      }
      const texts = utils.getInnerText(this.message || "", ent);
      const zip = (rows) => rows[0].map((_, c) => rows.map((row) => row[c]));
      return zip([ent, texts]);
    }
    async getReplyMessage() {
      if (!this._replyMessage && this._client) {
        if (!this.replyTo)
          return;
        this._replyMessage = (await this._client.getMessages(this.isChannel ? await this.getInputChat() : undefined, {
          ids: new api_1.Api.InputMessageReplyTo({ id: this.id })
        }))[0];
        if (!this._replyMessage) {
          this._replyMessage = (await this._client.getMessages(this.isChannel ? this._inputChat : undefined, {
            ids: this.replyToMsgId
          }))[0];
        }
      }
      return this._replyMessage;
    }
    async respond(params) {
      if (this._client) {
        return this._client.sendMessage(await this.getInputChat(), params);
      }
    }
    async reply(params) {
      if (this._client) {
        params.replyTo = this.id;
        return this._client.sendMessage(await this.getInputChat(), params);
      }
    }
    async forwardTo(entity, params) {
      if (this._client) {
        entity = await this._client.getInputEntity(entity);
        return this._client.forwardMessages(entity, {
          ...params,
          messages: [this.id],
          fromPeer: await this.getInputChat()
        });
      }
    }
    async edit(params) {
      const param = params;
      if (this.fwdFrom || !this._client)
        return;
      if (param.linkPreview == undefined) {
        param.linkPreview = !!this.webPreview;
      }
      if (param.buttons == undefined) {
        param.buttons = this.replyMarkup;
      }
      param.message = this.id;
      return this._client.editMessage(await this.getInputChat(), param);
    }
    async delete({ revoke = true } = {}) {
      if (this._client) {
        return this._client.deleteMessages(await this.getInputChat(), [this.id], {
          revoke
        });
      }
    }
    async pin(params) {
      if (this._client) {
        const entity = await this.getInputChat();
        if (entity === undefined) {
          throw Error("Failed to pin message due to cannot get input chat.");
        }
        return this._client.pinMessage(entity, this.id, params);
      }
    }
    async unpin(params) {
      if (this._client) {
        const entity = await this.getInputChat();
        if (entity === undefined) {
          throw Error("Failed to unpin message due to cannot get input chat.");
        }
        return this._client.unpinMessage(entity, this.id, params);
      }
    }
    async downloadMedia(params) {
      if (this._client)
        return this._client.downloadMedia(this, params || {});
    }
    async markAsRead(params) {
      if (this._client) {
        const entity = await this.getInputChat();
        if (entity === undefined) {
          throw Error(`Failed to mark message id ${this.id} as read due to cannot get input chat.`);
        }
        return this._client.markAsRead(entity, this.id, params);
      }
    }
    async react(reaction, big, addToRecent) {
      if (!this._client)
        return;
      function toReaction(r) {
        if (typeof r === "string") {
          return new api_1.Api.ReactionEmoji({ emoticon: r });
        }
        if (r instanceof api_1.Api.ReactionEmoji || r instanceof api_1.Api.ReactionCustomEmoji || r instanceof api_1.Api.ReactionPaid || r instanceof api_1.Api.ReactionEmpty) {
          return r;
        }
        return new api_1.Api.ReactionCustomEmoji({
          documentId: (0, Helpers_1.returnBigInt)(r)
        });
      }
      let reactionList;
      if (reaction == undefined) {
        reactionList = [];
      } else if (Array.isArray(reaction)) {
        reactionList = reaction.map(toReaction);
      } else {
        reactionList = [toReaction(reaction)];
      }
      return this._client.sendReaction(await this.getInputChat(), this.id, reactionList, big, addToRecent);
    }
    async getReactions(limit, reaction, offset) {
      if (!this._client)
        return;
      return this._client.getReactionUsers(await this.getInputChat(), this.id, { limit, reaction, offset });
    }
    async copy(entity, params) {
      if (!this._client)
        return;
      entity = await this._client.getInputEntity(entity);
      const sent = await this._client.forwardMessages(entity, {
        ...params,
        messages: [this.id],
        fromPeer: await this.getInputChat(),
        dropAuthor: true
      });
      return sent[0];
    }
    async click({ i, j, text, filter, data, sharePhone, shareGeo, password }) {
      if (!this.client) {
        return;
      }
      if (data) {
        const chat = await this.getInputChat();
        if (!chat) {
          return;
        }
        const button2 = new api_1.Api.KeyboardInlineButton({
          text: "",
          type: new api_1.Api.InlineButtonTypeCallback({
            data
          })
        });
        return await new messageButton_1.MessageButton(this.client, button2, chat, undefined, this.id).click({
          sharePhone,
          shareGeo,
          password
        });
      }
      if (this.poll) {
        let findPoll = function(answers) {
          if (i != null) {
            if (Array.isArray(i)) {
              const corrects = [];
              for (let x = 0;x < i.length; x++) {
                corrects.push(answers[x].option);
              }
              return corrects;
            }
            return [answers[i].option];
          }
          if (text != null) {
            if (typeof text == "function") {
              for (const answer of answers) {
                if (text(answer.text)) {
                  return [answer.option];
                }
              }
            } else {
              for (const answer of answers) {
                if (answer.text.text == text) {
                  return [answer.option];
                }
              }
            }
            return;
          }
          if (filter != null) {
            for (const answer of answers) {
              if (filter(answer)) {
                return [answer.option];
              }
            }
            return;
          }
        };
        const options = findPoll(this.poll.poll.answers) || [];
        const chat = await this.getInputChat();
        if (!chat) {
          return;
        }
        return await this.client.invoke(new api_1.Api.messages.SendVote({
          peer: chat,
          msgId: this.id,
          options
        }));
      }
      if (!await this.getButtons()) {
        return;
      }
      function findButton(self) {
        if (!self._buttonsFlat || !self._buttons) {
          return;
        }
        if (Array.isArray(i)) {
          i = i[0];
        }
        if (text != null) {
          if (typeof text == "function") {
            for (const button2 of self._buttonsFlat) {
              if (text(button2.text)) {
                return button2;
              }
            }
          } else {
            for (const button2 of self._buttonsFlat) {
              if (button2.text == text) {
                return button2;
              }
            }
          }
          return;
        }
        if (filter != null) {
          for (const button2 of self._buttonsFlat) {
            if (filter(button2)) {
              return button2;
            }
          }
          return;
        }
        if (i == undefined) {
          i = 0;
        }
        if (j == undefined) {
          return self._buttonsFlat[i];
        } else {
          return self._buttons[i][j];
        }
      }
      const button = findButton(this);
      if (button) {
        return await button.click({
          sharePhone,
          shareGeo,
          password
        });
      }
    }
    _setButtons(chat, bot) {
      if (this.client && (this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup || this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup)) {
        this._buttons = [];
        this._buttonsFlat = [];
        for (const row of this.replyMarkup.rows) {
          const tmp = [];
          for (const button of row.buttons) {
            const btn = new messageButton_1.MessageButton(this.client, button, chat, bot, this.id);
            tmp.push(btn);
            this._buttonsFlat.push(btn);
          }
          this._buttons.push(tmp);
        }
      }
    }
    _neededMarkupBot() {
      if (!this.client || this.replyMarkup == undefined) {
        return;
      }
      if (!(this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup || this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup)) {
        return;
      }
      for (const row of this.replyMarkup.rows) {
        for (const button of row.buttons) {
          if (button instanceof api_1.Api.KeyboardInlineButton && button.type instanceof api_1.Api.InlineButtonTypeSwitchInline) {
            if (button.type.samePeer || !this.viaBotId) {
              const bot = this._inputSender;
              if (!bot)
                throw new Error("No input sender");
              return bot;
            } else {
              const ent = this.client._entityCache.get(this.viaBotId);
              if (!ent)
                throw new Error("No input sender");
              return ent;
            }
          }
        }
      }
    }
    _documentByAttribute(kind, condition) {
      const doc = this.document;
      if (doc) {
        for (const attr of doc.attributes) {
          if (attr instanceof kind) {
            if (condition == undefined || typeof condition == "function" && condition(attr)) {
              return doc;
            }
            return;
          }
        }
      }
    }
  }
  exports2.CustomMessage = CustomMessage;
  var installed = false;
  function installMessageBehaviour() {
    if (installed)
      return;
    installed = true;
    (0, messages_1.patchAll)(CustomMessage);
  }
});

// node_modules/teleproto/client/telegramBaseClient.js
var require_telegramBaseClient = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.TelegramBaseClient = exports2.WEBSOCKET_DC_HOSTS = exports2.TEST_DC_IPV6 = exports2.TEST_DC_IPV4 = exports2.PROD_DC_IPV6 = exports2.PROD_DC_IPV4 = undefined;
  exports2.webSocketDcAddress = webSocketDcAddress;
  var Version_1 = require_Version();
  var connection_1 = require_connection();
  var sessions_1 = require_sessions();
  var extensions_1 = require_extensions();
  var tl_1 = require_tl();
  var os_1 = __importDefault(require("os"));
  var entityCache_1 = require_entityCache();
  var markdown_1 = require_markdown();
  var network_1 = require_network();
  var Dcenter_1 = require_Dcenter();
  var Network_1 = require_Network();
  var MediaScheduler_1 = require_MediaScheduler();
  var registry_1 = require_registry();
  var TCPMTProxy_1 = require_TCPMTProxy();
  var Deferred_1 = __importDefault(require_Deferred());
  var manager_1 = require_manager();
  var dispatch_1 = require_dispatch();
  var WebProxy_1 = require_WebProxy();
  var message_1 = require_message();
  var SESSION_IDLE_TIMEOUT_MS = 60000;
  var SESSION_STARTUP_DELAY_MS = 800;
  var PROD_DEFAULT_DC_ID = 2;
  var TEST_DEFAULT_DC_ID = 2;
  exports2.PROD_DC_IPV4 = {
    1: "149.154.175.50",
    2: "149.154.167.51",
    3: "149.154.175.100",
    4: "149.154.167.91",
    5: "149.154.171.5"
  };
  exports2.PROD_DC_IPV6 = {
    1: "2001:0b28:f23d:f001:0000:0000:0000:000a",
    2: "2001:067c:04e8:f002:0000:0000:0000:000a",
    3: "2001:0b28:f23d:f003:0000:0000:0000:000a",
    4: "2001:067c:04e8:f004:0000:0000:0000:000a",
    5: "2001:0b28:f23f:f005:0000:0000:0000:000a"
  };
  exports2.TEST_DC_IPV4 = {
    1: "149.154.175.10",
    2: "149.154.167.40",
    3: "149.154.175.117"
  };
  exports2.TEST_DC_IPV6 = {
    1: "2001:0b28:f23d:f001:0000:0000:0000:000e",
    2: "2001:067c:04e8:f002:0000:0000:0000:000e",
    3: "2001:0b28:f23d:f003:0000:0000:0000:000e"
  };
  var DC_PORT = 443;
  exports2.WEBSOCKET_DC_HOSTS = {
    1: "pluto",
    2: "venus",
    3: "aurora",
    4: "vesta",
    5: "flora"
  };
  function webSocketDcAddress(dcId, mediaCluster = false) {
    const host = exports2.WEBSOCKET_DC_HOSTS[dcId];
    if (!host)
      return;
    return `${host}${mediaCluster ? "-1" : ""}.web.telegram.org`;
  }
  function inferSessionEnv(address) {
    for (const ip of Object.values(exports2.TEST_DC_IPV4))
      if (ip === address)
        return true;
    for (const ip of Object.values(exports2.TEST_DC_IPV6))
      if (ip === address)
        return true;
    for (const ip of Object.values(exports2.PROD_DC_IPV4))
      if (ip === address)
        return false;
    for (const ip of Object.values(exports2.PROD_DC_IPV6))
      if (ip === address)
        return false;
    return;
  }
  var clientParamsDefault = {
    connection: connection_1.ConnectionTCPFull,
    networkSocket: extensions_1.PromisedNetSockets,
    useIPV6: false,
    testServers: false,
    timeout: 10,
    requestRetries: 5,
    connectionRetries: Infinity,
    reconnectRetries: Infinity,
    retryDelay: 1000,
    downloadRetries: 5,
    autoReconnect: true,
    sequentialUpdates: false,
    floodSleepThreshold: 60,
    deviceModel: "",
    systemVersion: "",
    appVersion: "",
    langCode: "en",
    systemLangCode: "en",
    channelPollInterval: 1000,
    channelPollRequestInterval: 250,
    channelPollConcurrency: 2,
    _securityChecks: true
  };

  class TelegramBaseClient {
    constructor(session, apiId, apiHash, clientParams) {
      this.__version__ = Version_1.version;
      this._lastReceivedAt = 0;
      this._ALBUMS = new Map;
      this._dcConnectFailures = new Map;
      this._dcenters = new Dcenter_1.DcenterRegistry;
      this._lifecycleHandlers = new Map;
      this._connectionEvent = "disconnect";
      const explicitConnection = clientParams.connection !== undefined;
      const explicitSocket = clientParams.networkSocket !== undefined;
      clientParams = { ...clientParamsDefault, ...clientParams };
      if (!apiId || !apiHash) {
        throw new Error("Your API ID or Hash cannot be empty or undefined");
      }
      if (clientParams.baseLogger) {
        this._log = clientParams.baseLogger;
      } else {
        this._log = new extensions_1.Logger;
      }
      this._log.info("Running teleproto version " + Version_1.version);
      if (session && typeof session == "string") {
        session = new sessions_1.StoreSession(session);
      }
      if (!(session instanceof sessions_1.Session)) {
        throw new Error("Only StringSession and StoreSessions are supported currently :( ");
      }
      this._floodSleepThreshold = clientParams.floodSleepThreshold;
      this.session = session;
      this.apiId = apiId;
      this.apiHash = apiHash;
      (0, message_1.installMessageBehaviour)();
      this._useIPV6 = clientParams.useIPV6;
      this._testServers = clientParams.testServers;
      this._requestRetries = clientParams.requestRetries;
      this._sequentialUpdates = !!clientParams.sequentialUpdates;
      this._downloadRetries = clientParams.downloadRetries;
      this._connectionRetries = clientParams.connectionRetries;
      this._reconnectRetries = clientParams.reconnectRetries;
      this._retryDelay = clientParams.retryDelay || 0;
      this._channelPollInterval = clientParams.channelPollInterval;
      this._channelPollRequestInterval = clientParams.channelPollRequestInterval;
      this._channelPollConcurrency = clientParams.channelPollConcurrency;
      for (const [name, value] of [
        ["channelPollInterval", this._channelPollInterval],
        ["channelPollRequestInterval", this._channelPollRequestInterval],
        ["channelPollConcurrency", this._channelPollConcurrency]
      ]) {
        if (!Number.isSafeInteger(value) || value <= 0) {
          throw new RangeError(`${name} must be a positive safe integer`);
        }
      }
      this._timeout = clientParams.timeout;
      this._autoReconnect = clientParams.autoReconnect;
      this._proxy = clientParams.proxy;
      this._maxConcurrentDownloads = clientParams.maxConcurrentDownloads || 1;
      this.networkSocket = clientParams.networkSocket || extensions_1.PromisedNetSockets;
      this._keepAliveInterval = clientParams.keepAliveInterval;
      this._reCaptchaCallback = clientParams.reCaptchaCallback;
      if (!(clientParams.connection instanceof Function)) {
        throw new Error("Connection should be a class not an instance");
      }
      this._connection = clientParams.connection;
      if (!explicitConnection && this.networkSocket.isWebSocket) {
        this._connection = connection_1.ConnectionTCPObfuscated;
      }
      let initProxy;
      const webProxy = this._proxy && "WEB" in this._proxy ? this._proxy : undefined;
      if (webProxy) {
        if (explicitConnection && this._connection !== WebProxy_1.ConnectionWebProxy || explicitSocket) {
          throw new Error("WEB proxy requires its own connection and socket adapter");
        }
        const web = (0, WebProxy_1.createWebProxySocket)(webProxy);
        this.networkSocket = web.socket;
        this._proxy = { MTProxy: true, ip: web.host, port: 443, secret: web.secret };
      }
      if (this._proxy && "MTProxy" in this._proxy) {
        this._connection = webProxy ? WebProxy_1.ConnectionWebProxy : TCPMTProxy_1.ConnectionTCPMTProxyAbridged;
        initProxy = new tl_1.Api.InputClientProxy({
          address: this._proxy.ip,
          port: this._proxy.port
        });
      }
      this._initRequest = new tl_1.Api.InitConnection({
        apiId: this.apiId,
        deviceModel: clientParams.deviceModel || os_1.default.type().toString() || "Unknown",
        systemVersion: clientParams.systemVersion || os_1.default.release().toString() || "1.0",
        appVersion: clientParams.appVersion || "1.0",
        langCode: clientParams.langCode || clientParamsDefault.langCode,
        langPack: "",
        systemLangCode: clientParams.systemLangCode || clientParamsDefault.systemLangCode,
        proxy: initProxy
      });
      this._eventBuilders = [];
      this._floodWaitedRequests = {};
      this._bot = undefined;
      this._selfInputPeer = undefined;
      this._securityChecks = !!clientParams.securityChecks;
      this._entityCache = new entityCache_1.EntityCache(clientParams.entityCache);
      this._config = undefined;
      this._loopStarted = false;
      this._reconnecting = false;
      this._destroyed = false;
      this._isSwitchingDc = false;
      this._connectedDeferred = new Deferred_1.default;
      this._parseMode = markdown_1.MarkdownParser;
      this.updateManager = new manager_1.UpdateManager(this);
      this._network = new Network_1.Network(this, {
        idleTimeoutMs: clientParams.downloadPool?.idleTimeoutMs ?? SESSION_IDLE_TIMEOUT_MS,
        sessionStartupDelayMs: clientParams.downloadPool?.sessionStartupDelayMs ?? SESSION_STARTUP_DELAY_MS
      });
      this._media = new MediaScheduler_1.MediaScheduler(this, this._network, clientParams.downloadPool);
    }
    get entityCache() {
      return this._entityCache;
    }
    get floodSleepThreshold() {
      return this._floodSleepThreshold;
    }
    set floodSleepThreshold(value) {
      this._floodSleepThreshold = Math.min(value || 0, 24 * 60 * 60);
    }
    set maxConcurrentDownloads(value) {
      this._maxConcurrentDownloads = value;
    }
    async _initSession() {
      await this.session.load();
      if (!this.session.serverAddress) {
        this.session.testServers = this._testServers;
        const dcId = this._testServers ? TEST_DEFAULT_DC_ID : PROD_DEFAULT_DC_ID;
        const ipv4Table = this._testServers ? exports2.TEST_DC_IPV4 : exports2.PROD_DC_IPV4;
        const ipv6Table = this._testServers ? exports2.TEST_DC_IPV6 : exports2.PROD_DC_IPV6;
        this.session.setDC(dcId, this._useIPV6 ? ipv6Table[dcId] : ipv4Table[dcId], DC_PORT);
      } else {
        const sessionEnv = inferSessionEnv(this.session.serverAddress);
        if (sessionEnv !== undefined && sessionEnv !== this._testServers) {
          this._log.warn(`testServers mismatch: client constructed with testServers=${this._testServers}, ` + `but the session's saved address (${this.session.serverAddress}) looks like ` + `${sessionEnv ? "test" : "production"}. Sessions are not portable between ` + `environments — use a separate session for each.`);
        }
        this.session.testServers = this._testServers;
        this._useIPV6 = this.session.serverAddress.includes(":");
      }
      if (this.networkSocket.isWebSocket) {
        if (!this.session.serverAddress.endsWith(".web.telegram.org")) {
          const address = webSocketDcAddress(this.session.dcId);
          if (address) {
            this.session.setDC(this.session.dcId, address, DC_PORT);
          }
        }
      } else if (this.session.serverAddress.endsWith(".web.telegram.org")) {
        const ipv4Table = this._testServers ? exports2.TEST_DC_IPV4 : exports2.PROD_DC_IPV4;
        const ipv6Table = this._testServers ? exports2.TEST_DC_IPV6 : exports2.PROD_DC_IPV6;
        const ip = (this._useIPV6 ? ipv6Table : ipv4Table)[this.session.dcId];
        if (ip) {
          this.session.setDC(this.session.dcId, ip, DC_PORT);
        }
      }
    }
    get connected() {
      return this._sender && this._sender.isConnected();
    }
    onConnecting(handler) {
      return this._subscribeLifecycle("connecting", handler);
    }
    onConnect(handler) {
      return this._subscribeLifecycle("connect", handler);
    }
    onDisconnect(handler) {
      return this._subscribeLifecycle("disconnect", handler);
    }
    onReconnecting(handler) {
      return this._subscribeLifecycle("reconnecting", handler);
    }
    onReconnect(handler) {
      return this._subscribeLifecycle("reconnect", handler);
    }
    onDestroy(handler) {
      return this._subscribeLifecycle("destroy", handler);
    }
    _subscribeLifecycle(event, handler) {
      if (typeof handler !== "function")
        throw new TypeError("Lifecycle handler must be a function");
      if (this._destroyed)
        throw new Error("Cannot subscribe to a destroyed client");
      let handlers = this._lifecycleHandlers.get(event);
      if (!handlers)
        this._lifecycleHandlers.set(event, handlers = new Set);
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    }
    _handleConnectionLifecycle(event) {
      if (this._destroyed && event !== "disconnect")
        return;
      if (event === this._connectionEvent)
        return;
      this._connectionEvent = event;
      this._emitLifecycle(event);
    }
    _emitLifecycle(event) {
      for (const handler of this._lifecycleHandlers.get(event) ?? []) {
        Promise.resolve().then(() => {
          if (this._destroyed && event !== "destroy" && event !== "disconnect")
            return;
          return handler();
        }).catch(async (error) => {
          this._log.error(`${event} handler failed`, error);
          if (this._errorHandler) {
            try {
              await this._errorHandler(error);
            } catch (handlerError) {
              this._log.error("Lifecycle error handler failed", handlerError);
            }
          }
        });
      }
    }
    async disconnect() {
      await this._disconnect();
      await this._media.purge();
      await this._network.purge();
      this._teardownUpdateState();
    }
    _teardownUpdateState() {
      for (const [timer] of this._ALBUMS.values()) {
        clearTimeout(timer);
      }
      this._ALBUMS.clear();
      this.updateManager.stop();
      for (const [builder] of this._eventBuilders) {
        builder.resolved = false;
      }
    }
    get disconnected() {
      return !this._sender || this._sender._disconnected;
    }
    async _disconnect() {
      (0, dispatch_1._stopUpdateLoop)(this);
      await this._sender?.disconnect();
    }
    destroy() {
      if (this._destroyTask)
        return this._destroyTask;
      this._destroyed = true;
      (0, dispatch_1._clearUpdateQueue)(this);
      this._destroyTask = (async () => {
        await this.disconnect();
        await this._media.close();
        await this._network.close();
        this._eventBuilders = [];
        this._updates?._destroy();
        this._emitLifecycle("destroy");
        this._lifecycleHandlers.clear();
      })();
      return this._destroyTask;
    }
    async _authKeyCallback(authKey, dcId) {
      this.session.setAuthKey(authKey, dcId);
      await this.session.save();
    }
    async _connectSender(sender, dcId, connection, mediaCluster = false) {
      const useMediaCluster = mediaCluster && !!sender.authKey.getKey();
      if (!connection) {
        const dc = await this.getDC(dcId, useMediaCluster);
        connection = new this._connection({
          ip: dc.ipAddress,
          port: dc.port,
          dcId,
          loggers: this._log,
          proxy: this._proxy,
          socket: this.networkSocket,
          keepAliveInterval: this._keepAliveInterval,
          testServers: this._testServers
        });
      }
      const dcenter = this.session.dcId !== dcId ? this._dcenters.get(dcId) : undefined;
      while (dcenter?.importing)
        await dcenter.importing;
      const needAuth = !!dcenter && (dcenter.needsImport || !dcenter.authKey.getKey());
      let releaseImport;
      if (needAuth) {
        dcenter.importing = new Promise((resolve) => {
          releaseImport = resolve;
        });
      }
      try {
        let innerQuery;
        if (needAuth) {
          this._log.info(`Exporting authorization for data center ${dcId} with layer ${registry_1.LAYER}`);
          const auth = await this.invoke(new tl_1.Api.auth.ExportAuthorization({ dcId }));
          innerQuery = new tl_1.Api.auth.ImportAuthorization({
            id: auth.id,
            bytes: auth.bytes
          });
        } else {
          innerQuery = new tl_1.Api.help.GetConfig;
        }
        await sender.connect(connection, false);
        if (useMediaCluster && !needAuth) {
          sender._authenticated = true;
          return sender;
        }
        const initConn = new tl_1.Api.InitConnection({
          apiId: this._initRequest.apiId,
          deviceModel: this._initRequest.deviceModel,
          systemVersion: this._initRequest.systemVersion,
          appVersion: this._initRequest.appVersion,
          langCode: this._initRequest.langCode,
          langPack: this._initRequest.langPack,
          systemLangCode: this._initRequest.systemLangCode,
          proxy: this._initRequest.proxy,
          query: innerQuery
        });
        await sender.send(new tl_1.Api.InvokeWithLayer({ layer: registry_1.LAYER, query: initConn }));
        sender._authenticated = true;
        sender._needsInitConnection = false;
        if (needAuth)
          dcenter.needsImport = false;
        return sender;
      } catch (err) {
        if (err.errorMessage === "DC_ID_INVALID") {
          sender._authenticated = true;
          sender.userDisconnected = false;
          return sender;
        }
        if (needAuth)
          dcenter.needsImport = true;
        const failKey = `${dcId}:${useMediaCluster}`;
        this._dcConnectFailures.set(failKey, (this._dcConnectFailures.get(failKey) ?? 0) + 1);
        sender.disconnect().catch(() => {});
        throw err;
      } finally {
        if (releaseImport) {
          dcenter.importing = undefined;
          releaseImport();
        }
      }
    }
    _makeSender(dcId, onBreak, authKey, autoReconnect = true, tempBinding, silenceMs) {
      return new network_1.MTProtoSender(authKey ?? this.session.getAuthKey(dcId), {
        logger: this._log,
        dcId,
        retries: this._connectionRetries,
        delay: this._retryDelay,
        autoReconnect: autoReconnect && this._autoReconnect,
        connectTimeout: this._timeout,
        authKeyCallback: this._authKeyCallback.bind(this),
        isMainSender: false,
        onConnectionBreak: onBreak,
        client: this,
        securityChecks: this._securityChecks,
        reconnectRetries: this._reconnectRetries,
        dcenter: this._dcenters.get(dcId),
        tempBinding,
        silenceMs
      });
    }
    getSender(dcId) {
      return dcId ? this._network.getSession(dcId).ensureConnected() : Promise.resolve(this._sender);
    }
    _leaseSender(dcId) {
      return dcId ? this._network.lease(dcId) : Promise.resolve({ sender: this._sender, release: () => {} });
    }
    async getDC(dcId, download) {
      throw new Error("Cannot be called from here!");
    }
    invoke(request) {
      throw new Error("Cannot be called from here!");
    }
    setLogLevel(level) {
      this._log.setLevel(level);
    }
    get logger() {
      return this._log;
    }
    set onError(handler) {
      this._errorHandler = async (error) => {
        try {
          await handler(error);
        } catch (e) {
          e.message = `Error ${e.message} thrown while handling top-level error: ${error.message}`;
          this._log.error(e.message, e);
        }
      };
    }
  }
  exports2.TelegramBaseClient = TelegramBaseClient;
});

// node_modules/teleproto/client/auth.js
var require_auth = __commonJS((exports2) => {
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
  exports2.start = start;
  exports2.checkAuthorization = checkAuthorization;
  exports2.logOut = logOut;
  exports2.signInUser = signInUser;
  exports2.signInUserWithQrCode = signInUserWithQrCode;
  exports2.sendCode = sendCode;
  exports2.signInWithPassword = signInWithPassword;
  exports2.signInBot = signInBot;
  exports2.signInWithWebToken = signInWithWebToken;
  exports2._authFlow = _authFlow;
  exports2.sendVerifyEmailCode = sendVerifyEmailCode;
  exports2.verifyEmail = verifyEmail;
  exports2.resetLoginEmail = resetLoginEmail;
  var tl_1 = require_tl();
  var utils = __importStar(require_Utils());
  var Helpers_1 = require_Helpers();
  var Password_1 = require_Password();
  var errors_1 = require_errors();
  var QR_CODE_TIMEOUT = 30000;
  async function start(client, authParams) {
    if (!client.connected) {
      await client.connect();
    }
    let authError;
    try {
      await client.api.updates.getState();
      return;
    } catch (e) {
      authError = e;
    }
    if (!authParams || !("phoneNumber" in authParams) && !("botAuthToken" in authParams)) {
      throw authError ?? new errors_1.UnauthorizedError("Not authorized and no auth parameters were provided to log in.", undefined);
    }
    const apiCredentials = {
      apiId: client.apiId,
      apiHash: client.apiHash
    };
    await _authFlow(client, apiCredentials, authParams);
  }
  async function checkAuthorization(client) {
    try {
      await client.api.updates.getState();
      return true;
    } catch (e) {
      return false;
    }
  }
  async function logOut(client) {
    let success = true;
    try {
      await client.api.auth.logOut();
    } catch (e) {
      client._log.warn("auth.LogOut failed: " + e.message);
      success = false;
    }
    await client.disconnect();
    await client.session.delete();
    client.updateManager.reset();
    client._entityCache.clear();
    client._dcenters.clear();
    client._sender = undefined;
    client._selfInputPeer = undefined;
    client._bot = undefined;
    client.updates._resumeAuthorization();
    return success;
  }
  async function signInUser(client, apiCredentials, authParams) {
    try {
      while (true) {
        const request = await requestLoginCode(client, apiCredentials, authParams);
        if (request === "qr") {
          return client.signInUserWithQrCode(apiCredentials, authParams);
        }
        if (!request)
          continue;
        const user = await completeSignIn(client, authParams, request.phoneNumber, request.sentCode);
        if (user)
          return user;
      }
    } catch (err) {
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        return client.signInWithPassword(apiCredentials, authParams);
      }
      throw err;
    }
    return;
  }
  var RESTART_SIGN_IN_ERRORS = new Set([
    "PHONE_CODE_EXPIRED",
    "PHONE_NUMBER_INVALID",
    "PHONE_NUMBER_BANNED"
  ]);
  var RESTART_SIGN_UP_ERRORS = new Set([
    ...RESTART_SIGN_IN_ERRORS,
    "PHONE_CODE_EMPTY",
    "PHONE_CODE_INVALID",
    "PHONE_NUMBER_OCCUPIED"
  ]);
  async function stepFailed(authParams, err, restartErrors) {
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED" || err.message === "AUTH_USER_CANCEL") {
      throw err;
    }
    const restart = restartErrors.has(err.errorMessage);
    if (restart && typeof authParams.phoneNumber !== "function") {
      throw err;
    }
    if (await authParams.onError(err)) {
      throw new Error("AUTH_USER_CANCEL");
    }
    return restart ? "restart" : "retry";
  }
  async function requestLoginCode(client, apiCredentials, authParams) {
    try {
      let phoneNumber;
      if (typeof authParams.phoneNumber === "function") {
        try {
          phoneNumber = await authParams.phoneNumber();
        } catch (err) {
          if (err.errorMessage === "RESTART_AUTH_WITH_QR")
            return "qr";
          throw err;
        }
      } else {
        phoneNumber = authParams.phoneNumber;
      }
      let sentCode = await requestCode(client, apiCredentials, phoneNumber, authParams.reCaptchaCallback);
      if (authParams.forceSMS) {
        sentCode = await preferSms(client, phoneNumber, sentCode);
      }
      return { phoneNumber, sentCode };
    } catch (err) {
      if (err.errorMessage === "AUTH_RESTART")
        return;
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED" || err.message === "AUTH_USER_CANCEL" || typeof authParams.phoneNumber !== "function") {
        throw err;
      }
      if (await authParams.onError(err)) {
        throw new Error("AUTH_USER_CANCEL");
      }
      return;
    }
  }
  async function completeSignIn(client, authParams, phoneNumber, sentCode) {
    while (sentCode) {
      if (sentCode instanceof tl_1.Api.auth.SentCodeSuccess) {
        return finishAuthorization(client, authParams, phoneNumber, "", sentCode.authorization);
      }
      if (sentCode instanceof tl_1.Api.auth.SentCodePaymentRequired) {
        throw new Error("Telegram requires a payment to send the login code to this number, which only official apps support");
      }
      const { type, phoneCodeHash } = sentCode;
      if (type instanceof tl_1.Api.auth.SentCodeTypeSetUpEmailRequired) {
        sentCode = await setUpLoginEmail(client, authParams, phoneNumber, phoneCodeHash, type);
        continue;
      }
      const signedIn = type instanceof tl_1.Api.auth.SentCodeTypeEmailCode ? await signInWithEmailCode(client, authParams, phoneNumber, phoneCodeHash, type) : await signInWithPhoneCode(client, authParams, phoneNumber, sentCode);
      if (!signedIn)
        return;
      return finishAuthorization(client, authParams, phoneNumber, signedIn.phoneCodeHash, signedIn.authorization);
    }
    return;
  }
  async function setUpLoginEmail(client, authParams, phoneNumber, phoneCodeHash, type) {
    if (!authParams.emailAddress || !authParams.emailVerification) {
      throw new Error("Telegram requires a login email for this account: pass emailAddress and emailVerification to sign in");
    }
    while (true) {
      let sentEmailCode;
      try {
        const email = await authParams.emailAddress();
        sentEmailCode = await sendVerifyEmailCode(client, phoneNumber, phoneCodeHash, email);
      } catch (err) {
        const next = await stepFailed(authParams, err, RESTART_SIGN_IN_ERRORS);
        if (next === "restart") {
          return;
        }
        continue;
      }
      while (true) {
        try {
          const verification = await authParams.emailVerification({
            googleSigninAllowed: type.googleSigninAllowed,
            appleSigninAllowed: type.appleSigninAllowed,
            emailPattern: sentEmailCode.emailPattern,
            codeLength: sentEmailCode.length
          });
          const { sentCode } = await verifyEmail(client, phoneNumber, phoneCodeHash, verification);
          return sentCode;
        } catch (err) {
          const next = await stepFailed(authParams, err, RESTART_SIGN_IN_ERRORS);
          if (next === "restart") {
            return;
          }
        }
      }
    }
    return;
  }
  async function signInWithEmailCode(client, authParams, phoneNumber, phoneCodeHash, type) {
    if (!authParams.emailVerification) {
      throw new Error("Telegram sent the login code to the account email: pass emailVerification to sign in");
    }
    while (true) {
      try {
        const verification = await authParams.emailVerification({
          googleSigninAllowed: type.googleSigninAllowed,
          appleSigninAllowed: type.appleSigninAllowed,
          emailPattern: type.emailPattern,
          codeLength: type.length,
          resetAvailablePeriod: type.resetAvailablePeriod,
          resetPendingDate: type.resetPendingDate
        });
        const authorization = await client.invoke(new tl_1.Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          emailVerification: toEmailVerification(verification)
        }));
        return { phoneCodeHash, authorization };
      } catch (err) {
        const next = await stepFailed(authParams, err, RESTART_SIGN_IN_ERRORS);
        if (next === "restart") {
          return;
        }
      }
    }
    return;
  }
  async function signInWithPhoneCode(client, authParams, phoneNumber, sentCode) {
    let current = sentCode;
    let resendAuthorization;
    const resend = async () => {
      const next = await resendCode(client, phoneNumber, current);
      if (next instanceof tl_1.Api.auth.SentCodeSuccess) {
        resendAuthorization = next.authorization;
        throw new Error("Login completed while resending the code");
      }
      if (!(next instanceof tl_1.Api.auth.SentCode)) {
        throw new Error("Unexpected resend result " + next.className);
      }
      const info = toSentCodeInfo(next, resend);
      current = next;
      return info;
    };
    while (true) {
      try {
        const info = toSentCodeInfo(current, resend);
        let phoneCode;
        try {
          phoneCode = await authParams.phoneCode(info.type === "app", info);
        } catch (err) {
          if (!resendAuthorization && err.errorMessage === "RESTART_AUTH") {
            return;
          }
          throw err;
        }
        if (resendAuthorization) {
          return {
            phoneCodeHash: current.phoneCodeHash,
            authorization: resendAuthorization
          };
        }
        if (!phoneCode) {
          throw new Error("Code is empty");
        }
        const authorization = await client.invoke(new tl_1.Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash: current.phoneCodeHash,
          phoneCode
        }));
        return { phoneCodeHash: current.phoneCodeHash, authorization };
      } catch (err) {
        if (resendAuthorization) {
          return {
            phoneCodeHash: current.phoneCodeHash,
            authorization: resendAuthorization
          };
        }
        const next = await stepFailed(authParams, err, RESTART_SIGN_IN_ERRORS);
        if (next === "restart") {
          return;
        }
      }
    }
    return;
  }
  async function finishAuthorization(client, authParams, phoneNumber, phoneCodeHash, authorization) {
    if (authorization instanceof tl_1.Api.auth.Authorization) {
      return authorization.user;
    }
    if (!authParams.firstAndLastNames) {
      throw new Error("No account is registered with this phone number: pass firstAndLastNames to sign up");
    }
    const { termsOfService } = authorization;
    if (termsOfService && authParams.acceptTermsOfService) {
      if (!await authParams.acceptTermsOfService(termsOfService)) {
        throw new Error("AUTH_USER_CANCEL");
      }
    }
    while (true) {
      try {
        const [firstName, lastName] = await authParams.firstAndLastNames();
        if (!firstName) {
          throw new Error("First name is required");
        }
        const { user } = await client.invoke(new tl_1.Api.auth.SignUp({
          phoneNumber,
          phoneCodeHash,
          firstName,
          lastName: lastName ?? ""
        }));
        if (termsOfService) {
          if (!authParams.acceptTermsOfService) {
            client._log.warn("Accepting the Telegram terms of service on behalf of the user: pass acceptTermsOfService to show them");
          }
          await client.invoke(new tl_1.Api.help.AcceptTermsOfService({
            id: termsOfService.id
          }));
        }
        return user;
      } catch (err) {
        const next = await stepFailed(authParams, err, RESTART_SIGN_UP_ERRORS);
        if (next === "restart") {
          return;
        }
      }
    }
    return;
  }
  function qrAbortError() {
    const err = new Error("QR login aborted");
    err.name = "AbortError";
    return err;
  }
  async function signInUserWithQrCode(client, apiCredentials, authParams) {
    if (authParams.qrCode == undefined) {
      throw new Error("qrCode callback not defined");
    }
    const { abortSignal } = authParams;
    if (abortSignal?.aborted)
      throw qrAbortError();
    let isScanningComplete = false;
    const stopped = () => isScanningComplete || !!abortSignal?.aborted;
    const inputPromise = (async () => {
      while (!stopped()) {
        const result = await client.invoke(new tl_1.Api.auth.ExportLoginToken({
          apiId: Number(apiCredentials.apiId),
          apiHash: apiCredentials.apiHash,
          exceptIds: []
        }));
        if (!(result instanceof tl_1.Api.auth.LoginToken)) {
          throw new Error("Unexpected");
        }
        const { token, expires } = result;
        await Promise.race([
          authParams.qrCode({ token, expires }),
          (0, Helpers_1.sleep)(QR_CODE_TIMEOUT)
        ]);
        await (0, Helpers_1.sleep)(QR_CODE_TIMEOUT);
      }
    })();
    const Raw = require_Raw().Raw;
    const rawEvent = new Raw({});
    const onUpdate = (update) => {
      if (update instanceof tl_1.Api.UpdateLoginToken)
        resolveUpdate();
    };
    let resolveUpdate;
    const updatePromise = new Promise((resolve) => resolveUpdate = resolve);
    client.addEventHandler(onUpdate, rawEvent);
    const abortPromise = new Promise((_, reject) => abortSignal?.addEventListener("abort", () => reject(qrAbortError()), {
      once: true
    }));
    try {
      await Promise.race([updatePromise, inputPromise, abortPromise]);
    } finally {
      isScanningComplete = true;
      client.removeEventHandler(onUpdate, rawEvent);
    }
    try {
      const result2 = await client.invoke(new tl_1.Api.auth.ExportLoginToken({
        apiId: Number(apiCredentials.apiId),
        apiHash: apiCredentials.apiHash,
        exceptIds: []
      }));
      if (result2 instanceof tl_1.Api.auth.LoginTokenSuccess && result2.authorization instanceof tl_1.Api.auth.Authorization) {
        return result2.authorization.user;
      } else if (result2 instanceof tl_1.Api.auth.LoginTokenMigrateTo) {
        await client._switchDC(result2.dcId);
        const migratedResult = await client.invoke(new tl_1.Api.auth.ImportLoginToken({
          token: result2.token
        }));
        if (migratedResult instanceof tl_1.Api.auth.LoginTokenSuccess && migratedResult.authorization instanceof tl_1.Api.auth.Authorization) {
          return migratedResult.authorization.user;
        } else {
          client._log.error(`Received unknown result while scanning QR ${result2.className}`);
          throw new Error(`Received unknown result while scanning QR ${result2.className}`);
        }
      } else {
        client._log.error(`Received unknown result while scanning QR ${result2.className}`);
        throw new Error(`Received unknown result while scanning QR ${result2.className}`);
      }
    } catch (err) {
      if (err.errorMessage === "SESSION_PASSWORD_NEEDED") {
        return client.signInWithPassword(apiCredentials, authParams);
      }
      throw err;
    }
    await authParams.onError(new Error("QR auth failed"));
    throw new Error("QR auth failed");
  }
  async function sendCode(client, apiCredentials, phoneNumber, forceSMS = false, reCaptchaCallback) {
    let sentCode = await requestCode(client, apiCredentials, phoneNumber, reCaptchaCallback);
    if (forceSMS) {
      try {
        sentCode = await preferSms(client, phoneNumber, sentCode);
      } catch (err) {
        if (err.errorMessage !== "AUTH_RESTART")
          throw err;
        return sendCode(client, apiCredentials, phoneNumber, forceSMS, reCaptchaCallback);
      }
    }
    if (sentCode instanceof tl_1.Api.auth.SentCodeSuccess) {
      throw new Error("logged in right after sending the code");
    }
    if (!(sentCode instanceof tl_1.Api.auth.SentCode)) {
      return {
        phoneCodeHash: sentCode.phoneCodeHash,
        isCodeViaApp: false
      };
    }
    const { type, phoneCodeHash } = sentCode;
    if (type instanceof tl_1.Api.auth.SentCodeTypeSetUpEmailRequired) {
      return {
        phoneCodeHash,
        isCodeViaApp: false,
        emailRequired: true,
        emailOptions: {
          googleSigninAllowed: type.googleSigninAllowed,
          appleSigninAllowed: type.appleSigninAllowed
        }
      };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeEmailCode) {
      return {
        phoneCodeHash,
        isCodeViaApp: false,
        emailCodeSent: true,
        emailOptions: {
          googleSigninAllowed: type.googleSigninAllowed,
          appleSigninAllowed: type.appleSigninAllowed,
          emailPattern: type.emailPattern,
          codeLength: type.length,
          resetAvailablePeriod: type.resetAvailablePeriod,
          resetPendingDate: type.resetPendingDate
        }
      };
    }
    return {
      phoneCodeHash,
      isCodeViaApp: type instanceof tl_1.Api.auth.SentCodeTypeApp
    };
  }
  async function requestCode(client, apiCredentials, phoneNumber, reCaptchaCallback) {
    const { apiId, apiHash } = apiCredentials;
    const request = new tl_1.Api.auth.SendCode({
      phoneNumber,
      apiId,
      apiHash,
      settings: new tl_1.Api.CodeSettings({})
    });
    try {
      return await client.invoke(request);
    } catch (err) {
      const match = err.errorMessage?.match(/RECAPTCHA_CHECK_.*(6Le[-\w]+)/);
      if (match && reCaptchaCallback) {
        const token = await reCaptchaCallback(match[1]);
        return client.invoke(new tl_1.Api.InvokeWithReCaptcha({ token, query: request }));
      }
      if (err.errorMessage === "AUTH_RESTART") {
        return requestCode(client, apiCredentials, phoneNumber, reCaptchaCallback);
      }
      throw err;
    }
  }
  async function resendCode(client, phoneNumber, sentCode) {
    if (!sentCode.nextType) {
      throw new Error("The login code cannot be resent");
    }
    return client.invoke(new tl_1.Api.auth.ResendCode({
      phoneNumber,
      phoneCodeHash: sentCode.phoneCodeHash
    }));
  }
  async function preferSms(client, phoneNumber, sentCode) {
    if (!(sentCode instanceof tl_1.Api.auth.SentCode) || sentCode.type instanceof tl_1.Api.auth.SentCodeTypeSms) {
      return sentCode;
    }
    if (!(sentCode.nextType instanceof tl_1.Api.auth.CodeTypeSms)) {
      client._log.warn("forceSMS ignored: Telegram does not offer SMS as the next delivery method for this code");
      return sentCode;
    }
    return resendCode(client, phoneNumber, sentCode);
  }
  function toSentCodeInfo(sentCode, resend) {
    const { type, nextType, timeout } = sentCode;
    return {
      ...toCodeDelivery(type),
      nextType: nextType && toNextCodeDelivery(nextType),
      timeout,
      resend,
      raw: sentCode
    };
  }
  function toCodeDelivery(type) {
    if (type instanceof tl_1.Api.auth.SentCodeTypeApp) {
      return { type: "app", length: type.length };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeSms || type instanceof tl_1.Api.auth.SentCodeTypeFirebaseSms) {
      return { type: "sms", length: type.length };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeCall) {
      return { type: "call", length: type.length };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeFlashCall) {
      return { type: "flashCall", pattern: type.pattern };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeMissedCall) {
      return {
        type: "missedCall",
        prefix: type.prefix,
        length: type.length
      };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeFragmentSms) {
      return { type: "fragment", url: type.url, length: type.length };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeSmsWord) {
      return { type: "smsWord", beginning: type.beginning };
    }
    if (type instanceof tl_1.Api.auth.SentCodeTypeSmsPhrase) {
      return { type: "smsPhrase", beginning: type.beginning };
    }
    throw new Error("Unexpected code delivery type " + type.className);
  }
  function toNextCodeDelivery(nextType) {
    if (nextType instanceof tl_1.Api.auth.CodeTypeSms)
      return "sms";
    if (nextType instanceof tl_1.Api.auth.CodeTypeCall)
      return "call";
    if (nextType instanceof tl_1.Api.auth.CodeTypeFlashCall)
      return "flashCall";
    if (nextType instanceof tl_1.Api.auth.CodeTypeMissedCall)
      return "missedCall";
    return "fragment";
  }
  function toEmailVerification(verification) {
    switch (verification.type) {
      case "code":
        return new tl_1.Api.EmailVerificationCode({ code: verification.code });
      case "google":
        return new tl_1.Api.EmailVerificationGoogle({
          token: verification.token
        });
      case "apple":
        return new tl_1.Api.EmailVerificationApple({
          token: verification.token
        });
    }
  }
  async function signInWithPassword(client, apiCredentials, authParams) {
    let emptyPassword = false;
    while (true) {
      try {
        const passwordSrpResult = await client.invoke(new tl_1.Api.account.GetPassword);
        if (!authParams.password) {
          emptyPassword = true;
          break;
        }
        const password = await authParams.password(passwordSrpResult.hint);
        if (!password) {
          throw new Error("Password is empty");
        }
        const passwordSrpCheck = await (0, Password_1.computeCheck)(passwordSrpResult, password);
        const { user } = await client.invoke(new tl_1.Api.auth.CheckPassword({
          password: passwordSrpCheck
        }));
        return user;
      } catch (err) {
        const shouldWeStop = await authParams.onError(err);
        if (shouldWeStop) {
          throw new Error("AUTH_USER_CANCEL");
        }
      }
    }
    if (emptyPassword) {
      throw new Error("Account has 2FA enabled.");
    }
    return;
  }
  async function signInBot(client, apiCredentials, authParams) {
    const { apiId, apiHash } = apiCredentials;
    let { botAuthToken } = authParams;
    if (!botAuthToken) {
      throw new Error("a valid BotToken is required");
    }
    if (typeof botAuthToken === "function") {
      let token;
      while (true) {
        token = await botAuthToken();
        if (token) {
          botAuthToken = token;
          break;
        }
      }
    }
    const { user } = await client.invoke(new tl_1.Api.auth.ImportBotAuthorization({
      apiId,
      apiHash,
      botAuthToken
    }));
    return user;
  }
  async function signInWithWebToken(client, apiCredentials, webAuthToken) {
    const { apiId, apiHash } = apiCredentials;
    const result = await client.invoke(new tl_1.Api.auth.ImportWebTokenAuthorization({
      apiId,
      apiHash,
      webAuthToken
    }));
    if (result instanceof tl_1.Api.auth.AuthorizationSignUpRequired) {
      throw new Error("The account bound to this web token does not exist yet; sign up is required");
    }
    const user = result.user;
    client._bot = user.bot;
    client._selfInputPeer = utils.getInputPeer(user, false);
    client._log.info("Signed in successfully as " + utils.getDisplayName(user));
    return user;
  }
  async function _authFlow(client, apiCredentials, authParams) {
    const me = "phoneNumber" in authParams ? await client.signInUser(apiCredentials, authParams) : await client.signInBot(apiCredentials, authParams);
    client._log.info("Signed in successfully as " + utils.getDisplayName(me));
  }
  async function sendVerifyEmailCode(client, phoneNumber, phoneCodeHash, email) {
    const result = await client.invoke(new tl_1.Api.account.SendVerifyEmailCode({
      purpose: new tl_1.Api.EmailVerifyPurposeLoginSetup({
        phoneNumber,
        phoneCodeHash
      }),
      email
    }));
    return {
      emailPattern: result.emailPattern,
      length: result.length
    };
  }
  async function verifyEmail(client, phoneNumber, phoneCodeHash, verification) {
    const result = await client.invoke(new tl_1.Api.account.VerifyEmail({
      purpose: new tl_1.Api.EmailVerifyPurposeLoginSetup({
        phoneNumber,
        phoneCodeHash
      }),
      verification: toEmailVerification(verification)
    }));
    if (!(result instanceof tl_1.Api.account.EmailVerifiedLogin)) {
      throw new Error("Expected EmailVerifiedLogin but got " + result.className);
    }
    return {
      email: result.email,
      sentCode: result.sentCode
    };
  }
  async function resetLoginEmail(client, phoneNumber, phoneCodeHash) {
    return await client.invoke(new tl_1.Api.auth.ResetLoginEmail({
      phoneNumber,
      phoneCodeHash
    }));
  }
});

// node_modules/teleproto/tl/custom/inlineResult.js
var require_inlineResult = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.InlineResult = undefined;
  var api_1 = require_api2();
  var Utils_1 = require_Utils();

  class InlineResult {
    constructor(client, original, queryId, entity) {
      this._ARTICLE = "article";
      this._PHOTO = "photo";
      this._GIF = "gif";
      this._VIDEO = "video";
      this._VIDEO_GIF = "mpeg4_gif";
      this._AUDIO = "audio";
      this._DOCUMENT = "document";
      this._LOCATION = "location";
      this._VENUE = "venue";
      this._CONTACT = "contact";
      this._GAME = "game";
      this._client = client;
      this.result = original;
      this._queryId = queryId;
      this._entity = entity;
    }
    get type() {
      return this.result.type;
    }
    get message() {
      return this.result.sendMessage;
    }
    get description() {
      return this.result.description;
    }
    get url() {
      if (this.result instanceof api_1.Api.BotInlineResult) {
        return this.result.url;
      }
    }
    get photo() {
      if (this.result instanceof api_1.Api.BotInlineResult) {
        return this.result.thumb;
      } else {
        return this.result.photo;
      }
    }
    get document() {
      if (this.result instanceof api_1.Api.BotInlineResult) {
        return this.result.content;
      } else {
        return this.result.document;
      }
    }
    async click(entity, replyTo, silent = false, clearDraft = false, hideVia = false) {
      if (entity) {
        entity = await this._client.getInputEntity(entity);
      } else if (this._entity) {
        entity = this._entity;
      } else {
        throw new Error("You must provide the entity where the result should be sent to");
      }
      let replyObject = undefined;
      if (replyTo != null) {
        replyObject = new api_1.Api.InputReplyToMessage({
          replyToMsgId: (0, Utils_1.getMessageId)(replyTo)
        });
      }
      const request = new api_1.Api.messages.SendInlineBotResult({
        peer: entity,
        queryId: this._queryId,
        id: this.result.id,
        silent,
        clearDraft,
        hideVia,
        replyTo: replyObject
      });
      return await this._client.invoke(request);
    }
  }
  exports2.InlineResult = InlineResult;
});

// node_modules/teleproto/tl/custom/inlineResults.js
var require_inlineResults = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.InlineResults = undefined;
  var inlineResult_1 = require_inlineResult();

  class InlineResults extends Array {
    constructor(client, original, entity) {
      super(...original.results.map((res) => new inlineResult_1.InlineResult(client, res, original.queryId, entity)));
      this.result = original;
      this.queryId = original.queryId;
      this.cacheTime = original.cacheTime;
      this._validUntil = new Date().getTime() / 1000 + this.cacheTime;
      this.users = original.users;
      this.gallery = Boolean(original.gallery);
      this.nextOffset = original.nextOffset;
      this.switchPm = original.switchPm;
    }
    resultsValid() {
      return new Date().getTime() / 1000 < this._validUntil;
    }
  }
  exports2.InlineResults = InlineResults;
});

// node_modules/teleproto/client/bots.js
var require_bots = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.inlineQuery = inlineQuery;
  exports2.setBotCommands = setBotCommands;
  exports2.getBotCommands = getBotCommands;
  exports2.resetBotCommands = resetBotCommands;
  exports2.setBotInfo = setBotInfo;
  exports2.getBotInfo = getBotInfo;
  exports2.setBotMenuButton = setBotMenuButton;
  exports2.getBotMenuButton = getBotMenuButton;
  var tl_1 = require_tl();
  var inlineResults_1 = require_inlineResults();
  var GetInlineBotResults = tl_1.Api.messages.GetInlineBotResults;
  async function inlineQuery(client, bot, query, entity, offset, geoPoint) {
    bot = await client.getInputEntity(bot);
    let peer = new tl_1.Api.InputPeerSelf;
    if (entity) {
      peer = await client.getInputEntity(entity);
    }
    const result = await client.invoke(new GetInlineBotResults({
      bot,
      peer,
      query,
      offset: offset || "",
      geoPoint
    }));
    return new inlineResults_1.InlineResults(client, result, entity ? peer : undefined);
  }
  async function setBotCommands(client, commands, params = {}) {
    return client.invoke(new tl_1.Api.bots.SetBotCommands({
      scope: params.scope ?? new tl_1.Api.BotCommandScopeDefault,
      langCode: params.langCode ?? "",
      commands: commands.map((command) => new tl_1.Api.BotCommand({
        command: command.command,
        description: command.description,
        ephemeral: command.ephemeral
      }))
    }));
  }
  async function getBotCommands(client, params = {}) {
    return client.invoke(new tl_1.Api.bots.GetBotCommands({
      scope: params.scope ?? new tl_1.Api.BotCommandScopeDefault,
      langCode: params.langCode ?? ""
    }));
  }
  async function resetBotCommands(client, params = {}) {
    return client.invoke(new tl_1.Api.bots.ResetBotCommands({
      scope: params.scope ?? new tl_1.Api.BotCommandScopeDefault,
      langCode: params.langCode ?? ""
    }));
  }
  async function setBotInfo(client, params) {
    return client.invoke(new tl_1.Api.bots.SetBotInfo({
      bot: params.bot ? await client.getInputEntity(params.bot) : undefined,
      langCode: params.langCode ?? "",
      name: params.name,
      about: params.about,
      description: params.description
    }));
  }
  async function getBotInfo(client, params = {}) {
    return client.invoke(new tl_1.Api.bots.GetBotInfo({
      bot: params.bot ? await client.getInputEntity(params.bot) : undefined,
      langCode: params.langCode ?? ""
    }));
  }
  async function setBotMenuButton(client, user, button) {
    return client.invoke(new tl_1.Api.bots.SetBotMenuButton({
      userId: await client.getInputEntity(user),
      button
    }));
  }
  async function getBotMenuButton(client, user) {
    return client.invoke(new tl_1.Api.bots.GetBotMenuButton({
      userId: await client.getInputEntity(user)
    }));
  }
});

// node_modules/teleproto/client/buttons.js
var require_buttons = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.buildReplyMarkup = buildReplyMarkup;
  var tl_1 = require_tl();
  var button_1 = require_button();
  var keyboard_1 = require_keyboard();
  var messageButton_1 = require_messageButton();
  var Helpers_1 = require_Helpers();
  function buildReplyMarkup(buttons, inlineOnly = false) {
    if (buttons == undefined) {
      return;
    }
    if (buttons instanceof keyboard_1.InlineKeyboard || buttons instanceof keyboard_1.ReplyKeyboard) {
      const markup = buttons.build();
      if (inlineOnly && markup instanceof tl_1.Api.ReplyKeyboardMarkup) {
        throw new Error("You cannot use non-inline buttons here");
      }
      return markup;
    }
    if ("SUBCLASS_OF_ID" in buttons) {
      if (buttons.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("ReplyMarkup")) {
        return buttons;
      }
    }
    if (!(0, Helpers_1.isArrayLike)(buttons)) {
      buttons = [[buttons]];
    } else if (!buttons || !(0, Helpers_1.isArrayLike)(buttons[0])) {
      buttons = [buttons];
    }
    let isInline = false;
    let isNormal = false;
    let resize;
    let singleUse;
    let selective;
    const rows = [];
    for (const row of buttons) {
      const current = [];
      for (let button of row) {
        if (button instanceof button_1.Button) {
          if (button.resize != null) {
            resize = button.resize;
          }
          if (button.singleUse != null) {
            singleUse = button.singleUse;
          }
          if (button.selective != null) {
            selective = button.selective;
          }
          button = button.button;
        } else if (button instanceof messageButton_1.MessageButton) {
          button = button.button;
        }
        if (button_1.Button._isInline(button)) {
          isInline = true;
          current.push(button);
        } else if (button instanceof tl_1.Api.KeyboardButton) {
          isNormal = true;
          current.push(button);
        }
      }
      if (current.length) {
        rows.push(current);
      }
    }
    if (inlineOnly && isNormal) {
      throw new Error("You cannot use non-inline buttons here");
    } else if (isInline && isNormal) {
      throw new Error("You cannot mix inline with normal buttons");
    } else if (isInline) {
      return new tl_1.Api.ReplyInlineMarkup({
        rows: rows.map((buttons2) => new tl_1.Api.KeyboardInlineButtonRow({
          buttons: buttons2
        }))
      });
    }
    return new tl_1.Api.ReplyKeyboardMarkup({
      rows: rows.map((buttons2) => new tl_1.Api.KeyboardButtonRow({
        buttons: buttons2
      })),
      resize,
      singleUse,
      selective
    });
  }
});

// node_modules/teleproto/client/downloads.js
var require_downloads = __commonJS((exports2) => {
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
  exports2.downloadFile = downloadFile;
  exports2.downloadMedia = downloadMedia;
  exports2._downloadDocument = _downloadDocument;
  exports2._downloadContact = _downloadContact;
  exports2._downloadWebDocument = _downloadWebDocument;
  exports2._downloadCachedPhotoSize = _downloadCachedPhotoSize;
  exports2._downloadPhoto = _downloadPhoto;
  exports2.downloadProfilePhoto = downloadProfilePhoto;
  exports2.iterDownload = iterDownload;
  var tl_1 = require_tl();
  var Utils_1 = require_Utils();
  var utils = __importStar(require_Utils());
  var fs_1 = require("fs");
  var extensions_1 = require_extensions();
  var fs2 = __importStar(require("fs"));
  var path_1 = __importDefault(require("path"));
  var big_integer_1 = __importDefault(require_BigInteger());
  var OrderedWriter_1 = require_OrderedWriter();
  var MediaScheduler_1 = require_MediaScheduler();
  var cifrante_1 = require_cifrante_node();
  var Helpers_1 = require_Helpers();
  var MIN_CHUNK_SIZE = 4096;
  var ONE_MB = 1024 * 1024;
  function getWriter(outputFile) {
    if (!outputFile || Buffer.isBuffer(outputFile)) {
      return new extensions_1.BinaryWriter(Buffer.alloc(0));
    } else if (typeof outputFile == "string") {
      return (0, fs_1.createWriteStream)(outputFile);
    } else {
      return outputFile;
    }
  }
  async function closeWriter(writer) {
    if (writer instanceof fs2.WriteStream) {
      await new Promise((resolve, reject) => {
        const onErr = (err) => {
          writer.removeListener("close", onClose);
          reject(err);
        };
        const onClose = () => {
          writer.removeListener("error", onErr);
          resolve();
        };
        writer.once("close", onClose);
        writer.once("error", onErr);
        writer.end();
      });
      return;
    }
    if ("close" in writer && typeof writer.close === "function") {
      writer.close();
    }
  }
  function returnWriterValue(writer) {
    if (writer instanceof extensions_1.BinaryWriter) {
      return writer.getValue();
    }
    if (writer instanceof fs2.WriteStream) {
      if (typeof writer.path == "string") {
        return path_1.default.resolve(writer.path);
      } else {
        return Buffer.from(writer.path);
      }
    }
  }
  function resolvePartSize(client, partSizeKb) {
    let size = partSizeKb && partSizeKb > 0 ? Math.floor(partSizeKb * 1024) : client._media.opts.partSize;
    if (size > ONE_MB)
      size = ONE_MB;
    if (size % MIN_CHUNK_SIZE !== 0) {
      throw new Error("partSizeKb must be a multiple of 4 (KB)");
    }
    return size;
  }
  var HASH_BLOCK = 128 * 1024;

  class FileHashChecker {
    constructor(client, location) {
      this.client = client;
      this.location = location;
      this._hashes = new Map;
      this._unsupported = false;
    }
    async verify(absOffset, data) {
      if (this._unsupported || !data.length)
        return;
      if (absOffset % HASH_BLOCK !== 0)
        return;
      for (let o = 0;o < data.length; o += HASH_BLOCK) {
        const abs = absOffset + o;
        let expected = this._hashes.get(abs);
        if (!expected) {
          await this._fetch(abs);
          expected = this._hashes.get(abs);
        }
        if (!expected)
          return;
        const block = data.subarray(o, Math.min(o + HASH_BLOCK, data.length));
        const actual = (0, Helpers_1.asBuffer)(cifrante_1.sha256.sync(block));
        if (!actual.equals(expected)) {
          throw new Error(`File hash mismatch at offset ${abs} — corrupted part`);
        }
      }
    }
    async _fetch(absOffset) {
      try {
        const res = await this.client.invoke(new tl_1.Api.upload.GetFileHashes({
          location: this.location,
          offset: (0, big_integer_1.default)(absOffset)
        }));
        for (const h of res) {
          this._hashes.set(h.offset.toJSNumber(), Buffer.from(h.hash));
        }
      } catch (e) {
        this._unsupported = true;
        this.client._log.debug(`getFileHashes unsupported: ${e}`);
      }
    }
  }
  async function downloadFile(client, inputLocation, { outputFile = undefined, partSizeKb = undefined, fileSize = undefined, progressCallback = undefined, dcId = undefined, verifyHashes = false, signal = undefined, requestTimeout = undefined }) {
    const info = utils.getFileInfo(inputLocation);
    const targetDc = dcId ?? info.dcId ?? client.session.dcId;
    const location = info.location ?? inputLocation;
    const totalSize = fileSize ?? info.size;
    const totalBytes = totalSize ? totalSize.toJSNumber() : 0;
    const partSize = resolvePartSize(client, partSizeKb);
    const route = { dcId: targetDc };
    const writer = getWriter(outputFile);
    const abort = new AbortController;
    let timeoutTimer;
    let unforward;
    if (signal) {
      if (signal.aborted)
        abort.abort();
      else {
        const forward = () => abort.abort();
        signal.addEventListener("abort", forward, { once: true });
        unforward = () => signal.removeEventListener("abort", forward);
      }
    }
    if (requestTimeout && requestTimeout > 0) {
      timeoutTimer = setTimeout(() => abort.abort(), requestTimeout);
    }
    const hashChecker = verifyHashes ? new FileHashChecker(client, location) : undefined;
    let downloaded = 0;
    const reportProgress = async (bytes) => {
      downloaded += bytes;
      if (!progressCallback)
        return;
      if (progressCallback.isCanceled) {
        abort.abort();
        return;
      }
      await progressCallback((0, big_integer_1.default)(downloaded), (0, big_integer_1.default)(totalBytes || downloaded));
    };
    try {
      if (totalBytes <= 0) {
        await streamSequential(client, location, route, partSize, writer, abort.signal, reportProgress, hashChecker);
      } else {
        await streamParallel(client, location, route, partSize, totalBytes, writer, abort.signal, reportProgress, hashChecker, dcId === undefined && info.dcId === undefined);
      }
      await closeWriter(writer);
      return returnWriterValue(writer);
    } catch (err) {
      await closeWriter(writer).catch(() => {});
      throw err;
    } finally {
      if (timeoutTimer)
        clearTimeout(timeoutTimer);
      unforward?.();
    }
  }
  async function streamSequential(client, location, route, partSize, writer, signal, onBytes, hashChecker) {
    let idx = 0;
    while (true) {
      if (signal.aborted)
        return;
      const offset = (0, big_integer_1.default)(idx).multiply(partSize);
      const data = await client._media.getFile(route.dcId, location, offset, partSize, signal, (dc) => route.dcId = dc);
      if (data.length > 0) {
        if (hashChecker) {
          await hashChecker.verify(idx * partSize, data);
        }
        await writer.write(data);
        await onBytes(data.length);
      }
      if (data.length < partSize)
        return;
      idx++;
    }
  }
  async function streamParallel(client, location, route, partSize, totalBytes, writer, signal, onBytes, hashChecker, probeRoute = false) {
    const totalParts = Math.max(1, Math.ceil(totalBytes / partSize));
    let firstPart;
    if (probeRoute && totalParts > 1) {
      firstPart = await client._media.getFile(route.dcId, location, big_integer_1.default.zero, partSize, signal, (dc) => route.dcId = dc);
    }
    const ordered = new OrderedWriter_1.OrderedWriter(writer);
    const dl = client._media.opts.download;
    const inflight = new OrderedWriter_1.BoundedSemaphore(Math.max(1, dl.sessions * dl.inFlight));
    let firstError;
    const tasks = [];
    for (let i = 0;i < totalParts; i++) {
      if (signal.aborted || firstError)
        break;
      await inflight.acquire();
      if (signal.aborted || firstError) {
        inflight.release();
        break;
      }
      const idx = i;
      const offset = (0, big_integer_1.default)(idx).multiply(partSize);
      tasks.push((async () => {
        try {
          const data = idx === 0 && firstPart !== undefined ? firstPart : await client._media.getFile(route.dcId, location, offset, partSize, signal, (dc) => route.dcId = dc);
          if (!firstError) {
            if (hashChecker) {
              await hashChecker.verify(idx * partSize, data);
            }
            await onBytes(data.length);
            await ordered.write(idx, data);
          }
        } catch (err) {
          if (!firstError)
            firstError = err;
        } finally {
          inflight.release();
        }
      })());
    }
    await Promise.all(tasks);
    if (firstError && !(firstError instanceof MediaScheduler_1.MediaAbortError)) {
      throw firstError;
    }
  }
  async function downloadMedia(client, messageOrMedia, outputFile, thumb, progressCallback, extra) {
    let msgData;
    let date;
    let media;
    if (messageOrMedia instanceof tl_1.Api.Message) {
      media = messageOrMedia.media;
      date = messageOrMedia.date;
      msgData = messageOrMedia.inputChat ? [messageOrMedia.inputChat, messageOrMedia.id] : undefined;
    } else {
      media = messageOrMedia;
      date = Date.now();
    }
    if (typeof media == "string") {
      throw new Error("not implemented");
    }
    if (media instanceof tl_1.Api.UserProfilePhoto || media instanceof tl_1.Api.ChatPhoto) {
      throw new Error(`${media.className} cannot be downloaded from the photo object alone its file location is bound to the owner: use client.downloadProfilePhoto(entity)`);
    }
    if (media instanceof tl_1.Api.MessageMediaWebPage) {
      if (media.webpage instanceof tl_1.Api.WebPage) {
        media = media.webpage.document || media.webpage.photo;
      }
    }
    if (media instanceof tl_1.Api.MessageMediaPhoto || media instanceof tl_1.Api.Photo) {
      return _downloadPhoto(client, media, outputFile, date, thumb, progressCallback, extra);
    } else if (media instanceof tl_1.Api.MessageMediaDocument || media instanceof tl_1.Api.Document) {
      return _downloadDocument(client, media, outputFile, date, thumb, progressCallback, msgData, extra);
    } else if (media instanceof tl_1.Api.MessageMediaContact) {
      return _downloadContact(client, media, {});
    } else if (media instanceof tl_1.Api.WebDocument || media instanceof tl_1.Api.WebDocumentNoProxy) {
      return _downloadWebDocument(client, media, {});
    } else if (!media) {
      return;
    } else {
      throw new Error(`Cannot download media of type ${media.className ?? typeof media}`);
    }
  }
  async function _downloadDocument(client, doc, outputFile, date, thumb, progressCallback, msgData, extra) {
    if (doc instanceof tl_1.Api.MessageMediaDocument) {
      if (!doc.document) {
        return Buffer.alloc(0);
      }
      doc = doc.document;
    }
    if (!(doc instanceof tl_1.Api.Document)) {
      return Buffer.alloc(0);
    }
    let size;
    if (thumb == undefined) {
      outputFile = getProperFilename(outputFile, "document", "." + (utils.getExtension(doc) || "bin"), date);
    } else {
      outputFile = getProperFilename(outputFile, "photo", ".jpg", date);
      size = getThumb(doc.thumbs || [], thumb);
      if (size instanceof tl_1.Api.PhotoCachedSize || size instanceof tl_1.Api.PhotoStrippedSize) {
        return _downloadCachedPhotoSize(size, outputFile);
      }
    }
    return await downloadFile(client, new tl_1.Api.InputDocumentFileLocation({
      id: doc.id,
      accessHash: doc.accessHash,
      fileReference: doc.fileReference,
      thumbSize: size && "type" in size ? size.type : ""
    }), {
      outputFile,
      fileSize: size && "size" in size ? (0, big_integer_1.default)(size.size) : doc.size,
      progressCallback,
      dcId: doc.dcId,
      msgData,
      signal: extra?.signal,
      requestTimeout: extra?.requestTimeout
    });
  }
  async function _downloadContact(_client, _media, _args) {
    throw new Error("not implemented");
  }
  async function _downloadWebDocument(_client, _media, _args) {
    throw new Error("not implemented");
  }
  function getThumb(thumbs, thumb) {
    function sortThumb(thumb2) {
      if (thumb2 instanceof tl_1.Api.PhotoStrippedSize) {
        return thumb2.bytes.length;
      }
      if (thumb2 instanceof tl_1.Api.PhotoCachedSize) {
        return thumb2.bytes.length;
      }
      if (thumb2 instanceof tl_1.Api.PhotoSize) {
        return thumb2.size;
      }
      if (thumb2 instanceof tl_1.Api.PhotoSizeProgressive) {
        return Math.max(...thumb2.sizes);
      }
      if (thumb2 instanceof tl_1.Api.VideoSize) {
        return thumb2.size;
      }
      return 0;
    }
    thumbs = thumbs.sort((a, b) => sortThumb(a) - sortThumb(b));
    const correctThumbs = [];
    for (const t of thumbs) {
      if (!(t instanceof tl_1.Api.PhotoPathSize)) {
        correctThumbs.push(t);
      }
    }
    if (thumb == undefined) {
      return correctThumbs.pop();
    } else if (typeof thumb == "number") {
      return correctThumbs[thumb];
    } else if (typeof thumb == "string") {
      for (const t of correctThumbs) {
        if ("type" in t && t.type == thumb) {
          return t;
        }
      }
    } else if (thumb instanceof tl_1.Api.PhotoSize || thumb instanceof tl_1.Api.PhotoCachedSize || thumb instanceof tl_1.Api.PhotoStrippedSize || thumb instanceof tl_1.Api.VideoSize) {
      return thumb;
    }
  }
  async function _downloadCachedPhotoSize(size, outputFile) {
    let data;
    if (size instanceof tl_1.Api.PhotoStrippedSize) {
      data = (0, Utils_1.strippedPhotoToJpg)(size.bytes);
    } else {
      data = size.bytes;
    }
    const writer = getWriter(outputFile);
    try {
      await writer.write(data);
      await closeWriter(writer);
    } catch (err) {
      await closeWriter(writer).catch(() => {});
      throw err;
    }
    return returnWriterValue(writer);
  }
  function getProperFilename(file, fileType, extension, date) {
    if (!file || typeof file != "string") {
      return file;
    }
    if (fs2.existsSync(file) && fs2.lstatSync(file).isDirectory()) {
      let fullName = fileType + date + extension;
      return path_1.default.join(file, fullName);
    }
    return file;
  }
  async function _downloadPhoto(client, photo, file, date, thumb, progressCallback, extra) {
    if (photo instanceof tl_1.Api.MessageMediaPhoto) {
      if (photo.photo instanceof tl_1.Api.PhotoEmpty || !photo.photo) {
        return Buffer.alloc(0);
      }
      photo = photo.photo;
    }
    if (!(photo instanceof tl_1.Api.Photo)) {
      return Buffer.alloc(0);
    }
    const photoSizes = [...photo.sizes || [], ...photo.videoSizes || []];
    const size = getThumb(photoSizes, thumb);
    if (!size || size instanceof tl_1.Api.PhotoSizeEmpty) {
      return Buffer.alloc(0);
    }
    if (!date) {
      date = Date.now();
    }
    file = getProperFilename(file, "photo", ".jpg", date);
    if (size instanceof tl_1.Api.PhotoCachedSize || size instanceof tl_1.Api.PhotoStrippedSize) {
      return _downloadCachedPhotoSize(size, file);
    }
    let fileSize;
    if (size instanceof tl_1.Api.PhotoSizeProgressive) {
      fileSize = Math.max(...size.sizes);
    } else {
      fileSize = "size" in size ? size.size : 512;
    }
    return downloadFile(client, new tl_1.Api.InputPhotoFileLocation({
      id: photo.id,
      accessHash: photo.accessHash,
      fileReference: photo.fileReference,
      thumbSize: "type" in size ? size.type : ""
    }), {
      outputFile: file,
      fileSize: (0, big_integer_1.default)(fileSize),
      progressCallback,
      dcId: photo.dcId,
      signal: extra?.signal,
      requestTimeout: extra?.requestTimeout
    });
  }
  async function downloadProfilePhoto(client, entity, fileParams) {
    let photo;
    if (typeof entity == "object" && "photo" in entity) {
      photo = entity.photo;
    } else {
      entity = await client.getEntity(entity);
      if ("photo" in entity) {
        photo = entity.photo;
      } else {
        throw new Error(`Could not get photo from ${entity ? entity.className : undefined}`);
      }
    }
    let dcId;
    let loc;
    if (photo instanceof tl_1.Api.UserProfilePhoto || photo instanceof tl_1.Api.ChatPhoto) {
      dcId = photo.dcId;
      loc = new tl_1.Api.InputPeerPhotoFileLocation({
        peer: utils.getInputPeer(entity),
        photoId: photo.photoId,
        big: fileParams.isBig
      });
    } else {
      return Buffer.alloc(0);
    }
    return client.downloadFile(loc, {
      outputFile: fileParams.outputFile,
      dcId,
      signal: fileParams.signal,
      requestTimeout: fileParams.requestTimeout
    });
  }
  async function* iterDownload(client, file, params = {}) {
    const info = utils.getFileInfo(file);
    const requestSize = params.requestSize ?? 512 * 1024;
    if (requestSize % 4096 !== 0) {
      throw new Error("requestSize must be divisible by 4096");
    }
    let dcId = params.dcId ?? info.dcId;
    let offset = typeof params.offset === "number" ? (0, big_integer_1.default)(params.offset) : params.offset ?? big_integer_1.default.zero;
    let downloaded = 0;
    for (;; ) {
      if (params.signal?.aborted) {
        throw new MediaScheduler_1.MediaAbortError;
      }
      let result;
      try {
        result = await client.invoke(new tl_1.Api.upload.GetFile({
          location: info.location,
          offset,
          limit: requestSize,
          precise: true
        }), dcId);
      } catch (e) {
        if (typeof e?.errorMessage === "string" && e.errorMessage.startsWith("FILE_MIGRATE") && typeof e.newDc === "number") {
          dcId = e.newDc;
          continue;
        }
        throw e;
      }
      if (result instanceof tl_1.Api.upload.FileCdnRedirect) {
        throw new Error("CDN redirects are not supported by iterDownload; use downloadFile instead");
      }
      if (result.bytes.length) {
        yield result.bytes;
        downloaded += result.bytes.length;
        offset = offset.add(result.bytes.length);
      }
      if (result.bytes.length < requestSize) {
        return;
      }
      if (params.limit != null && downloaded >= params.limit) {
        return;
      }
    }
  }
});

// node_modules/teleproto/client/messageParse.js
var require_messageParse = __commonJS((exports2) => {
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
  exports2.DEFAULT_DELIMITERS = undefined;
  exports2._replaceWithMention = _replaceWithMention;
  exports2._parseMessageText = _parseMessageText;
  exports2._getResponseMessage = _getResponseMessage;
  var Utils_1 = require_Utils();
  var tl_1 = require_tl();
  var utils = __importStar(require_Utils());
  var Helpers_1 = require_Helpers();
  var big_integer_1 = __importDefault(require_BigInteger());
  var markdown_1 = require_markdown();
  Object.defineProperty(exports2, "DEFAULT_DELIMITERS", { enumerable: true, get: function() {
    return markdown_1.DEFAULT_DELIMITERS;
  } });
  async function _replaceWithMention(client, entities, i, user) {
    try {
      entities[i] = new tl_1.Api.InputMessageEntityMentionName({
        offset: entities[i].offset,
        length: entities[i].length,
        userId: utils.getInputUser(await client.getInputEntity(user))
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  async function _parseMessageText(client, message, parseMode) {
    if (parseMode == false) {
      return [message, []];
    }
    if (parseMode == undefined) {
      if (client.parseMode == undefined) {
        return [message, []];
      }
      parseMode = client.parseMode;
    } else if (typeof parseMode === "string") {
      parseMode = client._sanitizeParseMode(parseMode);
    }
    const [rawMessage, msgEntities] = parseMode.parse(message);
    for (let i = msgEntities.length - 1;i >= 0; i--) {
      const e = msgEntities[i];
      if (e instanceof tl_1.Api.MessageEntityMentionName) {
        await _replaceWithMention(client, msgEntities, i, e.userId);
      } else if (e instanceof tl_1.Api.MessageEntityTextUrl) {
        const m = /^(?:@|\+|tg:\/\/user\?id=(\d+))/.exec(e.url);
        if (m) {
          const userIdOrUsername = m[1] ? Number(m[1]) : e.url;
          const isMention = await _replaceWithMention(client, msgEntities, i, userIdOrUsername);
          if (!isMention) {
            msgEntities.splice(i, 1);
          }
        }
      }
    }
    return [rawMessage, msgEntities];
  }
  function _getResponseMessage(client, request, result, inputChat) {
    let updates = [];
    let entities = new Map;
    if (result instanceof tl_1.Api.UpdateShort) {
      updates = [result.update];
    } else if (result instanceof tl_1.Api.Updates || result instanceof tl_1.Api.UpdatesCombined) {
      updates = result.updates;
      for (const x of [...result.users, ...result.chats]) {
        entities.set(utils.getPeerId(x), x);
      }
    } else {
      return;
    }
    const randomToId = new Map;
    const idToMessage = new Map;
    let schedMessage;
    for (const update of updates) {
      if (update instanceof tl_1.Api.UpdateMessageID) {
        randomToId.set(update.randomId.toString(), update.id);
      } else if (update instanceof tl_1.Api.UpdateNewChannelMessage || update instanceof tl_1.Api.UpdateNewMessage) {
        update.message._finishInit(client, entities, inputChat);
        if ("randomId" in request || (0, Helpers_1.isArrayLike)(request)) {
          idToMessage.set(update.message.id, update.message);
        } else {
          return update.message;
        }
      } else if (update instanceof tl_1.Api.UpdateEditMessage && "peer" in request && (0, Helpers_1._entityType)(request.peer) != Helpers_1._EntityType.CHANNEL) {
        update.message._finishInit(client, entities, inputChat);
        if ("randomId" in request) {
          idToMessage.set(update.message.id, update.message);
        } else if ("id" in request && request.id === update.message.id) {
          return update.message;
        }
      } else if (update instanceof tl_1.Api.UpdateEditChannelMessage && "peer" in request && (0, Utils_1.getPeerId)(request.peer) == (0, Utils_1.getPeerId)(update.message.peerId)) {
        if (request.id == update.message.id) {
          update.message._finishInit(client, entities, inputChat);
          return update.message;
        }
      } else if (update instanceof tl_1.Api.UpdateNewScheduledMessage) {
        update.message._finishInit(client, entities, inputChat);
        schedMessage = update.message;
        idToMessage.set(update.message.id, update.message);
      } else if (update instanceof tl_1.Api.UpdateMessagePoll) {
        if (request.media.poll.id == update.pollId) {
          const m = new tl_1.Api.Message({
            id: request.id,
            peerId: utils.getPeerId(request.peer),
            media: new tl_1.Api.MessageMediaPoll({
              poll: update.poll,
              results: update.results
            }),
            message: "",
            date: 0
          });
          m._finishInit(client, entities, inputChat);
          return m;
        }
      }
    }
    if (request == undefined) {
      return idToMessage;
    }
    let randomId;
    if ((0, Helpers_1.isArrayLike)(request) || typeof request == "number" || big_integer_1.default.isInstance(request)) {
      randomId = request;
    } else {
      randomId = request.randomId;
    }
    if (!randomId) {
      if (schedMessage) {
        return schedMessage;
      }
      client._log.warn(`No randomId in ${request} to map to. returning undefined for ${result} (Message was empty)`);
      return;
    }
    if (!(0, Helpers_1.isArrayLike)(randomId)) {
      let msg = idToMessage.get(randomToId.get(randomId.toString()));
      if (!msg) {
        client._log.warn(`Request ${request.className} had missing message mapping ${result.className} (Message was empty)`);
      }
      return msg;
    }
    const final = [];
    let warned = false;
    for (const rnd of randomId) {
      const tmp = randomToId.get(rnd.toString());
      if (!tmp) {
        warned = true;
        break;
      }
      const tmp2 = idToMessage.get(tmp);
      if (!tmp2) {
        warned = true;
        break;
      }
      final.push(tmp2);
    }
    if (warned) {
      client._log.warn(`Request ${request.className} had missing message mapping ${result.className} (Message was empty)`);
    }
    const finalToReturn = [];
    for (const rnd of randomId) {
      finalToReturn.push(idToMessage.get(randomToId.get(rnd.toString())));
    }
    return finalToReturn;
  }
});

// node_modules/teleproto/requestIter.js
var require_requestIter = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.RequestIter = undefined;
  var Helpers_1 = require_Helpers();

  class RequestIter {
    constructor(client, limit, params = {}, args = {}) {
      this.client = client;
      this.reverse = params.reverse;
      this.waitTime = params.waitTime;
      this.limit = Math.max(limit ?? Number.MAX_SAFE_INTEGER, 0);
      this.left = this.limit;
      this.buffer = undefined;
      this.kwargs = args;
      this.index = 0;
      this.total = undefined;
      this.lastLoad = 0;
    }
    async _init(kwargs) {}
    [Symbol.asyncIterator]() {
      this.buffer = undefined;
      this.index = 0;
      this.lastLoad = 0;
      this.left = this.limit;
      return {
        next: async () => {
          if (this.buffer == undefined) {
            this.buffer = [];
            if (await this._init(this.kwargs)) {
              this.left = Math.min(this.left, this.buffer.length);
            }
          }
          if (this.left <= 0) {
            return {
              value: undefined,
              done: true
            };
          }
          if (this.index == this.buffer.length) {
            if (this.waitTime && this.lastLoad) {
              const delay = this.waitTime * 1000 - (Date.now() - this.lastLoad);
              if (delay > 0)
                await (0, Helpers_1.sleep)(delay);
            }
            this.lastLoad = Date.now();
            this.index = 0;
            this.buffer = [];
            const nextChunk = await this._loadNextChunk();
            if (nextChunk === false) {
              return {
                value: undefined,
                done: true
              };
            }
            if (nextChunk) {
              this.left = Math.min(this.left, this.buffer.length);
            }
          }
          if (!this.buffer || !this.buffer.length) {
            return {
              value: undefined,
              done: true
            };
          }
          const result = this.buffer[this.index];
          this.left -= 1;
          this.index += 1;
          return {
            value: result,
            done: false
          };
        }
      };
    }
    async collect() {
      const result = new Helpers_1.TotalList;
      for await (const message of this) {
        result.push(message);
      }
      result.total = this.total;
      return result;
    }
    async _loadNextChunk() {
      throw new Error("Not Implemented");
    }
  }
  exports2.RequestIter = RequestIter;
});

// node_modules/teleproto/client/rpcControl.js
var require_rpcControl = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.RpcCallControl = undefined;

  class RpcCallControl {
    constructor(options) {
      this.options = options;
      this.controller = new AbortController;
      this.onAbort = () => this.controller.abort(this.options.abortSignal?.reason);
      for (const key of ["dcId", "maxRetryCount", "timeout", "floodSleepThreshold"]) {
        const value = options[key];
        if (value === undefined)
          continue;
        const minimum = key === "dcId" || key === "timeout" ? 1 : 0;
        if (!Number.isSafeInteger(value) || value < minimum || key === "timeout" && value > 2147483647) {
          throw new RangeError(`Invalid RPC option ${key}: ${value}`);
        }
      }
      if (options.abortSignal?.aborted)
        this.onAbort();
      else
        options.abortSignal?.addEventListener("abort", this.onAbort, { once: true });
      if (options.timeout !== undefined) {
        this.timer = setTimeout(() => {
          const error = new Error(`RPC timed out after ${options.timeout}ms`);
          error.name = "TimeoutError";
          this.controller.abort(error);
        }, options.timeout);
      }
    }
    get signal() {
      return this.controller.signal;
    }
    check() {
      this.signal.throwIfAborted();
    }
    wait(promise) {
      return new Promise((resolve, reject) => {
        const aborted = () => reject(this.signal.reason);
        if (this.signal.aborted)
          aborted();
        else
          this.signal.addEventListener("abort", aborted, { once: true });
        Promise.resolve(promise).then(resolve, reject).finally(() => {
          this.signal.removeEventListener("abort", aborted);
        });
      });
    }
    async sleep(ms) {
      let timer;
      try {
        await this.wait(new Promise((resolve) => {
          timer = setTimeout(resolve, ms);
        }));
      } finally {
        if (timer)
          clearTimeout(timer);
      }
    }
    dispose() {
      if (this.timer)
        clearTimeout(this.timer);
      this.options.abortSignal?.removeEventListener("abort", this.onAbort);
    }
  }
  exports2.RpcCallControl = RpcCallControl;
});

// node_modules/teleproto/client/users.js
var require_users = __commonJS((exports2) => {
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
  exports2.invoke = invoke;
  exports2.getMe = getMe;
  exports2.isBot = isBot;
  exports2.isUserAuthorized = isUserAuthorized;
  exports2.getEntity = getEntity;
  exports2.getInputEntity = getInputEntity;
  exports2._getEntityFromString = _getEntityFromString;
  exports2.getPeerId = getPeerId;
  exports2._getPeer = _getPeer;
  exports2._getInputDialog = _getInputDialog;
  exports2._getInputNotify = _getInputNotify;
  exports2._selfId = _selfId;
  exports2.getCommonChats = getCommonChats;
  var tl_1 = require_tl();
  var Utils_1 = require_Utils();
  var Helpers_1 = require_Helpers();
  var errors = __importStar(require_errors());
  var utils = __importStar(require_Utils());
  var big_integer_1 = __importDefault(require_BigInteger());
  var RequestState_1 = require_RequestState();
  var network_1 = require_network();
  var rpcControl_1 = require_rpcControl();
  var telegramInternalErrors = async (e, ctx) => {
    if (!(e instanceof errors.ServerError || e.errorMessage === "RPC_CALL_FAIL" || e.errorMessage === "RPC_MCGET_FAIL")) {
      return false;
    }
    ctx.client._log.warn(`Telegram is having internal issues ${e.constructor.name}`);
    await ctx.control.sleep(2000);
    return true;
  };
  var floodWait = async (e, ctx) => {
    if (!(e instanceof errors.FloodWaitError || e instanceof errors.FloodTestPhoneWaitError)) {
      return false;
    }
    if (e.seconds > (ctx.options.floodSleepThreshold ?? ctx.client.floodSleepThreshold)) {
      throw e;
    }
    ctx.client._log.info(`Sleeping for ${e.seconds}s on flood wait (Caused by ${ctx.request.className})`);
    await ctx.control.sleep(e.seconds * 1000);
    return true;
  };
  var dcMigration = async (e, ctx) => {
    if (!(e instanceof errors.PhoneMigrateError || e instanceof errors.NetworkMigrateError || e instanceof errors.UserMigrateError)) {
      return false;
    }
    if (e instanceof errors.UserMigrateError && (ctx.dcId !== undefined || ctx.sender !== ctx.client._sender) && e.newDc === ctx.client.session.dcId) {
      ctx.client._log.info(`Request must run on the home DC ${e.newDc}; rerouting to the main sender`);
      ctx.lease?.release();
      ctx.lease = undefined;
      ctx.dcId = undefined;
      ctx.sender = ctx.client._sender;
      return true;
    }
    ctx.client._log.info(`Migrating to data center ${e.newDc}`);
    const shouldRaise = e instanceof errors.PhoneMigrateError || e instanceof errors.NetworkMigrateError;
    if (shouldRaise && await ctx.control.wait(ctx.client.isUserAuthorized())) {
      throw e;
    }
    ctx.control.check();
    await ctx.control.wait(ctx.client._switchDC(e.newDc));
    ctx.control.check();
    ctx.lease?.release();
    ctx.lease = undefined;
    if (ctx.dcId === undefined) {
      ctx.sender = ctx.client._sender;
    } else {
      ctx.lease = await ctx.control.wait(ctx.client._leaseSender(ctx.dcId).then((lease) => {
        if (ctx.control.signal.aborted)
          lease.release();
        return lease;
      }));
      ctx.sender = ctx.lease.sender;
    }
    return true;
  };
  var msgWait = async (e, ctx) => {
    if (!(e instanceof errors.MsgWaitError)) {
      return false;
    }
    await ctx.control.wait(ctx.state.isReady());
    ctx.state.after = undefined;
    return true;
  };
  var reCaptcha = async (e, ctx) => {
    if (!(e.errorMessage && e.errorMessage.startsWith("RECAPTCHA_CHECK_") && ctx.client._reCaptchaCallback)) {
      return false;
    }
    const match = e.errorMessage.match(/RECAPTCHA_CHECK_.*(6Le[-\w]+)/);
    if (!match) {
      throw e;
    }
    const token = await ctx.control.wait(ctx.client._reCaptchaCallback(match[1]));
    ctx.control.check();
    const newRequest = new tl_1.Api.InvokeWithReCaptcha({
      token,
      query: ctx.request
    });
    await ctx.control.wait(newRequest.resolve(ctx.client, utils));
    ctx.control.check();
    ctx.state.request = newRequest;
    ctx.state.data = newRequest.getBytes();
    return true;
  };
  var connectionNotInited = async (e, ctx) => {
    if (e.message !== "CONNECTION_NOT_INITED") {
      return false;
    }
    const targetSender = ctx.sender || ctx.client._sender;
    if (targetSender) {
      targetSender._needsInitConnection = true;
    }
    ctx.client._log.warn("CONNECTION_NOT_INITED, will re-wrap next request with initConnection");
    return true;
  };
  var INVOKE_ERROR_POLICIES = [
    telegramInternalErrors,
    floodWait,
    dcMigration,
    msgWait,
    reCaptcha,
    connectionNotInited
  ];
  async function invoke(client, request, dcId, otherSender, options = {}) {
    if (request.classType !== "request") {
      throw new Error("You can only invoke MTProtoRequests");
    }
    const control = new rpcControl_1.RpcCallControl(options);
    const authorizationError = client.updates.authorizationError;
    const ctx = {
      client,
      request,
      state: undefined,
      dcId,
      sender: client._sender,
      control,
      options
    };
    try {
      control.check();
      if (dcId) {
        ctx.lease = await control.wait(client._leaseSender(dcId).then((lease) => {
          if (control.signal.aborted)
            lease.release();
          return lease;
        }));
        ctx.sender = ctx.lease.sender;
      }
      if (otherSender !== undefined) {
        ctx.sender = otherSender instanceof network_1.MTProtoSender ? otherSender : otherSender.sender;
      }
      if (!ctx.sender || ctx.sender.userDisconnected) {
        throw new Error("Cannot send requests while disconnected. Please connect first.");
      }
      await control.wait(client._connectedDeferred.promise);
      control.check();
      await control.wait(request.resolve(client, utils));
      control.check();
      client._lastRequest = Date.now();
      const state = new RequestState_1.RequestState(request);
      ctx.state = state;
      const attempts = options.maxRetryCount === undefined ? client._requestRetries : options.maxRetryCount + 1;
      let attempt = 0;
      for (attempt = 0;attempt < attempts; attempt++) {
        control.check();
        ctx.sender.addStateToQueue(state);
        try {
          const result = await control.wait(state.promise);
          state.finished.resolve();
          try {
            await client.session.processEntities(result);
          } catch (err) {
            client._log.warn(`session.processEntities failed: ${err}`);
          }
          client._entityCache.add(result);
          if (!dcId && !otherSender) {
            if (result instanceof tl_1.Api.auth.Authorization || result instanceof tl_1.Api.auth.LoginTokenSuccess || result instanceof tl_1.Api.updates.State && authorizationError !== undefined && authorizationError === client.updates.authorizationError) {
              client.updates._resumeAuthorization();
            }
            const sub = result?.SUBCLASS_OF_ID;
            if (sub === (0, Helpers_1.unionId)("Updates")) {
              client.updateManager.onUpdates(result, true);
            } else if (sub === (0, Helpers_1.unionId)("messages.AffectedMessages") || sub === (0, Helpers_1.unionId)("messages.AffectedHistory") || sub === (0, Helpers_1.unionId)("messages.AffectedFoundMessages")) {
              const affected = result;
              let affectedRequest = request;
              while (affectedRequest.query?.classType === "request") {
                affectedRequest = affectedRequest.query;
              }
              const channel = affectedRequest.channel;
              client.updateManager.applyAffected(affected.pts, affected.ptsCount, channel?.channelId?.toString());
            }
          }
          return result;
        } catch (e) {
          control.check();
          if ((e instanceof errors.FloodWaitError || e instanceof errors.FloodTestPhoneWaitError) && client.updateManager.handleChannelFloodWait(request, e.seconds))
            throw e;
          if (attempt + 1 >= attempts)
            throw e;
          let recovered = false;
          for (const policy of INVOKE_ERROR_POLICIES) {
            try {
              recovered = await policy(e, ctx);
            } catch (fatal) {
              state.finished.resolve();
              throw fatal;
            }
            if (recovered)
              break;
          }
          if (!recovered) {
            state.finished.resolve();
            throw e;
          }
        }
        state.resetPromise();
      }
      throw new Error(`Request was unsuccessful ${attempt} time(s)`);
    } finally {
      if (ctx.state) {
        if (control.signal.aborted)
          ctx.sender.cancelRequest(ctx.state, control.signal.reason);
        ctx.state.finished.resolve();
      }
      ctx.lease?.release();
      control.dispose();
    }
  }
  async function getMe(client, inputPeer) {
    if (inputPeer && client._selfInputPeer) {
      return client._selfInputPeer;
    }
    const me = (await client.api.users.getUsers({ id: [new tl_1.Api.InputUserSelf] }))[0];
    client._bot = me.bot;
    if (!client._selfInputPeer) {
      client._selfInputPeer = utils.getInputPeer(me, false);
    }
    return inputPeer ? client._selfInputPeer : me;
  }
  async function isBot(client) {
    if (client._bot === undefined) {
      const me = await client.getMe();
      if (me) {
        return !(me instanceof tl_1.Api.InputPeerUser) ? me.bot : undefined;
      }
    }
    return client._bot;
  }
  async function isUserAuthorized(client) {
    try {
      await client.api.updates.getState();
      return true;
    } catch (e) {
      return false;
    }
  }
  async function getEntity(client, entity) {
    const single = !(0, Helpers_1.isArrayLike)(entity);
    let entityArray = [];
    if ((0, Helpers_1.isArrayLike)(entity)) {
      entityArray = entity;
    } else {
      entityArray.push(entity);
    }
    const inputs = [];
    for (const x of entityArray) {
      if (typeof x === "string") {
        const valid = (0, Utils_1.parseID)(x);
        if (valid) {
          inputs.push(await client.getInputEntity(valid));
        } else {
          inputs.push(x);
        }
      } else {
        inputs.push(await client.getInputEntity(x));
      }
    }
    const lists = new Map([
      [Helpers_1._EntityType.USER, []],
      [Helpers_1._EntityType.CHAT, []],
      [Helpers_1._EntityType.CHANNEL, []]
    ]);
    for (const x of inputs) {
      try {
        lists.get((0, Helpers_1._entityType)(x)).push(x);
      } catch (e) {}
    }
    let users = lists.get(Helpers_1._EntityType.USER);
    let chats = lists.get(Helpers_1._EntityType.CHAT);
    let channels = lists.get(Helpers_1._EntityType.CHANNEL);
    if (users.length) {
      users = await client.api.users.getUsers({
        id: users
      });
    }
    if (chats.length) {
      const chatIds = chats.map((x) => x.chatId);
      chats = (await client.api.messages.getChats({ id: chatIds })).chats;
    }
    if (channels.length) {
      channels = await _getChannelsWithCommunityFallback(client, channels);
    }
    const idEntity = new Map;
    for (const user of users) {
      idEntity.set((0, Utils_1.getPeerId)(user), user);
    }
    for (const channel of channels) {
      idEntity.set((0, Utils_1.getPeerId)(channel), channel);
    }
    for (const chat of chats) {
      idEntity.set((0, Utils_1.getPeerId)(chat), chat);
    }
    const result = [];
    for (const x of inputs) {
      if (typeof x === "string") {
        result.push(await _getEntityFromString(client, x));
      } else if (!(x instanceof tl_1.Api.InputPeerSelf)) {
        result.push(idEntity.get((0, Utils_1.getPeerId)(x)));
      } else {
        for (const [key, u] of idEntity.entries()) {
          if (u instanceof tl_1.Api.User && u.self) {
            result.push(u);
            break;
          }
        }
      }
    }
    return single ? result[0] : result;
  }
  async function _getChannelsWithCommunityFallback(client, inputs) {
    try {
      return (await client.api.channels.getChannels({ id: inputs })).chats;
    } catch (e) {
      if (e?.errorMessage !== "COMMUNITY_ID_INVALID")
        throw e;
    }
    const joined = await client.api.communities.getJoinedCommunities();
    const byId = new Map;
    for (const chat of joined.chats) {
      byId.set(chat.id.toString(), chat);
    }
    const resolved = [];
    const rest = [];
    for (const input of inputs) {
      const id = input.channelId;
      const hit = id && byId.get(id.toString());
      if (hit)
        resolved.push(hit);
      else
        rest.push(input);
    }
    if (rest.length) {
      resolved.push(...(await client.api.channels.getChannels({ id: rest })).chats);
    }
    return resolved;
  }
  async function getInputEntity(client, peer) {
    try {
      return utils.getInputPeer(peer);
    } catch (e) {}
    try {
      if (typeof peer == "string") {
        const valid = (0, Utils_1.parseID)(peer);
        if (valid) {
          const res = client._entityCache.get(peer);
          if (res) {
            return res;
          }
        }
      }
      if (typeof peer === "number" || typeof peer === "bigint" || big_integer_1.default.isInstance(peer)) {
        const res = client._entityCache.get(peer.toString());
        if (res) {
          return res;
        }
      }
      if (typeof peer == "object" && !big_integer_1.default.isInstance(peer) && peer.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("Peer")) {
        const res = client._entityCache.get(utils.getPeerId(peer));
        if (res) {
          return res;
        }
      }
    } catch (e) {}
    if (typeof peer == "string") {
      if (["me", "this", "self"].includes(peer)) {
        return new tl_1.Api.InputPeerSelf;
      }
    }
    try {
      if (peer != null) {
        return await client.session.getInputEntity(peer);
      }
    } catch (e) {}
    if (typeof peer === "string") {
      return utils.getInputPeer(await _getEntityFromString(client, peer));
    }
    if (typeof peer === "number") {
      peer = (0, Helpers_1.returnBigInt)(peer);
    }
    peer = utils.getPeer(peer);
    if (peer instanceof tl_1.Api.PeerUser) {
      const users = await client.api.users.getUsers({
        id: [
          new tl_1.Api.InputUser({
            userId: peer.userId,
            accessHash: big_integer_1.default.zero
          })
        ]
      });
      if (users.length && !(users[0] instanceof tl_1.Api.UserEmpty)) {
        return utils.getInputPeer(users[0]);
      }
    } else if (peer instanceof tl_1.Api.PeerChat) {
      return new tl_1.Api.InputPeerChat({
        chatId: peer.chatId
      });
    } else if (peer instanceof tl_1.Api.PeerChannel) {
      try {
        const channels = await _getChannelsWithCommunityFallback(client, [
          new tl_1.Api.InputChannel({
            channelId: peer.channelId,
            accessHash: big_integer_1.default.zero
          })
        ]);
        return utils.getInputPeer(channels[0]);
      } catch (e) {
        client._log.error("Error while resolving channel entity", e);
        if (client._errorHandler) {
          await client._errorHandler(e);
        }
      }
    }
    throw new Error(`Could not find the input entity for ${JSON.stringify(peer)}.
         Please read https://` + "docs.teleproto.dev/concepts/entities to" + " find out more details.");
  }
  async function _getEntityFromString(client, string) {
    const phone = utils.parsePhone(string);
    if (phone) {
      try {
        const result = await client.api.contacts.getContacts({
          hash: big_integer_1.default.zero
        });
        if (!(result instanceof tl_1.Api.contacts.ContactsNotModified)) {
          for (const user of result.users) {
            if (user instanceof tl_1.Api.User && user.phone === phone) {
              return user;
            }
          }
        }
      } catch (e) {
        if (e.errorMessage === "BOT_METHOD_INVALID") {
          throw new Error("Cannot get entity by phone number as a " + "bot (try using integer IDs, not strings)");
        }
        throw e;
      }
    }
    const id = utils.parseID(string);
    if (id != null) {
      return getInputEntity(client, id);
    } else if (["me", "this"].includes(string.toLowerCase())) {
      return client.getMe();
    } else {
      const { username, isInvite } = utils.parseUsername(string);
      if (isInvite) {
        const invite = await client.api.messages.checkChatInvite({
          hash: username
        });
        if (invite instanceof tl_1.Api.ChatInvite) {
          throw new Error("Cannot get entity from a channel (or group) " + "that you are not part of. Join the group and retry");
        } else if (invite instanceof tl_1.Api.ChatInviteAlready) {
          return invite.chat;
        }
      } else if (username) {
        try {
          const result = await client.api.contacts.resolveUsername({
            username
          });
          const pid = utils.getPeerId(result.peer, false);
          if (result.peer instanceof tl_1.Api.PeerUser) {
            for (const x of result.users) {
              if ((0, Helpers_1.returnBigInt)(x.id).equals((0, Helpers_1.returnBigInt)(pid))) {
                return x;
              }
            }
          } else {
            for (const x of result.chats) {
              if ((0, Helpers_1.returnBigInt)(x.id).equals((0, Helpers_1.returnBigInt)(pid))) {
                return x;
              }
            }
          }
        } catch (e) {
          if (e.errorMessage === "USERNAME_NOT_OCCUPIED") {
            throw new Error(`No user has "${username}" as username`);
          }
          throw e;
        }
      }
    }
    throw new Error(`Cannot find any entity corresponding to "${string}"`);
  }
  async function getPeerId(client, peer, addMark = true) {
    if (typeof peer == "string") {
      const valid = (0, Utils_1.parseID)(peer);
      if (valid) {
        return utils.getPeerId(peer, addMark);
      } else {
        peer = await client.getInputEntity(peer);
      }
    }
    if (typeof peer == "number" || typeof peer == "bigint" || big_integer_1.default.isInstance(peer)) {
      return utils.getPeerId(peer, addMark);
    }
    if (peer.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("Peer") || peer.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputPeer")) {
      peer = await client.getInputEntity(peer);
    }
    if (peer instanceof tl_1.Api.InputPeerSelf) {
      peer = await client.getMe(true);
    }
    return utils.getPeerId(peer, addMark);
  }
  async function _getPeer(client, peer) {
    if (!peer) {
      return;
    }
    const [i, cls] = utils.resolveId((0, Helpers_1.returnBigInt)(await client.getPeerId(peer)));
    return new cls({
      userId: i,
      channelId: i,
      chatId: i
    });
  }
  async function _getInputDialog(client, dialog) {
    if (dialog?.inputDialog)
      return _getInputDialog(client, dialog.inputDialog);
    if (dialog instanceof tl_1.Api.InputDialogPeerCommunity) {
      dialog.community = utils.getInputChannel(await client.getInputEntity(dialog.community));
      return dialog;
    }
    if (dialog instanceof tl_1.Api.InputDialogPeerFolder)
      return dialog;
    if (dialog instanceof tl_1.Api.Community || dialog instanceof tl_1.Api.CommunityForbidden) {
      return utils.getInputDialog(dialog);
    }
    if (dialog instanceof tl_1.Api.DialogCommunity || dialog instanceof tl_1.Api.DialogPeerCommunity) {
      return new tl_1.Api.InputDialogPeerCommunity({
        community: utils.getInputChannel(await client.getInputEntity(new tl_1.Api.PeerChannel({ channelId: dialog.communityId })))
      });
    }
    try {
      if (dialog.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputDialogPeer")) {
        dialog.peer = await client.getInputEntity(dialog.peer);
        return dialog;
      } else if (dialog.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputPeer")) {
        return new tl_1.Api.InputDialogPeer({
          peer: dialog
        });
      }
    } catch (e) {}
    return new tl_1.Api.InputDialogPeer({
      peer: dialog
    });
  }
  async function _getInputNotify(client, notify) {
    if (notify instanceof tl_1.Api.Community || notify instanceof tl_1.Api.CommunityForbidden) {
      return new tl_1.Api.InputNotifyCommunity({
        community: utils.getInputChannel(await client.getInputEntity(notify))
      });
    }
    if (notify instanceof tl_1.Api.InputNotifyCommunity) {
      notify.community = utils.getInputChannel(await client.getInputEntity(notify.community));
      return notify;
    }
    if (notify instanceof tl_1.Api.NotifyCommunity || notify instanceof tl_1.Api.DialogCommunity) {
      return new tl_1.Api.InputNotifyCommunity({
        community: utils.getInputChannel(await client.getInputEntity(new tl_1.Api.PeerChannel({ channelId: notify.communityId })))
      });
    }
    try {
      if (notify.SUBCLASS_OF_ID == (0, Helpers_1.unionId)("InputNotifyPeer")) {
        if (notify instanceof tl_1.Api.InputNotifyPeer) {
          notify.peer = await client.getInputEntity(notify.peer);
        }
        return notify;
      }
    } catch (e) {}
    return new tl_1.Api.InputNotifyPeer({
      peer: await client.getInputEntity(notify)
    });
  }
  function _selfId(client) {
    return client._selfInputPeer ? client._selfInputPeer.userId : undefined;
  }
  async function getCommonChats(client, entity, params = {}) {
    const user = await client.getInputEntity(entity);
    const result = await client.invoke(new tl_1.Api.messages.GetCommonChats({
      userId: user,
      maxId: params.maxId ?? big_integer_1.default.zero,
      limit: params.limit ?? 100
    }));
    const chats = new Helpers_1.TotalList;
    chats.push(...result.chats);
    chats.total = result instanceof tl_1.Api.messages.ChatsSlice ? result.count : result.chats.length;
    return chats;
  }
});

// node_modules/teleproto/client/uploads.js
var require_uploads = __commonJS((exports2) => {
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
  exports2.CustomFile = undefined;
  exports2.uploadFile = uploadFile;
  exports2._toQuickReplyShortcut = _toQuickReplyShortcut;
  exports2._toReplyObject = _toReplyObject;
  exports2._fileToMedia = _fileToMedia;
  exports2._sendAlbum = _sendAlbum;
  exports2.sendFile = sendFile;
  var tl_1 = require_tl();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();
  var path_1 = __importDefault(require("path"));
  var fs_1 = require("fs");
  var utils = __importStar(require_Utils());
  var messageParse_1 = require_messageParse();
  var big_integer_1 = __importDefault(require_BigInteger());
  var OrderedWriter_1 = require_OrderedWriter();
  function isNamedBlob(value) {
    return typeof value === "object" && value !== null && typeof value.arrayBuffer === "function" && typeof value.name === "string" && typeof value.size === "number";
  }

  class CustomFile {
    constructor(name, size, path2, buffer) {
      this.name = name;
      this.size = size;
      this.path = path2;
      this.buffer = buffer;
    }
  }
  exports2.CustomFile = CustomFile;

  class CustomBuffer {
    constructor(options) {
      this.options = options;
      if (!options.buffer && !options.filePath) {
        throw new Error("Either one of `buffer` or `filePath` should be specified");
      }
    }
    async slice(begin, end) {
      const { buffer, filePath } = this.options;
      if (buffer) {
        return buffer.slice(begin, end);
      } else if (filePath) {
        const buffSize = end - begin;
        const buff = Buffer.alloc(buffSize);
        const fHandle = await fs_1.promises.open(filePath, "r");
        await fHandle.read(buff, 0, buffSize, begin);
        await fHandle.close();
        return Buffer.from(buff);
      }
      return Buffer.alloc(0);
    }
  }
  var KB_TO_BYTES = 1024;
  var LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;
  var BUFFER_SIZE_20MB = 20 * 1024 * 1024;
  async function getFileBuffer(file, fileSize, maxBufferSize) {
    const options = {};
    if (fileSize > maxBufferSize && file instanceof CustomFile) {
      options.filePath = file.path;
    } else {
      options.buffer = Buffer.from(await fileToBuffer(file));
    }
    return new CustomBuffer(options);
  }
  async function uploadFile(client, fileParams) {
    const { file, onProgress } = fileParams;
    let { workers } = fileParams;
    const { name, size } = file;
    const fileId = (0, Helpers_1.generateRandomLong)(true);
    const isLarge = size > LARGE_FILE_THRESHOLD;
    const partSize = (0, Utils_1.getAppropriatedPartSize)((0, big_integer_1.default)(size)) * KB_TO_BYTES;
    const partCount = Math.floor((size + partSize - 1) / partSize);
    const buffer = await getFileBuffer(file, size, fileParams.maxBufferSize || BUFFER_SIZE_20MB - 1);
    const ul = client._media.opts.upload;
    let readAhead = Math.max(1, ul.sessions * ul.inFlight);
    if (workers && workers > 0) {
      readAhead = Math.min(readAhead, workers);
    }
    if (readAhead > partCount) {
      readAhead = partCount;
    }
    let progress = 0;
    if (onProgress) {
      onProgress(progress);
    }
    const dcId = client.session.dcId;
    const abort = new AbortController;
    const inflight = new OrderedWriter_1.BoundedSemaphore(Math.max(1, readAhead));
    let firstError;
    const tasks = [];
    for (let j = 0;j < partCount; j++) {
      let endPart = (j + 1) * partSize;
      if (endPart > size) {
        endPart = size;
      }
      if (endPart == j * partSize) {
        break;
      }
      if (firstError)
        break;
      await inflight.acquire();
      if (firstError) {
        inflight.release();
        break;
      }
      const jMemo = j;
      const startPart = j * partSize;
      const endPartMemo = endPart;
      tasks.push((async () => {
        try {
          const bytesMemo = await buffer.slice(startPart, endPartMemo);
          await client._media.savePart(dcId, isLarge ? new tl_1.Api.upload.SaveBigFilePart({
            fileId,
            filePart: jMemo,
            fileTotalParts: partCount,
            bytes: bytesMemo
          }) : new tl_1.Api.upload.SaveFilePart({
            fileId,
            filePart: jMemo,
            bytes: bytesMemo
          }), abort.signal);
          if (onProgress) {
            if (onProgress.isCanceled) {
              throw new Error("USER_CANCELED");
            }
            progress += 1 / partCount;
            onProgress(progress);
          }
        } catch (err) {
          if (!firstError)
            firstError = err;
          abort.abort();
        } finally {
          inflight.release();
        }
      })());
    }
    await Promise.all(tasks);
    if (firstError) {
      throw firstError;
    }
    return isLarge ? new tl_1.Api.InputFileBig({
      id: fileId,
      parts: partCount,
      name
    }) : new tl_1.Api.InputFile({
      id: fileId,
      parts: partCount,
      name,
      md5Checksum: ""
    });
  }
  function _toQuickReplyShortcut(shortcut) {
    if (shortcut == undefined) {
      return;
    }
    if (typeof shortcut === "string") {
      return new tl_1.Api.InputQuickReplyShortcut({ shortcut });
    }
    if (typeof shortcut === "number") {
      return new tl_1.Api.InputQuickReplyShortcutId({ shortcutId: shortcut });
    }
    return shortcut;
  }
  async function _toReplyObject(client, replyTo, topMsgId, quote) {
    if (replyTo != null && typeof replyTo === "object" && replyTo.SUBCLASS_OF_ID === (0, Helpers_1.unionId)("InputReplyTo")) {
      return replyTo;
    }
    const replyToMsgId = replyTo != null ? (0, Utils_1.getMessageId)(replyTo) : (0, Utils_1.getMessageId)(topMsgId);
    if (replyToMsgId == undefined) {
      return;
    }
    return new tl_1.Api.InputReplyToMessage({
      replyToMsgId,
      topMsgId: replyTo != null ? (0, Utils_1.getMessageId)(topMsgId) : undefined,
      quoteText: quote?.quoteText,
      quoteEntities: quote?.quoteEntities,
      quoteOffset: quote?.quoteOffset,
      replyToPeerId: quote?.replyToPeerId ? await client.getInputEntity(quote.replyToPeerId) : undefined
    });
  }
  async function _fileToMedia(client, { file, forceDocument, fileSize, progressCallback, attributes, thumb, voiceNote = false, videoNote = false, supportsStreaming = false, mimeType, asImage, workers, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp }) {
    if (!file) {
      return { fileHandle: undefined, media: undefined, image: undefined };
    }
    const isImage = utils.isImage(file);
    if (asImage == undefined) {
      asImage = isImage && !forceDocument;
    }
    if (typeof file == "object" && !Buffer.isBuffer(file) && !(file instanceof tl_1.Api.InputFile) && !(file instanceof tl_1.Api.InputFileBig) && !(file instanceof CustomFile) && !isNamedBlob(file) && !("read" in file)) {
      try {
        return {
          fileHandle: undefined,
          media: utils.getInputMedia(file, {
            isPhoto: asImage,
            attributes,
            forceDocument,
            voiceNote,
            videoNote,
            supportsStreaming,
            spoiler,
            ttlSeconds,
            nosoundVideo,
            videoCover,
            videoTimestamp
          }),
          image: asImage
        };
      } catch (e) {
        return {
          fileHandle: undefined,
          media: undefined,
          image: isImage
        };
      }
    }
    let media;
    let fileHandle;
    let createdFile;
    if (file instanceof tl_1.Api.InputFile || file instanceof tl_1.Api.InputFileBig) {
      fileHandle = file;
    } else if (typeof file == "string" && (file.startsWith("https://") || file.startsWith("http://"))) {
      if (asImage) {
        media = new tl_1.Api.InputMediaPhotoExternal({
          url: file,
          spoiler,
          ttlSeconds
        });
      } else {
        media = new tl_1.Api.InputMediaDocumentExternal({
          url: file,
          spoiler,
          ttlSeconds,
          videoCover,
          videoTimestamp
        });
      }
    } else if (!(typeof file == "string") || (await fs_1.promises.lstat(file)).isFile()) {
      if (typeof file == "string") {
        createdFile = new CustomFile(path_1.default.basename(file), (await fs_1.promises.stat(file)).size, file);
      } else if (isNamedBlob(file) || file instanceof CustomFile) {
        createdFile = file;
      } else {
        const name = "name" in file && typeof file.name === "string" ? file.name : "unnamed";
        if (Buffer.isBuffer(file)) {
          createdFile = new CustomFile(name, file.length, "", file);
        }
      }
      if (!createdFile) {
        throw new Error(`Could not create file from ${JSON.stringify(file)}`);
      }
      fileHandle = await uploadFile(client, {
        file: createdFile,
        onProgress: progressCallback,
        workers
      });
    } else {
      throw new Error(`"Not a valid path nor a url ${file}`);
    }
    if (media != null) {} else if (fileHandle == undefined) {
      throw new Error(`Failed to convert ${file} to media. Not an existing file or an HTTP URL`);
    } else if (asImage) {
      media = new tl_1.Api.InputMediaUploadedPhoto({
        file: fileHandle,
        spoiler,
        ttlSeconds
      });
    } else {
      let res = utils.getAttributes(file, {
        mimeType,
        attributes,
        forceDocument: forceDocument && !isImage,
        voiceNote,
        videoNote,
        supportsStreaming,
        thumb
      });
      attributes = res.attrs;
      mimeType = res.mimeType;
      let uploadedThumb;
      if (!thumb) {
        uploadedThumb = undefined;
      } else {
        if (typeof thumb == "string") {
          uploadedThumb = new CustomFile(path_1.default.basename(thumb), (await fs_1.promises.stat(thumb)).size, thumb);
        } else if (isNamedBlob(thumb)) {
          uploadedThumb = thumb;
        } else {
          let name;
          if ("name" in thumb) {
            name = thumb.name;
          } else {
            name = "unnamed";
          }
          if (Buffer.isBuffer(thumb)) {
            uploadedThumb = new CustomFile(name, thumb.length, "", thumb);
          }
        }
        if (!uploadedThumb) {
          throw new Error(`Could not create file from ${file}`);
        }
        uploadedThumb = await uploadFile(client, {
          file: uploadedThumb,
          workers: 1
        });
      }
      media = new tl_1.Api.InputMediaUploadedDocument({
        file: fileHandle,
        mimeType,
        attributes,
        thumb: uploadedThumb,
        forceFile: forceDocument && !isImage,
        spoiler,
        ttlSeconds,
        nosoundVideo,
        videoCover,
        videoTimestamp
      });
    }
    return {
      fileHandle,
      media,
      image: asImage
    };
  }
  async function _sendAlbum(client, entity, { file, caption, formattingEntities, forceDocument = false, fileSize, clearDraft = false, progressCallback, replyTo, attributes, thumb, parseMode, voiceNote = false, videoNote = false, silent, supportsStreaming = false, scheduleDate, workers, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, quickReplyShortcut, quoteText, quoteEntities, quoteOffset, replyToPeerId, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp }) {
    entity = await client.getInputEntity(entity);
    let files = [];
    if (!Array.isArray(file)) {
      files = [file];
    } else {
      files = file;
    }
    if (!Array.isArray(caption)) {
      if (!caption) {
        caption = "";
      }
      caption = [caption];
    }
    const captions = [];
    for (const [i, c] of caption.entries()) {
      if (i === 0 && formattingEntities) {
        captions.push([c || "", formattingEntities]);
      } else {
        captions.push(await (0, messageParse_1._parseMessageText)(client, c, parseMode));
      }
    }
    if (commentTo != null) {
      const discussionData = await client.getCommentData(entity, commentTo);
      entity = discussionData.entity;
      replyTo = discussionData.replyTo;
    }
    if (!attributes) {
      attributes = [];
    }
    let index = 0;
    const albumFiles = [];
    for (const file2 of files) {
      let { fileHandle, media, image } = await _fileToMedia(client, {
        file: file2,
        forceDocument,
        fileSize,
        progressCallback,
        attributes: attributes[index],
        thumb,
        voiceNote,
        videoNote,
        supportsStreaming,
        workers,
        spoiler,
        ttlSeconds,
        nosoundVideo,
        videoCover,
        videoTimestamp
      });
      index++;
      if (media instanceof tl_1.Api.InputMediaUploadedPhoto || media instanceof tl_1.Api.InputMediaPhotoExternal) {
        const r = await client.invoke(new tl_1.Api.messages.UploadMedia({
          peer: entity,
          media
        }));
        if (r instanceof tl_1.Api.MessageMediaPhoto) {
          media = (0, Utils_1.getInputMedia)(r.photo, {
            spoiler,
            ttlSeconds
          });
        }
      } else if (media instanceof tl_1.Api.InputMediaUploadedDocument) {
        const r = await client.invoke(new tl_1.Api.messages.UploadMedia({
          peer: entity,
          media
        }));
        if (r instanceof tl_1.Api.MessageMediaDocument) {
          media = (0, Utils_1.getInputMedia)(r.document, {
            spoiler,
            ttlSeconds,
            videoCover,
            videoTimestamp
          });
        }
      }
      let text = "";
      let msgEntities = [];
      if (captions.length) {
        [text, msgEntities] = captions.shift();
      }
      albumFiles.push(new tl_1.Api.InputSingleMedia({
        media,
        message: text,
        entities: msgEntities
      }));
    }
    const replyObject = await _toReplyObject(client, replyTo, topMsgId, {
      quoteText,
      quoteEntities,
      quoteOffset,
      replyToPeerId
    });
    const result = await client.invoke(new tl_1.Api.messages.SendMultiMedia({
      peer: entity,
      replyTo: replyObject,
      multiMedia: albumFiles,
      silent,
      scheduleDate,
      clearDraft,
      noforwards,
      background,
      updateStickersetsOrder,
      allowPaidFloodskip,
      allowPaidStars,
      quickReplyShortcut: _toQuickReplyShortcut(quickReplyShortcut),
      sendAs: sendAs ? await client.getInputEntity(sendAs) : undefined,
      effect,
      invertMedia
    }));
    const randomIds = albumFiles.map((m) => m.randomId);
    return client._getResponseMessage(randomIds, result, entity);
  }
  async function sendFile(client, entity, { file, caption, forceDocument = false, fileSize, clearDraft = false, progressCallback, replyTo, attributes, thumb, parseMode, formattingEntities, voiceNote = false, videoNote = false, buttons, silent, supportsStreaming = false, scheduleDate, workers, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, quoteText, quoteEntities, quoteOffset, replyToPeerId, spoiler, ttlSeconds, nosoundVideo, videoCover, videoTimestamp }) {
    if (!file) {
      throw new Error("You need to specify a file");
    }
    if (!caption) {
      caption = "";
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != null) {
      const discussionData = await client.getCommentData(entity, commentTo);
      entity = discussionData.entity;
      replyTo = discussionData.replyTo;
    }
    if (Array.isArray(file)) {
      return await _sendAlbum(client, entity, {
        file,
        caption,
        formattingEntities,
        replyTo,
        parseMode,
        attributes,
        silent,
        scheduleDate,
        supportsStreaming,
        clearDraft,
        forceDocument,
        noforwards,
        topMsgId,
        fileSize,
        progressCallback,
        workers,
        thumb,
        voiceNote,
        videoNote,
        sendAs,
        effect,
        invertMedia,
        background,
        updateStickersetsOrder,
        allowPaidFloodskip,
        allowPaidStars,
        quickReplyShortcut,
        quoteText,
        quoteEntities,
        quoteOffset,
        replyToPeerId,
        spoiler,
        ttlSeconds,
        nosoundVideo,
        videoCover,
        videoTimestamp
      });
    }
    if (Array.isArray(caption)) {
      caption = caption[0] || "";
    }
    let msgEntities;
    if (formattingEntities != null) {
      msgEntities = formattingEntities;
    } else {
      [caption, msgEntities] = await (0, messageParse_1._parseMessageText)(client, caption, parseMode);
    }
    const { fileHandle, media, image } = await _fileToMedia(client, {
      file,
      forceDocument,
      fileSize,
      progressCallback,
      attributes,
      thumb,
      voiceNote,
      videoNote,
      supportsStreaming,
      workers,
      spoiler,
      ttlSeconds,
      nosoundVideo,
      videoCover,
      videoTimestamp
    });
    if (media == undefined) {
      throw new Error(`Cannot use ${file} as file.`);
    }
    const markup = client.buildReplyMarkup(buttons);
    const replyObject = await _toReplyObject(client, replyTo, topMsgId, {
      quoteText,
      quoteEntities,
      quoteOffset,
      replyToPeerId
    });
    const request = new tl_1.Api.messages.SendMedia({
      peer: entity,
      media,
      replyTo: replyObject,
      message: caption,
      entities: msgEntities,
      replyMarkup: markup,
      silent,
      scheduleDate,
      scheduleRepeatPeriod,
      clearDraft,
      noforwards,
      background,
      updateStickersetsOrder,
      allowPaidFloodskip,
      allowPaidStars,
      quickReplyShortcut: _toQuickReplyShortcut(quickReplyShortcut),
      suggestedPost,
      sendAs: sendAs ? await client.getInputEntity(sendAs) : undefined,
      effect,
      invertMedia
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity);
  }
  function fileToBuffer(file) {
    if (file instanceof CustomFile) {
      if (file.buffer != null) {
        return file.buffer;
      } else {
        return fs_1.promises.readFile(file.path);
      }
    } else if (isNamedBlob(file)) {
      return file.arrayBuffer().then((ab) => Buffer.from(ab));
    } else {
      throw new Error("Could not create buffer from file " + file);
    }
  }
});

// node_modules/teleproto/client/messages.js
var require_messages2 = __commonJS((exports2) => {
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
  exports2._IDsIter = exports2._MessagesIter = undefined;
  exports2.iterMessages = iterMessages;
  exports2.getMessages = getMessages;
  exports2.sendMessage = sendMessage;
  exports2.forwardMessages = forwardMessages;
  exports2.editMessage = editMessage;
  exports2.deleteMessages = deleteMessages;
  exports2.pinMessage = pinMessage;
  exports2.unpinMessage = unpinMessage;
  exports2._pin = _pin;
  exports2.markAsRead = markAsRead;
  exports2.getCommentData = getCommentData;
  exports2.sendReaction = sendReaction;
  exports2.getReactionUsers = getReactionUsers;
  exports2.sendPoll = sendPoll;
  exports2.vote = vote;
  exports2.closePoll = closePoll;
  exports2.getScheduledMessages = getScheduledMessages;
  exports2.sendScheduledMessages = sendScheduledMessages;
  exports2.deleteScheduledMessages = deleteScheduledMessages;
  exports2.copyMessages = copyMessages;
  exports2.saveDraft = saveDraft;
  exports2.clearDraft = clearDraft;
  exports2.clearAllDrafts = clearAllDrafts;
  exports2._parseMessageLink = _parseMessageLink;
  exports2.getMessageByLink = getMessageByLink;
  exports2.translateText = translateText;
  exports2.getMessagesViews = getMessagesViews;
  exports2.getOutboxReadDate = getOutboxReadDate;
  exports2.getMessageReadParticipants = getMessageReadParticipants;
  exports2.getRichMessage = getRichMessage;
  exports2.getDiscussionMessage = getDiscussionMessage;
  var tl_1 = require_tl();
  var requestIter_1 = require_requestIter();
  var Helpers_1 = require_Helpers();
  var Utils_1 = require_Utils();
  var utils = __importStar(require_Utils());
  var messageParse_1 = require_messageParse();
  var users_1 = require_users();
  var big_integer_1 = __importDefault(require_BigInteger());
  var uploads_1 = require_uploads();
  var _MAX_CHUNK_SIZE = 100;

  class _MessagesIter extends requestIter_1.RequestIter {
    async _init({ entity, offsetId, minId, maxId, fromUser, offsetDate, addOffset, filter, search, replyTo, topMsgId, savedPeerId, community }) {
      if (entity) {
        this.entity = await this.client.getInputEntity(entity);
      } else {
        this.entity = undefined;
        if (this.reverse) {
          throw new Error("Cannot reverse global search");
        }
      }
      if (this.reverse) {
        offsetId = Math.max(offsetId, minId);
        if (offsetId && maxId) {
          if (maxId - offsetId <= 1) {
            return false;
          }
        }
        if (!maxId) {
          maxId = Number.MAX_SAFE_INTEGER;
        }
      } else {
        offsetId = Math.max(offsetId, maxId);
        if (offsetId && minId) {
          if (offsetId - minId <= 1) {
            return false;
          }
        }
      }
      if (this.reverse) {
        if (offsetId) {
          offsetId += 1;
        } else if (!offsetDate) {
          offsetId = 1;
        }
      }
      if (fromUser) {
        fromUser = await this.client.getInputEntity(fromUser);
      }
      if (!this.entity && fromUser) {
        this.entity = new tl_1.Api.InputPeerEmpty;
      }
      if (!filter) {
        filter = new tl_1.Api.InputMessagesFilterEmpty;
      }
      if (!this.entity) {
        this.request = new tl_1.Api.messages.SearchGlobal({
          community: community === undefined ? undefined : utils.getInputChannel(await this.client.getInputEntity(community)),
          q: search || "",
          filter,
          minDate: 0,
          maxDate: offsetDate ?? 0,
          offsetRate: 0,
          offsetPeer: new tl_1.Api.InputPeerEmpty,
          offsetId,
          limit: 1
        });
      } else if (replyTo !== undefined) {
        this.request = new tl_1.Api.messages.GetReplies({
          peer: this.entity,
          msgId: replyTo,
          offsetId,
          offsetDate: offsetDate ?? 0,
          addOffset,
          limit: 0,
          maxId: 0,
          minId: 0,
          hash: big_integer_1.default.zero
        });
      } else if (search !== undefined || !(filter instanceof tl_1.Api.InputMessagesFilterEmpty) || fromUser !== undefined || topMsgId !== undefined || savedPeerId !== undefined) {
        this.request = new tl_1.Api.messages.Search({
          peer: this.entity,
          q: search || "",
          filter: typeof filter === "function" ? new filter : filter,
          minDate: 0,
          maxDate: offsetDate ?? 0,
          offsetId,
          addOffset,
          limit: 0,
          maxId: 0,
          minId: 0,
          hash: (0, Helpers_1.generateRandomBigInt)(),
          fromId: fromUser,
          topMsgId,
          savedPeerId: savedPeerId ? await this.client.getInputEntity(savedPeerId) : undefined
        });
        if (!(filter instanceof tl_1.Api.InputMessagesFilterEmpty) && offsetDate && !search && !offsetId) {
          for await (const m of this.client.iterMessages(this.entity, {
            limit: 1,
            offsetDate
          })) {
            this.request.offsetId = m.id + 1;
          }
        }
      } else {
        this.request = new tl_1.Api.messages.GetHistory({
          peer: this.entity,
          limit: 1,
          offsetDate: offsetDate ?? 0,
          offsetId,
          minId: 0,
          maxId: 0,
          addOffset,
          hash: big_integer_1.default.zero
        });
      }
      if (this.limit <= 0) {
        const result = await this.client.invoke(this.request);
        if (result instanceof tl_1.Api.messages.MessagesNotModified) {
          this.total = result.count;
        } else {
          if ("count" in result) {
            this.total = result.count;
          } else {
            this.total = result.messages.length;
          }
        }
        return false;
      }
      if (!this.waitTime) {
        this.waitTime = this.limit > 3000 ? 1 : 0;
      }
      if (this.reverse && !(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
        this.request.addOffset -= _MAX_CHUNK_SIZE;
      }
      this.addOffset = addOffset;
      this.maxId = maxId;
      this.minId = minId;
      this.lastId = this.reverse ? 0 : Number.MAX_SAFE_INTEGER;
    }
    async _loadNextChunk() {
      if (!this.request) {
        throw new Error("Request not set yet");
      }
      this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
      if (this.reverse && this.request.limit != _MAX_CHUNK_SIZE) {
        if (!(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
          this.request.addOffset = this.addOffset - this.request.limit;
        }
      }
      const r = await this.client.invoke(this.request);
      if (r instanceof tl_1.Api.messages.MessagesNotModified) {
        return true;
      }
      if ("count" in r) {
        this.total = r.count;
      } else {
        this.total = r.messages.length;
      }
      const entities = new Map;
      for (const x of [...r.users, ...r.chats]) {
        entities.set((0, Utils_1.getPeerId)(x), x);
      }
      const messages = this.reverse ? r.messages.reverse() : r.messages;
      for (const message of messages) {
        if (!this._messageInRange(message)) {
          return true;
        }
        this.lastId = message.id;
        try {
          message._finishInit(this.client, entities, this.entity);
        } catch (e) {}
        message._entities = entities;
        this.buffer?.push(message);
      }
      if (r.messages.length < this.request.limit) {
        return true;
      }
      if (this.buffer) {
        this._updateOffset(this.buffer[this.buffer.length - 1], r);
      } else {
        return true;
      }
    }
    _messageInRange(message) {
      if (this.entity) {
        if (this.reverse) {
          if (message.id <= this.lastId || message.id >= this.maxId) {
            return false;
          }
        } else {
          if (message.id >= this.lastId || message.id <= this.minId) {
            return false;
          }
        }
      }
      return true;
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
    _updateOffset(lastMessage, response) {
      if (!this.request) {
        throw new Error("Request not set yet");
      }
      this.request.offsetId = Number(lastMessage.id);
      if (this.reverse) {
        this.request.offsetId += 1;
      }
      if (this.request instanceof tl_1.Api.messages.Search) {
        this.request.maxDate = -1;
      } else {
        if (!(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
          this.request.offsetDate = lastMessage.date;
        }
      }
      if (this.request instanceof tl_1.Api.messages.SearchGlobal) {
        if (lastMessage.inputChat) {
          this.request.offsetPeer = lastMessage.inputChat;
        } else {
          this.request.offsetPeer = new tl_1.Api.InputPeerEmpty;
        }
        this.request.offsetRate = response.nextRate;
      }
    }
  }
  exports2._MessagesIter = _MessagesIter;

  class _IDsIter extends requestIter_1.RequestIter {
    async _init({ entity, ids }) {
      this.total = ids.length;
      this._ids = this.reverse ? ids.reverse() : ids;
      this._offset = 0;
      this._entity = entity ? await this.client.getInputEntity(entity) : undefined;
      this._ty = this._entity ? (0, Helpers_1._entityType)(this._entity) : undefined;
      if (!this.waitTime) {
        this.waitTime = this.limit > 300 ? 10 : 0;
      }
    }
    [Symbol.asyncIterator]() {
      return super[Symbol.asyncIterator]();
    }
    async _loadNextChunk() {
      const ids = this._ids.slice(this._offset, this._offset + _MAX_CHUNK_SIZE);
      if (!ids.length) {
        return false;
      }
      this._offset += _MAX_CHUNK_SIZE;
      let fromId;
      let r;
      if (this._ty == Helpers_1._EntityType.CHANNEL) {
        try {
          r = await this.client.invoke(new tl_1.Api.channels.GetMessages({
            channel: this._entity,
            id: ids
          }));
        } catch (e) {
          if (e.errorMessage == "MESSAGE_IDS_EMPTY") {
            r = new tl_1.Api.messages.MessagesNotModified({
              count: ids.length
            });
          } else {
            throw e;
          }
        }
      } else {
        r = await this.client.invoke(new tl_1.Api.messages.GetMessages({
          id: ids
        }));
        if (this._entity) {
          fromId = await (0, users_1._getPeer)(this.client, this._entity);
        }
      }
      if (r instanceof tl_1.Api.messages.MessagesNotModified) {
        this.buffer?.push(...Array(ids.length));
        return;
      }
      const entities = new Map;
      for (const entity of [...r.users, ...r.chats]) {
        entities.set(utils.getPeerId(entity), entity);
      }
      let message;
      for (message of r.messages) {
        if (message instanceof tl_1.Api.MessageEmpty || fromId && utils.getPeerId(message.peerId) != utils.getPeerId(fromId)) {
          this.buffer?.push(undefined);
        } else {
          const temp = message;
          temp._finishInit(this.client, entities, this._entity);
          temp._entities = entities;
          this.buffer?.push(temp);
        }
      }
    }
  }
  exports2._IDsIter = _IDsIter;
  var IterMessagesDefaults = {
    limit: undefined,
    offsetDate: undefined,
    offsetId: 0,
    maxId: 0,
    minId: 0,
    addOffset: 0,
    search: undefined,
    filter: undefined,
    fromUser: undefined,
    waitTime: undefined,
    ids: undefined,
    reverse: false,
    replyTo: undefined,
    scheduled: false,
    topMsgId: undefined,
    savedPeerId: undefined
  };
  function iterMessages(client, entity, options) {
    const { limit, offsetDate, offsetId, maxId, minId, addOffset, search, filter, fromUser, waitTime, ids, reverse, replyTo, topMsgId, savedPeerId, community } = { ...IterMessagesDefaults, ...options };
    if (community !== undefined && (entity !== undefined || ids !== undefined || fromUser !== undefined || replyTo !== undefined || topMsgId !== undefined || savedPeerId !== undefined)) {
      throw new Error("Community search requires global search without a peer, message IDs or thread filters");
    }
    if (ids) {
      let idsArray;
      if (!(0, Helpers_1.isArrayLike)(ids)) {
        idsArray = [ids];
      } else {
        idsArray = ids;
      }
      return new _IDsIter(client, idsArray.length, {
        reverse,
        waitTime
      }, {
        entity,
        ids: idsArray
      });
    }
    return new _MessagesIter(client, limit, {
      waitTime,
      reverse
    }, {
      entity,
      offsetId,
      minId,
      maxId,
      fromUser,
      offsetDate,
      addOffset,
      filter,
      search,
      replyTo,
      topMsgId,
      savedPeerId,
      community
    });
  }
  async function getMessages(client, entity, params) {
    if (Object.keys(params).length == 1 && params.limit === undefined) {
      if (params.minId === undefined && params.maxId === undefined) {
        params.limit = undefined;
      } else {
        params.limit = 1;
      }
    }
    const it = client.iterMessages(entity, params);
    const ids = params.ids;
    if (ids && !(0, Helpers_1.isArrayLike)(ids)) {
      for await (const message of it) {
        return [message];
      }
      return [];
    }
    return await it.collect();
  }
  async function sendMessage(client, entity, { message, replyTo, attributes, parseMode, formattingEntities, linkPreview = true, file, thumb, forceDocument, clearDraft: clearDraft2, buttons, silent, supportStreaming, schedule, noforwards, commentTo, topMsgId, sendAs, effect, invertMedia, background, updateStickersetsOrder, allowPaidFloodskip, allowPaidStars, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, richMessage, quoteText, quoteEntities, quoteOffset, replyToPeerId } = {}) {
    if (file) {
      return client.sendFile(entity, {
        file,
        caption: message ? typeof message == "string" ? message : message.message : "",
        forceDocument,
        clearDraft: clearDraft2,
        replyTo,
        attributes,
        thumb,
        supportsStreaming: supportStreaming,
        parseMode,
        formattingEntities,
        silent,
        scheduleDate: schedule,
        buttons,
        noforwards,
        commentTo,
        topMsgId,
        sendAs,
        effect,
        invertMedia,
        background,
        updateStickersetsOrder,
        allowPaidFloodskip,
        allowPaidStars,
        scheduleRepeatPeriod,
        quickReplyShortcut,
        suggestedPost,
        quoteText,
        quoteEntities,
        quoteOffset,
        replyToPeerId
      });
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != null) {
      const discussionData = await getCommentData(client, entity, commentTo);
      entity = discussionData.entity;
      replyTo = discussionData.replyTo;
    }
    let markup, request;
    const replyObject = await (0, uploads_1._toReplyObject)(client, replyTo, topMsgId, {
      quoteText,
      quoteEntities,
      quoteOffset,
      replyToPeerId
    });
    if (message && message instanceof tl_1.Api.Message) {
      if (buttons == undefined) {
        markup = message.replyMarkup;
      } else {
        markup = client.buildReplyMarkup(buttons);
      }
      if (silent == undefined) {
        silent = message.silent;
      }
      if (message.media && !(message.media instanceof tl_1.Api.MessageMediaWebPage)) {
        return client.sendFile(entity, {
          file: message.media,
          caption: message.message,
          silent,
          replyTo,
          buttons: markup,
          formattingEntities: message.entities,
          scheduleDate: schedule,
          clearDraft: clearDraft2,
          noforwards,
          topMsgId,
          sendAs,
          effect,
          invertMedia,
          background,
          allowPaidStars,
          quoteText,
          quoteEntities,
          quoteOffset,
          replyToPeerId
        });
      }
      request = new tl_1.Api.messages.SendMessage({
        peer: entity,
        message: message.message || "",
        silent,
        replyTo: replyObject,
        replyMarkup: markup,
        entities: message.entities,
        clearDraft: clearDraft2,
        noWebpage: !(message.media instanceof tl_1.Api.MessageMediaWebPage),
        scheduleDate: schedule,
        scheduleRepeatPeriod,
        noforwards,
        background,
        updateStickersetsOrder,
        allowPaidFloodskip,
        allowPaidStars,
        quickReplyShortcut: (0, uploads_1._toQuickReplyShortcut)(quickReplyShortcut),
        suggestedPost,
        richMessage,
        sendAs: sendAs ? await client.getInputEntity(sendAs) : undefined,
        effect,
        invertMedia
      });
      message = message.message;
    } else {
      if (formattingEntities == undefined) {
        [message, formattingEntities] = await (0, messageParse_1._parseMessageText)(client, message || "", parseMode);
      }
      if (!message && !richMessage) {
        throw new Error("The message cannot be empty unless a file is provided");
      }
      request = new tl_1.Api.messages.SendMessage({
        peer: entity,
        message: message ? message.toString() : "",
        entities: formattingEntities,
        noWebpage: !linkPreview,
        replyTo: replyObject,
        clearDraft: clearDraft2,
        silent,
        replyMarkup: client.buildReplyMarkup(buttons),
        scheduleDate: schedule,
        scheduleRepeatPeriod,
        noforwards,
        background,
        updateStickersetsOrder,
        allowPaidFloodskip,
        allowPaidStars,
        quickReplyShortcut: (0, uploads_1._toQuickReplyShortcut)(quickReplyShortcut),
        suggestedPost,
        richMessage,
        sendAs: sendAs ? await client.getInputEntity(sendAs) : undefined,
        effect,
        invertMedia
      });
    }
    const result = await client.invoke(request);
    if (result instanceof tl_1.Api.UpdateShortSentMessage) {
      const msg = new tl_1.Api.Message({
        id: result.id,
        peerId: await (0, users_1._getPeer)(client, entity),
        message,
        date: result.date,
        out: result.out,
        media: result.media,
        entities: result.entities,
        replyMarkup: request.replyMarkup,
        ttlPeriod: result.ttlPeriod
      });
      msg._finishInit(client, new Map, entity);
      return msg;
    }
    return client._getResponseMessage(request, result, entity);
  }
  async function forwardMessages(client, entity, { messages, fromPeer, silent, schedule, noforwards, dropAuthor, topMsgId, sendAs, effect, dropMediaCaptions, withMyScore, background, allowPaidFloodskip, allowPaidStars, videoTimestamp, scheduleRepeatPeriod, quickReplyShortcut, suggestedPost, replyTo }) {
    if (!(0, Helpers_1.isArrayLike)(messages)) {
      messages = [messages];
    }
    entity = await client.getInputEntity(entity);
    let fromPeerId;
    if (fromPeer) {
      fromPeer = await client.getInputEntity(fromPeer);
      fromPeerId = await client.getPeerId(fromPeer);
    }
    const getKey = (m) => {
      if (m instanceof tl_1.Api.Message) {
        return m.chatId;
      }
      let msgId = (0, Utils_1.parseID)(m);
      if (msgId) {
        if (fromPeerId !== undefined)
          return fromPeerId;
        throw new Error("fromPeer must be given if integer IDs are used");
      } else {
        throw new Error(`Cannot forward ${m}`);
      }
    };
    const sent = [];
    for (let [chatId, chunk] of (0, Helpers_1.groupBy)(messages, getKey)) {
      let chat;
      let numbers = [];
      if (typeof chunk[0] == "number") {
        chat = fromPeer;
        numbers = chunk;
      } else {
        chat = await chunk[0].getInputChat();
        numbers = chunk.map((m) => m.id);
      }
      const request = new tl_1.Api.messages.ForwardMessages({
        fromPeer: chat,
        id: numbers,
        toPeer: entity,
        silent,
        scheduleDate: schedule,
        scheduleRepeatPeriod,
        noforwards,
        dropAuthor,
        topMsgId: topMsgId ? (0, Utils_1.getMessageId)(topMsgId) : undefined,
        replyTo: await (0, uploads_1._toReplyObject)(client, replyTo, undefined),
        sendAs: sendAs ? await client.getInputEntity(sendAs) : undefined,
        effect,
        dropMediaCaptions,
        withMyScore,
        background,
        allowPaidFloodskip,
        allowPaidStars,
        videoTimestamp,
        quickReplyShortcut: (0, uploads_1._toQuickReplyShortcut)(quickReplyShortcut),
        suggestedPost
      });
      const result = await client.invoke(request);
      sent.push(...client._getResponseMessage(request, result, entity));
    }
    return sent;
  }
  async function editMessage(client, entity, { message, text, parseMode, formattingEntities, linkPreview = true, file, forceDocument, buttons, schedule, invertMedia, scheduleRepeatPeriod, quickReplyShortcutId, richMessage }) {
    if (typeof message === "number" && typeof text === "undefined" && !file && !schedule && !richMessage) {
      throw Error("You have to provide either file or text or schedule property.");
    }
    entity = await client.getInputEntity(entity);
    let id;
    let markup;
    let entities;
    let inputMedia;
    if (file) {
      const { fileHandle, media, image } = await (0, uploads_1._fileToMedia)(client, {
        file,
        forceDocument
      });
      inputMedia = media;
    }
    if (message instanceof tl_1.Api.Message) {
      id = (0, Utils_1.getMessageId)(message);
      text = message.message;
      entities = message.entities;
      if (buttons == undefined) {
        markup = message.replyMarkup;
      } else {
        markup = client.buildReplyMarkup(buttons);
      }
      if (message.media) {
        inputMedia = (0, Utils_1.getInputMedia)(message.media, { forceDocument });
      }
    } else {
      if (typeof message !== "number") {
        throw Error("editMessageParams.message must be either a number or a Api.Message type");
      }
      id = message;
      if (formattingEntities == undefined) {
        [text, entities] = await (0, messageParse_1._parseMessageText)(client, text || "", parseMode);
      } else {
        entities = formattingEntities;
      }
      markup = client.buildReplyMarkup(buttons);
    }
    const request = new tl_1.Api.messages.EditMessage({
      peer: entity,
      id,
      message: text,
      noWebpage: !linkPreview,
      entities,
      media: inputMedia,
      replyMarkup: markup,
      scheduleDate: schedule,
      scheduleRepeatPeriod,
      quickReplyShortcutId,
      richMessage,
      invertMedia
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity);
  }
  async function deleteMessages(client, entity, messageIds, { revoke = true }) {
    let ty = Helpers_1._EntityType.USER;
    if (entity) {
      entity = await client.getInputEntity(entity);
      ty = (0, Helpers_1._entityType)(entity);
    }
    const ids = [];
    for (const messageId of messageIds) {
      if (messageId instanceof tl_1.Api.Message || messageId instanceof tl_1.Api.MessageService || messageId instanceof tl_1.Api.MessageEmpty) {
        ids.push(messageId.id);
      } else if (typeof messageId === "number") {
        ids.push(messageId);
      } else {
        throw new Error(`Cannot convert ${messageId} to an integer`);
      }
    }
    const results = [];
    if (ty == Helpers_1._EntityType.CHANNEL) {
      for (const chunk of utils.chunks(ids)) {
        results.push(client.api.channels.deleteMessages({
          channel: utils.getInputChannel(entity),
          id: chunk
        }));
      }
    } else {
      for (const chunk of utils.chunks(ids)) {
        results.push(client.api.messages.deleteMessages({
          id: chunk,
          revoke
        }));
      }
    }
    return Promise.all(results);
  }
  async function pinMessage(client, entity, message, pinMessageParams) {
    return await _pin(client, entity, message, false, pinMessageParams?.notify, pinMessageParams?.pmOneSide, pinMessageParams);
  }
  async function unpinMessage(client, entity, message, unpinMessageParams) {
    return await _pin(client, entity, message, true, unpinMessageParams?.notify, unpinMessageParams?.pmOneSide, unpinMessageParams);
  }
  async function _pin(client, entity, message, unpin, notify = false, pmOneSide = false, params) {
    message = utils.getMessageId(message) || 0;
    if (message === 0) {
      return await client.api.messages.unpinAllMessages({
        peer: entity,
        topMsgId: params?.topMsgId,
        savedPeerId: params?.savedPeerId ? await client.getInputEntity(params.savedPeerId) : undefined
      });
    }
    entity = await client.getInputEntity(entity);
    const request = new tl_1.Api.messages.UpdatePinnedMessage({
      silent: !notify,
      unpin,
      pmOneside: pmOneSide,
      peer: entity,
      id: message
    });
    const result = await client.invoke(request);
    if (unpin || !("updates" in result) || "updates" in result && !result.updates) {
      return;
    }
    return client._getResponseMessage(request, result, entity);
  }
  async function markAsRead(client, entity, message, markAsReadParams) {
    let maxId = markAsReadParams?.maxId || 0;
    const maxIdIsUndefined = markAsReadParams?.maxId === undefined;
    if (maxIdIsUndefined) {
      if (message) {
        if (Array.isArray(message)) {
          maxId = Math.max(...message.map((v) => utils.getMessageId(v)));
        } else {
          maxId = utils.getMessageId(message);
        }
      }
    }
    entity = await client.getInputEntity(entity);
    if (markAsReadParams && markAsReadParams.clearMentions) {
      await client.invoke(new tl_1.Api.messages.ReadMentions({
        peer: entity,
        topMsgId: markAsReadParams.topMsgId
      }));
      if (maxIdIsUndefined && message === undefined) {
        return true;
      }
    }
    if ((0, Helpers_1._entityType)(entity) === Helpers_1._EntityType.CHANNEL) {
      return await client.api.channels.readHistory({
        channel: utils.getInputChannel(entity),
        maxId
      });
    } else {
      await client.api.messages.readHistory({ peer: entity, maxId });
      return true;
    }
  }
  async function getCommentData(client, entity, message) {
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const result = await client.api.messages.getDiscussionMessage({
      peer: entity,
      msgId
    });
    const relevantMessage = result.messages.reduce((p, c) => p && p.id < c.id ? p : c);
    let chat;
    for (const c of result.chats) {
      if (relevantMessage.peerId instanceof tl_1.Api.PeerChannel && c.id.eq(relevantMessage.peerId.channelId)) {
        chat = c;
        break;
      }
    }
    return {
      entity: utils.getInputPeer(chat),
      replyTo: relevantMessage.id
    };
  }
  async function sendReaction(client, entity, messageId, reaction, big, addToRecent) {
    return client.invoke(new tl_1.Api.messages.SendReaction({
      peer: entity,
      msgId: messageId,
      reaction: reaction || [],
      big,
      addToRecent
    }));
  }
  async function getReactionUsers(client, entity, messageId, params) {
    const { reaction, limit = 100, offset = "" } = params || {};
    return client.invoke(new tl_1.Api.messages.GetMessageReactionsList({
      peer: entity,
      id: messageId,
      limit,
      offset,
      reaction: typeof reaction === "string" ? new tl_1.Api.ReactionEmoji({ emoticon: reaction }) : reaction
    }));
  }
  async function _pollText(client, text, parseMode) {
    const [parsed, entities] = await (0, messageParse_1._parseMessageText)(client, text, parseMode);
    return new tl_1.Api.TextWithEntities({ text: parsed, entities });
  }
  async function sendPoll(client, entity, poll, params = {}) {
    let solution;
    let solutionEntities = poll.solutionEntities;
    if (poll.solution != null) {
      if (solutionEntities == undefined) {
        [solution, solutionEntities] = await (0, messageParse_1._parseMessageText)(client, poll.solution, poll.parseMode);
      } else {
        solution = poll.solution;
      }
    }
    const correctAnswers = poll.correctAnswers == undefined ? undefined : Array.isArray(poll.correctAnswers) ? poll.correctAnswers : [poll.correctAnswers];
    const media = new tl_1.Api.InputMediaPoll({
      poll: new tl_1.Api.Poll({
        id: big_integer_1.default.zero,
        question: await _pollText(client, poll.question, poll.parseMode),
        answers: await Promise.all(poll.answers.map(async (answer) => {
          const item = typeof answer === "string" ? { text: answer } : answer;
          return new tl_1.Api.InputPollAnswer({
            text: await _pollText(client, item.text, poll.parseMode),
            media: item.media
          });
        })),
        multipleChoice: poll.multipleChoice,
        quiz: poll.quiz,
        publicVoters: poll.publicVoters,
        closePeriod: poll.closePeriod,
        closeDate: poll.closeDate,
        openAnswers: poll.openAnswers,
        shuffleAnswers: poll.shuffleAnswers,
        hideResultsUntilClose: poll.hideResultsUntilClose,
        revotingDisabled: poll.revotingDisabled,
        subscribersOnly: poll.subscribersOnly,
        countriesIso2: poll.countriesIso2,
        hash: big_integer_1.default.zero
      }),
      correctAnswers,
      solution,
      solutionEntities: solution != null ? solutionEntities : undefined,
      solutionMedia: poll.solutionMedia,
      attachedMedia: poll.attachedMedia
    });
    return client.sendFile(entity, { ...params, file: media });
  }
  async function _getMessagePoll(client, entity, message) {
    let msg = message instanceof tl_1.Api.Message ? message : undefined;
    if (!msg || !(msg.media instanceof tl_1.Api.MessageMediaPoll)) {
      const id = utils.getMessageId(message);
      if (id == undefined) {
        throw new Error(`Cannot convert ${message} to a message ID`);
      }
      msg = (await getMessages(client, entity, { ids: id }))[0];
    }
    if (!msg || !(msg.media instanceof tl_1.Api.MessageMediaPoll)) {
      throw new Error("The message does not contain a poll");
    }
    return msg.media.poll;
  }
  async function vote(client, entity, message, options) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const list = Array.isArray(options) ? options : [options];
    let bytes;
    if (list.every((option) => typeof option === "number")) {
      const poll = await _getMessagePoll(client, peer, message);
      bytes = list.map((index) => {
        const answer = poll.answers[index];
        if (!answer || !(answer instanceof tl_1.Api.PollAnswer)) {
          throw new Error(`Poll has no answer with index ${index}`);
        }
        return answer.option;
      });
    } else {
      bytes = list;
    }
    return client.invoke(new tl_1.Api.messages.SendVote({
      peer,
      msgId,
      options: bytes
    }));
  }
  async function closePoll(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const poll = await _getMessagePoll(client, peer, message);
    const request = new tl_1.Api.messages.EditMessage({
      peer,
      id: msgId,
      media: new tl_1.Api.InputMediaPoll({
        poll: new tl_1.Api.Poll({
          id: poll.id,
          closed: true,
          question: poll.question,
          answers: poll.answers,
          multipleChoice: poll.multipleChoice,
          quiz: poll.quiz,
          publicVoters: poll.publicVoters,
          hash: poll.hash
        })
      })
    });
    const result = await client.invoke(request);
    if ("updates" in result) {
      for (const update of result.updates) {
        if (update instanceof tl_1.Api.UpdateMessagePoll && update.poll) {
          return update.poll;
        }
      }
    }
    return _getMessagePoll(client, peer, msgId);
  }
  function _collectMessages(client, messages, users, chats) {
    const entities = new Map;
    for (const x of [...users, ...chats]) {
      entities.set(utils.getPeerId(x), x);
    }
    const out = [];
    for (const m of messages) {
      if (m instanceof tl_1.Api.MessageEmpty) {
        continue;
      }
      const msg = m;
      try {
        msg._finishInit(client, entities, undefined);
      } catch (e) {}
      msg._entities = entities;
      out.push(msg);
    }
    return out;
  }
  async function getScheduledMessages(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    const result = ids == undefined ? await client.api.messages.getScheduledHistory({
      peer,
      hash: big_integer_1.default.zero
    }) : await client.api.messages.getScheduledMessages({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
    if (!("messages" in result)) {
      return [];
    }
    return _collectMessages(client, result.messages, result.users, result.chats);
  }
  async function sendScheduledMessages(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    const result = await client.api.messages.sendScheduledMessages({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
    if (!("updates" in result)) {
      return [];
    }
    const messages = [];
    for (const update of result.updates) {
      if (update instanceof tl_1.Api.UpdateNewMessage || update instanceof tl_1.Api.UpdateNewChannelMessage || update instanceof tl_1.Api.UpdateNewScheduledMessage) {
        messages.push(update.message);
      }
    }
    return _collectMessages(client, messages, result.users, result.chats);
  }
  async function deleteScheduledMessages(client, entity, ids) {
    const peer = await client.getInputEntity(entity);
    await client.api.messages.deleteScheduledMessages({
      peer,
      id: Array.isArray(ids) ? ids : [ids]
    });
  }
  async function copyMessages(client, entity, params) {
    return forwardMessages(client, entity, { ...params, dropAuthor: true });
  }
  async function saveDraft(client, entity, params = {}) {
    const peer = await client.getInputEntity(entity);
    let message = params.message || "";
    let entities = params.formattingEntities;
    if (entities == undefined && message) {
      [message, entities] = await (0, messageParse_1._parseMessageText)(client, message, params.parseMode);
    }
    const replyTo = await (0, uploads_1._toReplyObject)(client, params.replyTo, params.topMsgId, {
      quoteText: params.quoteText,
      quoteEntities: params.quoteEntities,
      quoteOffset: params.quoteOffset,
      replyToPeerId: params.replyToPeerId
    });
    return client.invoke(new tl_1.Api.messages.SaveDraft({
      peer,
      message: message.toString(),
      entities,
      noWebpage: params.linkPreview === undefined ? undefined : !params.linkPreview,
      replyTo,
      invertMedia: params.invertMedia,
      media: params.media,
      effect: params.effect,
      suggestedPost: params.suggestedPost,
      richMessage: params.richMessage
    }));
  }
  async function clearDraft(client, entity) {
    return saveDraft(client, entity, {});
  }
  async function clearAllDrafts(client) {
    return client.api.messages.clearAllDrafts({});
  }
  function _linkInt(value) {
    if (!value || !/^\d+$/.test(value)) {
      return;
    }
    const n = parseInt(value, 10);
    return isNaN(n) ? undefined : n;
  }
  function _parseMessageLink(link) {
    let raw = link.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
      raw = "https://" + raw;
    }
    let url;
    try {
      url = new URL(raw);
    } catch (e) {
      return;
    }
    const query = url.searchParams;
    if (url.protocol === "tg:") {
      const host = url.host || url.pathname.replace(/^\/+/, "");
      const post = _linkInt(query.get("post"));
      if (post == undefined) {
        return;
      }
      const common = {
        msgId: post,
        thread: _linkInt(query.get("thread")),
        comment: _linkInt(query.get("comment"))
      };
      if (host === "resolve" && query.get("domain")) {
        return { username: query.get("domain"), ...common };
      }
      if (host === "privatepost" && _linkInt(query.get("channel"))) {
        return { channelId: query.get("channel"), ...common };
      }
      return;
    }
    if (!/^(t\.me|telegram\.me|telegram\.dog)$/i.test(url.hostname)) {
      return;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "s") {
      parts.shift();
    }
    if (parts.length < 2) {
      return;
    }
    const msgId = _linkInt(parts[parts.length - 1]);
    if (msgId == undefined) {
      return;
    }
    const thread = parts.length >= 3 ? _linkInt(parts[1]) : _linkInt(query.get("thread"));
    const comment = _linkInt(query.get("comment"));
    if (parts[0] === "c") {
      const channelId = parts[1];
      if (parts.length < 3 || !/^\d+$/.test(channelId)) {
        return;
      }
      return {
        channelId,
        msgId,
        thread: parts.length >= 4 ? _linkInt(parts[2]) : thread,
        comment
      };
    }
    const username = parts[0];
    if (username.startsWith("+") || username.startsWith("joinchat")) {
      return;
    }
    return { username, msgId, thread, comment };
  }
  async function getMessageByLink(client, link) {
    const parsed = _parseMessageLink(link);
    if (!parsed) {
      throw new Error(`Cannot parse message link: ${link}`);
    }
    const peer = await client.getInputEntity(parsed.channelId != null ? "-100" + parsed.channelId : parsed.username);
    if (parsed.comment != null) {
      const discussion = await getCommentData(client, peer, parsed.msgId);
      return (await getMessages(client, discussion.entity, {
        ids: parsed.comment
      }))[0];
    }
    return (await getMessages(client, peer, { ids: parsed.msgId }))[0];
  }
  async function translateText(client, params) {
    const { toLang, tone, entity, ids, text } = params;
    if (entity == undefined !== (ids == undefined)) {
      throw new Error("translateText: entity and ids must be used together");
    }
    if (entity == undefined === (text == undefined)) {
      throw new Error("translateText: provide either entity+ids or text, not both");
    }
    return client.invoke(new tl_1.Api.messages.TranslateText({
      toLang,
      tone,
      peer: entity ? await client.getInputEntity(entity) : undefined,
      id: ids == undefined ? undefined : Array.isArray(ids) ? ids : [ids],
      text: text == undefined ? undefined : (Array.isArray(text) ? text : [text]).map((t) => new tl_1.Api.TextWithEntities({
        text: t,
        entities: []
      }))
    }));
  }
  async function getMessagesViews(client, entity, ids, increment = false) {
    const peer = await client.getInputEntity(entity);
    return client.api.messages.getMessagesViews({
      peer,
      id: Array.isArray(ids) ? ids : [ids],
      increment
    });
  }
  async function getOutboxReadDate(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    return client.api.messages.getOutboxReadDate({
      peer,
      msgId
    });
  }
  async function getMessageReadParticipants(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    return client.api.messages.getMessageReadParticipants({
      peer,
      msgId
    });
  }
  async function getRichMessage(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const result = await client.api.messages.getRichMessage({
      peer,
      id: msgId
    });
    if (!("messages" in result)) {
      return;
    }
    const collected = _collectMessages(client, result.messages, result.users, result.chats);
    return collected.find((m) => m.id === msgId) ?? collected[0];
  }
  async function getDiscussionMessage(client, entity, message) {
    const peer = await client.getInputEntity(entity);
    const msgId = utils.getMessageId(message);
    if (msgId == undefined) {
      throw new Error(`Cannot convert ${message} to a message ID`);
    }
    const result = await client.api.messages.getDiscussionMessage({
      peer,
      msgId
    });
    const collected = _collectMessages(client, result.messages, result.users, result.chats);
    if (!collected.length) {
      return;
    }
    return collected.reduce((a, b) => a.id < b.id ? a : b);
  }
});

// node_modules/teleproto/client/inviteLinks.js
var require_inviteLinks = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2._ChatInviteImportersIter = exports2._ExportedChatInvitesIter = undefined;
  exports2._parseInviteHash = _parseInviteHash;
  exports2.exportChatInvite = exportChatInvite;
  exports2.editExportedChatInvite = editExportedChatInvite;
  exports2.getExportedChatInvite = getExportedChatInvite;
  exports2.deleteExportedChatInvite = deleteExportedChatInvite;
  exports2.deleteRevokedExportedChatInvites = deleteRevokedExportedChatInvites;
  exports2.getAdminsWithInvites = getAdminsWithInvites;
  exports2.iterExportedChatInvites = iterExportedChatInvites;
  exports2.getExportedChatInvites = getExportedChatInvites;
  exports2.iterChatInviteImporters = iterChatInviteImporters;
  exports2.getChatInviteImporters = getChatInviteImporters;
  exports2.hideChatJoinRequest = hideChatJoinRequest;
  exports2.hideAllChatJoinRequests = hideAllChatJoinRequests;
  exports2.checkChatInvite = checkChatInvite;
  var requestIter_1 = require_requestIter();
  var tl_1 = require_tl();
  var _MAX_INVITES_CHUNK_SIZE = 100;
  var _MAX_IMPORTERS_CHUNK_SIZE = 100;
  function _parseInviteHash(link) {
    const trimmed = link.trim();
    const match = trimmed.match(/(?:t\.me\/|telegram\.me\/|telegram\.dog\/)?(?:joinchat\/|\+)([a-zA-Z0-9_-]+)\/?$/);
    return match ? match[1] : trimmed;
  }
