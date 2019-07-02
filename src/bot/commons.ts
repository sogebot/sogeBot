import { readdirSync } from 'fs';
import _ from 'lodash';
import moment from 'moment';
import 'moment-precise-range-plugin';
import { join, normalize } from 'path';
import { isMainThread } from 'worker_threads';

import { debug, isEnabled as debugIsEnabled } from './debug';
import Message from './message';
import { globalIgnoreList } from './data/globalIgnoreList';

export async function autoLoad(directory): Promise<{ [x: string]: any }> {
  const directoryListing = readdirSync(directory);
  const loaded = {};
  for (const file of directoryListing) {
    if (file.startsWith('_')) {
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(normalize(join(process.cwd(), directory, file)));
    if (typeof imported.default !== 'undefined') {
      loaded[file.split('.')[0]] = new imported.default(); // remap default to root object
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
export function flatten(data): { [x: string]: any } {
  const result = {};
  function recurse(cur, prop): void {
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
  return global.tmi.ignorelist.map((o) => {
    return o.trim().toLowerCase();
  });
}

export function getGlobalIgnoreList() {
  return Object.keys(globalIgnoreList)
    .filter(o => !global.tmi.globalIgnoreListExclude.includes(o))
    .map(o => { return { id: o, ...globalIgnoreList[o] }; });
}

export function isIgnored(sender: { username: string | null; userId?: string }) {
  if (sender.username === null) {
    return false; // null can be bot from dashboard or event
  }

  const isInIgnoreList = getIgnoreList().includes(sender.username) || getIgnoreList().includes(sender.userId);
  let isInGlobalIgnoreList = false;
  for (const [, data] of Object.entries(getGlobalIgnoreList())) {
    if (data.id === sender.userId || data.known_aliases.includes(sender.username.toLowerCase())) {
      isInGlobalIgnoreList = true;
      break;
    }
  }

  return (isInGlobalIgnoreList || isInIgnoreList) && !isBroadcaster(sender);
}

/**
 * Prepares strings with replacement attributes
 * @param translate Translation key
 * @param attr Attributes to replace { 'replaceKey': 'value' }
 */
export async function prepare(translate: string, attr?: {[x: string]: any }): Promise<string> {
  attr = attr || {};
  let msg = global.translate(translate);
  for (const key of Object.keys(attr).sort((a, b) => b.length - a.length)) {
    let value = attr[key];
    if (['username', 'who', 'winner', 'sender', 'loser'].includes(key)) {
      if (typeof value.username !== 'undefined') {
        value = global.tmi.showWithAt ? `@${value.username}` : value.username;
      } else {
        value = global.tmi.showWithAt ? `@${value}` : value;
      }
    }
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value);
  }
  return msg;
}

export function getTime(time, isChat) {
  let days: string | number = 0;
  let hours: string | number = 0;
  let minutes: string | number = 0;
  let seconds: string | number = 0;
  const now = _.isNull(time) || !time
    ? { days: 0, hours: 0, minutes: 0, seconds: 0 }
    : moment.preciseDiff(moment.utc(), moment.utc(time), true);
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

export async function sendMessage(messageToSend: string | Promise<string>, sender: Sender | null, attr?: {
  sender?: Sender;
  quiet?: boolean;
  skip?: boolean;
  force?: boolean;
  [x: string]: any;
}) {
  messageToSend = await messageToSend as string; // await if messageToSend is promise (like prepare)
  attr = attr || {};
  sender = sender || null;

  debug('commons.sendMessage', JSON.stringify({messageToSend, sender, attr}));

  if (sender) {
    attr.sender = sender;
  }

  if (!attr.skip) { messageToSend = await new Message(messageToSend).parse(attr) as string; }
  if (messageToSend.length === 0) { return false; } // if message is empty, don't send anything

  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (!sender && !attr.force) { return false; } // we don't want to reply on bot commands

  if (sender) {
    messageToSend = !_.isNil(sender.username) ? messageToSend.replace(/\$sender/g, (global.tmi.showWithAt ? '@' : '') + sender.username) : messageToSend;
    if (!global.tmi.mute || attr.force) {
      if ((!_.isNil(attr.quiet) && attr.quiet)) { return true; }
      if (sender['message-type'] === 'whisper') {
        global.log.whisperOut(messageToSend, { username: sender.username });
        message('whisper', sender.username, messageToSend);
      } else {
        global.log.chatOut(messageToSend, { username: sender.username });
        if (global.tmi.sendWithMe && !messageToSend.startsWith('/')) {
          message('me', null, messageToSend);
        } else {
          message('say', null, messageToSend);
        }
      }
    }
    return true;
  }
}

/* TODO: move to tmi */
export async function message(type, username, messageToSend, retry = true) {
  if (debugIsEnabled('tmi')) { return; }
  if (!isMainThread) {
    global.workers.sendToMaster({ type, sender: username, message: messageToSend });
  } else if (isMainThread) {
    try {
      if (username === null) { username = await global.oauth.generalChannel; }
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
    if (reason) {
      reason = reason.replace(/\$sender/g, username);
    }
    global.tmi.client.bot.chat.timeout(global.oauth.generalChannel, username, timeMs, reason);
  } else { global.workers.sendToMaster({ type: 'timeout', username, timeout: timeMs, reason }); }
}

export function getOwner() {
  try {
    return global.oauth.generalOwners[0].trim();
  } catch (e) {
    return '';
  }
}
export function getOwners() {
  return global.oauth.generalOwners;
}

export function getChannel() {
  try {
    return global.oauth.generalChannel.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function getBroadcaster() {
  try {
    return global.oauth.broadcasterUsername.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function isBroadcaster(user) {
  try {
    if (_.isString(user)) { user = { username: user }; }
    return global.oauth.broadcasterUsername.toLowerCase().trim() === user.username.toLowerCase().trim();
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
    if (global.oauth.botUsername) {
      return global.oauth.botUsername.toLowerCase().trim() === user.username.toLowerCase().trim();
    } else { return false; }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function isOwner(user) {
  try {
    if (_.isString(user)) { user = { username: user }; }
    if (global.oauth.generalOwners) {
      const owners = _.map(_.filter(global.oauth.generalOwners, _.isString), (owner) => {
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
  return Math.round(x / 5 ) * 5;
}

/**
 * Return diff object
 * @param x timestamp ms
 * @param y timestamp ms
 */
export function dateDiff(x: number, y: number) {
  let diff;

  if (x > y) {
    diff = x - y;
  } else {
    diff = y - x;
  }

  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  diff = diff - (years * 1000 * 60 * 60 * 24 * 365);

  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  diff = diff - (months * 1000 * 60 * 60 * 24 * 30);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff = diff - (days * 1000 * 60 * 60 * 24);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff = diff - (hours * 1000 * 60 * 60);

  const minutes = Math.floor(diff / (1000 * 60));

  return {
    years,
    months,
    days,
    hours,
    minutes,
  };
}
