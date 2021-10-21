import { setInterval } from 'timers';
import util from 'util';

import * as constants from '@sogebot/ui-helpers/constants';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import { isNil } from 'lodash';
import tmijs from 'tmi.js';
import { getRepository } from 'typeorm';

import Core from './_interface';
import api from './api';
import { parserReply } from './commons';
import type { EmitData } from './database/entity/alert';
import { Price } from './database/entity/price';
import { UserBit, UserBitInterface } from './database/entity/user';
import { settings, timer } from './decorators';
import { command, default_permission } from './decorators';
import {
  getFunctionList, onChange, onLoad, onStreamStart,
} from './decorators/on';
import Expects from './expects';
import { isStreamOnline, stats } from './helpers/api';
import * as hypeTrain from './helpers/api/hypeTrain';
import {
  getOwner, getUserSender, prepare,
} from './helpers/commons';
import { sendMessage } from './helpers/commons/sendMessage';
import { dayjs } from './helpers/dayjs';
import { eventEmitter } from './helpers/events';
import {
  triggerInterfaceOnBit, triggerInterfaceOnMessage, triggerInterfaceOnSub,
} from './helpers/interface/triggers';
import { isDebugEnabled, warning } from './helpers/log';
import {
  chatIn, cheer, debug, error, host, info, raid, resub, sub, subcommunitygift, subgift, whisperIn,
} from './helpers/log';
import { generalChannel } from './helpers/oauth/generalChannel';
import { linesParsedIncrement, setStatus } from './helpers/parser';
import { defaultPermissions } from './helpers/permissions';
import {
  globalIgnoreListExclude, ignorelist, sendWithMe, setMuteStatus, showWithAt, tmiEmitter,
} from './helpers/tmi';
import { isOwner } from './helpers/user';
import * as changelog from './helpers/user/changelog.js';
import { isBotId } from './helpers/user/isBot';
import { isIgnored } from './helpers/user/isIgnored';
import { getUserFromTwitch } from './microservices/getUserFromTwitch';
import oauth from './oauth';
import eventlist from './overlays/eventlist';
import { Parser } from './parser';
import alerts from './registries/alerts';
import alias from './systems/alias';
import customcommands from './systems/customcommands';
import { translate } from './translate';
import users from './users';
import joinpart from './widgets/joinpart';

const commandRegexp = new RegExp(/^!\w+$/);

const userHaveSubscriberBadges = (badges: Readonly<UserStateTags['badges']>) => {
  return typeof badges.subscriber !== 'undefined' || typeof badges.founder !== 'undefined';
};

const subCumulativeMonths = function(senderObj: tmijs.ChatUserstate) {
  const badgeInfo = senderObj['badge-info'];
  if (badgeInfo?.subscriber) {
    return Number(badgeInfo.subscriber);
  }
  return undefined; // undefined will not change any values
};

let intervalBroadcaster: NodeJS.Timeout;
let intervalBot: NodeJS.Timeout;
let intervalBroadcasterPONG = Date.now();
let intervalBotPONG = Date.now();

class TMI extends Core {
  shouldConnect = false;

  @settings('chat')
  sendWithMe = false;

  @settings('chat')
  sendAsReply = true;

  @settings('chat')
  ignorelist: any[] = [];

  @settings('chat')
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
    bot: tmijs.Client | null;
    broadcaster: tmijs.Client | null;
  } = {
    bot:         null,
    broadcaster: null,
  };
  broadcasterWarning = false;
  botWarning = false;

  ignoreGiftsFromUser = new Map<string, number>();

  constructor() {
    super();
    this.emitter();
  }

  emitter() {
    if (!tmiEmitter) {
      setTimeout(() => this.emitter(), 10);
      return;
    }
    tmiEmitter.on('reconnect', (type) => {
      this.reconnect(type);
    });
    tmiEmitter.on('part', (type) => {
      this.part(type);
    });
  }

  @onChange('showWithAt')
  @onLoad('showWithAt')
  setShowWithAt() {
    showWithAt.value = this.showWithAt;
  }

  @onChange('sendWithMe')
  @onLoad('sendWithMe')
  setSendWithMe() {
    sendWithMe.value = this.sendWithMe;
  }

  @onChange('ignorelist')
  @onLoad('ignorelist')
  setIgnoreList() {
    ignorelist.value = this.ignorelist;
  }

  @onChange('globalIgnoreListExclude')
  @onLoad('globalIgnoreListExclude')
  setGlobalIgnoreListExclude() {
    globalIgnoreListExclude.value = this.globalIgnoreListExclude;
  }

  @onChange('mute')
  @onLoad('mute')
  setMuteStatus() {
    setMuteStatus(this.mute);
  }

  @command('!ignore add')
  @default_permission(defaultPermissions.CASTERS)
  async ignoreAdd (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      this.ignorelist = [
        ...new Set([
          ...this.ignorelist,
          username,
        ],
        )];
      // update ignore list

      return [{ response: prepare('ignore.user.is.added', { username }), ...opts }];
    } catch (e: any) {
      error(e.stack);
    }
    return [];
  }

  @command('!ignore remove')
  @default_permission(defaultPermissions.CASTERS)
  async ignoreRm (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      this.ignorelist = this.ignorelist.filter(o => o !== username);
      // update ignore list
      return [{ response: prepare('ignore.user.is.removed', { username }), ...opts }];
    } catch (e: any) {
      error(e.stack);
    }
    return [];
  }

  @command('!ignore check')
  @default_permission(defaultPermissions.CASTERS)
  async ignoreCheck (opts: Record<string, any>) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase();
      const isUserIgnored = isIgnored({ username });
      return [{ response: prepare(isUserIgnored ? 'ignore.user.is.ignored' : 'ignore.user.is.not.ignored', { username }), ...opts }];
    } catch (e: any) {
      error(e.stack);
    }
    return [];
  }

  async initClient (type: 'bot' | 'broadcaster') {
    if ((global as any).mocha) {
      // do nothing if tests
      warning('initClient disabled due to mocha test run.')
      return;
    }
    clearTimeout(this.timeouts[`initClient.${type}`]);

    // wait for initial validation
    if (!oauth.initialValidation) {
      setTimeout(() => this.initClient(type), constants.SECOND);
      return;
    }

    const token = type === 'bot' ? oauth.botAccessToken : oauth.broadcasterAccessToken;
    const username = type === 'bot' ? oauth.botUsername : oauth.broadcasterUsername;
    const channel = generalChannel.value;

    try {
      if (token === '' || username === '' || channel === '') {
        throw Error(`${type} - token, username or channel expected`);
      }

      const client = this.client[type];
      if (client) {
        client.removeAllListeners();
        this.client[type] = null;
      }

      this.client[type] = new tmijs.Client({
        options: {
          debug:                 isDebugEnabled('tmi.client'),
          messagesLogLevel:      isDebugEnabled('tmi.client') ? 'debug' : 'info',
          skipUpdatingEmotesets: true,
        },
        connection: {
          reconnect: true,
          secure:    true,
          timeout:   60000,
        },
        identity: { username, password: token },
      });
      await this.client[type]?.connect();
      await this.join(type, channel);
      this.loadListeners(type);
    } catch (e: any) {
      if (type === 'broadcaster' && !this.broadcasterWarning) {
        error('Broadcaster oauth is not properly set - hosts will not be loaded');
        error('Broadcaster oauth is not properly set - subscribers will not be loaded');
        this.broadcasterWarning = true;
      } else if (!this.botWarning) {
        error('Bot oauth is not properly set');
        this.botWarning = true;
      }
      oauth.refreshAccessToken(type);
      this.timeouts[`initClient.${type}`] = setTimeout(() => this.initClient(type), 10000);
    }
  }

  @onStreamStart()
  reconnectOnStreamStart() {
    this.part('bot').then(() => this.join('bot', this.channel));
    this.part('broadcaster').then(() => this.join('broadcaster', this.channel));
  }

  /* will connect/reconnect bot and broadcaster
   * this is called from oauth when channel is changed or initialized
   */
  async reconnect (type: 'bot' | 'broadcaster') {
    try {
      if (!this.shouldConnect) {
        setTimeout(() => this.reconnect(type), 1000);
        return;
      }
      const client = this.client[type];
      if (!client) {
        throw Error('TMI: cannot reconnect, connection is not established');
      }
      const channel = generalChannel.value;

      if (type === 'bot') {
        clearInterval(intervalBot);
      } else {
        clearInterval(intervalBroadcaster);
      }

      info(`TMI: ${type} is reconnecting`);

      client.removeAllListeners();
      await client.part(this.channel);
      await client.connect();

      this.loadListeners(type);
      await this.join(type, channel);
    } catch (e: any) {
      this.initClient(type); // connect properly
    }
  }

  async join (type: 'bot' | 'broadcaster', channel: string) {
    const client = this.client[type];
    if (!client) {
      info(`TMI: ${type} oauth is not properly set, cannot join`);
    } else {
      if (channel === '') {
        info(`TMI: ${type} is not properly set, cannot join empty channel`);
        if (type ==='bot') {
          setStatus('TMI', constants.DISCONNECTED);
        }
      } else {
        await client.join(channel);
        info(`TMI: ${type} joined channel ${channel}`);
        if (type ==='bot') {
          setStatus('TMI', constants.CONNECTED);
        }
        this.channel = channel;

        if (type === 'bot') {
          intervalBotPONG = Date.now();
          if (intervalBot) {
            clearInterval(intervalBot);
          }
          intervalBot = setInterval(() => {
            if (!this.client.bot || this.channel === '') {
              return;
            }
            this.client.bot.raw('PING');

            if (Date.now() - intervalBotPONG > 10 * constants.MINUTE) {
              error(`TMI: bot PONG not returned in 10 minutes. Force reconnect.`);
              this.reconnect('bot');
            }
          }, 10000);
        } else if (type === 'broadcaster') {
          intervalBroadcasterPONG = Date.now();
          if (intervalBroadcaster) {
            clearInterval(intervalBroadcaster);
          }
          intervalBroadcaster = setInterval(() => {
            if (!this.client.broadcaster || this.channel === '') {
              return;
            }
            this.client.broadcaster.raw('PING');

            if (Date.now() - intervalBroadcasterPONG > 10 * constants.MINUTE) {
              error(`TMI: broadcaster PONG not returned in 10 minutes. Force reconnect.`);
              this.reconnect('broadcaster');
            }
          }, 10000);
        }
      }
    }
  }

  async ban (username: string, type: 'bot' | 'broadcaster' = 'bot' ): Promise<void> {
    const client = this.client[type];
    if (!client && type === 'bot') {
      return this.ban(username, 'broadcaster');
    } else if (!client) {
      error(`TMI: Cannot ban user. Bot/Broadcaster is not connected to TMI.`);
    } else {
      await client.ban(this.channel, username);
      await client.say(this.channel, `/block ${username}`);
      info(`TMI: User ${username} was banned and blocked.`);
      return;
    }
  }

  async part (type: 'bot' | 'broadcaster') {
    const client = this.client[type];
    if (!client) {
      info(`TMI: ${type} is not connected in any channel`);
    } else {
      await client.part(this.channel);
      info(`TMI: ${type} parted channel ${this.channel}`);
      if (type === 'bot') {
        clearInterval(intervalBot);
      } else if (type === 'broadcaster') {
        clearInterval(intervalBroadcaster);
      }
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
    const client = this.client[type];
    if (!client) {
      error('Cannot init listeners for TMI ' + type + 'client');
      error(new Error().stack || '');
      return;
    }
    client.removeAllListeners();

    // common for bot and broadcaster
    client.on('pong', async () => {
      if (type === 'bot') {
        intervalBotPONG = Date.now();
      } else {
        intervalBroadcasterPONG = Date.now();
      }
    });
    client.on('disconnected', async (reason) => {
      info(`TMI: ${type} is disconnected, reason: ${reason}`);
      setStatus('TMI', constants.DISCONNECTED);
      client.removeAllListeners();
      for (const event of getFunctionList('partChannel')) {
        (this as any)[event.fName]();
      }
    });
    client.on('reconnect', async () => {
      info(`TMI: ${type} is reconnecting`);
      setStatus('TMI', constants.RECONNECTING);
      this.loadListeners(type);
      for (const event of getFunctionList('reconnectChannel')) {
        (this as any)[event.fName]();
      }
    });
    client.on('connected', async () => {
      info(`TMI: ${type} is connected`);
      setStatus('TMI', constants.CONNECTED);
      this.loadListeners(type);
      for (const event of getFunctionList('joinChannel')) {
        (this as any)[event.fName]();
      }
    });

    if (type === 'bot') {
      client.on('whisper', async (from, userstate, message, self) => {
        if (isBotId(userstate['user-id']) || self) {
          return;
        }
        userstate['message-type'] = 'whisper';
        this.message({ userstate, message });
        linesParsedIncrement();
      });

      client.on('cheer', (_channel, userstate, message)  => {
        this.cheer(userstate, message);
      });

      client.on('action', (_channel, userstate, message, self) => {
        if (isBotId(userstate['user-id']) || self) {
          return;
        }
        // strip message from ACTION
        message = message.replace('\u0001ACTION ', '').replace('\u0001', '');
        this.message({ userstate, message });
        linesParsedIncrement();
        triggerInterfaceOnMessage({
          sender:    userstate,
          message,
          timestamp: Date.now(),
        });

        eventEmitter.emit('action', { username: userstate.username?.toLowerCase() ?? '', source: 'twitch' });
      });

      client.on('message', (_channel, userstate, message, self) => {
        if (isBotId(userstate['user-id']) || self) {
          return;
        }
        this.message({ userstate, message });
        linesParsedIncrement();
        triggerInterfaceOnMessage({
          sender:    userstate,
          message,
          timestamp: Date.now(),
        });
      });

      client.on('clearchat', () => {
        eventEmitter.emit('clearchat');
      });
    } else if (type === 'broadcaster') {
      client.on('hosting', (_channel, target, viewers) => {
        eventEmitter.emit('hosting', { target, viewers });
      });

      client.on('raided', (_channel, username, viewers) => {
        this.raid(username, viewers);
      });

      client.on('subscription', (_channel, username, methods, message, userstate) => {
        this.subscription(username, methods, message, userstate);
      });

      client.on('resub', (_channel, username, months, message, userstate, methods) => {
        this.resub(username, months, message, userstate, methods);
      });

      client.on('subgift', (_channel, username, streakMonths, recipient, methods, userstate)  => {
        this.subgift(username, streakMonths, recipient, methods, userstate);
      });

      client.on('submysterygift', (_channel, username, numOfSubs, methods, userstate) => {
        this.subscriptionGiftCommunity(username, numOfSubs, methods, userstate);
      });

      client.on('hosted', async (_channel, username, viewers) => {
        host(`${username}, viewers: ${viewers}`);

        const data = {
          username,
          viewers,
          event:     'host',
          timestamp: Date.now(),
        };

        eventlist.add({
          userId:    String(await users.getIdByName(username) ?? '0'),
          viewers:   viewers,
          event:     'host',
          timestamp: Date.now(),
        });
        eventEmitter.emit('hosted', data);
        alerts.trigger({
          event:      'hosts',
          name:       username,
          amount:     Number(viewers),
          tier:       null,
          currency:   '',
          monthsName: '',
          message:    '',
        });
      });
    } else {
      throw Error(`This ${type} is not supported`);
    }
  }

  @timer()
  async raid(username: string, viewers: number) {
    raid(`${username}, viewers: ${viewers}`);

    const data = {
      username:  username,
      viewers:   viewers,
      event:     'raid',
      timestamp: Date.now(),
    };

    eventlist.add({
      userId:    String(await users.getIdByName(username) ?? '0'),
      viewers:   viewers,
      event:     'raid',
      timestamp: Date.now(),
    });
    eventEmitter.emit('raid', data);
    alerts.trigger({
      event:      'raids',
      name:       username,
      amount:     viewers,
      tier:       null,
      currency:   '',
      monthsName: '',
      message:    '',
    });
  }

  @timer()
  async subscription (username: string , methods: tmijs.SubMethods, message: string, userstate: tmijs.SubUserstate) {
    try {
      const amount = Number(userstate['msg-param-cumulative-months'] ?? 1);
      const tier = (methods.prime ? 'Prime' : String(Number(methods.plan ?? 1000) / 1000)) as EmitData['tier'];

      if (isIgnored({ username, userId: userstate.userId })) {
        return;
      }

      const user = await changelog.get(userstate.userId);
      if (!user) {
        changelog.update(userstate.userId, { username });
        this.subscription(username, methods, message, userstate);
        return;
      }

      let profileImageUrl = null;
      if (user.profileImageUrl.length === 0) {
        profileImageUrl = (await getUserFromTwitch(user.username)).profile_image_url;
      }

      changelog.update(user.userId, {
        ...user,
        isSubscriber:              user.haveSubscriberLock ? user.isSubscriber : true,
        subscribedAt:              user.haveSubscribedAtLock ? user.subscribedAt : Date.now(),
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: amount,
        subscribeStreak:           0,
        profileImageUrl:           profileImageUrl ? profileImageUrl : user.profileImageUrl,
      });

      hypeTrain.addSub({
        username:        user.username,
        profileImageUrl: profileImageUrl ? profileImageUrl : user.profileImageUrl,
      });

      eventlist.add({
        event:     'sub',
        tier:      String(tier),
        userId:    String(userstate.userId),
        method:    (isNil(methods.prime) && methods.prime) ? 'Twitch Prime' : '' ,
        timestamp: Date.now(),
      });
      sub(`${username}#${userstate.userId}, tier: ${tier}`);
      eventEmitter.emit('subscription', {
        username: username, method: (isNil(methods.prime) && methods.prime) ? 'Twitch Prime' : '', subCumulativeMonths: amount, tier: String(tier),
      });
      alerts.trigger({
        event:      'subs',
        name:       username,
        amount:     0,
        tier,
        currency:   '',
        monthsName: '',
        message:    '',
      });

      triggerInterfaceOnSub({
        username:            username,
        userId:              userstate.userId,
        subCumulativeMonths: amount,
      });
    } catch (e: any) {
      error('Error parsing subscription event');
      error(util.inspect(userstate));
      error(e.stack);
    }
  }

  @timer()
  async resub (username: string, months: number, message: string, userstate: tmijs.SubUserstate, methods: tmijs.SubMethods) {
    try {
      const amount = months;
      const subStreakShareEnabled = userstate['msg-param-should-share-streak'] ?? false;
      const streakMonths = Number(userstate['msg-param-streak-months'] ?? 0);
      const tier = (methods.prime ? 'Prime' : String(Number(methods.plan ?? 1000) / 1000)) as EmitData['tier'];

      if (isIgnored({ username, userId: userstate.userId })) {
        return;
      }

      const subStreak = subStreakShareEnabled ? streakMonths : 0;

      const user = await changelog.get(userstate.userId);
      if (!user) {
        changelog.update(userstate.userId, { username });
        this.resub(username, months, message, userstate, methods);
        return;
      }

      let profileImageUrl = null;
      if (user.profileImageUrl.length === 0) {
        profileImageUrl = (await getUserFromTwitch(user.username)).profile_image_url;
      }

      changelog.update(user.userId, {
        ...user,
        isSubscriber:              true,
        subscribedAt:              Number(dayjs().subtract(streakMonths, 'month').unix()) * 1000,
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: amount,
        subscribeStreak:           subStreak,
        profileImageUrl:           profileImageUrl ? profileImageUrl : user.profileImageUrl,
      });

      hypeTrain.addSub({
        username:        user.username,
        profileImageUrl: profileImageUrl ? profileImageUrl : user.profileImageUrl,
      });

      eventlist.add({
        event:                   'resub',
        tier:                    String(tier),
        userId:                  String(userstate.userId),
        subStreakShareEnabled,
        subStreak,
        subStreakName:           getLocalizedName(subStreak, translate('core.months')),
        subCumulativeMonths:     amount,
        subCumulativeMonthsName: getLocalizedName(amount, translate('core.months')),
        message,
        timestamp:               Date.now(),
      });
      resub(`${username}#${userstate.userId}, streak share: ${subStreakShareEnabled}, streak: ${subStreak}, months: ${subCumulativeMonths}, message: ${message}, tier: ${tier}`);
      eventEmitter.emit('resub', {
        username,
        tier:                    String(tier),
        subStreakShareEnabled,
        subStreak,
        subStreakName:           getLocalizedName(subStreak, translate('core.months')),
        subCumulativeMonths:     amount,
        subCumulativeMonthsName: getLocalizedName(amount, translate('core.months')),
        message,
      });
      alerts.trigger({
        event:      'resubs',
        name:       username,
        amount:     Number(amount),
        tier,
        currency:   '',
        monthsName: getLocalizedName(amount, translate('core.months')),
        message,
      });
    } catch (e: any) {
      error('Error parsing resub event');
      error(util.inspect(userstate));
      error(e.stack);
    }
  }

  @timer()
  async subscriptionGiftCommunity (username: string, numOfSubs: number, methods: tmijs.SubMethods, userstate: tmijs.SubMysteryGiftUserstate) {
    try {
      const userId = userstate['user-id'] ?? '';
      const count = numOfSubs;

      changelog.increment(userId, { giftedSubscribes: Number(count) });

      const ignoreGifts = this.ignoreGiftsFromUser.get(username) ?? 0;
      this.ignoreGiftsFromUser.set(username, ignoreGifts + count);

      if (isIgnored({ username, userId })) {
        return;
      }

      eventlist.add({
        event:     'subcommunitygift',
        userId:    userId,
        count,
        timestamp: Date.now(),
      });
      eventEmitter.emit('subcommunitygift', { username, count });
      subcommunitygift(`${username}#${userId}, to ${count} viewers`);
      alerts.trigger({
        event:      'subcommunitygifts',
        name:       username,
        amount:     Number(count),
        tier:       null,
        currency:   '',
        monthsName: '',
        message:    '',
      });
    } catch (e: any) {
      error('Error parsing subscriptionGiftCommunity event');
      error(util.inspect(userstate));
      error(e.stack);
    }
  }

  @timer()
  async subgift (username: string, streakMonths: number, recipient: string, methods: tmijs.SubMethods, userstate: tmijs.SubGiftUserstate) {
    try {
      const userId = userstate.userId;
      const amount = streakMonths;
      const recipientId = userstate['msg-param-recipient-id'] ?? '';
      const tier = (methods.prime ? 1 : (Number(methods.plan ?? 1000) / 1000));

      const ignoreGifts = (this.ignoreGiftsFromUser.get(username) ?? 0);
      let isGiftIgnored = false;

      const user = await changelog.get(recipientId);
      if (!user) {
        changelog.update(recipientId, { userId: recipientId, username });
        this.subgift(username, streakMonths, recipient, methods, userstate);
        return;
      }

      if (ignoreGifts > 0) {
        isGiftIgnored = true;
        this.ignoreGiftsFromUser.set(username, ignoreGifts - 1);
      }

      if (!isGiftIgnored) {
        debug('tmi.subgift', `Triggered: ${username}#${userId} -> ${recipient}#${recipientId}`);
        alerts.trigger({
          event:      'subgifts',
          name:       username,
          recipient,
          amount:     amount,
          tier:       null,
          currency:   '',
          monthsName: getLocalizedName(amount, translate('core.months')),
          message:    '',
        });
        eventEmitter.emit('subgift', {
          username: username, recipient: recipient, tier,
        });
        triggerInterfaceOnSub({
          username:            recipient,
          userId:              recipientId,
          subCumulativeMonths: 0,
        });
      } else {
        debug('tmi.subgift', `Ignored: ${username}#${userId} -> ${recipient}#${recipientId}`);
      }
      if (isIgnored({ username, userId: recipientId })) {
        return;
      }

      changelog.update(user.userId, {
        ...user,
        isSubscriber:              true,
        subscribedAt:              Date.now(),
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: amount,
        subscribeStreak:           user.subscribeStreak + 1,
      });

      eventlist.add({
        event:      'subgift',
        userId:     recipientId,
        fromId:     userId,
        monthsName: getLocalizedName(amount, translate('core.months')),
        months:     amount,
        timestamp:  Date.now(),
      });
      subgift(`${recipient}#${recipientId}, from: ${username}#${userId}, months: ${amount}`);

      // also set subgift count to gifter
      if (!(isIgnored({ username, userId })) && !isGiftIgnored) {
        changelog.increment(userId, { giftedSubscribes: 1 });
      }
    } catch (e: any) {
      error('Error parsing subgift event');
      error(util.inspect(userstate));
      error(e.stack);
    }
  }

  @timer()
  async cheer (userstate: tmijs.ChatUserstate, message: string): Promise<void> {
    try {
      const username = userstate.username;
      const userId = userstate['user-id'];
      const bits = Number(userstate.bits ?? 0);

      // remove <string>X or <string>X from message, but exclude from remove #<string>X or !someCommand2
      const messageFromUser = message.replace(/(?<![#!])(\b\w+[\d]+\b)/g, '').trim();
      if (!username || !userId || isIgnored({ username, userId })) {
        return;
      }

      const user = await changelog.get(userId);
      if (!user) {
        // if we still doesn't have user, we create new
        changelog.update(userId, { username });
        return this.cheer(userstate, message);
      }

      eventlist.add({
        event:     'cheer',
        userId:    userId,
        bits,
        message:   messageFromUser,
        timestamp: Date.now(),
      });
      cheer(`${username}#${userId}, bits: ${bits}, message: ${messageFromUser}`);

      const newBits: UserBitInterface = {
        amount:    bits,
        cheeredAt: Date.now(),
        message:   messageFromUser,
        userId:    String(userId),
      };
      getRepository(UserBit).save(newBits);

      eventEmitter.emit('cheer', {
        username, bits: bits, message: messageFromUser,
      });

      if (isStreamOnline.value) {
        stats.value.currentBits = stats.value.currentBits + bits;
      }

      triggerInterfaceOnBit({
        username:  username,
        amount:    bits,
        message:   messageFromUser,
        timestamp: Date.now(),
      });

      let redeemTriggered = false;
      if (messageFromUser.trim().startsWith('!')) {
        try {
          const price = await getRepository(Price).findOneOrFail({ where: { command: messageFromUser.trim().toLowerCase(), enabled: true } });
          if (price.priceBits <= bits) {
            if (customcommands.enabled) {
              await customcommands.run({
                sender: getUserSender(userId, username), id: 'null', skip: true, quiet: false, message: messageFromUser.trim().toLowerCase(), parameters: '', parser: new Parser(),
              });
            }
            if (alias.enabled) {
              await alias.run({
                sender: getUserSender(userId, username), id: 'null', skip: true, message: messageFromUser.trim().toLowerCase(), parameters: '', parser: new Parser(),
              });
            }
            const responses = await new Parser().command(getUserSender(userId, username), messageFromUser, true);
            for (let i = 0; i < responses.length; i++) {
              await parserReply(responses[i].response, { sender: responses[i].sender, attr: responses[i].attr });
            }
            if (price.emitRedeemEvent) {
              redeemTriggered = true;
              debug('tmi.cmdredeems', messageFromUser);
              alerts.trigger({
                event:      'cmdredeems',
                recipient:  username,
                name:       price.command,
                amount:     bits,
                tier:       null,
                currency:   '',
                monthsName: '',
                message:    '',
              });
            }
          }
        } catch (e: any) {
          debug('tmi.cheer', e.stack);
        }
      }
      if (!redeemTriggered) {
        alerts.trigger({
          event:      'cheers',
          name:       username,
          amount:     bits,
          tier:       null,
          currency:   '',
          monthsName: '',
          message:    messageFromUser,
        });
      }
    } catch (e: any) {
      error('Error parsing cheer event');
      error(util.inspect(userstate));
      error(e.stack);
    }
  }

  delete (client: 'broadcaster' | 'bot', msgId: string): void {
    this.client[client]?.deletemessage(getOwner(), msgId);
  }

  @timer()
  async message (data: { skip?: boolean, quiet?: boolean, message: string, userstate: tmijs.ChatUserstate}) {
    const userstate = data.userstate;
    const message = data.message;
    const skip = data.skip ?? false;
    const quiet = data.quiet;

    if (!userstate['user-id'] && userstate.username) {
      // this can happen if we are sending commands from dashboards etc.
      userstate['user-id'] = String(await users.getIdByName(userstate.username));
    }

    if (typeof userstate.badges === 'undefined') {
      userstate.badges = {};
    }

    const parse = new Parser({
      sender: userstate, message: message, skip: skip, quiet: quiet,
    });

    if (!skip
        && userstate['message-type'] === 'whisper'
        && (this.whisperListener || isOwner(userstate))) {
      whisperIn(`${message} [${userstate.username}]`);
    } else if (!skip && !isBotId(userstate['user-id'])) {
      chatIn(`${message} [${userstate.username}]`);
    }

    if (commandRegexp.test(message)) {
      // check only if ignored if it is just simple command
      if (await isIgnored({ username: userstate.username ?? '', userId: userstate['user-id'] })) {
        return;
      }
    } else {
      // we need to moderate ignored users as well
      const [isModerated, isIgnoredCheck] = await Promise.all(
        [parse.isModerated(), isIgnored({ username: userstate.username ?? '', userId: userstate['user-id'] })],
      );
      if (isModerated || isIgnoredCheck) {
        return;
      }
    }

    if (!skip && !isNil(userstate.username)) {
      const user = await changelog.get(userstate.userId);
      if (user) {
        if (!user.isOnline) {
          joinpart.send({ users: [userstate.username], type: 'join' });
          eventEmitter.emit('user-joined-channel', { username: userstate.username });
        }
        changelog.update(user.userId, {
          ...user,
          username:                  userstate.username,
          userId:                    userstate.userId,
          isOnline:                  true,
          isVIP:                     typeof userstate.badges.vip !== 'undefined',
          isModerator:               typeof userstate.badges.moderator !== 'undefined',
          isSubscriber:              user.haveSubscriberLock ? user.isSubscriber : userHaveSubscriberBadges(userstate.badges),
          messages:                  user.messages ?? 0,
          subscribeTier:             String(userHaveSubscriberBadges(userstate.badges) ? 0 : user.subscribeTier),
          subscribeCumulativeMonths: subCumulativeMonths(userstate) || user.subscribeCumulativeMonths,
          seenAt:                    Date.now(),
        });
      } else {
        joinpart.send({ users: [userstate.username], type: 'join' });
        eventEmitter.emit('user-joined-channel', { username: userstate.username });
        changelog.update(userstate.userId, {
          username:     userstate.username,
          userId:       userstate.userId,
          isOnline:     true,
          isVIP:        typeof userstate.badges.vip !== 'undefined',
          isModerator:  typeof userstate.badges.moderator !== 'undefined',
          isSubscriber: userHaveSubscriberBadges(userstate.badges),
          seenAt:       Date.now(),
        });
      }

      api.followerUpdatePreCheck(userstate.username);

      eventEmitter.emit('keyword-send-x-times', {
        username: userstate.username, message: message, source: 'twitch',
      });
      if (message.startsWith('!')) {
        eventEmitter.emit('command-send-x-times', {
          username: userstate.username, message: message, source: 'twitch',
        });
      } else if (!message.startsWith('!')) {
        changelog.increment(userstate.userId, { messages: 1 });
      }
    }
    const responses = await parse.process();
    for (let i = 0; i < responses.length; i++) {
      await sendMessage(responses[i].response, responses[i].sender, responses[i].attr);
    }
  }
}

export default new TMI();