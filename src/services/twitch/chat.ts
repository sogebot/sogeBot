import util from 'util';

import type { EmitData } from '@entity/alert.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import {
  ChatClient, ChatCommunitySubInfo, ChatSubGiftInfo, ChatSubInfo, ChatUser,
} from '@twurple/chat';
import { isNil } from 'lodash-es';

import addModerator from './calls/addModerator.js';
import banUser from './calls/banUser.js';
import deleteChatMessages from './calls/deleteChatMessages.js';
import getUserByName from './calls/getUserByName.js';
import sendWhisper from './calls/sendWhisper.js';
import { CustomAuthProvider } from './token/CustomAuthProvider.js';

import {
  getFunctionList,
} from '~/decorators/on.js';
import { timer } from '~/decorators.js';
import * as hypeTrain from '~/helpers/api/hypeTrain.js';
import { sendMessage } from '~/helpers/commons/sendMessage.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { subscription } from '~/helpers/events/subscription.js';
import {
  triggerInterfaceOnMessage, triggerInterfaceOnSub,
} from '~/helpers/interface/triggers.js';
import emitter from '~/helpers/interfaceEmitter.js';
import { warning } from '~/helpers/log.js';
import {
  chatIn, debug, error, info, resub, subcommunitygift, subgift, whisperIn,
} from '~/helpers/log.js';
import { linesParsedIncrement, setStatus } from '~/helpers/parser.js';
import { tmiEmitter } from '~/helpers/tmi/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import getNameById from '~/helpers/user/getNameById.js';
import { isOwner } from '~/helpers/user/index.js';
import { isBot, isBotId } from '~/helpers/user/isBot.js';
import { isIgnored, isIgnoredSafe } from '~/helpers/user/isIgnored.js';
import eventlist from '~/overlays/eventlist.js';
import { Parser } from '~/parser.js';
import alerts from '~/registries/alerts.js';
import { translate } from '~/translate.js';
import users from '~/users.js';
import { variables } from '~/watchers.js';
import joinpart from '~/widgets/joinpart.js';

let _connected_channel = '';

const ignoreGiftsFromUser = new Map<string, number>();
const commandRegexp = new RegExp(/^!\w+$/);
class Chat {
  authProvider: CustomAuthProvider;

  shouldConnect = false;

  timeouts: Record<string, any> = {};
  client: {
    bot: ChatClient | null;
    broadcaster: ChatClient | null;
  } = {
      bot:         null,
      broadcaster: null,
    };
  broadcasterWarning = false;
  botWarning = false;

  constructor(authProvider: CustomAuthProvider) {
    this.emitter();
    this.authProvider = authProvider;

    this.initClient('bot');
    this.initClient('broadcaster');

    setInterval(() => {
      if (this.client.bot && !this.client.bot.isConnected) {
        info(`TMI: Found bot disconnected from TMI, reconnecting.`);
        this.client.bot.reconnect();
      }
      if (this.client.broadcaster && !this.client.broadcaster.isConnected) {
        info(`TMI: Found broadcaster disconnected from TMI, reconnecting.`);
        this.client.broadcaster.reconnect();
      }
    }, constants.MINUTE);
  }

  emitter() {
    if (!tmiEmitter) {
      setTimeout(() => this.emitter(), 10);
      return;
    }

    tmiEmitter.on('timeout', async (username, duration, is, reason) => {
      debug('emitter.timeout', JSON.stringify({ username, duration, is, reason }));
      const userId = await users.getIdByName(username);

      banUser(userId, reason ?? '', duration);

      if (is.mod) {
        info(`Bot will set mod status for ${username} after ${duration} seconds.`);
        setTimeout(() => {
          // we need to remod user
          addModerator(userId);
        }, (duration * 1000) + 1000);
      }
    });
    tmiEmitter.on('say', async (channel, message, opts) => {
      if (typeof (global as any).it === 'function') {
        return;
      }
      debug('emitter.say', JSON.stringify({ channel, message, opts }));

      if (this.client.bot) {
        await this.client.bot.say(channel, message, opts);
      } else {
        throw new Error('Bot client is not available.');
      }
    });
    tmiEmitter.on('whisper', async (username, message) => {
      debug('emitter.whisper', JSON.stringify({ username, message }));
      const userId = await users.getIdByName(username);
      sendWhisper(userId, message);
    });
    tmiEmitter.on('join', (type) => {
      debug('emitter.join', JSON.stringify({ type }));
      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
      this.join(type, broadcasterUsername);
    });
    tmiEmitter.on('reconnect', (type) => {
      debug('emitter.reconnect', JSON.stringify({ type }));
      this.reconnect(type);
    });
    tmiEmitter.on('delete', (msgId) => {
      debug('emitter.delete', JSON.stringify({ msgId }));
      this.delete(msgId);
    });
    tmiEmitter.on('part', (type) => {
      debug('emitter.part', JSON.stringify({ type }));
      this.part(type);
    });
  }

  async initClient (type: 'bot' | 'broadcaster') {
    if (typeof (global as any).it === 'function') {
      // do nothing if tests
      warning('initClient disabled due to mocha test run.');
      return;
    }
    clearTimeout(this.timeouts[`initClient.${type}`]);

    const isValidToken = type === 'bot'
      ? variables.get(`services.twitch.botTokenValid`)
      : variables.get(`services.twitch.broadcasterTokenValid`);
    const channel = variables.get('services.twitch.broadcasterUsername') as string;

    // wait for initial validation
    if (!isValidToken || channel.length === 0) {
      this.timeouts[`initClient.${type}`] = setTimeout(() => this.initClient(type), 10 * constants.SECOND);
      return;
    }

    try {
      const client = this.client[type];
      if (client) {
        info(`TMI: ${type} quit on initClient`);
        await this.client[type]?.quit();
        client.removeListener();
        this.client[type] = null;
      }
      this.client[type] = new ChatClient({
        rejoinChannelsOnReconnect: true,
        authProvider:              this.authProvider,
        channels:                  [channel],
        isAlwaysMod:               true,
        authIntents:               [type],
        logger:                    {
          minLevel: isDebugEnabled('twitch.tmi') ? 'debug' : 'warning',
          custom:   (level, message) => {
            info(`TMI[${type}:${level}]: ${message}`);
          },
        },
      });

      this.loadListeners(type);
      await this.client[type]?.connect();
      setTimeout(() => {
        this.join(type, channel);
      }, 5 * constants.SECOND);
    } catch (e: any) {
      error(e.stack);
      if (type === 'broadcaster' && !this.broadcasterWarning) {
        error('Broadcaster oauth is not properly set - subscribers will not be loaded');
        this.broadcasterWarning = true;
      } else if (!this.botWarning) {
        error('Bot oauth is not properly set');
        this.botWarning = true;
      }
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

      const channel = variables.get('services.twitch.broadcasterUsername') as string;

      info(`TMI: ${type} is reconnecting`);

      client.removeListener();
      await client.part(channel);
      await client.connect();
      this.loadListeners(type);
      await this.join(type, channel);
    } catch (e: any) {
      this.initClient(type); // connect properly
    }
  }

  async join (type: 'bot' | 'broadcaster', channel: string) {
    _connected_channel = channel;
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
        try {
          await client.join(channel);
        } catch (e: unknown) {
          if (e instanceof Error) {
            warning('TMI: ' + e.message + ' for ' + type);
            setTimeout(() => this.initClient(type), constants.SECOND * 5);
            return;
          }
        }
        info(`TMI: ${type} joined channel ${channel}`);
        if (type ==='bot') {
          setStatus('TMI', constants.CONNECTED);
        }

        emitter.emit('set', '/services/twitch', 'broadcasterUsername', channel);
      }
    }
  }

  async part (type: 'bot' | 'broadcaster') {
    if (_connected_channel.length === 0) {
      return;
    }
    const client = this.client[type];
    if (!client) {
      info(`TMI: ${type} is not connected in any channel`);
    } else {
      await client.part(_connected_channel);
      info(`TMI: ${type} parted channel ${_connected_channel}`);
    }
  }

  loadListeners (type: 'bot' | 'broadcaster') {
    const client = this.client[type];
    if (!client) {
      error('Cannot init listeners for TMI ' + type + 'client');
      error(new Error().stack || '');
      return;
    }
    client.removeListener();

    // common for bot and broadcaster
    client.onPart((channel, user) => {
      if (isBot(user)) {
        info(`TMI: ${type} is disconnected from channel`);
        setStatus('TMI', constants.DISCONNECTED);
        for (const event of getFunctionList('partChannel')) {
          (this as any)[event.fName]();
        }
      }
    });

    client.onAuthenticationFailure(message => {
      info(`TMI: ${type} authentication failure, ${message}`);
    });

    client.irc.onDisconnect((manually, reason) => {
      setStatus('TMI', constants.DISCONNECTED);
      if (manually) {
        reason = new Error('Disconnected manually by user');
      }
      if (reason) {
        info(`TMI: ${type} is disconnected, reason: ${reason}`);
      }
    });

    client.irc.onConnect(() => {
      setStatus('TMI', constants.CONNECTED);
      info(`TMI: ${type} is connected`);
    });

    client.onJoin(async () => {
      setStatus('TMI', constants.CONNECTED);
      for (const event of getFunctionList('joinChannel')) {
        (this as any)[event.fName]();
      }
    });

    if (type === 'bot') {
      client.onWhisper((_user, message, msg) => {
        if (isBotId(msg.userInfo.userId)) {
          return;
        }
        this.message({
          userstate: msg.userInfo, message, isWhisper: true, emotesOffsets: msg.emoteOffsets, isAction: false, isHighlight: false,
        });
        linesParsedIncrement();
      });

      client.onAction((channel, user, message, msg) => {
        const userstate = msg.userInfo;
        if (isBotId(userstate.userId)) {
          return;
        }
        // strip message from ACTION
        message = message.replace('\u0001ACTION ', '').replace('\u0001', '');
        this.message({ userstate, message, id: msg.id, emotesOffsets: msg.emoteOffsets, isAction: true })
          .then(() => {
            linesParsedIncrement();
            triggerInterfaceOnMessage({
              sender:    userstate,
              message,
              timestamp: Date.now(),
            });
          });

        eventEmitter.emit('action', { userName: userstate.userName?.toLowerCase() ?? '', source: 'twitch' });
      });

      client.onMessage(async (_channel, user, message, msg) => {
        const userstate = msg.userInfo;
        if (isBotId(userstate.userId)) {
          return;
        }

        this.message({
          userstate, message,
          id:                 msg.id,
          emotesOffsets:      msg.emoteOffsets,
          isAction:           false,
          isFirstTimeMessage: msg.tags.get('first-msg') === '1',
          isHighlight:        msg.isHighlight,
        }).then(() => {
          linesParsedIncrement();
          triggerInterfaceOnMessage({
            sender:    userstate,
            message,
            timestamp: Date.now(),
          });
        });
      });

      client.onChatClear(() => {
        eventEmitter.emit('clearchat');
      });
    } else if (type === 'broadcaster') {
      client.onSub((_channel, username, subInfo, msg) => {
        subscription(username, subInfo, msg.userInfo);
      });

      client.onResub((_channel, username, subInfo, msg) => {
        this.resub(username, subInfo, msg.userInfo);
      });

      client.onSubGift((_channel, username, subInfo, msg) => {
        this.subgift(username, subInfo, msg.userInfo);
      });

      client.onCommunitySub((_channel, username, subInfo, msg) => {
        this.subscriptionGiftCommunity(username, subInfo, msg.userInfo);
      });
    } else {
      throw Error(`This ${type} is not supported`);
    }
  }

  @timer()
  async resub (username: string, subInfo: ChatSubInfo, userstate: ChatUser) {
    try {
      const amount = subInfo.months;
      const subStreakShareEnabled = typeof subInfo.streak !== 'undefined';
      const streakMonths = subInfo.streak ?? 0;
      const tier = (subInfo.isPrime ? 'Prime' : String(Number(subInfo.plan ?? 1000) / 1000)) as EmitData['tier'];
      const message = subInfo.message ?? '';

      if (isIgnored({ userName: username, userId: userstate.userId })) {
        return;
      }

      const subStreak = subStreakShareEnabled ? streakMonths : 0;

      const user = await changelog.get(userstate.userId);
      if (!user) {
        changelog.update(userstate.userId, { userName: username });
        this.resub(username, subInfo, userstate);
        return;
      }

      let profileImageUrl = null;
      if (user.profileImageUrl.length === 0) {
        const res = await getUserByName(user.userName);
        if (res) {
          profileImageUrl = res.profilePictureUrl;
        }
      }

      changelog.update(user.userId, {
        ...user,
        isSubscriber:              true,
        subscribedAt:              new Date(Number(dayjs().subtract(streakMonths, 'month').unix()) * 1000).toISOString(),
        subscribeTier:             String(tier),
        subscribeCumulativeMonths: amount,
        subscribeStreak:           subStreak,
        profileImageUrl:           profileImageUrl ? profileImageUrl : user.profileImageUrl,
      });

      hypeTrain.addSub({
        username:        user.userName,
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
      resub(`${username}#${userstate.userId}, streak share: ${subStreakShareEnabled}, streak: ${subStreak}, months: ${amount}, message: ${message}, tier: ${tier}`);
      eventEmitter.emit('resub', {
        userName:                username,
        tier:                    String(tier),
        subStreakShareEnabled,
        subStreak,
        subStreakName:           getLocalizedName(subStreak, translate('core.months')),
        subCumulativeMonths:     amount,
        subCumulativeMonthsName: getLocalizedName(amount, translate('core.months')),
        message,
      });
      alerts.trigger({
        event:      'resub',
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
  async subscriptionGiftCommunity (username: string, subInfo: ChatCommunitySubInfo, userstate: ChatUser) {
    try {
      const userId = subInfo.gifterUserId ?? '';
      const count = subInfo.count;

      changelog.increment(userId, { giftedSubscribes: Number(count) });

      const ignoreGifts = ignoreGiftsFromUser.get(userId) ?? 0;
      ignoreGiftsFromUser.set(userId, ignoreGifts + count);

      if (isIgnored({ userName: username, userId })) {
        return;
      }

      eventlist.add({
        event:     'subcommunitygift',
        userId:    userId,
        count,
        timestamp: Date.now(),
      });
      eventEmitter.emit('subcommunitygift', { userName: username, count });
      subcommunitygift(`${username}#${userId}, to ${count} viewers`);
      alerts.trigger({
        event:      'subcommunitygift',
        name:       username,
        amount:     Number(count),
        tier:       null,
        currency:   '',
        monthsName: '',
        message:    '',
      });
    } catch (e: any) {
      error('Error parsing subscriptionGiftCommunity event');
      error(util.inspect({ userstate, subInfo }));
      error(e.stack);
    }
  }

  @timer()
  async subgift (recipient: string | null, subInfo: ChatSubGiftInfo, userstate: ChatUser) {
    try {
      const username = subInfo.gifter ?? '';
      const userId = subInfo.gifterUserId ?? '0';
      const amount = subInfo.months;
      const recipientId = subInfo.userId;
      const tier = (subInfo.isPrime ? 1 : (Number(subInfo.plan ?? 1000) / 1000));

      const ignoreGifts = (ignoreGiftsFromUser.get(userId) ?? 0);
      let isGiftIgnored = false;

      if (!recipient) {
        recipient = await getNameById(recipientId);
      }
      changelog.update(recipientId, { userId: recipientId, userName: recipient });
      const user = await changelog.get(recipientId);

      if (!user) {
        this.subgift(recipient, subInfo, userstate);
        return;
      }

      if (ignoreGifts > 0) {
        isGiftIgnored = true;
        ignoreGiftsFromUser.set(userId, ignoreGifts - 1);
      }

      if (!isGiftIgnored) {
        debug('tmi.subgift', `Triggered: ${username}#${userId} -> ${recipient}#${recipientId}`);
        alerts.trigger({
          event:      'subgift',
          name:       username,
          recipient,
          amount:     amount,
          tier:       null,
          currency:   '',
          monthsName: getLocalizedName(amount, translate('core.months')),
          message:    '',
        });
        eventEmitter.emit('subgift', {
          userName: username, recipient: recipient, tier,
        });
        triggerInterfaceOnSub({
          userName:            recipient,
          userId:              recipientId,
          subCumulativeMonths: 0,
        });
      } else {
        debug('tmi.subgift', `Ignored: ${username}#${userId} -> ${recipient}#${recipientId}`);
      }
      if (isIgnored({ userName: username, userId: recipientId })) {
        return;
      }

      changelog.update(user.userId, {
        ...user,
        isSubscriber:              true,
        subscribedAt:              new Date().toISOString(),
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
      if (!(isIgnored({ userName: username, userId })) && !isGiftIgnored) {
        changelog.increment(userId, { giftedSubscribes: 1 });
      }
    } catch (e: any) {
      error('Error parsing subgift event');
      error(util.inspect(userstate));
      error(e.stack);
    }
  }

  delete (msgId: string): void {
    deleteChatMessages(msgId);
  }

  @timer()
  async message (data: { skip?: boolean, quiet?: boolean, message: string, userstate: ChatUser, id?: string, isHighlight?: boolean, isWhisper?: boolean, emotesOffsets?: Map<string, string[]>, isAction: boolean, isFirstTimeMessage?: boolean }) {
    data.emotesOffsets ??= new Map();
    data.isAction ??= false;
    data.isFirstTimeMessage ??= false;

    let userId = data.userstate.userId as string | undefined;
    const userName = data.userstate.userName as string | undefined;
    const userstate = data.userstate;
    const message = data.message;
    const skip = data.skip ?? false;
    const quiet = data.quiet;

    if (!userId && userName) {
      // this can happen if we are sending commands from dashboards etc.
      userId = String(await users.getIdByName(userName));
    }

    const parse = new Parser({
      sender:             userstate,
      message:            message,
      skip:               skip,
      quiet:              quiet,
      id:                 data.id,
      emotesOffsets:      data.emotesOffsets,
      isAction:           data.isAction,
      isFirstTimeMessage: data.isFirstTimeMessage,
      isHighlight:        data.isHighlight,
    });

    const whisperListener = variables.get('services.twitch.whisperListener') as boolean;
    let additionalInfo = '+';
    if (userstate.isVip) {
      additionalInfo += 'V';
    }
    if (userstate.isMod) {
      additionalInfo += 'M';
    }
    if (userstate.isArtist) {
      additionalInfo += 'A';
    }
    if (userstate.isBroadcaster) {
      additionalInfo += 'B';
    }
    if (userstate.isFounder) {
      additionalInfo += 'F';
    }
    if (userstate.isSubscriber) {
      additionalInfo += 'S';
    }

    if (!skip
        && data.isWhisper
        && (whisperListener || isOwner(userstate))) {
      whisperIn(`${message} [${userName}${additionalInfo.length > 1 ? additionalInfo : ''}]`);
    } else if (!skip && !isBotId(userId)) {
      if (data.isHighlight) {
        if (userId) {
          eventEmitter.emit('highlight', { userId, message });
        }
        chatIn(`**${message}** [${userName}${additionalInfo.length > 1 ? additionalInfo : ''}]`);
      } else {
        chatIn(`${message} [${userName}${additionalInfo.length > 1 ? additionalInfo : ''}]`);
      }
    }

    if (commandRegexp.test(message)) {
      // check only if ignored if it is just simple command
      if (await isIgnored({ userName: userName ?? '', userId: userId })) {
        return;
      }
    } else {
      const isIgnoredSafeCheck = await isIgnoredSafe({ userName: userName ?? '', userId: userId });
      if (isIgnoredSafeCheck) {
        return;
      }
      // we need to moderate ignored users as well
      const [isModerated, isIgnoredCheck] = await Promise.all(
        [parse.isModerated(), isIgnored({ userName: userName ?? '', userId: userId })],
      );
      if (isModerated || isIgnoredCheck) {
        return;
      }
    }

    // trigger plugins
    (await import('../../plugins.js')).default.trigger('message', message, userstate);

    if (!skip && !isNil(userName)) {
      const user = await changelog.get(userstate.userId);
      if (user) {
        if (!user.isOnline) {
          joinpart.send({ users: [userName], type: 'join' });
          eventEmitter.emit('user-joined-channel', { userName: userName });
        }

        changelog.update(user.userId, {
          ...user,
          userName:     userName,
          userId:       userstate.userId,
          isOnline:     true,
          isVIP:        userstate.isVip,
          isModerator:  userstate.isMod,
          isSubscriber: user.haveSubscriberLock ? user.isSubscriber : userstate.isSubscriber || userstate.isFounder,
          messages:     user.messages ?? 0,
          seenAt:       new Date().toISOString(),
        });
      } else {
        joinpart.send({ users: [userName], type: 'join' });
        eventEmitter.emit('user-joined-channel', { userName: userName });
        changelog.update(userstate.userId, {
          userName:     userName,
          userId:       userstate.userId,
          isOnline:     true,
          isVIP:        userstate.isVip,
          isModerator:  userstate.isMod,
          isSubscriber: userstate.isSubscriber || userstate.isFounder,
          seenAt:       new Date().toISOString(),
        });
      }

      eventEmitter.emit('keyword-send-x-times', {
        userName: userName, message: message, source: 'twitch',
      });
      if (message.startsWith('!')) {
        eventEmitter.emit('command-send-x-times', {
          userName: userName, message: message, source: 'twitch',
        });
      } else if (!message.startsWith('!')) {
        changelog.increment(userstate.userId, { messages: 1 });
      }
    }

    if (data.isFirstTimeMessage) {
      eventEmitter.emit('chatter-first-message', {
        userName: userName ?? '', message: message, source: 'twitch',
      });
    }
    const responses = await parse.process();
    for (let i = 0; i < responses.length; i++) {
      await sendMessage(responses[i].response, responses[i].sender, { ...responses[i].attr }, parse.id);
    }
  }
}

export default Chat;
