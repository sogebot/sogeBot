import { setTimeout } from 'timers'; // tslint workaround

import axios from 'axios';
import _ from 'lodash';
import safeEval from 'safe-eval';
import { getRepository } from 'typeorm';

import Core from './_interface';
import api from './api';
import { parserReply } from './commons';
import { Event, EventInterface } from './database/entity/event';
import { User } from './database/entity/user';
import { onStreamEnd } from './decorators/on';
import events from './events';
import {
  calls, isStreamOnline, rawStatus, setRateLimit, stats, streamStatusChangeSince,
} from './helpers/api';
import { sample } from './helpers/array/sample';
import { attributesReplace } from './helpers/attributesReplace';
import {
  announce, getOwner, getUserSender, prepare,
} from './helpers/commons';
import { mainCurrency } from './helpers/currency';
import {
  getAll, getValueOf, setValueOf,
} from './helpers/customvariables';
import { csEmitter } from './helpers/customvariables/emitter';
import { isDbConnected } from './helpers/database';
import { dayjs } from './helpers/dayjs';
import { eventEmitter } from './helpers/events/emitter';
import { flatten } from './helpers/flatten';
import { generateUsername } from './helpers/generateUsername';
import { getLocalizedName } from './helpers/getLocalized';
import {
  debug, error, info, warning,
} from './helpers/log';
import { channelId } from './helpers/oauth';
import { ioServer } from './helpers/panel';
import { addUIError } from './helpers/panel/';
import { parserEmitter } from './helpers/parser/';
import { adminEndpoint } from './helpers/socket';
import {
  isOwner, isSubscriber, isVIP,
} from './helpers/user';
import { isBot, isBotSubscriber } from './helpers/user/isBot';
import { isBroadcaster } from './helpers/user/isBroadcaster';
import { isModerator } from './helpers/user/isModerator';
import Message from './message';
import { getIdFromTwitch } from './microservices/getIdFromTwitch';
import { setTitleAndGame } from './microservices/setTitleAndGame';
import oauth from './oauth';
import tmi from './tmi';
import { translate } from './translate';
import users from './users';

const excludedUsers = new Set<string>();

class Events extends Core {
  public timeouts: { [x: string]: NodeJS.Timeout } = {};
  public supportedEventsList: {
    id: string;
    variables?: string[];
    check?: (event: EventInterface, attributes: any) => Promise<boolean>;
    definitions?: {
      [x: string]: any;
    };
  }[];
  public supportedOperationsList: {
    id: string;
    definitions?: {
      [x: string]: any;
    };
    fire: (operation: Events.OperationDefinitions, attributes: Events.Attributes) => Promise<void>;
  }[];

  constructor() {
    super();

    this.supportedEventsList = [
      { id: 'user-joined-channel', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'user-parted-channel', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'follow', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'unfollow', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'subscription', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'method', 'subCumulativeMonths', 'tier' ] },
      { id: 'subgift', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'recipient', 'recipientis.moderator', 'recipientis.subscriber', 'recipientis.vip', 'recipientis.follower', 'recipientis.broadcaster', 'recipientis.bot', 'recipientis.owner', 'tier' ] },
      { id: 'subcommunitygift', variables: [ 'username', 'count' ] },
      { id: 'resub', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'subStreakShareEnabled', 'subStreak', 'subStreakName', 'subCumulativeMonths', 'subCumulativeMonthsName', 'tier' ] },
      { id: 'tip', variables: [ 'username', 'amount', 'currency', 'message', 'amountInBotCurrency', 'currencyInBot' ] },
      {
        id:          'command-send-x-times', variables:   [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'command', 'count', 'source' ], definitions: {
          fadeOutXCommands: 0, fadeOutInterval: 0, runEveryXCommands: 10, commandToWatch: '', runInterval: 0,
        }, check: this.checkCommandSendXTimes,
      }, // runInterval 0 or null - disabled; > 0 every x seconds
      {
        id:          'keyword-send-x-times', variables:   [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'command', 'count', 'source' ], definitions: {
          fadeOutXKeywords: 0, fadeOutInterval: 0, runEveryXKeywords: 10, keywordToWatch: '', runInterval: 0, resetCountEachMessage: false,
        }, check: this.checkKeywordSendXTimes,
      }, // runInterval 0 or null - disabled; > 0 every x seconds
      {
        id: 'number-of-viewers-is-at-least-x', variables: [ 'count' ], definitions: { viewersAtLeast: 100, runInterval: 0 }, check: this.checkNumberOfViewersIsAtLeast,
      }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'stream-started' },
      { id: 'stream-stopped' },
      {
        id: 'stream-is-running-x-minutes', definitions: { runAfterXMinutes: 100 }, check: this.checkStreamIsRunningXMinutes,
      },
      { id: 'cheer', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'bits', 'message' ] },
      { id: 'clearchat' },
      { id: 'action', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'ban', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'reason' ] },
      { id: 'hosting', variables: [ 'target', 'viewers' ] },
      {
        id: 'hosted', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'viewers' ], definitions: { viewersAtLeast: 1 }, check: this.checkHosted,
      },
      {
        id: 'raid', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'viewers' ], definitions: { viewersAtLeast: 1 }, check: this.checkRaid,
      },
      { id: 'mod', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'commercial', variables: [ 'duration' ] },
      { id: 'timeout', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'duration' ] },
      {
        id: 'every-x-minutes-of-stream', definitions: { runEveryXMinutes: 100 }, check: this.everyXMinutesOfStream,
      },
      { id: 'game-changed', variables: [ 'oldGame', 'game' ] },
      {
        id: 'reward-redeemed', definitions: { titleOfReward: '' }, variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'userInput' ], check: this.isCorrectReward,
      },
    ];

    this.supportedOperationsList = [
      {
        id: 'send-chat-message', definitions: { messageToSend: '' }, fire: this.fireSendChatMessage,
      },
      {
        id: 'send-whisper', definitions: { messageToSend: '' }, fire: this.fireSendWhisper,
      },
      {
        id: 'run-command', definitions: { commandToRun: '', isCommandQuiet: false }, fire: this.fireRunCommand,
      },
      {
        id: 'emote-explosion', definitions: { emotesToExplode: '' }, fire: this.fireEmoteExplosion,
      },
      {
        id: 'emote-firework', definitions: { emotesToFirework: '' }, fire: this.fireEmoteFirework,
      },
      {
        id: 'start-commercial', definitions: { durationOfCommercial: [30, 60, 90, 120, 150, 180] }, fire: this.fireStartCommercial,
      },
      {
        id: 'bot-will-join-channel', definitions: {}, fire: this.fireBotWillJoinChannel,
      },
      {
        id: 'bot-will-leave-channel', definitions: {}, fire: this.fireBotWillLeaveChannel,
      },
      {
        id: 'create-a-clip', definitions: { announce: false, hasDelay: true }, fire: this.fireCreateAClip,
      },
      {
        id: 'create-a-clip-and-play-replay', definitions: { announce: false, hasDelay: true }, fire: this.fireCreateAClipAndPlayReplay,
      },
      {
        id: 'increment-custom-variable', definitions: { customVariable: '', numberToIncrement: '1' }, fire: this.fireIncrementCustomVariable,
      },
      {
        id: 'set-custom-variable', definitions: { customVariable: '', value: '' }, fire: this.fireSetCustomVariable,
      },
      {
        id: 'decrement-custom-variable', definitions: { customVariable: '', numberToDecrement: '1' }, fire: this.fireDecrementCustomVariable,
      },
    ];

    this.addMenu({
      category: 'manage', name: 'event-listeners', id: 'manage/events/list', this: null,
    });
    this.fadeOut();

    // emitter .on listeners
    for (const event of [
      'action',
      'commercial',
      'game-changed',
      'follow',
      'cheer',
      'unfollow',
      'user-joined-channel',
      'user-parted-channel',
      'subcommunitygift',
      'reward-redeemed',
      'timeout',
      'ban',
      'hosting',
      'hosted',
      'raid',
      'stream-started',
      'stream-stopped',
      'subscription',
      'resub',
      'clearchat',
      'command-send-x-times',
      'keyword-send-x-times',
      'every-x-minutes-of-stream',
      'stream-is-running-x-minutes',
      'subgift',
      'number-of-viewers-is-at-least-x',
      'tip',
      'tweet-post-with-hashtag',
      'obs-scene-changed',
    ] as const) {
      eventEmitter.on(event, (opts?: Events.Attributes) => {
        if (typeof opts === 'undefined') {
          opts = {};
        }
        events.fire(event, { ...opts });
      });
    }
  }

  @onStreamEnd()
  resetExcludedUsers() {
    excludedUsers.clear();
  }

  public async fire(eventId: string, attributes: Events.Attributes): Promise<void> {
    attributes = _.cloneDeep(attributes) || {};
    debug('events', JSON.stringify({ eventId, attributes }));

    if (!attributes.isAnonymous) {
      if (attributes.username !== null && typeof attributes.username !== 'undefined' && (!attributes.userId && !excludedUsers.has(attributes.username))) {
        excludedUsers.delete(attributes.username); // remove from excluded users if passed first if

        const user = attributes.userId
          ? await getRepository(User).findOne({ userId: attributes.userId })
          : await getRepository(User).findOne({ username: attributes.username });

        if (!user) {
          try {
            await getRepository(User).save({
              userId:   attributes.userId ? attributes.userId : await getIdFromTwitch(attributes.username),
              username: attributes.username,
            });
            return this.fire(eventId, attributes);
          } catch (e) {
            excludedUsers.add(attributes.username);
            warning(`User ${attributes.username} triggered event ${eventId} was not found on Twitch.`);
            warning(`User ${attributes.username} will be excluded from events, until stream restarts or user writes in chat and his data will be saved.`);
            warning(e);
            return;
          }
        }

        // add is object
        attributes.is = {
          moderator:   isModerator(user),
          subscriber:  isSubscriber(user),
          vip:         isVIP(user),
          broadcaster: isBroadcaster(attributes.username),
          bot:         isBot(attributes.username),
          owner:       isOwner(attributes.username),
        };
      }
    }
    if (!_.isNil(_.get(attributes, 'recipient', null))) {
      const user = await getRepository(User).findOne({ username: attributes.recipient });
      if (!user) {
        await getRepository(User).save({
          userId:   await getIdFromTwitch(attributes.recipient),
          username: attributes.recipient,
        });
        this.fire(eventId, attributes);
        return;
      }

      // add is object
      attributes.recipientis = {
        moderator:   isModerator(user),
        subscriber:  isSubscriber(user),
        vip:         isVIP(user),
        broadcaster: isBroadcaster(attributes.recipient),
        bot:         isBot(attributes.recipient),
        owner:       isOwner(attributes.recipient),
      };
    }
    if (_.get(attributes, 'reset', false)) {
      this.reset(eventId);
      return;
    }

    for (const event of (await getRepository(Event).find({
      relations: ['operations'],
      where:     {
        name:      eventId,
        isEnabled: true,
      },
    }))) {
      const [shouldRunByFilter, shouldRunByDefinition] = await Promise.all([
        this.checkFilter(event, _.cloneDeep(attributes)),
        this.checkDefinition(_.clone(event), _.cloneDeep(attributes)),
      ]);
      if ((!shouldRunByFilter || !shouldRunByDefinition)) {
        continue;
      }
      info(`Event ${eventId} with attributes ${JSON.stringify(attributes)} is triggered and running of operations.`);

      for (const operation of event.operations) {
        const isOperationSupported = typeof this.supportedOperationsList.find((o) => o.id === operation.name) !== 'undefined';
        if (isOperationSupported) {
          const foundOp = this.supportedOperationsList.find((o) =>  o.id === operation.name);
          if (foundOp) {
            foundOp.fire(operation.definitions, _.cloneDeep(attributes));
          }
        }
      }
    }
  }

  // set triggered attribute to empty object
  public async reset(eventId: string) {
    for (const event of await getRepository(Event).find({ name: eventId })) {
      await getRepository(Event).save({ ...event, triggered: {} });
    }
  }

  public async fireCreateAClip(operation: Events.OperationDefinitions) {
    const cid = await api.createClip({ hasDelay: operation.hasDelay });
    if (cid) { // OK
      if (Boolean(operation.announce) === true) {
        announce(prepare('api.clips.created', { link: `https://clips.twitch.tv/${cid}` }), 'general');
      }
      info('Clip was created successfully');
      return cid;
    } else { // NG
      warning('Clip was not created successfully');
      return null;
    }
  }

  public async fireCreateAClipAndPlayReplay(operation: Events.OperationDefinitions, attributes: Events.Attributes) {
    const cid = await events.fireCreateAClip(operation);
    if (cid) { // clip created ok
      require('./overlays/clips').default.showClip(cid);
    }
  }

  public async fireBotWillJoinChannel() {
    tmi.client.bot?.chat.join('#' + oauth.broadcasterUsername);
  }

  public async fireBotWillLeaveChannel() {
    tmi.part('bot');
    // force all users offline
    await getRepository(User).update({}, { isOnline: false });
  }

  public async fireStartCommercial(operation: Events.OperationDefinitions) {
    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/channels/commercial`;

    const token = await oauth.broadcasterAccessToken;
    if (!oauth.broadcasterCurrentScopes.includes('channel:edit:commercial')) {
      warning('Missing Broadcaster oAuth scope channel:edit:commercial to start commercial');
      addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope channel:edit:commercial to start commercial' });
      return;
    }
    if (token === '') {
      warning('Missing Broadcaster oAuth to change game or title');
      addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth to change game or title' });
      return;
    }

    try {
      const request = await axios({
        method:  'post',
        url,
        data:    { broadcaster_id: String(cid), length: Number(operation.durationOfCommercial) },
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.broadcasterClientId,
          'Content-Type':  'application/json',
        },
      });

      // save remaining api calls
      setRateLimit('broadcaster', request.headers);

      ioServer?.emit('api.stats', {
        method: 'POST', request: { data: { broadcaster_id: String(cid), length: Number(operation.durationOfCommercial) } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: request.status, data: request.data, remaining: calls.broadcaster,
      });
      eventEmitter.emit('commercial', { duration: Number(operation.durationOfCommercial) });
    } catch (e) {
      if (e.isAxiosError) {
        error(`API: ${url} - ${e.response.data.message}`);
        ioServer?.emit('api.stats', {
          method: 'POST', request: { data: { broadcaster_id: String(cid), length: Number(operation.durationOfCommercial) } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a',
        });
      } else {
        error(`API: ${url} - ${e.stack}`);
        ioServer?.emit('api.stats', {
          method: 'POST', request: { data: { broadcaster_id: String(cid), length: Number(operation.durationOfCommercial) } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack,
        });
      }
    }
  }

  public async fireEmoteExplosion(operation: Events.OperationDefinitions) {
    // we must require emotes as it is triggering translations in mocha
    const emotes: typeof import('./overlays/emotes') = require('./overlays/emotes');
    emotes.default.explode(String(operation.emotesToExplode).split(' '));
  }

  public async fireEmoteFirework(operation: Events.OperationDefinitions) {
    // we must require emotes as it is triggering translations in mocha
    const emotes: typeof import('./overlays/emotes') = require('./overlays/emotes');
    emotes.default.firework(String(operation.emotesToFirework).split(' '));
  }

  public async fireRunCommand(operation: Events.OperationDefinitions, attributes: Events.Attributes) {
    const username = _.isNil(attributes.username) ? getOwner() : attributes.username;
    const userId = attributes.userId ? attributes.userId : await users.getIdByName(username);

    let command = String(operation.commandToRun);
    for (const key of Object.keys(attributes).sort((a, b) => a.length - b.length)) {
      const val = attributes[key];
      if (_.isObject(val) && Object.keys(val).length === 0) {
        return;
      } // skip empty object
      const replace = new RegExp(`\\$${key}`, 'g');
      command = command.replace(replace, val);
    }
    command = await new Message(command).parse({ username, sender: getUserSender(String(userId), username) });

    if (global.mocha) {
      parserEmitter.emit('process', {
        sender:  { username, userId: String(userId) },
        message: command,
        skip:    true,
        quiet:   _.get(operation, 'isCommandQuiet', false) as boolean,
      }, (responses) => {
        for (let i = 0; i < responses.length; i++) {
          setTimeout(async () => {
            parserReply(await responses[i].response, { sender: responses[i].sender, attr: responses[i].attr });
          }, 500 * i);
        }
      });
    } else {
      tmi.message({
        message: {
          tags:    { username, userId },
          message: command,
        },
        skip:  true,
        quiet: !!_.get(operation, 'isCommandQuiet', false),
      });
    }
  }

  public async fireSendChatMessageOrWhisper(operation: Events.OperationDefinitions, attributes: Events.Attributes, whisper: boolean): Promise<void> {
    const username = _.isNil(attributes.username) ? getOwner() : attributes.username;
    let userId = attributes.userId;
    const userObj = await getRepository(User).findOne({ username });
    if (!userObj && !attributes.test) {
      await getRepository(User).save({
        userId: await getIdFromTwitch(username),
        username,
      });
      return this.fireSendChatMessageOrWhisper(operation, {
        ...attributes, userId, username,
      }, whisper);
    } else if (attributes.test) {
      userId = attributes.userId;
    } else if (!userObj) {
      return;
    }

    const message = attributesReplace(attributes, String(operation.messageToSend));
    parserReply(message, {
      sender: {
        badges:      {},
        emotes:      [],
        userId:      String(userId),
        username,
        displayName: userObj?.displayname || username,
        color:       '',
        emoteSets:   [],
        userType:    'viewer',
        isModerator: false,
        mod:         '0',
        subscriber:  '0',
        turbo:       '0',
      },
    }, whisper ? 'whisper' : 'chat');
  }

  public async fireSendWhisper(operation: Events.OperationDefinitions, attributes: Events.Attributes) {
    events.fireSendChatMessageOrWhisper(operation, attributes, true);
  }

  public async fireSendChatMessage(operation: Events.OperationDefinitions, attributes: Events.Attributes) {
    events.fireSendChatMessageOrWhisper(operation, attributes, false);
  }

  public async fireSetCustomVariable(operation: Events.OperationDefinitions, attributes: Events.Attributes) {
    const customVariableName = operation.customVariable;
    const value = attributesReplace(attributes, String(operation.value));
    await setValueOf(String(customVariableName), value, {});

    // Update widgets and titles
    csEmitter.emit('refresh');

    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = rawStatus.value;
    if (title.match(regexp)) {
      setTitleAndGame({});
    }
  }
  public async fireIncrementCustomVariable(operation: Events.OperationDefinitions) {
    const customVariableName = String(operation.customVariable).replace('$_', '');
    const numberToIncrement = Number(operation.numberToIncrement);

    // check if value is number
    let currentValue: string | number = await getValueOf('$_' + customVariableName);
    if (!_.isFinite(parseInt(currentValue, 10))) {
      currentValue = String(numberToIncrement);
    } else {
      currentValue = String(parseInt(currentValue, 10) + numberToIncrement);
    }
    await setValueOf(String('$_' + customVariableName), currentValue, {});

    // Update widgets and titles
    csEmitter.emit('refresh');

    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = rawStatus.value;
    if (title.match(regexp)) {
      setTitleAndGame({});
    }
  }

  public async fireDecrementCustomVariable(operation: Events.OperationDefinitions) {
    const customVariableName = String(operation.customVariable).replace('$_', '');
    const numberToDecrement = Number(operation.numberToDecrement);

    // check if value is number
    let currentValue = await getValueOf('$_' + customVariableName);
    if (!_.isFinite(parseInt(currentValue, 10))) {
      currentValue = String(numberToDecrement * -1);
    } else {
      currentValue = String(parseInt(currentValue, 10) - numberToDecrement);
    }
    await setValueOf(String('$_' + customVariableName), currentValue, {});

    // Update widgets and titles
    csEmitter.emit('refresh');
    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = rawStatus.value;
    if (title.match(regexp)) {
      setTitleAndGame({});
    }
  }

  public async everyXMinutesOfStream(event: EventInterface) {
    // set to Date.now() because 0 will trigger event immediatelly after stream start
    const shouldSave = _.get(event, 'triggered.runEveryXMinutes', 0) === 0 || typeof _.get(event, 'triggered.runEveryXMinutes', 0) !== 'number';
    event.triggered.runEveryXMinutes = _.get(event, 'triggered.runEveryXMinutes', Date.now());

    const shouldTrigger = Date.now() - new Date(event.triggered.runEveryXMinutes).getTime() >= Number(event.definitions.runEveryXMinutes) * 60 * 1000;
    if (shouldTrigger || shouldSave) {
      event.triggered.runEveryXMinutes = Date.now();
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async isCorrectReward(event: EventInterface, attributes: Events.Attributes) {
    const shouldTrigger = (attributes.titleOfReward === event.definitions.titleOfReward);
    return shouldTrigger;
  }

  public async checkRaid(event: EventInterface, attributes: Events.Attributes) {
    event.definitions.viewersAtLeast = Number(event.definitions.viewersAtLeast); // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast);
    return shouldTrigger;
  }

  public async checkHosted(event: EventInterface, attributes: Events.Attributes) {
    event.definitions.viewersAtLeast = Number(event.definitions.viewersAtLeast); // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast);
    return shouldTrigger;
  }

  public async checkStreamIsRunningXMinutes(event: EventInterface) {
    if (!isStreamOnline.value) {
      return false;
    }
    event.triggered.runAfterXMinutes = _.get(event, 'triggered.runAfterXMinutes', 0);
    const shouldTrigger = event.triggered.runAfterXMinutes === 0
                          && Number(dayjs.utc().unix()) - Number(dayjs.utc(streamStatusChangeSince.value).unix()) > Number(event.definitions.runAfterXMinutes) * 60;
    if (shouldTrigger) {
      event.triggered.runAfterXMinutes = event.definitions.runAfterXMinutes;
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async checkNumberOfViewersIsAtLeast(event: EventInterface) {
    event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

    event.definitions.runInterval = Number(event.definitions.runInterval); // force Integer
    event.definitions.viewersAtLeast = Number(event.definitions.viewersAtLeast); // force Integer

    const viewers = stats.value.currentViewers;

    const shouldTrigger = viewers >= event.definitions.viewersAtLeast
                        && ((event.definitions.runInterval > 0 && Date.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000)
                        || (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
    if (shouldTrigger) {
      event.triggered.runInterval = Date.now();
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async checkCommandSendXTimes(event: EventInterface, attributes: Events.Attributes) {
    const regexp = new RegExp(`^${event.definitions.commandToWatch}\\s`, 'i');

    let shouldTrigger = false;
    attributes.message += ' ';
    if (attributes.message.match(regexp)) {
      event.triggered.runEveryXCommands = _.get(event, 'triggered.runEveryXCommands', 0);
      event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

      event.definitions.runInterval = Number(event.definitions.runInterval); // force Integer
      event.triggered.runInterval = Number(event.triggered.runInterval); // force Integer

      event.triggered.runEveryXCommands++;
      shouldTrigger
        = event.triggered.runEveryXCommands >= event.definitions.runEveryXCommands
        && ((event.definitions.runInterval > 0 && Date.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000)
        || (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
      if (shouldTrigger) {
        event.triggered.runInterval = Date.now();
        event.triggered.runEveryXCommands = 0;
      }
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async checkKeywordSendXTimes(event: EventInterface, attributes: Events.Attributes) {
    const regexp = new RegExp(`${event.definitions.keywordToWatch}`, 'gi');

    let shouldTrigger = false;
    attributes.message += ' ';
    const match = attributes.message.match(regexp);
    if (match) {
      event.triggered.runEveryXKeywords = _.get(event, 'triggered.runEveryXKeywords', 0);
      event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

      event.definitions.runInterval = Number(event.definitions.runInterval); // force Integer
      event.triggered.runInterval = Number(event.triggered.runInterval); // force Integer

      if (event.definitions.resetCountEachMessage) {
        event.triggered.runEveryXKeywords = 0;
      }

      // add count from match
      event.triggered.runEveryXKeywords = Number(event.triggered.runEveryXKeywords) + Number(match.length);

      shouldTrigger
        = event.triggered.runEveryXKeywords >= event.definitions.runEveryXKeywords
        && ((event.definitions.runInterval > 0 && Date.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000)
        || (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
      if (shouldTrigger) {
        event.triggered.runInterval = Date.now();
        event.triggered.runEveryXKeywords = 0;
      }
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async checkDefinition(event: EventInterface, attributes: Events.Attributes) {
    const foundEvent = this.supportedEventsList.find((o) => o.id === event.name);
    if (!foundEvent || !foundEvent.check) {
      return true;
    }
    return foundEvent.check(event, attributes);
  }

  public async checkFilter(event: EventInterface, attributes: Events.Attributes) {
    if (event.filter.trim().length === 0) {
      return true;
    }

    const customVariables = await getAll();
    const toEval = `(function evaluation () { return ${event.filter} })()`;
    const context = {
      $username: _.get(attributes, 'username', null),
      $source:   _.get(attributes, 'source', null),
      $is:       {
        moderator:   _.get(attributes, 'is.moderator', false),
        subscriber:  _.get(attributes, 'is.subscriber', false),
        vip:         _.get(attributes, 'is.vip', false),
        follower:    _.get(attributes, 'is.follower', false),
        broadcaster: _.get(attributes, 'is.broadcaster', false),
        bot:         _.get(attributes, 'is.bot', false),
        owner:       _.get(attributes, 'is.owner', false),
      },
      $method:          _.get(attributes, 'method', null),
      $months:          _.get(attributes, 'months', null),
      $monthsName:      _.get(attributes, 'monthsName', null),
      $message:         _.get(attributes, 'message', null),
      $command:         _.get(attributes, 'command', null),
      $count:           _.get(attributes, 'count', null),
      $bits:            _.get(attributes, 'bits', null),
      $reason:          _.get(attributes, 'reason', null),
      $target:          _.get(attributes, 'target', null),
      $viewers:         _.get(attributes, 'viewers', null),
      $duration:        _.get(attributes, 'duration', null),
      // add global variables
      $game:            stats.value.currentGame,
      $title:           stats.value.currentTitle,
      $views:           stats.value.currentViews,
      $followers:       stats.value.currentFollowers,
      $subscribers:     stats.value.currentSubscribers,
      $isBotSubscriber: isBotSubscriber(),
      ...customVariables,
    };
    let result = false;
    try {
      result = safeEval(toEval, { ...context, _ });
    } catch (e) {
      // do nothing
    }
    return !!result; // force boolean
  }

  public sockets() {
    adminEndpoint(this.nsp, 'events::getRedeemedRewards', async (cb) => {
      try {
        const rewards = await api.getCustomRewards();
        cb(null, rewards?.data ? [...rewards?.data.map(o => o.title)] : []);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(Event).find({ relations: ['operations'] }));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        const event = await getRepository(Event).findOne({
          relations: ['operations'],
          where:     { id },
        });
        cb(null, event);
      } catch (e) {
        cb(e.stack, undefined);
      }
    });
    adminEndpoint(this.nsp, 'list.supported.events', (cb) => {
      try {
        cb(null, this.supportedEventsList);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'list.supported.operations', (cb) => {
      try {
        cb(null, this.supportedOperationsList);
      } catch (e) {
        cb(e.stack, []);
      }
    });

    adminEndpoint(this.nsp, 'test.event', async (eventId, cb) => {
      try {
        const username = sample(['short', 'someFreakingLongUsername', generateUsername()]);
        const recipient = sample(['short', 'someFreakingLongUsername', generateUsername()]);
        const months = _.random(0, 99, false);
        const attributes = {
          test:   true,
          userId: '0',
          username,
          is:     {
            moderator:   _.random(0, 1, false) === 0,
            subscriber:  _.random(0, 1, false) === 0,
            broadcaster: _.random(0, 1, false) === 0,
            bot:         _.random(0, 1, false) === 0,
            owner:       _.random(0, 1, false) === 0,
          },
          recipient,
          recipientis: {
            moderator:   _.random(0, 1, false) === 0,
            subscriber:  _.random(0, 1, false) === 0,
            broadcaster: _.random(0, 1, false) === 0,
            bot:         _.random(0, 1, false) === 0,
            owner:       _.random(0, 1, false) === 0,
          },
          subStreakShareEnabled:   _.random(0, 1, false) === 0,
          subStreak:               _.random(10, 99, false),
          subStreakName:           getLocalizedName(_.random(10, 99, false), 'core.months'),
          subCumulativeMonths:     _.random(10, 99, false),
          subCumulativeMonthsName: getLocalizedName(_.random(10, 99, false), 'core.months'),
          months,
          tier:                    _.random(0, 3, false),
          monthsName:              getLocalizedName(months, translate('core.months')),
          message:                 sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          viewers:                 _.random(0, 9999, false),
          bits:                    _.random(1, 1000000, false),
          duration:                sample([30, 60, 90, 120, 150, 180]),
          reason:                  sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          command:                 '!testcommand',
          count:                   _.random(0, 9999, false),
          method:                  _.random(0, 1, false) === 0 ? 'Twitch Prime' : '',
          amount:                  _.random(0, 9999, true).toFixed(2),
          currency:                sample(['CZK', 'USD', 'EUR']),
          currencyInBot:           mainCurrency.value,
          amountInBotCurrency:     _.random(0, 9999, true).toFixed(2),
        };

        const event = await getRepository(Event).findOne({
          relations: ['operations'],
          where:     { id: eventId },
        });
        if (event) {
          for (const operation of event.operations) {
            if (!_.isNil(attributes.is)) {
              // flatten is
              const is = attributes.is;
              _.merge(attributes, flatten({ is }));
            }
            if (!_.isNil(attributes.recipientis)) {
              // flatten recipientis
              const recipientis = attributes.recipientis;
              _.merge(attributes, flatten({ recipientis }));
            }
            const isOperationSupported = typeof this.supportedOperationsList.find((o) => o.id === operation.name) !== 'undefined';
            if (isOperationSupported) {
              const foundOp = this.supportedOperationsList.find((o) =>  o.id === operation.name);
              if (foundOp) {
                foundOp.fire(operation.definitions, attributes);
              }
            }
          }
        }
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });

    adminEndpoint(this.nsp, 'events::save', async (event, cb) => {
      try {
        cb(null, await getRepository(Event).save({ ...event, operations: event.operations.filter(o => o.name !== 'do-nothing') }));
      } catch (e) {
        cb(e.stack, event);
      }
    });

    adminEndpoint(this.nsp, 'events::remove', async (event, cb) => {
      await getRepository(Event).remove(event);
      cb(null);
    });
  }

  protected async fadeOut() {
    if (!isDbConnected) {
      setTimeout(() => this.fadeOut, 10);
      return;
    }

    try {
      for (const event of (await getRepository(Event)
        .createQueryBuilder('event')
        .where('event.name = :event1', { event1: 'command-send-x-times' })
        .orWhere('event.name = :event2', { event2: 'keyword-send-x-times ' })
        .getMany())) {
        if (_.isNil(_.get(event, 'triggered.fadeOutInterval', null))) {
          // fadeOutInterval init
          event.triggered.fadeOutInterval = Date.now();
          await getRepository(Event).save(event);
        } else {
          if (Date.now() - event.triggered.fadeOutInterval >= Number(event.definitions.fadeOutInterval) * 1000) {
            // fade out commands
            if (event.name === 'command-send-x-times') {
              if (!_.isNil(_.get(event, 'triggered.runEveryXCommands', null))) {
                if (event.triggered.runEveryXCommands <= 0) {
                  continue;
                }

                event.triggered.fadeOutInterval = Date.now();
                event.triggered.runEveryXCommands = event.triggered.runEveryXCommands - Number(event.definitions.fadeOutXCommands);
                await getRepository(Event).save(event);
              }
            } else if (event.name === 'keyword-send-x-times') {
              if (!_.isNil(_.get(event, 'triggered.runEveryXKeywords', null))) {
                if (event.triggered.runEveryXKeywords <= 0) {
                  continue;
                }

                event.triggered.fadeOutInterval = Date.now();
                event.triggered.runEveryXKeywords = event.triggered.runEveryXKeywords - Number(event.definitions.fadeOutXKeywords);
                await getRepository(Event).save(event);
              }
            }
          }
        }
      }
    } catch (e) {
      error(e.stack);
    } finally {
      clearTimeout(this.timeouts.fadeOut);
      this.timeouts.fadeOut = setTimeout(() => this.fadeOut(), 1000);
    }
  }
}

export default new Events();
