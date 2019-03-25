import { readdirSync } from 'fs';
import * as _ from 'lodash';
import * as moment from 'moment';
import { join, normalize } from 'path';
import { isMainThread } from 'worker_threads';

import { debug, isEnabled as debugIsEnabled } from './debug';
import Message from './message';

export async function autoLoad(directory) {
  const directoryListing = readdirSync(directory);
  const loaded = {};
  for (const file of directoryListing) {
    const imported = require(normalize(join(process.cwd(), directory, file)));
    if (typeof imported.default !== 'undefined') {
      loaded[file.split('.')[0]] = imported.default; // remap default to root object
    } else {
      loaded[file.split('.')[0]] = imported;
    }
  }
  return loaded;
}

/*
 * Flatten object keys
 * { a: { b: 'c' }} => { 'a.b': 'c' }
 */
export function flatten(data) {
  const result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur || Array.isArray(cur)) {
      result[prop] = cur;
    } else {
      let isEmpty = true;
      for (const p of Object.keys(cur)) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + '.' + p : p);
      }
      if (isEmpty && prop) {
        result[prop] = {};
      }
    }
  }
  recurse(data, '');
  return result;
}

/*
 * Unflatten object keys
 * { 'a.b': 'c' } => { a: { b: 'c' }}
 */
export function unflatten(data) {
  let result;
  if (Array.isArray(data)) {
    result = [];
    // create unflatten each item
    for (const o of data) {
      result.push(unflatten(o));
    }
  } else {
    result = {};
    for (const i of Object.keys(data)) {
      const keys = i.split('.');
      keys.reduce((r, e, j)  => {
        return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 === j ? data[i] : {}) : []);
      }, result);
    }
  }
  return result;
}

export function getIgnoreList() {
  return global.tmi.settings.chat.ignorelist;
}

export function isIgnored(sender) {
  if (sender !== null) { // null can be bot from dashboard or event
    if (typeof sender === 'string') { sender = { username: sender }; }
    const isInIgnoreList = getIgnoreList().includes(sender.username);
    return isInIgnoreList && !isBroadcaster(sender);
  } else { return false; }
}

export async function prepare(translate, attr = {}): Promise<string> {
  attr = attr || {};
  let msg = global.translate(translate);
  for (const key of Object.keys(attr).sort((a, b) => a.length - b.length)) {
    let value = attr[key];
    if (['username', 'who', 'winner', 'sender', 'loser'].includes(key)) {
      value = global.tmi.settings.chat.showWithAt ? `@${value}` : value;
    }
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value);
  }
  return msg;
}

export function getTime(time, isChat) {
  let now = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  let days: string | number = 0;
  let hours: string | number = 0;
  let minutes: string | number = 0;
  let seconds: string | number = 0;
  now = _.isNull(time) || !time
    ? { days: 0, hours: 0, minutes: 0, seconds: 0 }
    : moment.preciseDiff(moment(), moment(time), true);
  if (isChat) {
    days = now.days > 0 ? now.days : '';
    hours = now.hours > 0 ? now.hours : '';
    minutes = now.minutes > 0 ? now.minutes : '';
    seconds = now.seconds > 0 ? now.seconds : '';
    return { days,
      hours,
      minutes,
      seconds };
  } else {
    days = now.days > 0 ? now.days + 'd' : '';
    hours = now.hours >= 0 && now.hours < 10 ? '0' + now.hours + ':' : now.hours + ':';
    minutes = now.minutes >= 0 && now.minutes < 10 ? '0' + now.minutes + ':' : now.minutes + ':';
    seconds = now.seconds >= 0 && now.seconds < 10 ? '0' + now.seconds : now.seconds;
    return days + hours + minutes + seconds;
  }
}

export async function sendMessage(messageToSend, sender, attr?: {
  sender?: any,
  quiet?: boolean,
  skip?: boolean,
  force?: boolean,
  [x: string]: any,
}) {
  messageToSend = await messageToSend; // await if messageToSend is promise (like prepare)
  attr = attr || {};
  sender = sender || {};

  debug('commons.sendMessage', JSON.stringify({messageToSend, sender, attr}));
  if (_.isString(sender)) { sender = { username: String(sender) }; }

  if (_.isNil(sender) || _.isNil(sender.username)) { sender.username = undefined; } else { attr.sender = sender.username; }

  if (!_.isNil(sender.quiet)) { attr.quiet = sender.quiet; }
  if (!_.isNil(sender.skip)) { attr.skip = sender.skip; }
  if (!attr.skip) { messageToSend = await new Message(messageToSend).parse(attr); }
  if (messageToSend.length === 0) { return false; } // if message is empty, don't send anything

  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if ((typeof sender.username === 'undefined' || sender.username === null) && !attr.force) { return false; } // we don't want to reply on bot commands
  messageToSend = !_.isNil(sender.username) ? messageToSend.replace(/\$sender/g, (global.tmi.settings.chat.showWithAt ? '@' : '') + sender.username) : messageToSend;
  if (!global.tmi.settings.chat.mute || attr.force) {
    if ((!_.isNil(attr.quiet) && attr.quiet)) { return true; }
    if (sender['message-type'] === 'whisper') {
      global.log.whisperOut(messageToSend, { username: sender.username });
      message('whisper', sender.username, messageToSend);
    } else {
      global.log.chatOut(messageToSend, { username: sender.username });
      if (global.tmi.settings.chat.sendWithMe && !messageToSend.startsWith('/')) {
        message('me', null, messageToSend);
      } else {
        message('say', null, messageToSend);
      }
    }
  }
  return true;
}

/* TODO: move to tmi */
export async function message(type, username, messageToSend, retry = true) {
  if (debugIsEnabled('tmi')) { return; }
  if (!isMainThread) {
    global.workers.sendToMaster({ type, sender: username, message: messageToSend });
  } else if (isMainThread) {
    try {
      if (username === null) { username = await global.oauth.settings.general.channel; }
      if (username === '') {
        global.log.error('TMI: channel is not defined, message cannot be sent');
      } else {
        global.tmi.client.bot.chat[type](username, messageToSend);
      }
    } catch (e) {
      if (retry) { setTimeout(() => message(type, username, messageToSend, false), 5000); } else { global.log.error(e); }
    }
  }
}

/* TODO: move to tmi */
export async function timeout(username, reason, timeMs) {
  if (isMainThread) {
    reason = reason.replace(/\$sender/g, username);
    global.tmi.client.bot.chat.timeout(global.oauth.settings.general.channel, username, timeMs, reason);
  } else { global.workers.sendToMaster({ type: 'timeout', username, timeout: timeMs, reason }); }
}

export function getOwner() {
  try {
    return global.oauth.settings.general.owners[0].trim();
  } catch (e) {
    return '';
  }
}
export function getOwners() {
  return global.oauth.settings.general.owners;
}

export function getChannel() {
  try {
    return global.oauth.settings.general.channel.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function getBroadcaster() {
  try {
    return global.oauth.settings.broadcaster.username.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function isBroadcaster(user) {
  try {
    if (_.isString(user)) { user = { username: user }; }
    return global.oauth.settings.broadcaster.username.toLowerCase().trim() === user.username.toLowerCase().trim();
  } catch (e) {
    return false;
  }
}

export async function isModerator(user): Promise<boolean> {
  try {
    if (_.isString(user)) {
      user = await global.users.getByName(user);
    }

    if (_.has(user, 'is.moderator')) {
      // from db
      return user.is.moderator;
    } else if (_.has(user, 'badges')) {
      // from message
      return typeof user.badges.moderator !== 'undefined';
    } else {
      return false;
    }
  } catch (e) {
    global.log.error(e.stack);
    return false;
  }
}

export async function isVIP(user) {
  try {
    if (_.isString(user)) { user = await global.users.getByName(user); }
    return !_.isNil(user.is.vip) ? user.is.vip : false;
  } catch (e) {
    return false;
  }
}

export async function isFollower(user) {
  try {
    if (_.isString(user)) { user = await global.users.getByName(user); }
    return !_.isNil(user.is.follower) ? user.is.follower : false;
  } catch (e) {
    return false;
  }
}

export async function isSubscriber(user) {
  try {
    if (_.isString(user)) { user = await global.users.getByName(user); }
    debug('commons.isSubscriber', JSON.stringify(user));
    return !_.isNil(user.is.subscriber) ? user.is.subscriber : false;
  } catch (e) {
    return false;
  }
}

export function isBot(user) {
  try {
    if (_.isString(user)) { user = { username: user }; }
    if (global.oauth.settings.bot.username) {
      return global.oauth.settings.bot.username.toLowerCase().trim() === user.username.toLowerCase().trim();
    } else { return false; }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function isOwner(user) {
  try {
    if (_.isString(user)) { user = { username: user }; }
    if (global.oauth.settings.general.owners) {
      const owners = _.map(_.filter(global.oauth.settings.general.owners, _.isString), (owner) => {
        return _.trim(owner.toLowerCase());
      });
      return _.includes(owners, user.username.toLowerCase().trim());
    } else { return false; }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function getLocalizedName(number, translation) {
  let single;
  let multi;
  let xmulti;
  let name;
  const names = global.translate(translation).split('|').map(Function.prototype.call, String.prototype.trim);
  number = parseInt(number, 10);

  switch (names.length) {
    case 1:
      xmulti = null;
      single = multi = names[0];
      break;
    case 2:
      single = names[0];
      multi = names[1];
      xmulti = null;
      break;
    default:
      const len = names.length;
      single = names[0];
      multi = names[len - 1];
      xmulti = {};

      for (let i = 0; i < names.length; i++) {
        if (i !== 0 && i !== len - 1) {
          const maxPts = names[i].split(':')[0];
          xmulti[maxPts] = names[i].split(':')[1];
        }
      }
      break;
  }

  name = (number === 1 ? single : multi);
  if (!_.isNull(xmulti) && _.isObject(xmulti) && number > 1 && number <= 10) {
    for (let i = number; i <= 10; i++) {
      if (typeof xmulti[i] === 'string') {
        name = xmulti[i];
        break;
      }
    }
  }
  return name;
}

/*
 * returns nearest 5
 */
export function round5(x: number) {
  return (x % 5) >= 2.5 ? Number(Number(x / 5).toFixed(0)) * 5 + 5 : Number(Number(x / 5).toFixed(0)) * 5;
}
