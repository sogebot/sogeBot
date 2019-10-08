import moment from 'moment';

import { isMainThread }  from 'worker_threads';
import TwitchJs from 'twitch-js';
import util from 'util';
import { get, isNil, set } from 'lodash';

import * as Parser from './parser';
import { command, default_permission } from './decorators';
import { permission } from './permissions';
import * as Expects from './expects';
import Core from './_interface';
import * as constants from './constants';
import { settings, ui } from './decorators';
import { globalIgnoreList } from './data/globalIgnoreList';
import { ban, chatIn, cheer, error, host, info, raid, resub, sub, subcommunitygift, subgift, warning, whisperIn } from './helpers/log';
import { triggerInterfaceOnBit, triggerInterfaceOnMessage, triggerInterfaceOnSub } from './helpers/interface/triggers';
import { isDebugEnabled } from './helpers/log';
import { getLocalizedName, getOwner, isBot, isIgnored, isOwner, prepare, sendMessage } from './commons';

class TMI extends Core {
  @settings('chat')
  sendWithMe = false;

  @settings('chat')
  ignorelist: any[] = [];

  @settings('chat')
  @ui({ type: 'global-ignorelist-exclude', values: globalIgnoreList }, 'chat')
  globalIgnoreListExclude: any[] = [];

  @settings('chat')
  showWithAt = true;

  @settings('chat')
  mute = false;

  @settings('chat')
  whisperListener = false;

  channel = '';
  timeouts: Record<string, any> = {};
  client: Record<string, any> = {};
  lastWorker = '';
  broadcasterWarning = false;

  ignoreGiftsFromUser: { [x: string]: { count: number; time: Date }} = {};

  constructor () {
    super();

    if (isMainThread) {
      global.status.TMI = constants.DISCONNECTED;
    }
  }

  @command('!ignore add')
  @default_permission(permission.CASTERS)
  async ignoreAdd (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      global.tmi.ignorelist = [
        ...new Set([
          ...global.tmi.ignorelist,
          username,
        ]
        )];
      // update ignore list
      sendMessage(prepare('ignore.user.is.added', { username }), opts.sender);
    } catch (e) {
      error(e.message);
    }
  }

  @command('!ignore remove')
  @default_permission(permission.CASTERS)
  async ignoreRm (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      global.tmi.ignorelist = global.tmi.ignorelist.filter(o => o !== username);
      // update ignore list
      sendMessage(prepare('ignore.user.is.removed', { username }), opts.sender);
    } catch (e) {
      error(e.message);
    }
  }

  @command('!ignore check')
  @default_permission(permission.CASTERS)
  async ignoreCheck (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      const isUserIgnored = isIgnored({ username });
      sendMessage(prepare(isUserIgnored ? 'ignore.user.is.ignored' : 'ignore.user.is.not.ignored', { username }), opts.sender);
      return isUserIgnored;
    } catch (e) {}
  }

  async initClient (type: string) {
    clearTimeout(this.timeouts[`initClient.${type}`]);
    const [token, username, channel] = await Promise.all([
      global.oauth[type + 'AccessToken'],
      global.oauth[type + 'Username'],
      global.oauth.generalChannel,
    ]);

    try {
      if (token === '' || username === '' || channel === '') {
        throw Error(`${type} - token, username or channel expected`);
      }
      const log = isDebugEnabled('tmi.client') ? null : { level: 0 };
      this.client[type] = new TwitchJs({
        token,
        username,
        log,
        onAuthenticationFailure: () => global.oauth.refreshAccessToken(type).then(token => token),
      });
      this.loadListeners(type);
      await this.client[type].chat.connect();
      await this.join(type, channel);
    } catch (e) {
      if (type === 'broadcaster' && !this.broadcasterWarning) {
        error('Broadcaster oauth is not properly set - hosts will not be loaded');
        error('Broadcaster oauth is not properly set - subscribers will not be loaded');
        this.broadcasterWarning = true;
      }
      this.timeouts[`initClient.${type}`] = setTimeout(() => this.initClient(type), 10000);
    }
  }

  /* will connect/reconnect bot and broadcaster
   * this is called from oauth when channel is changed or initialized
   */
  async reconnect (type: string) {
    try {
      if (typeof this.client[type] === 'undefined') {
        throw Error('TMI: cannot reconnect, connection is not established');
      }
      const [token, username, channel] = await Promise.all([
        global.oauth[type + 'AccessToken'],
        global.oauth[type + 'Username'],
        global.oauth.generalChannel,
      ]);

      if (this.channel !== channel) {
        info(`TMI: ${type} is reconnecting`);

        await this.client[type].chat.part(this.channel);
        await this.client[type].chat.reconnect({ token, username, onAuthenticationFailure: () => global.oauth.refreshAccessToken(type).then(token => token) });

        await this.join(type, channel);
      }
    } catch (e) {
      this.initClient(type); // connect properly
    }
  }

  async join (type: string, channel: string) {
    if (typeof this.client[type] === 'undefined') {
      info(`TMI: ${type} oauth is not properly set, cannot join`);
    } else {
      if (channel === '') {
        info(`TMI: ${type} is not properly set, cannot join empty channel`);
      } else {
        await this.client[type].chat.join(channel);
        info(`TMI: ${type} joined channel ${channel}`);
        this.channel = channel;
      }
    }
  }

  async part (type: string) {
    if (typeof this.client[type] === 'undefined') {
      info(`TMI: ${type} is not connected in any channel`);
    } else {
      await this.client[type].chat.part(this.channel);
      info(`TMI: ${type} parted channel ${this.channel}`);
    }
  }

  getUsernameFromRaw (raw: string) {
    const match = raw.match(/@([a-z_0-9]*).tmi.twitch.tv/);
    if (match) {
      return match[1];
    } else {
      return null;
    }
  }

  loadListeners (type: string) {
    // common for bot and broadcaster
    this.client[type].chat.on('DISCONNECT', async (message) => {
      info(`TMI: ${type} is disconnected`);
      global.status.TMI = constants.DISCONNECTED;
      // go through all systems and trigger on.partChannel
      for (const [/* type */, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations,
      })) {
        for (const [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') {
            continue;
          }
          if (Array.isArray(system.on.partChannel)) {
            for (const fnc of system.on.partChannel) {
              system[fnc]();
            }
          }
        }
      }
    });
    this.client[type].chat.on('RECONNECT', async (message) => {
      info(`TMI: ${type} is reconnecting`);
      global.status.TMI = constants.RECONNECTING;
      // go through all systems and trigger on.reconnectChannel
      for (const [/* type */, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations,
      })) {
        for (const [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') {
            continue;
          }
          if (Array.isArray(system.on.reconnectChannel)) {
            for (const fnc of system.on.reconnectChannel) {
              system[fnc]();
            }
          }
        }
      }
    });
    this.client[type].chat.on('CONNECTED', async (message) => {
      info(`TMI: ${type} is connected`);
      global.status.TMI = constants.CONNECTED;
      // go through all systems and trigger on.joinChannel
      for (const [/* type */, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations,
      })) {
        for (const [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') {
            continue;
          }
          if (Array.isArray(system.on.joinChannel)) {
            for (const fnc of system.on.joinChannel) {
              system[fnc]();
            }
          }
        }
      }
    });

    if (type === 'bot') {
      this.client[type].chat.on('WHISPER', async (message) => {
        message.tags.username = this.getUsernameFromRaw(message._raw);

        if (!isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = 'whisper';
          global.tmi.message({message});
          global.linesParsed++;
        }
      });

      this.client[type].chat.on('PRIVMSG', async (message) => {
        message.tags.username = this.getUsernameFromRaw(message._raw);

        if (!isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = message.message.startsWith('\u0001ACTION') ? 'action' : 'say'; // backward compatibility for /me moderation

          if (message.event === 'CHEER') {
            this.cheer(message);
          } else {
            // strip message from ACTION
            message.message = message.message.replace('\u0001ACTION ', '').replace('\u0001', '');
            global.tmi.message({message});
            global.linesParsed++;
            triggerInterfaceOnMessage({
              sender: message.tags,
              message: message.message,
              timestamp: Date.now(),
            });

            if (message.tags['message-type'] === 'action') {
              global.events.fire('action', { username: message.tags.username.toLowerCase() });
            }
          }
        } else {
          global.status.MOD = typeof message.tags.badges.moderator !== 'undefined';
        }
      });

      this.client[type].chat.on('CLEARCHAT', message => {
        if (message.event === 'USER_BANNED') {
          const duration = message.tags.banDuration;
          const reason = message.tags.banReason;
          const username = message.username.toLowerCase();

          if (typeof duration === 'undefined') {
            ban(`${username}, reason: ${reason}`);
            global.events.fire('ban', { username: username, reason: reason });
          } else {
            global.events.fire('timeout', { username, reason, duration });
          }
        } else {
          global.events.fire('clearchat', {});
        }
      });

      this.client[type].chat.on('HOSTTARGET', message => {
        if (message.event === 'HOST_ON') {
          if (typeof message.numberOfViewers !== 'undefined') { // may occur on restart bot when hosting
            global.events.fire('hosting', { target: message.username, viewers: message.numberOfViewers });
            global.registries.alerts.trigger({
              event: 'hosts',
              name: message.username,
              amount: Number(message.numberOfViewers),
              currency: '',
              monthsName: '',
              message: '',
              autohost: false,
            });
          }
        }
      });

      this.client[type].chat.on('USERNOTICE', message => {
        this.usernotice(message);
      });

      this.client[type].chat.on('NOTICE', message => {
        info(message.message);
      });
    } else if (type === 'broadcaster') {
      this.client[type].chat.on('PRIVMSG/HOSTED', async (message) => {
        // Someone is hosting the channel and the message contains how many viewers..
        const username = message.message.split(' ')[0].replace(':', '').toLowerCase();
        const autohost = message.message.includes('auto');
        const viewers = message.numberOfViewers || '0';

        host(`${username}, viewers: ${viewers}, autohost: ${autohost}`);
        global.db.engine.update('cache.hosts', { username }, { username });

        const data = {
          username: username,
          viewers: viewers,
          autohost: autohost,
          type: 'host',
          timestamp: Date.now(),
        };

        global.overlays.eventlist.add(data);
        global.events.fire('hosted', data);
        global.registries.alerts.trigger({
          event: 'hosts',
          name: username,
          amount: Number(viewers),
          currency: '',
          monthsName: '',
          message: '',
          autohost,
        });
      });
    } else {
      throw Error(`This ${type} is not supported`);
    }
  }

  usernotice(message) {
    if (message.event === 'RAID') {
      raid(`${message.parameters.login}, viewers: ${message.parameters.viewerCount}`);
      global.db.engine.update('cache.raids', { username: message.parameters.login }, { username: message.parameters.login });

      const data = {
        username: message.parameters.login,
        viewers: message.parameters.viewerCount,
        type: 'raid',
        timestamp: Date.now(),
      };

      global.overlays.eventlist.add(data);
      global.events.fire('raid', data);
      global.registries.alerts.trigger({
        event: 'raids',
        name: message.parameters.login,
        amount: Number(message.parameters.viewerCount),
        currency: '',
        monthsName: '',
        message: '',
        autohost: false,
      });

    } else if (message.event === 'SUBSCRIPTION') {
      this.subscription(message);
    } else if (message.event === 'RESUBSCRIPTION') {
      this.resub(message);
    } else if (message.event === 'SUBSCRIPTION_GIFT') {
      this.subgift(message);
    } else if (message.event === 'SUBSCRIPTION_GIFT_COMMUNITY') {
      this.subscriptionGiftCommunity(message);
    } else if (message.event === 'RITUAL') {
      if (message.parameters.ritualName === 'new_chatter') {
        /*
        Workaround for https://github.com/sogehige/sogeBot/issues/2581
        TODO: update for tmi-js
        if (!global.users.newChattersList.includes(message.tags.login.toLowerCase())) {
          global.users.newChattersList.push(message.tags.login.toLowerCase())
          global.api.stats.newChatters += 1;
        }
        */
      } else {
        info('Unknown RITUAL');
      }
    } else {
      info('Unknown USERNOTICE');
      info(JSON.stringify(message));
    }
  }

  async subscription (message: Record<string, any>) {
    try {
      const username = message.tags.login;
      const subCumulativeMonths = Number(message.parameters.cumulativeMonths);
      const method = this.getMethod(message);
      const tier = method.prime ? 'Prime' : method.plan / 1000;
      const userstate = message.tags;

      if (isIgnored({username, userId: userstate.userId})) {
        return;
      }

      const user = await global.db.engine.findOne('users', { id: userstate.userId });
      let subscribedAt: undefined | number = Date.now();
      let isSubscriber: undefined | boolean = true;

      if (user.lock && user.lock.subscribed_at) {
        subscribedAt = undefined;
      }
      if (user.lock && user.lock.subscriber) {
        isSubscriber = undefined;
      }

      await global.users.setById(userstate.userId, { username, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt }, stats: { subStreak: 1, subCumulativeMonths, tier } });
      global.overlays.eventlist.add({
        type: 'sub',
        tier: String(tier),
        username,
        method: (isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' ,
        timestamp: Date.now(),
      });
      sub(`${username}#${userstate.userId}, tier: ${tier}`);
      global.events.fire('subscription', { username: username, method: (isNil(method.prime) && method.prime) ? 'Twitch Prime' : '', subCumulativeMonths, tier });
      global.registries.alerts.trigger({
        event: 'subs',
        name: username,
        amount: 0,
        currency: '',
        monthsName: '',
        message: '',
        autohost: false,
      });

      triggerInterfaceOnSub({
        username: username,
        userId: userstate.userId,
        subCumulativeMonths,
      });
    } catch (e) {
      error('Error parsing subscription event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  async resub (message: Record<string, any>) {
    try {
      const username = message.tags.login;
      const method = this.getMethod(message);
      const subCumulativeMonths = Number(message.parameters.cumulativeMonths);
      const subStreakShareEnabled = Number(message.parameters.shouldShareStreak) !== 0;
      const streakMonths = Number(message.parameters.streakMonths);
      const userstate = message.tags;
      const messageFromUser = message.message;
      const tier = method.prime ? 'Prime' : method.plan / 1000;

      if (isIgnored({username, userId: userstate.userId})) {
        return;
      }

      const user = await global.db.engine.findOne('users', { id: userstate.userId });

      let subscribed_at: undefined | number = subStreakShareEnabled ? Number(moment().subtract(streakMonths, 'months').format('X')) * 1000 : undefined;
      const subStreak = subStreakShareEnabled ? streakMonths : 0;
      let isSubscriber: undefined | boolean = true;

      if (user.lock && user.lock.subscribed_at) {
        subscribed_at = undefined;
      }
      if (user.lock && user.lock.subscriber) {
        isSubscriber = undefined;
      }

      await global.users.setById(userstate.userId, { username, id: userstate.userId, is: { subscriber: isSubscriber }, time: { subscribed_at }, stats: { subStreak, subCumulativeMonths, tier } });

      global.overlays.eventlist.add({
        type: 'resub',
        tier: String(tier),
        username,
        subStreakShareEnabled,
        subStreak,
        subStreakName: getLocalizedName(subStreak, 'core.months'),
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        message: messageFromUser,
        timestamp: Date.now(),
      });
      resub(`${username}#${userstate.userId}, streak share: ${subStreakShareEnabled}, streak: ${subStreak}, months: ${subCumulativeMonths}, message: ${messageFromUser}, tier: ${tier}`);
      global.events.fire('resub', {
        username,
        tier,
        subStreakShareEnabled,
        subStreak,
        subStreakName: getLocalizedName(subStreak, 'core.months'),
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        message: messageFromUser,
      });
      global.registries.alerts.trigger({
        event: 'resubs',
        name: username,
        amount: Number(subCumulativeMonths),
        currency: '',
        monthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        message: messageFromUser,
        autohost: false,
      });
    } catch (e) {
      error('Error parsing resub event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  async subscriptionGiftCommunity (message: any) {
    try {
      const username = message.tags.login;
      const userId = message.tags.userId;
      const count = Number(message.parameters.massGiftCount);

      // save total count, userId
      await global.db.engine.update('users', { id: userId }, { username, custom: { subgiftCount: Number(message.parameters.senderCount) } });

      this.ignoreGiftsFromUser[username] = { count, time: new Date() };

      if (isIgnored({username, userId})) {
        return;
      }

      global.overlays.eventlist.add({
        type: 'subcommunitygift',
        username,
        count,
        timestamp: Date.now(),
      });
      global.events.fire('subcommunitygift', { username, count });
      subcommunitygift(`${username}#${userId}, to ${count} viewers`);
      global.registries.alerts.trigger({
        event: 'subgifts',
        name: username,
        amount: Number(count),
        currency: '',
        monthsName: '',
        message: '',
        autohost: false,
      });
    } catch (e) {
      error('Error parsing subscriptionGiftCommunity event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  async subgift (message: Record<string, any>) {
    try {
      const username = message.tags.login;
      const subCumulativeMonths = Number(message.parameters.months);
      const recipient = message.parameters.recipientUserName.toLowerCase();
      const recipientId = message.parameters.recipientId;
      const tier = this.getMethod(message).plan / 1000;


      // update recipient ID
      await global.db.engine.update('users', { id: recipientId }, { username: recipient });
      // update gifter ID
      await global.db.engine.update('users', { id: message.tags.userId }, { username });

      for (const [u, o] of Object.entries(this.ignoreGiftsFromUser)) {
        // $FlowFixMe Incorrect mixed type from value of Object.entries https://github.com/facebook/flow/issues/5838
        if (o.count === 0 || new Date().getTime() - new Date(o.time).getTime() >= 1000 * 60 * 10) {
          delete this.ignoreGiftsFromUser[u];
        }
      }

      if (typeof this.ignoreGiftsFromUser[username] !== 'undefined' && this.ignoreGiftsFromUser[username].count !== 0) {
        this.ignoreGiftsFromUser[username].count--;
      } else {
        global.events.fire('subgift', { username: username, recipient: recipient, tier });
        triggerInterfaceOnSub({
          username: recipient,
          userId: recipientId,
          subCumulativeMonths: 0,
        });
      }
      if (isIgnored({username, userId: recipientId})) {
        return;
      }

      const user = await global.db.engine.findOne('users', { id: recipientId });
      if (!user.id) {
        user.id = recipientId;
      }

      let subscribedAt: undefined | number = Date.now();
      let isSubscriber: undefined | boolean = true;

      if (user.lock && user.lock.subscribed_at) {
        subscribedAt = undefined;
      }
      if (user.lock && user.lock.subscriber) {
        isSubscriber = undefined;
      }

      await global.users.setById(user.id, { username: recipient, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt }, stats: { subCumulativeMonths, tier } });
      await global.db.engine.increment('users', { id: user.id }, { stats: { subStreak: 1 }});
      global.overlays.eventlist.add({
        type: 'subgift',
        username: recipient,
        from: username,
        monthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        months: subCumulativeMonths,
        timestamp: Date.now(),
      });
      subgift(`${recipient}#${recipientId}, from: ${username}, months: ${subCumulativeMonths}`);

      // also set subgift count to gifter
      if (!(isIgnored({username, userId: user.id}))) {
        await global.db.engine.increment('users', { id: message.tags.userId }, { custom: { subgiftCount: 1 } });
      }
    } catch (e) {
      error('Error parsing subgift event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  async cheer (message: Record<string, any>) {
    try {
      const username = message.tags.username;
      const userId = message.tags.userId;
      const userstate = message.tags;
      // remove <string>X or <string>X from message, but exclude from remove #<string>X
      const messageFromUser = message.message.replace(/(?<!#)(\b\w+[\d]+\b)/g, '').trim();

      if (isIgnored({username: userstate.username, userId: userstate.userId})) {
        return;
      }

      // update users ID
      await global.db.engine.update('users', { id: userId }, { username });

      global.overlays.eventlist.add({
        type: 'cheer',
        username,
        bits: userstate.bits,
        message: messageFromUser,
        timestamp: Date.now(),
      });
      cheer(`${username}#${userId}, bits: ${userstate.bits}, message: ${messageFromUser}`);
      global.db.engine.insert('users.bits', { id: userId, amount: Number(userstate.bits), message: messageFromUser, timestamp: Date.now() });
      global.events.fire('cheer', { username, bits: userstate.bits, message: messageFromUser });
      global.registries.alerts.trigger({
        event: 'cheers',
        name: username,
        amount: Number(userstate.bits),
        currency: '',
        monthsName: '',
        message: messageFromUser,
        autohost: false,
      });
      if (global.api.isStreamOnline) {
        global.api.stats.currentBits += parseInt(userstate.bits, 10);
      }

      triggerInterfaceOnBit({
        username: username,
        amount: userstate.bits,
        message: messageFromUser,
        timestamp: Date.now(),
      });
    } catch (e) {
      error('Error parsing cheer event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  getMethod (message: Record<string, any>) {
    return {
      plan: message.parameters.subPlan === 'Prime' ? 1000 : message.parameters.subPlan,
      prime: message.parameters.subPlan === 'Prime' ? 'Prime' : false,
    };
  }

  delete (client: 'broadcaster' | 'bot', msgId: string): void {
    if (!isMainThread) {
      global.workers.sendToMaster({
        type: 'call',
        ns: 'tmi',
        fnc: 'delete',
        args: [client, msgId],
      });
    } else {
      this.client[client].chat.say(getOwner(), '/delete ' + msgId);
    }
  }

  async message (data) {
    if (isMainThread && !global.mocha) {
      return global.workers.sendToWorker({
        type: 'call',
        ns: 'tmi',
        fnc: 'message',
        args: [data],
      });
    }

    const sender = data.message.tags;
    const message = data.message.message;
    const skip = data.skip;
    const quiet = data.quiet;

    if (!sender.userId && sender.username) {
      // this can happen if we are sending commands from dashboards etc.
      sender.userId = await global.users.getIdByName(sender.username);
    }

    if (typeof sender.badges === 'undefined') {
      sender.badges = {};
    }

    const parse = new Parser({ sender: sender, message: message, skip: skip, quiet: quiet });

    if (!skip
        && sender['message-type'] === 'whisper'
        && (global.tmi.whisperListener || isOwner(sender))) {
      whisperIn(`${message} [${sender.username}]`);
    } else if (!skip && !isBot(sender.username)) {
      chatIn(`${message} [${sender.username}]`);
    }

    const isModerated = await parse.isModerated();
    if (!isModerated && !isIgnored(sender)) {
      if (!skip && isNil(sender.username)) {
        const subCumulativeMonths = function(senderObj) {
          if (typeof senderObj.badgeInfo === 'string' && senderObj.badgeInfo.includes('subscriber')) {
            const match = senderObj.badgeInfo.match(/subscriber\/(\d+)/);
            if (match) {
              return Number(match[1]);
            }
          }
          return undefined; // undefined will not change any values
        };
        const user = await global.db.engine.findOne('users', { id: sender.userId });
        const data = {
          id: sender.userId,
          is: {
            subscriber: (user.lock && user.lock.subscriber ? undefined : typeof sender.badges.subscriber !== 'undefined'),
            moderator: typeof sender.badges.moderator !== 'undefined',
            vip: typeof sender.badges.vip !== 'undefined',
          },
          stats: {
            subCumulativeMonths: subCumulativeMonths(sender),
          },
          username: sender.username,
        };

        // mark user as online
        await global.db.engine.update('users.online', { username: sender.username }, { username: sender.username });

        if (get(sender, 'badges.subscriber', 0)) {
          set(data, 'stats.tier', 0);
        } // unset tier if sender is not subscriber

        // update user based on id not username
        await global.db.engine.update('users', { id: String(sender.userId) }, data);

        if (isMainThread) {
          global.api.isFollower(sender.username);
        } else {
          global.workers.sendToMaster({ type: 'api', fnc: 'isFollower', username: sender.username });
        }

        if (global.api.isStreamOnline) {
          global.events.fire('keyword-send-x-times', { username: sender.username, message: message });
          if (message.startsWith('!')) {
            global.events.fire('command-send-x-times', { username: sender.username, message: message });
          } else if (!message.startsWith('!')) {
            global.db.engine.increment('users.messages', { id: sender.userId }, { messages: 1 });
          }
        }
      }
      await parse.process();
    }
    this.avgResponse({ value: parse.time(), message });
  }

  avgResponse(opts) {
    if (!isMainThread) {
      return global.workers.sendToMaster({
        type: 'call',
        ns: 'tmi',
        fnc: 'avgResponse',
        args: [opts],
      });
    }
    let avgTime = 0;
    global.avgResponse.push(opts.value);
    if (opts.value > 1000) {
      warning(`Took ${opts.value}ms to process: ${opts.message}`);
    }
    if (global.avgResponse.length > 100) {
      global.avgResponse.shift();
    }
    for (const time of global.avgResponse) {
      avgTime += time;
    }
    global.status.RES = Number((avgTime / global.avgResponse.length).toFixed(0));
  }
}

export default TMI;
export { TMI };