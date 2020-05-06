import moment from 'moment';

import TwitchJs, { HostTargetMessage, Message, PrivateMessages, UserStateTags } from 'twitch-js';

import util from 'util';
import { isNil } from 'lodash';

import Parser from './parser';
import { command, default_permission } from './decorators';
import { permission } from './helpers/permissions';
import Expects from './expects';
import Core from './_interface';
import * as constants from './constants';
import { settings, ui } from './decorators';
import { globalIgnoreList } from './data/globalIgnoreList';
import { ban, cheer, debug, error, host, info, raid, resub, sub, subcommunitygift, subgift, warning } from './helpers/log';
import { triggerInterfaceOnBit, triggerInterfaceOnMessage, triggerInterfaceOnSub } from './helpers/interface/triggers';
import { isDebugEnabled } from './helpers/log';
import { getLocalizedName, getOwner, isBot, isIgnored, isOwner, prepare, sendMessage } from './commons';
import { clusteredChatIn, clusteredWhisperIn, isMainThread, manageMessage } from './cluster';

import { getRepository } from 'typeorm';
import { User, UserBitInterface } from './database/entity/user';

import events from './events';
import api from './api';
import users from './users';
import oauth from './oauth';
import joinpart from './widgets/joinpart';
import tmi from './tmi';
import alerts from './registries/alerts';
import eventlist from './overlays/eventlist';
import { getFunctionList } from './decorators/on';
import { avgResponse, linesParsedIncrement, setStatus } from './helpers/parser';


const userHaveSubscriberBadges = (badges: Readonly<UserStateTags['badges']>) => {
  return typeof badges.subscriber !== 'undefined' || typeof badges.founder !== 'undefined';
};

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
  client: {
    bot: TwitchJs | null;
    broadcaster: TwitchJs | null;
  } = {
    bot: null,
    broadcaster: null,
  };
  lastWorker = '';
  broadcasterWarning = false;

  ignoreGiftsFromUser: { [x: string]: { count: number; time: Date }} = {};

  @command('!ignore add')
  @default_permission(permission.CASTERS)
  async ignoreAdd (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      tmi.ignorelist = [
        ...new Set([
          ...tmi.ignorelist,
          username,
        ]
        )];
      // update ignore list
      return [{ response: prepare('ignore.user.is.added', { username }), ...opts}];
    } catch (e) {
      error(e.message);
    }
    return [];
  }

  @command('!ignore remove')
  @default_permission(permission.CASTERS)
  async ignoreRm (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      tmi.ignorelist = tmi.ignorelist.filter(o => o !== username);
      // update ignore list
      return [{ response: prepare('ignore.user.is.removed', { username }), ...opts}];
    } catch (e) {
      error(e.message);
    }
    return [];
  }

  @command('!ignore check')
  @default_permission(permission.CASTERS)
  async ignoreCheck (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      const isUserIgnored = isIgnored({ username });
      return [{ response: prepare(isUserIgnored ? 'ignore.user.is.ignored' : 'ignore.user.is.not.ignored', { username }), ...opts}];
    } catch (e) {
      error(e.stack);
    }
    return [];
  }

  async initClient (type: 'bot' | 'broadcaster') {
    clearTimeout(this.timeouts[`initClient.${type}`]);
    const [token, username, channel] = await Promise.all([
      oauth[type + 'AccessToken'],
      oauth[type + 'Username'],
      oauth.generalChannel,
    ]);

    try {
      if (token === '' || username === '' || channel === '') {
        throw Error(`${type} - token, username or channel expected`);
      }
      const log = isDebugEnabled('tmi.client') ? { level: 'debug' } : { level: 'silent' };
      this.client[type] = new TwitchJs({
        token,
        username,
        log,
        onAuthenticationFailure: () => oauth.refreshAccessToken(type).then(refresh_token => refresh_token),
      });
      this.loadListeners(type);
      await (this.client[type] as TwitchJs).chat.connect();
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
  async reconnect (type: 'bot' | 'broadcaster') {
    try {
      if (typeof this.client[type] === 'undefined') {
        throw Error('TMI: cannot reconnect, connection is not established');
      }
      const [token, username, channel] = await Promise.all([
        oauth[type + 'AccessToken'],
        oauth[type + 'Username'],
        oauth.generalChannel,
      ]);

      if (this.channel !== channel) {
        info(`TMI: ${type} is reconnecting`);

        await this.client[type]?.chat.part(this.channel);
        await this.client[type]?.chat.reconnect({ token, username, onAuthenticationFailure: () => oauth.refreshAccessToken(type).then(refresh_token => refresh_token) });

        await this.join(type, channel);
      }
    } catch (e) {
      this.initClient(type); // connect properly
    }
  }

  async join (type: 'bot' | 'broadcaster', channel: string) {
    if (typeof this.client[type] === 'undefined') {
      info(`TMI: ${type} oauth is not properly set, cannot join`);
    } else {
      if (channel === '') {
        info(`TMI: ${type} is not properly set, cannot join empty channel`);
        if (type ==='bot') {
          setStatus('TMI', constants.DISCONNECTED);
        }
      } else {
        await (this.client[type] as TwitchJs).chat.join(channel);
        info(`TMI: ${type} joined channel ${channel}`);
        if (type ==='bot') {
          setStatus('TMI', constants.CONNECTED);
        }
        this.channel = channel;
      }
    }
  }

  async part (type: 'bot' | 'broadcaster') {
    if (typeof this.client[type] === 'undefined') {
      info(`TMI: ${type} is not connected in any channel`);
    } else {
      await (this.client[type] as TwitchJs).chat.part(this.channel);
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

  loadListeners (type: 'bot' | 'broadcaster') {
    (this.client[type] as TwitchJs).chat.removeAllListeners();

    // common for bot and broadcaster
    (this.client[type] as TwitchJs).chat.on('DISCONNECT', async (message) => {
      info(`TMI: ${type} is disconnected`);
      setStatus('TMI', constants.DISCONNECTED);
      for (const event of getFunctionList('partChannel')) {
        this[event.fName]();
      }
    });
    (this.client[type] as TwitchJs).chat.on('RECONNECT', async (message) => {
      info(`TMI: ${type} is reconnecting`);
      setStatus('TMI', constants.RECONNECTING);
      for (const event of getFunctionList('reconnectChannel')) {
        this[event.fName]();
      }
    });
    (this.client[type] as TwitchJs).chat.on('CONNECTED', async (message) => {
      info(`TMI: ${type} is connected`);
      setStatus('TMI', constants.CONNECTED);
      for (const event of getFunctionList('joinChannel')) {
        this[event.fName]();
      }
    });

    if (type === 'bot') {
      (this.client[type] as TwitchJs).chat.on('WHISPER', async (message) => {
        message = message as Message;
        message.tags.username = this.getUsernameFromRaw(message._raw);

        if (!isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = 'whisper';
          tmi.message({message});
          linesParsedIncrement();
        }
      });

      (this.client[type] as TwitchJs).chat.on('PRIVMSG', async (message: PrivateMessages & { tags: { username?: string | null }}) => {
        message.tags.username = this.getUsernameFromRaw(message._raw) || message.tags.displayName;

        if (!isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = message.message.startsWith('\u0001ACTION') ? 'action' : 'say'; // backward compatibility for /me moderation

          if (message.event === 'CHEER') {
            this.cheer(message);
          } else {
            // strip message from ACTION
            message.message = message.message.replace('\u0001ACTION ', '').replace('\u0001', '');
            tmi.message({message});
            linesParsedIncrement();
            triggerInterfaceOnMessage({
              sender: message.tags,
              message: message.message,
              timestamp: Date.now(),
            });

            if (message.tags['message-type'] === 'action') {
              events.fire('action', { username: message.tags.username?.toLowerCase() });
            }
          }
        } else {
          setStatus('MOD', typeof (message.tags as UserStateTags).badges.moderator !== 'undefined');
        }
      });

      (this.client[type] as TwitchJs).chat.on('CLEARCHAT', message => {
        if (message.event === 'USER_BANNED') {
          const duration = message.tags.banDuration;
          const reason = message.tags.banReason;
          const username = message.username.toLowerCase();

          if (typeof duration === 'undefined') {
            ban(`${username}`);
            events.fire('ban', { username: username });
          } else {
            events.fire('timeout', { username, reason, duration });
          }
        } else {
          events.fire('clearchat', {});
        }
      });

      (this.client[type] as TwitchJs).chat.on('HOSTTARGET', message => {
        if (message.event === 'HOST_ON') {
          if (typeof message.numberOfViewers !== 'undefined') { // may occur on restart bot when hosting
            events.fire('hosting', { target: message.username, viewers: message.numberOfViewers });
          }
        }
      });

      (this.client[type] as TwitchJs).chat.on('USERNOTICE', message => {
        this.usernotice(message);
      });

      (this.client[type] as TwitchJs).chat.on('NOTICE', message => {
        info(message.message);
      });
    } else if (type === 'broadcaster') {
      (this.client[type] as TwitchJs).chat.on('PRIVMSG/HOSTED', async (message) => {
        message = message as HostTargetMessage;
        // Someone is hosting the channel and the message contains how many viewers..
        const username = message.message.split(' ')[0].replace(':', '').toLowerCase();
        const autohost = message.message.includes('auto');
        const viewers = (message as HostTargetMessage).numberOfViewers || 0;

        host(`${username}, viewers: ${viewers}, autohost: ${autohost}`);

        const data = {
          username: username,
          viewers: viewers,
          autohost: autohost,
          event: 'host',
          timestamp: Date.now(),
        };

        eventlist.add(data);
        events.fire('hosted', data);
        alerts.trigger({
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
    debug('tmi.usernotice', message);
    if (message.event === 'RAID') {
      raid(`${message.parameters.login}, viewers: ${message.parameters.viewerCount}`);

      const data = {
        username: message.parameters.login,
        viewers: message.parameters.viewerCount,
        event: 'raid',
        timestamp: Date.now(),
      };

      eventlist.add(data);
      events.fire('raid', data);
      alerts.trigger({
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
    } else if (message.event === 'REWARDGIFT') {
      warning('REWARDGIFT event is being ignored');
    } else if (message.event === 'SUBSCRIPTION_GIFT') {
      this.subgift(message);
    } else if (message.event === 'SUBSCRIPTION_GIFT_COMMUNITY') {
      this.subscriptionGiftCommunity(message);
    } else if (message.event === 'RITUAL') {
      if (message.parameters.ritualName === 'new_chatter') {
        /*
        Workaround for https://github.com/sogehige/sogeBot/issues/2581
        TODO: update for tmi-js
        if (!users.newChattersList.includes(message.tags.login.toLowerCase())) {
          users.newChattersList.push(message.tags.login.toLowerCase())
          api.stats.newChatters += 1;
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

      const user = await getRepository(User).findOne({ userId: userstate.userId });
      if (!user) {
        await getRepository(User).save({ userId: Number(userstate.userId), username });
        this.subscription(message);
        return;
      }

      await getRepository(User).save({
        ...user,
        isSubscriber: user.haveSubscriberLock ? user.isSubscriber : true,
        subscribedAt: user.haveSubscribedAtLock ? user.subscribedAt : Date.now(),
        subscribeTier: String(tier),
        subscribeCumulativeMonths: subCumulativeMonths,
        subscribeStreak: 0,
      });

      eventlist.add({
        event: 'sub',
        tier: String(tier),
        username,
        method: (isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' ,
        timestamp: Date.now(),
      });
      sub(`${username}#${userstate.userId}, tier: ${tier}`);
      events.fire('subscription', { username: username, method: (isNil(method.prime) && method.prime) ? 'Twitch Prime' : '', subCumulativeMonths, tier });
      alerts.trigger({
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
      const messageFromUser: string = message.message ?? '';
      const tier = method.prime ? 'Prime' : String(method.plan / 1000);

      if (isIgnored({username, userId: userstate.userId})) {
        return;
      }

      const subStreak = subStreakShareEnabled ? streakMonths : 0;

      const user = await getRepository(User).findOne({ userId: userstate.userId });
      if (!user) {
        await getRepository(User).save({ userId: Number(userstate.userId), username });
        this.resub(message);
        return;
      }

      await getRepository(User).save({
        ...user,
        isSubscriber: true,
        subscribedAt:  Number(moment().subtract(streakMonths, 'months').format('X')) * 1000,
        subscribeTier: tier,
        subscribeCumulativeMonths: subCumulativeMonths,
        subscribeStreak: subStreak,
      });

      eventlist.add({
        event: 'resub',
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
      events.fire('resub', {
        username,
        tier,
        subStreakShareEnabled,
        subStreak,
        subStreakName: getLocalizedName(subStreak, 'core.months'),
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        message: messageFromUser,
      });
      alerts.trigger({
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

      await getRepository(User).increment({ userId }, 'giftedSubscribes', Number(message.parameters.senderCount));

      this.ignoreGiftsFromUser[username] = { count, time: new Date() };

      if (isIgnored({username, userId})) {
        return;
      }

      eventlist.add({
        event: 'subcommunitygift',
        username,
        count,
        timestamp: Date.now(),
      });
      events.fire('subcommunitygift', { username, count });
      subcommunitygift(`${username}#${userId}, to ${count} viewers`);
      alerts.trigger({
        event: 'subcommunitygifts',
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

      for (const [u, o] of Object.entries(this.ignoreGiftsFromUser)) {
        // $FlowFixMe Incorrect mixed type from value of Object.entries https://github.com/facebook/flow/issues/5838
        if (o.count === 0 || new Date().getTime() - new Date(o.time).getTime() >= 1000 * 60 * 10) {
          delete this.ignoreGiftsFromUser[u];
        }
      }

      if (typeof this.ignoreGiftsFromUser[username] !== 'undefined' && this.ignoreGiftsFromUser[username].count !== 0) {
        this.ignoreGiftsFromUser[username].count--;
      } else {
        events.fire('subgift', { username: username, recipient: recipient, tier });
        triggerInterfaceOnSub({
          username: recipient,
          userId: recipientId,
          subCumulativeMonths: 0,
        });
      }
      if (isIgnored({username, userId: recipientId})) {
        return;
      }

      const user = await getRepository(User).findOne({ userId: recipientId });
      if (!user) {
        await getRepository(User).save({ userId: Number(recipientId), username });
        this.subscription(message);
        return;
      }

      await getRepository(User).save({
        ...user,
        isSubscriber: true,
        subscribedAt: Date.now(),
        subscribeTier: String(tier),
        subscribeCumulativeMonths: subCumulativeMonths,
        subscribeStreak: user.subscribeStreak + 1,
      });

      eventlist.add({
        event: 'subgift',
        username: recipient,
        from: username,
        monthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        months: subCumulativeMonths,
        timestamp: Date.now(),
      });
      subgift(`${recipient}#${recipientId}, from: ${username}, months: ${subCumulativeMonths}`);
      alerts.trigger({
        event: 'subgifts',
        name: username,
        recipient,
        amount: subCumulativeMonths,
        currency: '',
        monthsName: getLocalizedName(subCumulativeMonths, 'core.months'),
        message: '',
        autohost: false,
      });

      // also set subgift count to gifter
      if (!(isIgnored({username, userId: user.userId}))) {
        await getRepository(User).increment({ userId: message.tags.userId }, 'giftedSubscribes', 1);
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
      const userId = Number(message.tags.userId);
      const userstate = message.tags;
      // remove <string>X or <string>X from message, but exclude from remove #<string>X
      const messageFromUser = message.message.replace(/(?<!#)(\b\w+[\d]+\b)/g, '').trim();

      if (isIgnored({username, userId})) {
        return;
      }

      const user = await getRepository(User).findOne({ where: { userId: userId }});
      if (!user) {
        // if we still doesn't have user, we create new
        await getRepository(User).save({ userId: Number(userstate.userId), username });
        this.cheer(message);
        return;
      }

      eventlist.add({
        event: 'cheer',
        username,
        bits: userstate.bits,
        message: messageFromUser,
        timestamp: Date.now(),
      });
      cheer(`${username}#${userId}, bits: ${userstate.bits}, message: ${messageFromUser}`);

      const newBits: UserBitInterface = {
        amount: Number(userstate.bits),
        cheeredAt: Date.now(),
        message: messageFromUser,
      };
      user.bits.push(newBits);
      getRepository(User).save(user);

      events.fire('cheer', { username, bits: userstate.bits, message: messageFromUser });
      alerts.trigger({
        event: 'cheers',
        name: username,
        amount: Number(userstate.bits),
        currency: '',
        monthsName: '',
        message: messageFromUser,
        autohost: false,
      });
      if (api.isStreamOnline) {
        api.stats.currentBits += parseInt(userstate.bits, 10);
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
    this.client[client]?.chat.say(getOwner(), '/delete ' + msgId);
  }

  async message (data, managed = false) {
    if (!managed && !global.mocha) {
      return manageMessage(data);
    }

    const sender = data.message.tags;
    const message = data.message.message;
    const skip = data.skip ?? false;
    const quiet = data.quiet;

    if (!sender.userId && sender.username) {
      // this can happen if we are sending commands from dashboards etc.
      sender.userId = await users.getIdByName(sender.username);
    }

    if (typeof sender.badges === 'undefined') {
      sender.badges = {};
    }

    const parse = new Parser({ sender: sender, message: message, skip: skip, quiet: quiet });

    if (!skip
        && sender['message-type'] === 'whisper'
        && (tmi.whisperListener || isOwner(sender))) {
      clusteredWhisperIn(`${message} [${sender.username}]`);
    } else if (!skip && !isBot(sender.username)) {
      clusteredChatIn(`${message} [${sender.username}]`);
    }

    const isModerated = await parse.isModerated();
    if (!isModerated && !isIgnored(sender)) {
      if (!skip && !isNil(sender.username)) {
        const subCumulativeMonths = function(senderObj) {
          if (typeof senderObj.badgeInfo === 'string' && senderObj.badgeInfo.includes('subscriber')) {
            const match = senderObj.badgeInfo.match(/subscriber\/(\d+)/);
            if (match) {
              return Number(match[1]);
            }
          }
          return undefined; // undefined will not change any values
        };
        const user = await getRepository(User).findOne({
          where: {
            userId: sender.userId,
          },
        });

        if (user) {
          if (!user.isOnline) {
            joinpart.send({ users: [sender.username], type: 'join' });
          }
          await getRepository(User).save({
            ...user,
            username: sender.username,
            userId: Number(sender.userId),
            isOnline: true,
            isVIP: typeof sender.badges.vip !== 'undefined',
            isModerator: typeof sender.badges.moderator !== 'undefined',
            isSubscriber: user.haveSubscriberLock ? user.isSubscriber : userHaveSubscriberBadges(sender.badges),
            messages: user.messages ?? 0,
            subscribeTier: String(userHaveSubscriberBadges(sender.badges) ? 0 : user.subscribeTier),
            subscribeCumulativeMonths: subCumulativeMonths(sender) || user.subscribeCumulativeMonths,
            seenAt: Date.now(),
          });
        } else {
          joinpart.send({ users: [sender.username], type: 'join' });
          await getRepository(User).save({
            username: sender.username,
            userId: Number(sender.userId),
            isOnline: true,
            isVIP: typeof sender.badges.vip !== 'undefined',
            isModerator: typeof sender.badges.moderator !== 'undefined',
            isSubscriber: userHaveSubscriberBadges(sender.badges),
            seenAt: Date.now(),
          });
        }

        api.followerUpdatePreCheck(sender.username);

        if (api.isStreamOnline) {
          events.fire('keyword-send-x-times', { username: sender.username, message: message });
          if (message.startsWith('!')) {
            events.fire('command-send-x-times', { username: sender.username, message: message });
          } else if (!message.startsWith('!')) {
            getRepository(User).increment({ userId: sender.userId }, 'messages', 1);
          }
        }
      }
      const responses = await parse.process();
      for (let i = 0; i < responses.length; i++) {
        setTimeout(() => {
          sendMessage(responses[i].response, responses[i].sender, responses[i].attr);
        }, 500 * i);
      }
    }

    if (isMainThread) {
      avgResponse({ value: parse.time(), message });
    } else {
      return { value: parse.time(), message };
    }
  }
}

export default new TMI();