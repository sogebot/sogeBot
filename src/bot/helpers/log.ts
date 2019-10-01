import fs from 'fs';
import moment from 'moment-timezone';
import * as configfile from '@config';
import os from 'os';
import util from 'util';
import { parse } from 'path';
import stripAnsi from 'strip-ansi';

const config = configfile;

const logDir = './logs';
config.timezone = config.timezone === 'system' ? moment.tz.guess() : config.timezone;

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
};

const logLevel = process.env.LOGLEVEL ? process.env.LOGLEVEL.toLowerCase().trim() : 'info';
const logFile = fs.createWriteStream('./logs/sogebot.log', { flags: 'a' });
enum Levels {
  debug,
  error,
  chatIn,
  chatOut,
  whisperIn,
  whisperOut,
  host,
  raid,
  follow,
  unfollow,
  cheer,
  tip,
  sub,
  subgift,
  subcommunitygift,
  resub,
  timeout,
  ban,
  warning,
  start,
  stop,
  info,
};
const levelFormat = {
  error: '!!! ERROR !!!',
  debug: 'DEBUG:',
  chatIn: '<<<',
  chatOut: '>>>',
  whisperIn: '<w<',
  whisperOut: '>w>',
  info: '|',
  warning: '|!',
  timeout: '+timeout',
  ban: '+ban',
  follow: '+follow',
  host: '+host',
  raid: '+raid',
  unfollow: '-follow',
  cheer: '+cheer',
  tip: '+tip',
  sub: '+sub',
  subgift: '+subgift',
  subcommunitygift: '+subcommunitygift',
  resub: '+resub',
  start: '== STREAM STARTED =>',
  stop: '== STREAM STOPPED',
};

function getNameFromStackTrace() {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_s, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;
  const path = parse(stack[2].getFunctionName() || '');
  const name = path.name;
  return name;
}


function format(level: Levels, message: string | object, category?: string) {
  const timestamp = moment().tz(config.timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSS');
  if (typeof message === 'object') {
    message = util.inspect(message);
  }
  return [timestamp, levelFormat[Levels[level]], category, message].filter(Boolean).join(' ');
}

export function isDebugEnabled(category: string) {
  if (!process.env.DEBUG) {
    return false;
  }
  const categories = category.split('.');
  let bEnabled = false;
  bEnabled = process.env.DEBUG.includes(category) || process.env.DEBUG.includes(categories[0] + '.*');
  bEnabled = process.env.DEBUG === '*' || bEnabled;
  return bEnabled;
}

function log(message: string | object) {
  const level = getNameFromStackTrace();
  if (Levels[level] <= Levels[logLevel]) {
    const formattedMessage = format(Levels[level], message);
    console.log(formattedMessage);
    logFile.write(stripAnsi(formattedMessage) + os.EOL);
  }
}

/* * category will be always shown */
export function debug(category: string, message: string | object) {
  const categories = category.split('.');
  if (categories.length > 2 && category !== '*') {
    throw Error('For debug use only <main>.<sub> or *');
  }
  if (isDebugEnabled(category) || category == '*') {
    const formattedMessage = format(Levels.debug, message, category);
    console.log(formattedMessage);
    logFile.write(formattedMessage + os.EOL);
  }
}
export function error(message: string | object) {
  log(message);
}
export function chatIn(message: string | object) {
  log(message);
}
export function chatOut(message: string | object) {
  log(message);
}
export function whisperIn(message: string | object) {
  log(message);
}
export function whisperOut(message: string | object) {
  log(message);
}
export function info(message: string | object) {
  log(message);
}
export function warning(message: string | object) {
  log(message);
}
export function timeout(message: string | object) {
  log(message);
}
export function ban(message: string | object) {
  log(message);
}
export function follow(message: string | object) {
  log(message);
}
export function host(message: string | object) {
  log(message);
}
export function raid(message: string | object) {
  log(message);
}
export function unfollow(message: string | object) {
  log(message);
}
export function cheer(message: string | object) {
  log(message);
}
export function tip(message: string | object) {
  log(message);
}
export function sub(message: string | object) {
  log(message);
}
export function subgift(message: string | object) {
  log(message);
}
export function subcommunitygift(message: string | object) {
  log(message);
}
export function resub(message: string | object) {
  log(message);
}
export function start(message: string | object) {
  log(message);
}
export function stop(message: string | object) {
  log(message);
}
