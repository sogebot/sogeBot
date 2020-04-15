import axios from 'axios';
import _ from 'lodash';
import moment from 'moment';
import safeEval from 'safe-eval';
import { setTimeout } from 'timers'; // tslint workaround
import { isMainThread } from './cluster';
import Core from './_interface';
import { flatten } from './helpers/flatten';
import { getLocalizedName, getOwner, isBot, isBroadcaster, isModerator, isOwner, isSubscriber, isVIP, prepare, sendMessage } from './commons';
import Message from './message';
import Parser from './parser';
import { generateUsername } from './helpers/generateUsername';
import { error, info, warning } from './helpers/log';
import { adminEndpoint } from './helpers/socket';

import { getRepository } from 'typeorm';
import { User } from './database/entity/user';
import { Variable } from './database/entity/variable';
import { Event, EventInterface } from './database/entity/event';
import api from './api';
import oauth from './oauth';
import events from './events';
import customvariables from './customvariables';
import { ioServer } from './helpers/panel';
import clips from './overlays/clips';
import tmi from './tmi';
import emotes from './overlays/emotes';
import custom_variables from './widgets/customvariables';
import currency from './currency';
import { isDbConnected } from './helpers/database';

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
      { id: 'command-send-x-times', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'command', 'count' ], definitions: { fadeOutXCommands: 0, fadeOutInterval: 0, runEveryXCommands: 10, commandToWatch: '', runInterval: 0 }, check: this.checkCommandSendXTimes }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'keyword-send-x-times', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'command', 'count' ], definitions: { fadeOutXKeywords: 0, fadeOutInterval: 0, runEveryXKeywords: 10, keywordToWatch: '', runInterval: 0, resetCountEachMessage: false }, check: this.checkKeywordSendXTimes }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'number-of-viewers-is-at-least-x', variables: [ 'count' ], definitions: { viewersAtLeast: 100, runInterval: 0 }, check: this.checkNumberOfViewersIsAtLeast }, // runInterval 0 or null - disabled; > 0 every x seconds
      { id: 'stream-started' },
      { id: 'stream-stopped' },
      { id: 'stream-is-running-x-minutes', definitions: { runAfterXMinutes: 100 }, check: this.checkStreamIsRunningXMinutes },
      { id: 'cheer', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'bits', 'message' ] },
      { id: 'clearchat' },
      { id: 'action', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'ban', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'reason' ] },
      { id: 'hosting', variables: [ 'target', 'viewers' ] },
      { id: 'hosted', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'viewers', 'autohost' ], definitions: { viewersAtLeast: 1, ignoreAutohost: false }, check: this.checkHosted },
      { id: 'raid', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'viewers' ], definitions: { viewersAtLeast: 1 }, check: this.checkRaid },
      { id: 'mod', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'commercial', variables: [ 'duration' ] },
      { id: 'timeout', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'reason', 'duration' ] },
      { id: 'every-x-minutes-of-stream', definitions: { runEveryXMinutes: 100 }, check: this.everyXMinutesOfStream },
      { id: 'game-changed', variables: [ 'oldGame', 'game' ] },
    ];

    this.supportedOperationsList = [
      { id: 'send-chat-message', definitions: { messageToSend: '' }, fire: this.fireSendChatMessage },
      { id: 'send-whisper', definitions: { messageToSend: '' }, fire: this.fireSendWhisper },
      { id: 'run-command', definitions: { commandToRun: '', isCommandQuiet: false }, fire: this.fireRunCommand },
      { id: 'play-sound', definitions: { urlOfSoundFile: '' }, fire: this.firePlaySound },
      { id: 'emote-explosion', definitions: { emotesToExplode: '' }, fire: this.fireEmoteExplosion },
      { id: 'emote-firework', definitions: { emotesToFirework: '' }, fire: this.fireEmoteFirework },
      { id: 'start-commercial', definitions: { durationOfCommercial: [30, 60, 90, 120, 150, 180] }, fire: this.fireStartCommercial },
      { id: 'bot-will-join-channel', definitions: {}, fire: this.fireBotWillJoinChannel },
      { id: 'bot-will-leave-channel', definitions: {}, fire: this.fireBotWillLeaveChannel },
      { id: 'create-a-clip', definitions: { announce: false, hasDelay: true }, fire: this.fireCreateAClip },
      { id: 'create-a-clip-and-play-replay', definitions: { announce: false, hasDelay: true }, fire: this.fireCreateAClipAndPlayReplay },
      { id: 'increment-custom-variable', definitions: { customVariable: '', numberToIncrement: '1' }, fire: this.fireIncrementCustomVariable },
      { id: 'decrement-custom-variable', definitions: { customVariable: '', numberToDecrement: '1' }, fire: this.fireDecrementCustomVariable },
    ];

    if (isMainThread) {
      this.addMenu({ category: 'manage', name: 'event-listeners', id: 'manage/events/list' });
      this.fadeOut();
    }
  }

  public async fire(eventId, attributes) {
    attributes = _.clone(attributes) || {};

    if (!_.isNil(_.get(attributes, 'username', null))) {
      const user = attributes.userId
        ? await getRepository(User).findOne({ userId: attributes.userId })
        : await getRepository(User).findOne({ username: attributes.username });

      if (!user) {
        await getRepository(User).save({
          userId: Number(attributes.userId ? attributes.userId : await api.getIdFromTwitch(attributes.username)),
          username: attributes.username,
        });
        return this.fire(eventId, attributes);
      }

      // add is object
      attributes.is = {
        moderator: isModerator(user),
        subscriber: isSubscriber(user),
        vip: isVIP(user),
        broadcaster: isBroadcaster(attributes.username),
        bot: isBot(attributes.username),
        owner: isOwner(attributes.username),
      };
    }
    if (!_.isNil(_.get(attributes, 'recipient', null))) {
      const user = await getRepository(User).findOne({ username: attributes.recipient });
      if (!user) {
        await getRepository(User).save({
          userId: Number(await api.getIdFromTwitch(attributes.recipient)),
          username: attributes.recipient,
        });
        return this.fire(eventId, attributes);
      }

      // add is object
      attributes.recipientis = {
        moderator: isModerator(user),
        subscriber: isSubscriber(user),
        vip: isVIP(user),
        broadcaster: isBroadcaster(attributes.recipient),
        bot: isBot(attributes.recipient),
        owner: isOwner(attributes.recipient),
      };
    }
    if (_.get(attributes, 'reset', false)) {
      return this.reset(eventId);
    }

    for (const event of (await getRepository(Event).find({
      relations: ['operations'],
      where: {
        name: eventId,
        isEnabled: true,
      },
    }))) {
      const [shouldRunByFilter, shouldRunByDefinition] = await Promise.all([
        this.checkFilter(event, attributes),
        this.checkDefinition(_.clone(event), attributes),
      ]);
      if ((!shouldRunByFilter || !shouldRunByDefinition)) {
        continue;
      }

      for (const operation of event.operations) {
        const isOperationSupported = !_.isNil(_.find(this.supportedOperationsList, (o) => o.id === operation.name));
        if (isOperationSupported) {
          const foundOp = this.supportedOperationsList.find((o) =>  o.id === operation.name);
          if (foundOp) {
            foundOp.fire(operation.definitions, attributes);
          }
        }
      }
    }
  }

  // set triggered attribute to empty object
  public async reset(eventId) {
    for (const event of await getRepository(Event).find({ name: eventId })) {
      await getRepository(Event).save({...event, triggered: {}});
    }
  }

  public async fireCreateAClip(operation, attributes) {
    const cid = await api.createClip({ hasDelay: operation.hasDelay });
    if (cid) { // OK
      if (Boolean(operation.announce) === true) {
        const message = prepare('api.clips.created', { link: `https://clips.twitch.tv/${cid}` });
        sendMessage(message, {
          username: oauth.botUsername,
          displayName: oauth.botUsername,
          userId: Number(oauth.botId),
          emotes: [],
          badges: {},
          'message-type': 'chat',
        });
      }
      info('Clip was created successfully');
      return cid;
    } else { // NG
      warning('Clip was not created successfully');
      return null;
    }
  }

  public async fireCreateAClipAndPlayReplay(operation, attributes) {
    const cid = await events.fireCreateAClip(operation, attributes);
    if (cid) { // clip created ok
      clips.showClip(cid);
    }
  }

  public async fireBotWillJoinChannel(operation, attributes) {
    tmi.client.bot?.chat.join('#' + oauth.broadcasterUsername);
  }

  public async fireBotWillLeaveChannel(operation, attributes) {
    tmi.part('bot');
    // force all users offline
    await getRepository(User).update({}, { isOnline: false });
  }

  public async fireStartCommercial(operation, attributes) {
    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/kraken/channels/${cid}/commercial`;

    const token = await oauth.botAccessToken;
    if (token === '') {
      return;
    }

    await axios({
      method: 'post',
      url,
      data: { length: operation.durationOfCommercial },
      headers: {
        'Authorization': 'OAuth ' + token,
        'Accept': 'application/vnd.twitchtv.v5+json',
        'Content-Type': 'application/json',
      },
    });
  }

  public async fireEmoteExplosion(operation, attributes) {
    emotes.explode(operation.emotesToExplode.split(' '));
  }

  public async fireEmoteFirework(operation, attributes) {
    emotes.firework(operation.emotesToFirework.split(' '));
  }

  public async firePlaySound(operation, attributes) {
    // attr.sound can be filename or url
    let sound = operation.urlOfSoundFile;
    if (!_.includes(sound, 'http')) {
      sound = 'dist/soundboard/' + sound + '.mp3';
    }
    ioServer?.emit('play-sound', sound);
  }

  public async fireRunCommand(operation, attributes) {
    let command = operation.commandToRun;
    for (const key of Object.keys(attributes).sort((a, b) => a.length - b.length)) {
      const val = attributes[key];
      if (_.isObject(val) && _.size(val) === 0) {
        return;
      } // skip empty object
      const replace = new RegExp(`\\$${key}`, 'g');
      command = command.replace(replace, val);
    }
    command = await new Message(command).parse({ username: oauth.broadcasterUsername });

    if (global.mocha) {
      const parse = new Parser({
        sender: { username: oauth.broadcasterUsername, userId: oauth.broadcasterId },
        message: command,
        skip: true,
        quiet: _.get(operation, 'isCommandQuiet', false),
      });
      await parse.process();
    } else {
      tmi.message({
        message: {
          tags: { username: oauth.broadcasterUsername , userId: oauth.broadcasterId},
          message: command,
        },
        skip: true,
        quiet: _.get(operation, 'isCommandQuiet', false),
      });
    }
  }

  public async fireSendChatMessageOrWhisper(operation, attributes, whisper) {
    const username = _.isNil(attributes.username) ? getOwner() : attributes.username;
    let userId = attributes.userId;
    const userObj = await getRepository(User).findOne({ username });
    if (!userObj && !attributes.test) {
      await getRepository(User).save({
        userId: await api.getIdFromTwitch(username),
        username,
      });
      return this.fireSendChatMessageOrWhisper(operation, {...attributes, userId, username }, whisper);
    } else if (attributes.test) {
      userId = attributes.userId;
    } else if (!userObj) {
      return;
    }

    let message = operation.messageToSend;
    const atUsername = tmi.showWithAt;

    attributes = flatten(attributes);
    for (const key of Object.keys(attributes).sort((a, b) => a.length - b.length)) {
      let val = attributes[key];
      if (_.isObject(val) && _.size(val) === 0) {
        continue;
      } // skip empty object
      if (key.includes('username') || key.includes('recipient')) {
        val = atUsername ? `@${val}` : val;
      }
      const replace = new RegExp(`\\$${key}`, 'g');
      message = message.replace(replace, val);
    }
    sendMessage(message, {
      username,
      displayName: userObj?.displayname || username,
      userId: userId,
      emotes: [],
      badges: {},
      'message-type': (whisper ? 'whisper' : 'chat'),
    });
  }

  public async fireSendWhisper(operation, attributes) {
    events.fireSendChatMessageOrWhisper(operation, attributes, true);
  }

  public async fireSendChatMessage(operation, attributes) {
    events.fireSendChatMessageOrWhisper(operation, attributes, false);
  }

  public async fireIncrementCustomVariable(operation, attributes) {
    const customVariableName = operation.customVariable;
    const numberToIncrement = operation.numberToIncrement;

    // check if value is number
    let currentValue = await customvariables.getValueOf('$_' + customVariableName);
    if (!_.isFinite(parseInt(currentValue, 10))) {
      currentValue = numberToIncrement;
    } else {
      currentValue = String(parseInt(currentValue, 10) - parseInt(numberToIncrement, 10));
    }
    await customvariables.setValueOf(customVariableName, currentValue, {});

    // Update widgets and titles
    if (custom_variables.socket) {
      custom_variables.socket.emit('refresh');
    }

    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = api.rawStatus;
    if (title.match(regexp)) {
      api.setTitleAndGame(null, {});
    }
  }

  public async fireDecrementCustomVariable(operation, attributes) {
    const customVariableName = operation.customVariable;
    const numberToDecrement = operation.numberToDecrement;

    // check if value is number
    let currentValue = await customvariables.getValueOf('$_' + customVariableName);
    if (!_.isFinite(parseInt(currentValue, 10))) {
      currentValue = String(numberToDecrement * -1);
    } else {
      currentValue = String(parseInt(currentValue, 10) - parseInt(numberToDecrement, 10));
    }
    await customvariables.setValueOf(customVariableName, currentValue, {});

    // Update widgets and titles
    if (custom_variables.socket) {
      custom_variables.socket.emit('refresh');
    }
    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = api.rawStatus;
    if (title.match(regexp)) {
      api.setTitleAndGame(null, {});
    }
  }

  public async everyXMinutesOfStream(event: EventInterface, attributes) {
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

  public async checkRaid(event: EventInterface, attributes) {
    event.definitions.viewersAtLeast = Number(event.definitions.viewersAtLeast); // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast);
    return shouldTrigger;
  }

  public async checkHosted(event: EventInterface, attributes) {
    event.definitions.viewersAtLeast = Number(event.definitions.viewersAtLeast); // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast)
                        && ((!attributes.autohost && event.definitions.ignoreAutohost as boolean) || !(event.definitions.ignoreAutohost as boolean));
    return shouldTrigger;
  }

  public async checkStreamIsRunningXMinutes(event: EventInterface, attributes) {
    if (!api.isStreamOnline) {
      return false;
    }
    event.triggered.runAfterXMinutes = _.get(event, 'triggered.runAfterXMinutes', 0);
    const shouldTrigger = event.triggered.runAfterXMinutes === 0
                          && Number(moment.utc().format('X')) - Number(moment.utc(api.streamStatusChangeSince).format('X')) > Number(event.definitions.runAfterXMinutes) * 60;
    if (shouldTrigger) {
      event.triggered.runAfterXMinutes = event.definitions.runAfterXMinutes;
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async checkNumberOfViewersIsAtLeast(event: EventInterface, attributes) {
    event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

    event.definitions.runInterval = Number(event.definitions.runInterval); // force Integer
    event.definitions.viewersAtLeast = Number(event.definitions.viewersAtLeast); // force Integer

    const viewers = api.stats.currentViewers;

    const shouldTrigger = viewers >= event.definitions.viewersAtLeast
                        && ((event.definitions.runInterval > 0 && Date.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000)
                        || (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
    if (shouldTrigger) {
      event.triggered.runInterval = Date.now();
      await getRepository(Event).save(event);
    }
    return shouldTrigger;
  }

  public async checkCommandSendXTimes(event: EventInterface, attributes) {
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

  public async checkKeywordSendXTimes(event: EventInterface, attributes) {
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

  public async checkDefinition(event: EventInterface, attributes) {
    const foundEvent = this.supportedEventsList.find((o) => o.id === event.name);
    if (!foundEvent || !foundEvent.check) {
      return true;
    }
    return foundEvent.check(event, attributes);
  }

  public async checkFilter(event: EventInterface, attributes) {
    if (event.filter.trim().length === 0) {
      return true;
    }

    // get custom variables
    const customVariablesDb = await getRepository(Variable).find();
    const customVariables = {};
    for (const cvar of customVariablesDb) {
      customVariables[cvar.variableName] = cvar.currentValue;
    }

    const toEval = `(function evaluation () { return ${event.filter} })()`;
    const context = {
      _,
      $username: _.get(attributes, 'username', null),
      $is: {
        moderator: _.get(attributes, 'is.moderator', false),
        subscriber: _.get(attributes, 'is.subscriber', false),
        vip: _.get(attributes, 'is.vip', false),
        follower: _.get(attributes, 'is.follower', false),
        broadcaster: _.get(attributes, 'is.broadcaster', false),
        bot: _.get(attributes, 'is.bot', false),
        owner: _.get(attributes, 'is.owner', false),
      },
      $method: _.get(attributes, 'method', null),
      $months: _.get(attributes, 'months', null),
      $monthsName: _.get(attributes, 'monthsName', null),
      $message: _.get(attributes, 'message', null),
      $command: _.get(attributes, 'command', null),
      $count: _.get(attributes, 'count', null),
      $bits: _.get(attributes, 'bits', null),
      $reason: _.get(attributes, 'reason', null),
      $target: _.get(attributes, 'target', null),
      $viewers: _.get(attributes, 'viewers', null),
      $autohost: _.get(attributes, 'autohost', null),
      $duration: _.get(attributes, 'duration', null),
      // add global variables
      $game: api.stats.currentGame,
      $title: api.stats.currentTitle,
      $views: api.stats.currentViews,
      $followers: api.stats.currentFollowers,
      $hosts: api.stats.currentHosts,
      $subscribers: api.stats.currentSubscribers,
      ...customVariables,
    };
    let result = false;
    try {
      result = safeEval(toEval, context);
    } catch (e) {
      // do nothing
    }
    delete context._;
    return !!result; // force boolean
  }

  public sockets() {
    adminEndpoint(this.nsp, 'events::getAll', async (cb) => {
      try {
        cb(null, await getRepository(Event).find({
          relations: ['operations'],
        }));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'events::getOne', async (eventId: string, cb) => {
      try {
        const event = await getRepository(Event).findOne({
          relations: ['operations'],
          where: { id: eventId },
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
        const username = _.sample(['short', 'someFreakingLongUsername', generateUsername()]) || 'short';
        const recipient = _.sample(['short', 'someFreakingLongUsername', generateUsername()]) || 'short';
        const months = _.random(0, 99, false);
        const attributes = {
          test: true,
          userId: 0,
          username,
          is: {
            moderator: _.random(0, 1, false) === 0,
            subscriber: _.random(0, 1, false) === 0,
            broadcaster: _.random(0, 1, false) === 0,
            bot: _.random(0, 1, false) === 0,
            owner: _.random(0, 1, false) === 0,
          },
          recipient,
          recipientis: {
            moderator: _.random(0, 1, false) === 0,
            subscriber: _.random(0, 1, false) === 0,
            broadcaster: _.random(0, 1, false) === 0,
            bot: _.random(0, 1, false) === 0,
            owner: _.random(0, 1, false) === 0,
          },
          subStreakShareEnabled: _.random(0, 1, false) === 0,
          subStreak: _.random(10, 99, false),
          subStreakName: getLocalizedName(_.random(10, 99, false), 'core.months'),
          subCumulativeMonths: _.random(10, 99, false),
          subCumulativeMonthsName: getLocalizedName(_.random(10, 99, false), 'core.months'),
          months,
          tier: _.random(0, 3, false),
          monthsName: getLocalizedName(months, 'core.months'),
          message: _.sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          viewers: _.random(0, 9999, false),
          autohost: _.random(0, 1, false) === 0,
          bits: _.random(1, 1000000, false),
          duration: _.sample([30, 60, 90, 120, 150, 180]),
          reason: _.sample(['', 'Lorem Ipsum Dolor Sit Amet']),
          command: '!testcommand',
          count: _.random(0, 9999, false),
          method: _.random(0, 1, false) === 0 ? 'Twitch Prime' : '',
          amount: _.random(0, 9999, true).toFixed(2),
          currency: _.sample(['CZK', 'USD', 'EUR']),
          currencyInBot: currency.mainCurrency,
          amountInBotCurrency: _.random(0, 9999, true).toFixed(2),
        };

        const event = await getRepository(Event).findOne({
          relations: ['operations'],
          where: { id: eventId },
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
            const isOperationSupported = !_.isNil(_.find(this.supportedOperationsList, (o) => o.id === operation.name));
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

    adminEndpoint(this.nsp, 'events::save', async (event: EventInterface, cb) => {
      try {
        cb(null, await getRepository(Event).save({...event, operations: event.operations.filter(o => o.name !== 'do-nothing')}));
      } catch (e) {
        cb(e.stack, event);
      }
    });

    adminEndpoint(this.nsp, 'events::remove', async (event: Required<EventInterface>, cb) => {
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
        .orWhere('event.name = :event2', { event2: 'keyword-send-x-times '})
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
