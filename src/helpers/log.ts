import fs from 'fs';
import os from 'os';
import util from 'util';

import { dayjs, timezone } from '@sogebot/ui-helpers/dayjsHelper.js';
import { createStream, Generator } from 'rotating-file-stream';
import stripAnsi from 'strip-ansi';

import { isDebugEnabled } from './debug.js';
import { logEmitter } from './log/emitter.js';

import { isDbConnected } from '~/helpers/database.js';

let sinon;
try {
  // Attempt to import sinon as it is only dev dependency
  sinon = await import('sinon');
} catch {
  sinon = null;
}

const isMochaTestRun = () => typeof (global as any).it === 'function';

const logDir = './logs';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logLevel = process.env.LOGLEVEL ? process.env.LOGLEVEL.toLowerCase().trim() : 'info';
const migrationFileName: Generator = (time: Date | number, index?: number) => {
  if (!time) {
    return './logs/migration.log';
  }
  return `./logs/migration.log.${(index ?? 1)-1}.gz`;
};
const logFileName: Generator = (time: Date | number, index?: number) => {
  if (!time) {
    return './logs/sogebot.log';
  }
  return `./logs/sogebot.log.${(index ?? 1)-1}.gz`;
};
const perfFileName: Generator = (time: Date | number, index?: number) => {
  if (!time) {
    return './logs/performance.log';
  }
  return `./logs/performance.log.${(index ?? 1)-1}.gz`;
};
const migrationFile = createStream(migrationFileName, {
  size:     '5M',
  compress: 'gzip',
  maxFiles: 5,
});
const logFile = createStream(logFileName, {
  size:     '5M',
  compress: 'gzip',
  maxFiles: 5,
});
const perfFile = createStream(perfFileName, {
  size:     '5M',
  compress: 'gzip',
  maxFiles: 5,
});

perfFile.write(`====================== ${dayjs().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSS')} ======================\n`);

// until https://github.com/typescript-eslint/typescript-eslint/pull/1898 fixed
/* eslint-disable */
enum Levels {
  debug,
  error,
  chatIn,
  chatOut,
  whisperIn,
  whisperOut,
  raid,
  follow,
  cheer,
  tip,
  sub,
  subgift,
  subcommunitygift,
  resub,
  redeem,
  timeout,
  ban,
  unban,
  warning,
  start,
  stop,
  info,
};
/* eslint-enable */

const levelFormat = {
  error:            '!!! ERROR !!!',
  debug:            'DEBUG:',
  chatIn:           '<<<',
  chatOut:          '>>>',
  whisperIn:        '<w<',
  whisperOut:       '>w>',
  info:             '|',
  warning:          '|!',
  timeout:          '+timeout',
  ban:              '+ban',
  unban:            '-ban',
  follow:           '+follow',
  raid:             '+raid',
  redeem:           '+++ redeem:',
  cheer:            '+cheer',
  tip:              '+tip',
  sub:              '+sub',
  subgift:          '+subgift',
  subcommunitygift: '+subcommunitygift',
  resub:            '+resub',
  start:            '== STREAM STARTED =>',
  stop:             '== STREAM STOPPED',
};

function format(level: Levels, message: any, category?: string) {
  const timestamp = dayjs().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSS');

  if (typeof message === 'object') {
    message = util.inspect(message);
  }
  return [timestamp, levelFormat[Levels[level] as keyof typeof Levels], category, message].filter(Boolean).join(' ');
}

function log(message: any, level: keyof typeof Levels) {
  if (Levels[level] <= Levels[logLevel as keyof typeof Levels]) {
    const formattedMessage = format(Levels[level as keyof typeof Levels], message);
    process.stdout.write(formattedMessage + '\n');
    logFile.write(stripAnsi(formattedMessage) + os.EOL);
  }
}

logEmitter.on('debug', (message: string) => {
  log(message, 'debug');
});

logEmitter.on('warning', (message: string) => {
  log(message, 'warning');
});

logEmitter.on('error', (message: string) => {
  log(message, 'error');
});

export function performance(message:string) {
  if (isDebugEnabled('performance')) {
    process.stdout.write(message.replace(/ /g, '\t') + '\n');
  }
  perfFile.write(dayjs().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSS') + ' ' + (message.replace(/ /g, '\t')) + os.EOL);
}

export function error(message: any) {
  // we have custom typeorm logger to show QueryFailedError
  // stack from those errors are not usable so we don't need it
  if (typeof message !== 'string' || (typeof message === 'string' && !message.startsWith('QueryFailedError: '))) {
    log(message, 'error');
  }
}

export function chatIn(message: any) {
  log(message, 'chatIn');
}

export const chatOut = isMochaTestRun() && sinon ? sinon.stub() : (message: any) => {
  log(message, 'chatOut');
};
export const warning = isMochaTestRun() && sinon ? sinon.stub() : (message: any) => {
  log(message, 'warning');
};
export const debug = isMochaTestRun() && sinon ? sinon.stub() : (category: string, message: any) => {
  const categories = category.split('.');
  if (categories.length > 2 && category !== '*') {
    throw Error('For debug use only <main>.<sub> or *');
  }
  if (isDebugEnabled(category) || category == '*') {
    const formattedMessage = format(Levels.debug, message, category);
    process.stdout.write(formattedMessage + '\n');
    logFile.write(formattedMessage + os.EOL);
  }
};

export function whisperIn(message: any) {
  log(message, 'whisperIn');
}
export function whisperOut(message: any) {
  log(message, 'whisperOut');
}
export function info(message: any) {
  log(message, 'info');
}
export function timeout(message: any) {
  log(message, 'timeout');
}
export function ban(message: any) {
  log(message, 'ban');
}
export function unban(message: any) {
  log(message, 'unban');
}
export function follow(message: any) {
  log(message, 'follow');
}
export function raid(message: any) {
  log(message, 'raid');
}
export function cheer(message: any) {
  log(message, 'cheer');
}
export function tip(message: any) {
  log(message, 'tip');
}
export function sub(message: any) {
  log(message, 'sub');
}
export function subgift(message: any) {
  log(message, 'subgift');
}
export function subcommunitygift(message: any) {
  log(message, 'subcommunitygift');
}
export function resub(message: any) {
  log(message, 'resub');
}
export function start(message: any) {
  log(message, 'start');
}
export function stop(message: any) {
  log(message, 'stop');
}
export function redeem(message: any) {
  log(message, 'redeem');
}

const logTimezone = async () => {
  if (!isDbConnected) {
    setTimeout(() => logTimezone(), 10);
  } else {
    info(`Bot timezone set to ${timezone}`);
  }
};
logTimezone();

export {
  migrationFile,
};