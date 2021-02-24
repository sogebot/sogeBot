import util from 'util';

import { isNil } from 'lodash';
import TwitchJs, {
  BaseMessage, HostTargetMessage, Message, PrivateMessages, UserNoticeMessages, UserStateTags,
} from 'twitch-js';
import { getRepository } from 'typeorm';

import Core from './_interface';
import api from './api';
import * as constants from './constants';
import type { EmitData } from './database/entity/alert';
import { Price } from './database/entity/price';
import { User, UserBitInterface } from './database/entity/user';
import { settings, ui } from './decorators';
import { command, default_permission } from './decorators';
import {
  getFunctionList, onChange, onLoad,
} from './decorators/on';
import Expects from './expects';
import { isStreamOnline, stats } from './helpers/api';
import {
  getBotSender, getOwner, prepare,
} from './helpers/commons';
import { sendMessage } from './helpers/commons/sendMessage';
import { dayjs } from './helpers/dayjs';
import { eventEmitter } from './helpers/events';
import { getLocalizedName } from './helpers/getLocalized';
import {
  triggerInterfaceOnBit, triggerInterfaceOnMessage, triggerInterfaceOnSub,
} from './helpers/interface/triggers';
import { isDebugEnabled } from './helpers/log';
import {
  chatIn, cheer, debug, error, host, info, raid, resub, sub, subcommunitygift, subgift, warning, whisperIn,
} from './helpers/log';
import { generalChannel } from './helpers/oauth/generalChannel';
import {
  avgResponse, linesParsedIncrement, setStatus,
} from './helpers/parser';
import { defaultPermissions } from './helpers/permissions/';
import {
  globalIgnoreListExclude, ignorelist, sendWithMe, setMuteStatus, showWithAt, tmiEmitter,
} from './helpers/tmi/';
import { isOwner } from './helpers/user';
import { isBot } from './helpers/user/isBot';
import { isIgnored } from './helpers/user/isIgnored';
import oauth from './oauth';
import eventlist from './overlays/eventlist';
import { Parser } from './parser';
import alerts from './registries/alerts';
import customcommands from './systems/customcommands';
import { translate } from './translate';
import users from './users';
import joinpart from './widgets/joinpart';

const userHaveSubscriberBadges = (badges: Readonly<UserStateTags['badges']>) => {
  return typeof badges.subscriber !== 'undefined' || typeof badges.founder !== 'undefined';
};

class TMI extends Core {
  shouldConnect = false;

  @settings('chat')
  sendWithMe = false;

  @settings('chat')
  ignorelist: any[] = [];

  @settings('chat')
  @ui({ type: 'global-ignorelist-exclude' }, 'chat')
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
    bot:         null,
    broadcaster: null,
  };
  broadcasterWarning = false;

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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      error(e.stack);
    }
    return [];
  }

  async initClient (type: 'bot' | 'broadcaster') {
    clearTimeout(this.timeouts[`initClient.${type}`]);
    const token = type === 'bot' ? oauth.botAccessToken : oauth.broadcasterAccessToken;
    const username = type === 'bot' ? oauth.botUsername : oauth.broadcasterUsername;
    const channel = generalChannel.value;

    try {
      if (token === '' || username === '' || channel === '') {
        throw Error(`${type} - token, username or channel expected`);
      }
      const log = isDebugEnabled('tmi.client') ? { level: 'debug' } : { level: 'silent' };

      const client = this.client[type];
      if (client) {
        client.chat.removeAllListeners();
        this.client[type] = null;
      }

      this.client[type] = new TwitchJs({
        token,
        username,
        log,
        onAuthenticationFailure: () => oauth.refreshAccessToken(type).then(refresh_token => refresh_token),
      });
      await (this.client[type] as TwitchJs).chat.connect();
      await this.join(type, channel);
      this.loadListeners(type);
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
      if (!this.shouldConnect) {
        setTimeout(() => this.reconnect(type), 1000);
        return;
      }
      const client = this.client[type];
      if (!client) {
        throw Error('TMI: cannot reconnect, connection is not established');
      }
      const token = type === 'bot' ? oauth.botAccessToken : oauth.broadcasterAccessToken;
      const username = type === 'bot' ? oauth.botUsername : oauth.broadcasterUsername;
      const channel = generalChannel.value;

      info(`TMI: ${type} is reconnecting`);

      client.chat.removeAllListeners();
      await client.chat.part(this.channel);
      await client.chat.reconnect({
        token,
        username,
        onAuthenticationFailure: () => oauth.refreshAccessToken(type).then(refresh_token => refresh_token),
        connectionTimeout:       60000,
        joinTimeout:             60000,
      });

      this.loadListeners(type);
      await this.join(type, channel);
    } catch (e) {
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
        await client.chat.join(channel);
        info(`TMI: ${type} joined channel ${channel}`);
        if (type ==='bot') {
          setStatus('TMI', constants.CONNECTED);
        }
        this.channel = channel;
      }
    }
  }

  async part (type: 'bot' | 'broadcaster') {
    const client = this.client[type];
    if (!client) {
      info(`TMI: ${type} is not connected in any channel`);
    } else {
      await client.chat.part(this.channel);
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
    const client = this.client[type];
    if (!client) {
      error('Cannot init listeners for TMI ' + type + 'client');
      error(new Error().stack || '');
      return;
    }
    client.chat.removeAllListeners();

    // common for bot and broadcaster
    client.chat.on('DISCONNECT', async () => {
      info(`TMI: ${type} is disconnected`);
      setStatus('TMI', constants.DISCONNECTED);
      client.chat.removeAllListeners();
      for (const event of getFunctionList('partChannel')) {
        (this as any)[event.fName]();
      }
    });
    client.chat.on('RECONNECT', async () => {
      info(`TMI: ${type} is reconnecting`);
      setStatus('TMI', constants.RECONNECTING);
      this.loadListeners(type);
      for (const event of getFunctionList('reconnectChannel')) {
        (this as any)[event.fName]();
      }
    });
    client.chat.on('CONNECTED', async () => {
      info(`TMI: ${type} is connected`);
      setStatus('TMI', constants.CONNECTED);
      this.loadListeners(type);
      for (const event of getFunctionList('joinChannel')) {
        (this as any)[event.fName]();
      }
    });

    if (type === 'bot') {
      client.chat.on('WHISPER', async (message) => {
        message = message as Message;
        message.tags.username = this.getUsernameFromRaw(message._raw);

        if (!isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = 'whisper';
          this.message({ message });
          linesParsedIncrement();
        }
      });

      client.chat.on('PRIVMSG', async (message: PrivateMessages & { tags: { username?: string; 'message-type'?: 'action' | 'say'}}) => {
        message.tags.username = this.getUsernameFromRaw(message._raw) || message.tags.displayName;

        if (!isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = message.message.startsWith('\u0001ACTION') ? 'action' : 'say'; // backward compatibility for /me moderation

          if (message.event === 'CHEER') {
            this.cheer(message);
          } else {
            // strip message from ACTION
            message.message = message.message.replace('\u0001ACTION ', '').replace('\u0001', '');
            this.message({ message });
            linesParsedIncrement();
            triggerInterfaceOnMessage({
              sender:    message.tags,
              message:   message.message,
              timestamp: Date.now(),
            });

            if (message.tags['message-type'] === 'action') {
              eventEmitter.emit('action', { username: message.tags.username?.toLowerCase(), source: 'twitch' });
            }
          }
        } else {
          setStatus('MOD', typeof (message.tags as UserStateTags).badges.moderator !== 'undefined');
        }
      });

      client.chat.on('CLEARCHAT', message => {
        if (message.event !== 'USER_BANNED') {
          eventEmitter.emit('clearchat');
        }
      });

      client.chat.on('HOSTTARGET', message => {
        if (message.event === 'HOST_ON') {
          if (typeof message.numberOfViewers !== 'undefined') { // may occur on restart bot when hosting
            eventEmitter.emit('hosting', { target: message.username, viewers: message.numberOfViewers });
          }
        }
      });

      client.chat.on('USERNOTICE', message => {
        this.usernotice(message);
      });
    } else if (type === 'broadcaster') {
      client.chat.on('PRIVMSG/HOSTED', async (message) => {
        message = message as BaseMessage;
        // Someone is hosting the channel and the message contains how many viewers..
        const username = message.message.split(' ')[0].replace(':', '').toLowerCase();
        const viewers = (message as HostTargetMessage).numberOfViewers || 0;

        host(`${username}, viewers: ${viewers}`);

        const data = {
          username:  username,
          viewers:   viewers,
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

  async usernotice(message: UserNoticeMessages) {
    debug('tmi.usernotice', message);
    if (message.event === 'RAID') {
      raid(`${message.parameters.login}, viewers: ${message.parameters.viewerCount}`);

      const data = {
        username:  message.parameters.login,
        viewers:   message.parameters.viewerCount,
        event:     'raid',
        timestamp: Date.now(),
      };

      eventlist.add({
        userId:    String(await users.getIdByName(message.parameters.login) ?? '0'),
        viewers:   message.parameters.viewerCount,
        event:     'raid',
        timestamp: Date.now(),
      });
      eventEmitter.emit('raid', data);
      alerts.trigger({
        event:      'raids',
        name:       message.parameters.login,
        amount:     Number(message.parameters.viewerCount),
        tier:       null,
        currency:   '',
        monthsName: '',
        message:    '',
      });

    } else if (message.event === 'SUBSCRIPTION') {
      this.subscription(message);
    } else if (message.event === 'RESUBSCRIPTION') {
      this.resub(message);
    } else if ((message.event as any /* REWARDGIFT is not in types */) === 'REWARDGIFT') {
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
          api.stats.value.newChatters += 1;
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
      const tier = (method.prime ? 'Prime' : String(method.plan / 1000)) as EmitData['tier'];
      const userstate = message.tags;

      if (isIgnored({ username, userId: userstate.userId })) {
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
        isSubscriber:              user.haveSubscriberLock ? user.isSubscriber : true,
        subscribedAt:              user.haveSubscribedAtLock ? user.subscribedAt : Date.now(),
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: subCumulativeMonths,
        subscribeStreak:           0,
      });

      eventlist.add({
        event:     'sub',
        tier:      String(tier),
        userId:    String(userstate.userId),
        method:    (isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' ,
        timestamp: Date.now(),
      });
      sub(`${username}#${userstate.userId}, tier: ${tier}`);
      eventEmitter.emit('subscription', {
        username: username, method: (isNil(method.prime) && method.prime) ? 'Twitch Prime' : '', subCumulativeMonths, tier: String(tier),
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
        username: username,
        userId:   userstate.userId,
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
      const streakMonths = Number(message.parameters.multimonthTenure);
      const userstate = message.tags;
      const messageFromUser: string = message.message ?? '';
      const tier = (method.prime ? 'Prime' : String(method.plan / 1000)) as EmitData['tier'];

      if (isIgnored({ username, userId: userstate.userId })) {
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
        isSubscriber:              true,
        subscribedAt:              Number(dayjs().subtract(streakMonths, 'month').unix()) * 1000,
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: subCumulativeMonths,
        subscribeStreak:           subStreak,
      });

      eventlist.add({
        event:                   'resub',
        tier:                    String(tier),
        userId:                  String(userstate.userId),
        subStreakShareEnabled,
        subStreak,
        subStreakName:           getLocalizedName(subStreak, translate('core.months')),
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths, translate('core.months')),
        message:                 messageFromUser,
        timestamp:               Date.now(),
      });
      resub(`${username}#${userstate.userId}, streak share: ${subStreakShareEnabled}, streak: ${subStreak}, months: ${subCumulativeMonths}, message: ${messageFromUser}, tier: ${tier}`);
      eventEmitter.emit('resub', {
        username,
        tier:                    String(tier),
        subStreakShareEnabled,
        subStreak,
        subStreakName:           getLocalizedName(subStreak, translate('core.months')),
        subCumulativeMonths,
        subCumulativeMonthsName: getLocalizedName(subCumulativeMonths, translate('core.months')),
        message:                 messageFromUser,
      });
      alerts.trigger({
        event:      'resubs',
        name:       username,
        amount:     Number(subCumulativeMonths),
        tier,
        currency:   '',
        monthsName: getLocalizedName(subCumulativeMonths, translate('core.months')),
        message:    messageFromUser,
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

      await getRepository(User).increment({ userId }, 'giftedSubscribes', Number(count));

      const ignoreGifts = this.ignoreGiftsFromUser.get(username) ?? 0;
      this.ignoreGiftsFromUser.set(username, ignoreGifts + count);

      if (isIgnored({ username, userId })) {
        return;
      }

      eventlist.add({
        event:     'subcommunitygift',
        userId:    String(userId),
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
    } catch (e) {
      error('Error parsing subscriptionGiftCommunity event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  async subgift (message: Record<string, any>) {
    try {
      const username = message.tags.login;
      const userId = message.tags.userId;
      const subCumulativeMonths = Number(message.parameters.months);
      const recipient = message.parameters.recipientUserName.toLowerCase();
      const recipientId = message.parameters.recipientId;
      const tier = this.getMethod(message).plan / 1000;

      const ignoreGifts = (this.ignoreGiftsFromUser.get(username) ?? 0);
      let isGiftIgnored = false;

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
          amount:     subCumulativeMonths,
          tier:       null,
          currency:   '',
          monthsName: getLocalizedName(subCumulativeMonths, translate('core.months')),
          message:    '',
        });
        eventEmitter.emit('subgift', {
          username: username, recipient: recipient, tier,
        });
        triggerInterfaceOnSub({
          username:            recipient,
          userId:              Number(recipientId),
          subCumulativeMonths: 0,
        });
      } else {
        debug('tmi.subgift', `Ignored: ${username}#${userId} -> ${recipient}#${recipientId}`);
      }
      if (isIgnored({ username, userId: recipientId })) {
        return;
      }

      const user = await getRepository(User).findOne({ userId: Number(recipientId) });
      if (!user) {
        await getRepository(User).save({ userId: Number(recipientId), username });
        this.subgift(message);
        return;
      }

      await getRepository(User).save({
        ...user,
        isSubscriber:              true,
        subscribedAt:              Date.now(),
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: subCumulativeMonths,
        subscribeStreak:           user.subscribeStreak + 1,
      });

      eventlist.add({
        event:      'subgift',
        userId:     recipientId,
        fromId:     userId,
        monthsName: getLocalizedName(subCumulativeMonths, translate('core.months')),
        months:     subCumulativeMonths,
        timestamp:  Date.now(),
      });
      subgift(`${recipient}#${recipientId}, from: ${username}#${userId}, months: ${subCumulativeMonths}`);

      // also set subgift count to gifter
      if (!(isIgnored({ username, userId })) && !isGiftIgnored) {
        await getRepository(User).increment({ userId }, 'giftedSubscribes', 1);
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
      // remove <string>X or <string>X from message, but exclude from remove #<string>X or !someCommand2
      const messageFromUser = message.message.replace(/(?<![#!])(\b\w+[\d]+\b)/g, '').trim();

      if (isIgnored({ username, userId })) {
        return;
      }

      const user = await getRepository(User).findOne({ where: { userId: userId } });
      if (!user) {
        // if we still doesn't have user, we create new
        await getRepository(User).save({ userId: Number(userstate.userId), username });
        this.cheer(message);
        return;
      }

      eventlist.add({
        event:     'cheer',
        userId:    String(userId),
        bits:      userstate.bits,
        message:   messageFromUser,
        timestamp: Date.now(),
      });
      cheer(`${username}#${userId}, bits: ${userstate.bits}, message: ${messageFromUser}`);

      const newBits: UserBitInterface = {
        amount:    Number(userstate.bits),
        cheeredAt: Date.now(),
        message:   messageFromUser,
      };
      user.bits.push(newBits);
      getRepository(User).save(user);

      eventEmitter.emit('cheer', {
        username, bits: Number(userstate.bits), message: messageFromUser,
      });

      if (isStreamOnline.value) {
        stats.value.currentBits = stats.value.currentBits + parseInt(userstate.bits, 10);
      }

      triggerInterfaceOnBit({
        username:  username,
        amount:    userstate.bits,
        message:   messageFromUser,
        timestamp: Date.now(),
      });

      let redeemTriggered = false;
      if (messageFromUser.trim().startsWith('!')) {
        try {
          const price = await getRepository(Price).findOneOrFail({ where: { command: messageFromUser.trim().toLowerCase(), enabled: true } });
          if (price.priceBits <= Number(userstate.bits)) {
            if (customcommands.enabled) {
              await customcommands.run({
                sender: getBotSender(), id: 'null', skip: false, quiet: false, message: messageFromUser.trim().toLowerCase(), parameters: '',
              });
            }
            new Parser().command(null, messageFromUser, true);
            if (price.emitRedeemEvent) {
              redeemTriggered = true;
              debug('tmi.cmdredeems', messageFromUser);
              alerts.trigger({
                event:      'cmdredeems',
                recipient:  username,
                name:       price.command,
                amount:     Number(userstate.bits),
                tier:       null,
                currency:   '',
                monthsName: '',
                message:    '',
              });
            }
          }
        } catch (e) {
          debug('tmi.cheer', e.stack);
        }
      }
      if (!redeemTriggered) {
        alerts.trigger({
          event:      'cheers',
          name:       username,
          amount:     Number(userstate.bits),
          tier:       null,
          currency:   '',
          monthsName: '',
          message:    messageFromUser,
        });
      }
    } catch (e) {
      error('Error parsing cheer event');
      error(util.inspect(message));
      error(e.stack);
    }
  }

  getMethod (message: Record<string, any>) {
    return {
      plan:  message.parameters.subPlan === 'Prime' ? 1000 : message.parameters.subPlan,
      prime: message.parameters.subPlan === 'Prime' ? 'Prime' : false,
    };
  }

  delete (client: 'broadcaster' | 'bot', msgId: string): void {
    this.client[client]?.chat.say(getOwner(), '/delete ' + msgId);
  }

  async message (data: { skip?: boolean, quiet?: boolean, message: Pick<Message, 'message' | 'tags'>}) {
    // ignore if it is part of custom reward // we have it laready logged in redeem log
    if (data.message.tags.customRewardId) {
      return;
    }

    const sender = data.message.tags as UserStateTagsWithId;
    const message = data.message.message;
    const skip = data.skip ?? false;
    const quiet = data.quiet;

    if (!sender.userId && sender.username) {
      // this can happen if we are sending commands from dashboards etc.
      sender.userId = String(await users.getIdByName(sender.username));
    }

    if (typeof sender.badges === 'undefined') {
      sender.badges = {};
    }

    const parse = new Parser({
      sender: sender, message: message, skip: skip, quiet: quiet,
    });

    if (!skip
        && sender['message-type'] === 'whisper'
        && (this.whisperListener || isOwner(sender))) {
      whisperIn(`${message} [${sender.username}]`);
    } else if (!skip && !isBot(sender.username)) {
      chatIn(`${message} [${sender.username}]`);
    }

    const isModerated = await parse.isModerated();
    if (!isModerated && !isIgnored(sender)) {
      if (!skip && !isNil(sender.username)) {
        const subCumulativeMonths = function(senderObj: UserStateTags) {
          if (typeof senderObj.badgeInfo === 'string' && senderObj.badgeInfo.includes('subscriber')) {
            const match = senderObj.badgeInfo.match(/subscriber\/(\d+)/);
            if (match) {
              return Number(match[1]);
            }
          }
          return undefined; // undefined will not change any values
        };
        const user = await getRepository(User).findOne({ where: { userId: sender.userId } });

        if (user) {
          if (!user.isOnline) {
            joinpart.send({ users: [sender.username], type: 'join' });
            eventEmitter.emit('user-joined-channel', { username: sender.username });
          }
          await getRepository(User).save({
            ...user,
            username:                  sender.username,
            userId:                    Number(sender.userId),
            isOnline:                  true,
            isVIP:                     typeof sender.badges.vip !== 'undefined',
            isModerator:               typeof sender.badges.moderator !== 'undefined',
            isSubscriber:              user.haveSubscriberLock ? user.isSubscriber : userHaveSubscriberBadges(sender.badges),
            messages:                  user.messages ?? 0,
            subscribeTier:             String(userHaveSubscriberBadges(sender.badges) ? 0 : user.subscribeTier),
            subscribeCumulativeMonths: subCumulativeMonths(sender) || user.subscribeCumulativeMonths,
            seenAt:                    Date.now(),
          });
        } else {
          joinpart.send({ users: [sender.username], type: 'join' });
          eventEmitter.emit('user-joined-channel', { username: sender.username });
          await getRepository(User).save({
            username:     sender.username,
            userId:       Number(sender.userId),
            isOnline:     true,
            isVIP:        typeof sender.badges.vip !== 'undefined',
            isModerator:  typeof sender.badges.moderator !== 'undefined',
            isSubscriber: userHaveSubscriberBadges(sender.badges),
            seenAt:       Date.now(),
          });
        }

        api.followerUpdatePreCheck(sender.username);

        eventEmitter.emit('keyword-send-x-times', {
          username: sender.username, message: message, source: 'twitch',
        });
        if (message.startsWith('!')) {
          eventEmitter.emit('command-send-x-times', {
            username: sender.username, message: message, source: 'twitch',
          });
        } else if (!message.startsWith('!')) {
          getRepository(User).increment({ userId: Number(sender.userId) }, 'messages', 1);
        }
      }
      const responses = await parse.process();
      for (let i = 0; i < responses.length; i++) {
        setTimeout(() => {
          sendMessage(responses[i].response, responses[i].sender, responses[i].attr);
        }, 500 * i);
      }
    }

    avgResponse({ value: parse.time(), message });
  }
}

export default new TMI();