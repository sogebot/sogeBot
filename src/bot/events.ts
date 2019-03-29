import axios from 'axios';
import * as _ from 'lodash';
import * as moment from 'moment';
import safeEval from 'safe-eval';
import { setTimeout } from 'timers'; // tslint workaround
import { isMainThread } from 'worker_threads';
import Core from './_interface';
import { flatten, getLocalizedName, getOwner, isBot, isBroadcaster, isModerator, isOwner, isSubscriber, isVIP, prepare, sendMessage } from './commons';
import Message from './message';

class Events extends Core {
  public timeouts: { [x: string]: NodeJS.Timeout } = {};
  public supportedEventsList: Array<{
    id: string,
    variables?: string[],
    check?: (event: any, attributes: any) => Promise<boolean>,
    definitions?: {
      [x: string]: any;
    },
  }>;
  public supportedOperationsList: Array<{
    id: string,
    definitions?: {
      [x: string]: any;
    },
    fire: (operation: Events.OperationDefinitions, attributes: Events.Attributes) => Promise<void>,
  }>;

  constructor() {
    super();

    this.supportedEventsList = [
      { id: 'user-joined-channel', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'user-parted-channel', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'follow', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'unfollow', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner' ] },
      { id: 'subscription', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'method', 'subCumulativeMonths' ] },
      { id: 'subgift', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'recipient', 'recipientis.moderator', 'recipientis.subscriber', 'recipientis.vip', 'recipientis.follower', 'recipientis.broadcaster', 'recipientis.bot', 'recipientis.owner' ] },
      { id: 'subcommunitygift', variables: [ 'username', 'count' ] },
      { id: 'resub', variables: [ 'username', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'subStreakShareEnabled', 'subStreak', 'subStreakName', 'subCumulativeMonths', 'subCumulativeMonthsName' ] },
      { id: 'tip', variables: [ 'username', 'amount', 'currency', 'message' ] },
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
      { id: 'increment-custom-variable', definitions: { customVariable: '', numberToIncrement: '' }, fire: this.fireIncrementCustomVariable },
      { id: 'decrement-custom-variable', definitions: { customVariable: '', numberToDecrement: '' }, fire: this.fireDecrementCustomVariable },
    ];

    if (isMainThread) {
      this.addMenu({ category: 'manage', name: 'event-listeners', id: '/manage/events/list' });
      this.fadeOut();
      global.db.engine.index('events', [{ index: 'id', unique: true }]);
      global.db.engine.index('events.operations', [{ index: 'eventId' }]);
      global.db.engine.index('events.filters', [{ index: 'eventId' }]);
    }
  }

  public async fire(eventId, attributes) {
    attributes = _.clone(attributes) || {};

    if (!isMainThread) { // emit process to master
      return global.workers.sendToMaster({ type: 'call', ns: 'events', fnc: 'fire', args: [eventId, attributes] });
    }

    if (!_.isNil(_.get(attributes, 'username', null))) {
      // add is object
      attributes.is = {
        moderator: await isModerator(attributes.username),
        subscriber: await isSubscriber(attributes.username),
        vip: await isVIP(attributes.username),
        broadcaster: isBroadcaster(attributes.username),
        bot: isBot(attributes.username),
        owner: isOwner(attributes.username),
      };
    }
    if (!_.isNil(_.get(attributes, 'recipient', null))) {
      // add is object
      attributes.recipientis = {
        moderator: await isModerator(attributes.recipient),
        subscriber: await isSubscriber(attributes.recipient),
        vip: await isVIP(attributes.recipient),
        broadcaster: isBroadcaster(attributes.recipient),
        bot: isBot(attributes.recipient),
        owner: isOwner(attributes.recipient),
      };
    }
    if (_.get(attributes, 'reset', false)) { return this.reset(eventId); }

    const events = await global.db.engine.find('events', { key: eventId, enabled: true });
    for (const event of events) {
      const id = event.id;
      const [shouldRunByFilter, shouldRunByDefinition] = await Promise.all([
        this.checkFilter(id, attributes),
        this.checkDefinition(_.clone(event), attributes),
      ]);
      if ((!shouldRunByFilter || !shouldRunByDefinition)) { continue; }

      for (const operation of (await global.db.engine.find('events.operations', { eventId: id }))) {
        const isOperationSupported = !_.isNil(_.find(this.supportedOperationsList, (o) => o.id === operation.key));
        if (isOperationSupported) {
          const foundOp = this.supportedOperationsList.find((o) =>  o.id === operation.key);
          if (foundOp) {
            foundOp.fire(operation.definitions, attributes);
          }
        }
      }
    }
  }

  // set triggered attribute to empty object
  public async reset(eventId) {
    const events = await global.db.engine.find('events', { key: eventId });
    for (const event of events) {
      event.triggered = {};
      await global.db.engine.update('events', { _id: event._id.toString() }, event);
    }
  }

  public async fireCreateAClip(operation, attributes) {
    const cid = await global.api.createClip({ hasDelay: operation.hasDelay });
    if (cid) { // OK
      if (Boolean(operation.announce) === true) {
        const message = await prepare('api.clips.created', { link: `https://clips.twitch.tv/${cid}` });
        sendMessage(message, { username: getOwner() });
      }
      global.log.info('Clip was created successfully');
      return cid;
    } else { // NG
      global.log.warning('Clip was not created successfully');
      return null;
    }
  }

  public async fireCreateAClipAndPlayReplay(operation, attributes) {
    const cid = await global.events.fireCreateAClip(operation, attributes);
    if (cid) { // clip created ok
      global.overlays.clips.showClip(cid);
    }
  }

  public async fireBotWillJoinChannel(operation, attributes) {
    global.client.join('#' + await global.oauth.settings.broadcaster.username);
  }

  public async fireBotWillLeaveChannel(operation, attributes) {
    global.tmi.part('bot', global.tmi.channel);
    global.db.engine.remove('users.online', {}); // force all users offline
  }

  public async fireStartCommercial(operation, attributes) {
    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/kraken/channels/${cid}/commercial`;

    const token = await global.oauth.settings.bot.accessToken;
    if (token === '') { return; }

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
    global.overlays.emotes.explode(operation.emotesToExplode.split(' '));
  }

  public async fireEmoteFirework(operation, attributes) {
    global.overlays.emotes.firework(operation.emotesToFirework.split(' '));
  }

  public async firePlaySound(operation, attributes) {
    // attr.sound can be filename or url
    let sound = operation.urlOfSoundFile;
    if (!_.includes(sound, 'http')) {
      sound = 'dist/soundboard/' + sound + '.mp3';
    }
    global.panel.io.emit('play-sound', sound);
  }

  public async fireRunCommand(operation, attributes) {
    let command = operation.commandToRun;
    for (const key of Object.keys(attributes).sort((a, b) => a.length - b.length)) {
      const val = attributes[key];
      if (_.isObject(val) && _.size(val) === 0) { return; } // skip empty object
      const replace = new RegExp(`\\$${key}`, 'g');
      command = command.replace(replace, val);
    }
    command = await new Message(command).parse({ username: getOwner() });

    if (global.mocha) {
      // we are testing => straight to parser
      const Parser = require('./parser');
      const parse = new Parser({
        sender: (_.get(operation, 'isCommandQuiet', false) ? {} : { username: getOwner() }),
        message: command,
        skip: true,
      });
      await parse.process();
    } else {
      global.tmi.message({
        message: {
          tags: _.get(operation, 'isCommandQuiet', false) ? {} : { username: getOwner() },
          message: command,
        },
        skip: true,
      });
    }
  }

  public async fireSendChatMessageOrWhisper(operation, attributes, whisper) {
    const username = _.isNil(attributes.username) ? getOwner() : attributes.username;
    let message = operation.messageToSend;
    const atUsername = global.tmi.settings.chat.showWithAt;

    attributes = flatten(attributes);
    for (const key of Object.keys(attributes).sort((a, b) => a.length - b.length)) {
      let val = attributes[key];
      if (_.isObject(val) && _.size(val) === 0) { continue; } // skip empty object
      if (key.includes('username') || key.includes('recipient')) { val = atUsername ? `@${val}` : val; }
      const replace = new RegExp(`\\$${key}`, 'g');
      message = message.replace(replace, val);
    }
    sendMessage(message, { 'username': username, 'message-type': (whisper ? 'whisper' : 'chat') });
  }

  public async fireSendWhisper(operation, attributes) {
    global.events.fireSendChatMessageOrWhisper(operation, attributes, true);
  }

  public async fireSendChatMessage(operation, attributes) {
    global.events.fireSendChatMessageOrWhisper(operation, attributes, false);
  }

  public async fireIncrementCustomVariable(operation, attributes) {
    const customVariableName = operation.customVariable;
    const numberToIncrement = operation.numberToIncrement;

    // check if value is number
    const cvFromDb = await global.db.engine.findOne('customvars', { key: customVariableName });
    let value = 0;
    if (_.isEmpty(cvFromDb)) {
      await global.db.engine.insert('customvars', { key: customVariableName, value: numberToIncrement });
    } else {
      if (!_.isFinite(parseInt(cvFromDb.value, 10))) { value = numberToIncrement; } else { value = parseInt(cvFromDb.value, 10) + parseInt(numberToIncrement, 10); }
      await global.db.engine.update('customvars', { _id: cvFromDb._id.toString() }, { value: value.toString() });
    }

    // Update widgets and titles
    global.widgets.custom_variables.io.emit('refresh');
    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = await global.cache.rawStatus();
    if (title.match(regexp)) { global.api.setTitleAndGame(null); }
  }

  public async fireDecrementCustomVariable(operation, attributes) {
    const customVariableName = operation.customVariable;
    const numberToDecrement = operation.numberToDecrement;

    // check if value is number
    const cvFromDb = await global.db.engine.findOne('customvars', { key: customVariableName });
    let value = 0;
    if (_.isEmpty(cvFromDb)) {
      await global.db.engine.insert('customvars', { key: customVariableName, value: numberToDecrement });
    } else {
      if (!_.isFinite(parseInt(cvFromDb.value, 10))) { value = numberToDecrement * -1; } else { value = parseInt(cvFromDb.value, 10) - parseInt(numberToDecrement, 10); }
      await global.db.engine.update('customvars', { _id: cvFromDb._id.toString() }, { value: value.toString() });
    }

    // Update widgets and titles
    global.widgets.custom_variables.io.emit('refresh');
    const regexp = new RegExp(`\\$_${customVariableName}`, 'ig');
    const title = await global.cache.rawStatus();
    if (title.match(regexp)) { global.api.setTitleAndGame(null); }
  }

  public async everyXMinutesOfStream(event, attributes) {
    // set to new Date() because 0 will trigger event immediatelly after stream start
    const shouldSave = _.get(event, 'triggered.runEveryXMinutes', 0) === 0;
    event.triggered.runEveryXMinutes = _.get(event, 'triggered.runEveryXMinutes', new Date());

    const shouldTrigger = _.now() - new Date(event.triggered.runEveryXMinutes).getTime() >= event.definitions.runEveryXMinutes * 60 * 1000;
    if (shouldTrigger || shouldSave) {
      event.triggered.runEveryXMinutes = new Date();
      await global.db.engine.update('events', { _id: event._id.toString() }, event);
    }
    return shouldTrigger;
  }

  public async checkRaid(event, attributes) {
    event.definitions.viewersAtLeast = parseInt(event.definitions.viewersAtLeast, 10); // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast);
    return shouldTrigger;
  }

  public async checkHosted(event, attributes) {
    event.definitions.viewersAtLeast = parseInt(event.definitions.viewersAtLeast, 10); // force Integer
    const shouldTrigger = (attributes.viewers >= event.definitions.viewersAtLeast) &&
                        ((!attributes.autohost && event.definitions.ignoreAutohost) || !event.definitions.ignoreAutohost);
    return shouldTrigger;
  }

  public async checkStreamIsRunningXMinutes(event, attributes) {
    const when = await global.cache.when();
    event.triggered.runAfterXMinutes = _.get(event, 'triggered.runAfterXMinutes', 0);
    const shouldTrigger = event.triggered.runAfterXMinutes === 0
                          && Number(moment().format('X')) - Number(moment(when.online).format('X')) > event.definitions.runAfterXMinutes * 60;
    if (shouldTrigger) {
      event.triggered.runAfterXMinutes = event.definitions.runAfterXMinutes;
      await global.db.engine.update('events', { _id: event._id.toString() }, event);
    }
    return shouldTrigger;
  }

  public async checkNumberOfViewersIsAtLeast(event, attributes) {
    event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

    event.definitions.runInterval = parseInt(event.definitions.runInterval, 10); // force Integer
    event.definitions.viewersAtLeast = parseInt(event.definitions.viewersAtLeast, 10); // force Integer

    const viewers = (await global.db.engine.findOne('api.current', { key: 'viewers' })).value;

    const shouldTrigger = viewers >= event.definitions.viewersAtLeast &&
                        ((event.definitions.runInterval > 0 && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000) ||
                        (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
    if (shouldTrigger) {
      event.triggered.runInterval = _.now();
      await global.db.engine.update('events', { _id: event._id.toString() }, event);
    }
    return shouldTrigger;
  }

  public async checkCommandSendXTimes(event, attributes) {
    const regexp = new RegExp(`^${event.definitions.commandToWatch}\\s`, 'i');

    let shouldTrigger = false;
    attributes.message += ' ';
    if (attributes.message.match(regexp)) {
      event.triggered.runEveryXCommands = _.get(event, 'triggered.runEveryXCommands', 0);
      event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

      event.definitions.runInterval = parseInt(event.definitions.runInterval, 10); // force Integer
      event.triggered.runInterval = parseInt(event.triggered.runInterval, 10); // force Integer

      event.triggered.runEveryXCommands++;
      shouldTrigger =
        event.triggered.runEveryXCommands >= event.definitions.runEveryXCommands &&
        ((event.definitions.runInterval > 0 && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000) ||
        (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
      if (shouldTrigger) {
        event.triggered.runInterval = _.now();
        event.triggered.runEveryXCommands = 0;
      }
      await global.db.engine.update('events', { _id: event._id.toString() }, event);
    }
    return shouldTrigger;
  }

  public async checkKeywordSendXTimes(event, attributes) {
    const regexp = new RegExp(`${event.definitions.keywordToWatch}`, 'gi');

    let shouldTrigger = false;
    attributes.message += ' ';
    const match = attributes.message.match(regexp);
    if (match) {
      event.triggered.runEveryXKeywords = _.get(event, 'triggered.runEveryXKeywords', 0);
      event.triggered.runInterval = _.get(event, 'triggered.runInterval', 0);

      event.definitions.runInterval = parseInt(event.definitions.runInterval, 10); // force Integer
      event.triggered.runInterval = parseInt(event.triggered.runInterval, 10); // force Integer

      if (event.definitions.resetCountEachMessage) {
        event.triggered.runEveryXKeywords = 0;
      }

      // add count from match
      event.triggered.runEveryXKeywords = Number(event.triggered.runEveryXKeywords) + Number(match.length);

      shouldTrigger =
        event.triggered.runEveryXKeywords >= event.definitions.runEveryXKeywords &&
        ((event.definitions.runInterval > 0 && _.now() - event.triggered.runInterval >= event.definitions.runInterval * 1000) ||
        (event.definitions.runInterval === 0 && event.triggered.runInterval === 0));
      if (shouldTrigger) {
        event.triggered.runInterval = _.now();
        event.triggered.runEveryXKeywords = 0;
      }
      await global.db.engine.update('events', { _id: event._id.toString() }, event);
    }
    return shouldTrigger;
  }

  public async checkDefinition(event, attributes) {
    const foundEvent = this.supportedEventsList.find((o) => o.id === event.key);
    if (!foundEvent || !foundEvent.check) {
      return true;
    }
    return foundEvent.check(event, attributes);
  }

  public async checkFilter(eventId, attributes) {
    const filter = (await global.db.engine.findOne('events.filters', { eventId })).filters;
    if (typeof filter === 'undefined' || filter.trim().length === 0) { return true; }
    const toEval = `(function evaluation () { return ${filter} })()`;
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
      $game: _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a'),
      $title: _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a'),
      $views: _.get(await global.db.engine.findOne('api.current', { key: 'views' }), 'value', 0),
      $followers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
      $hosts: _.get(await global.db.engine.findOne('api.current', { key: 'hosts' }), 'value', 0),
      $subscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
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
    global.panel.io.of('/core/events').on('connection', (socket) => {
      socket.on('list.supported.events', (callback) => {
        callback(null, this.supportedEventsList);
      });
      socket.on('list.supported.operations', (callback) => {
        callback(null, this.supportedOperationsList);
      });

      socket.on('test.event', async (eventId, cb) => {
        const generateUsername = () => {
          const adject = ['Encouraging', 'Plucky', 'Glamorous', 'Endearing', 'Fast', 'Agitated', 'Mushy', 'Muddy', 'Sarcastic', 'Real', 'Boring'];
          const subject = ['Sloth', 'Beef', 'Fail', 'Fish', 'Fast', 'Raccoon', 'Dog', 'Man', 'Pepperonis', 'RuleFive', 'Slug', 'Cat', 'SogeBot'];
          return _.sample(adject) || adject[0] + _.sample(subject) || subject[0];
        };

        const username = _.sample(['short', 'someFreakingLongUsername', generateUsername()]) || 'short';
        const recipient = _.sample(['short', 'someFreakingLongUsername', generateUsername()]) || 'short';
        const months = _.random(0, 99, false);
        const attributes = {
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
        };
        for (const operation of (await global.db.engine.find('events.operations', { eventId }))) {
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
          const isOperationSupported = !_.isNil(_.find(this.supportedOperationsList, (o) => o.id === operation.key));
          if (isOperationSupported) {
            const foundOp = this.supportedOperationsList.find((o) =>  o.id === operation.key);
            if (foundOp) {
              foundOp.fire(operation.definitions, attributes);
            }
          }
        }

        cb();
      });

      socket.on('delete.event', async (eventId, cb) => {
        await Promise.all([
          global.db.engine.remove('events', { id: eventId }),
          global.db.engine.remove('events.filters', { eventId }),
          global.db.engine.remove('events.operations', { eventId }),
        ]);
        cb(null, eventId);
      });
    });
  }

/*
  public sockets() {
    const io = global.panel.io.of('/events');

    io.on('connection', (socket) => {
      socket.on('list.supported.events', (callback) => {
        callback(this.supportedEventsList);
      });
      socket.on('list.supported.operations', (callback) => {
        callback(this.supportedOperationsList);
      });
      socket.on('save-changes', async (data, callback) => {
        let eventId = data._id;
        const errors = {
          definitions: {},
          operations: {},
        };
        try {
          const event = {
            name: data.name.trim().length ? data.name : 'events#' + crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5),
            key: data.event.key,
            enabled: true,
            definitions: data.event.definitions,
            triggered: {},
          };

          // check all definitions are correctly set -> no empty values
          for (const [key, value] of Object.entries(event.definitions)) {
            if (value.length === 0) { _.set(errors, `definitions.${key}`, global.translate('webpanel.events.errors.value_cannot_be_empty')); } else if (['commandToWatch'].includes(key) && !value.startsWith('!')) { _.set(errors, 'definitions.commandToWatch', global.translate('webpanel.events.errors.command_must_start_with_!')); } else if (!['commandToWatch', 'keywordToWatch', 'hashtag'].includes(key) && !_.isBoolean(value) && !value.match(/^\d+$/g)) { _.set(errors, `definitions.${key}`, global.translate('webpanel.events.errors.this_value_must_be_a_positive_number_or_0')); }
          }

          // check all operations definitions are correctly set -> no empty values
          for (const [timestamp, operation] of Object.entries(data.operations)) {
            for (const [key, value] of Object.entries(operation.definitions)) {
              if (value.length === 0) { _.set(errors, `operations.${timestamp}.${key}`, global.translate('webpanel.events.errors.value_cannot_be_empty')); } else if (key === 'commandToRun' && !value.startsWith('!')) { _.set(errors, `operations.${timestamp}.${key}`, global.translate('webpanel.events.errors.command_must_start_with_!')); }
            }
          }

          if (_.size(errors.definitions) > 0 || _.size(errors.operations) > 0) { throw Error(JSON.stringify(errors)); }

          if (_.isNil(eventId)) { eventId = (await global.db.engine.insert('events', event))._id.toString(); } else {
            await Promise.all([
              global.db.engine.remove('events', { _id: eventId }),
              global.db.engine.remove('events.filters', { eventId }),
              global.db.engine.remove('events.operations', { eventId }),
            ]);
            eventId = (await global.db.engine.insert('events', event))._id.toString();
          }

          const insertArray = [];
          insertArray.push(global.db.engine.insert('events.filters', {
            eventId,
            filters: data.filters,
          }));
          for (let operation of Object.entries(data.operations)) {
            operation = operation[1];
            insertArray.push(global.db.engine.insert('events.operations', {
              eventId,
              key: operation.key,
              definitions: operation.definitions,
            }));
          }
          await Promise.all(insertArray);

          callback(null, true);
        } catch (e) {
          global.log.warning(e.message);

          if (!_.isNil(eventId) && _.isNil(data._id)) { // eventId is __newly__ created, rollback all changes
            await Promise.all([
              global.db.engine.remove('events', { _id: eventId }),
              global.db.engine.remove('events.filters', { eventId }),
              global.db.engine.remove('events.operations', { eventId }),
            ]);
          }
          callback(e, e.message);
        }
      });
      socket.on('list.events', async (callback) => {
        const [events, operations, filters] = await Promise.all([
          global.db.engine.find('events'),
          global.db.engine.find('events.operations'),
          global.db.engine.find('events.filters'),
        ]);
        callback(null, { events, operations, filters });
      });
      socket.on('toggle.event', async (eventId, callback) => {
        const eventFromDb = await global.db.engine.findOne('events', { _id: eventId });
        if (_.isEmpty(eventFromDb)) { return callback(new Error('Event not found'), null); }

        const updatedEvent = await global.db.engine.update('events', { _id: eventId }, { enabled: !eventFromDb.enabled });
        callback(null, updatedEvent);
      });
      socket.on('delete.event', async (eventId, callback) => {
        await Promise.all([
          global.db.engine.remove('events', { _id: eventId }),
          global.db.engine.remove('events.filters', { eventId }),
          global.db.engine.remove('events.operations', { eventId }),
        ]);
        callback(null, eventId);
      });
    });
  }
*/

  protected async fadeOut() {
    try {
      const commands = await global.db.engine.find('events', { key: 'command-send-x-times' });
      const keywords = await global.db.engine.find('events', { key: 'keyword-send-x-times' });
      for (const event of _.merge(commands, keywords)) {
        if (_.isNil(_.get(event, 'triggered.fadeOutInterval', null))) {
          // fadeOutInterval init
          await global.db.engine.update('events', { _id: event._id.toString() }, { triggered: { fadeOutInterval: _.now() } });
        } else {
          if (_.now() - event.triggered.fadeOutInterval >= event.definitions.fadeOutInterval * 1000) {
            // fade out commands
            if (event.key === 'command-send-x-times') {
              if (!_.isNil(_.get(event, 'triggered.runEveryXCommands', null))) {
                if (event.triggered.runEveryXCommands <= 0) { continue; }
                await global.db.engine.update('events', { _id: event._id.toString() }, { triggered: { fadeOutInterval: _.now(), runEveryXCommands: event.triggered.runEveryXCommands - event.definitions.fadeOutXCommands } });
              }
            } else if (event.key === 'keyword-send-x-times') {
              if (!_.isNil(_.get(event, 'triggered.runEveryXKeywords', null))) {
                if (event.triggered.runEveryXKeywords <= 0) { continue; }
                await global.db.engine.update('events', { _id: event._id.toString() }, { triggered: { fadeOutInterval: _.now(), runEveryXKeywords: event.triggered.runEveryXKeywords - event.definitions.fadeOutXKeywords } });
              }
            }
          }
        }
      }
    } catch (e) {
      global.log.error(e.stack);
    } finally {
      clearTimeout(this.timeouts.fadeOut);
      this.timeouts.fadeOut = setTimeout(() => this.fadeOut(), 1000);
    }
  }
}

export { Events };
