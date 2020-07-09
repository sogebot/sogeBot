import { readdirSync } from 'fs';
import _ from 'lodash';
import moment from 'moment';
import 'moment-precise-range-plugin';
import { join, normalize } from 'path';

import { chatOut, debug, warning } from './helpers/log';
import { globalIgnoreList } from './data/globalIgnoreList';
import { error } from './helpers/log';
import { clusteredChatOut, clusteredClientChat, clusteredClientTimeout, clusteredWhisperOut } from './cluster';

import oauth from './oauth';
import users from './users';
import { translate } from './translate';
import tmi from './tmi';
import { UserStateTags } from 'twitch-js';
import Discord from './integrations/discord';
import { TextChannel } from 'discord.js';
import { Message } from './message';
import { getRepository } from 'typeorm';
import { DiscordLink } from './database/entity/discord';
import { UserInterface } from './database/entity/user';

/**
 * Use to send message to correct platform in @parser
 * @param response
 * @param opts
 * @param [messageType]
 *
 * parserReply('Lorem Ipsum Dolor', { sender });
 */
export async function parserReply(response: string | Promise<string>, opts: { sender: CommandOptions['sender']; attr?: CommandOptions['attr'] }, messageType: 'chat' | 'whisper' = 'chat') {
  const senderObject = {
    ..._.cloneDeep(opts.sender),
    'message-type': messageType,
    forceWithoutAt: typeof opts.sender.discord !== 'undefined', // we dont need @
  };
  const messageToSend = await (async () => {
    if (opts.attr?.skip) {
      return prepare(await response as string, { ...opts, sender: senderObject.discord ? { ...senderObject, discord: senderObject.discord.author } : senderObject }, false);
    } else {
      return await new Message(await response as string).parse({ ...opts, sender: senderObject.discord ? { ...senderObject, discord: senderObject.discord.author } : senderObject }) as string;
    }
  })();
  if (opts.sender.discord) {
    if (Discord.client) {
      if (messageType === 'chat') {
        const msg = await opts.sender.discord.channel.send(messageToSend);
        chatOut(`#${(opts.sender.discord.channel as TextChannel).name}: ${messageToSend} [${Discord.client.user?.tag}]`);
        if (Discord.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete().catch(() => {
              return;
            });
          }, 10000);
        }
      } else {
        opts.sender.discord.author.send(messageToSend);
      }
    } else {
      warning('Discord client is not connected');
    }
  } else {
    // we skip as we are already parsing message
    sendMessage(messageToSend, senderObject, { skip: true, ...opts.attr });
  }
}

/**
 * Announce in all channels (discord, twitch)
 * @param messageToAnnounce
 *
 * announce('Lorem Ipsum Dolor');
 */
export async function announce(messageToAnnounce: string) {
  messageToAnnounce = await new Message(messageToAnnounce).parse({}) as string;
  sendMessage(messageToAnnounce, {
    username: oauth.botUsername,
    displayName: oauth.botUsername,
    userId: Number(oauth.botId),
    emotes: [],
    badges: {},
    'message-type': 'chat',
  }, { force: true, skip: true });

  if (Discord.sendGeneralAnnounceToChannel.length > 0 && Discord.client) {
    // search discord channel by ID
    for (const [ id, channel ] of Discord.client.channels.cache) {
      if (channel.type === 'text') {
        if (id === Discord.sendGeneralAnnounceToChannel || (channel as TextChannel).name === Discord.sendGeneralAnnounceToChannel) {
          const ch = Discord.client.channels.cache.find(o => o.id === id);
          if (ch) {
            // search linked users and change to @<id>
            let match;
            const usernameRegexp = /@(?<username>[A-Za-z0-9_]{3,15})/g;
            while ((match = usernameRegexp.exec(messageToAnnounce)) !== null) {
              if (match) {
                const username = match.groups?.username as string;
                const userId = await users.getIdByName(username);
                const link = await getRepository(DiscordLink).findOne({ userId });
                if (link) {
                  messageToAnnounce = messageToAnnounce.replace(`@${username}`, `<@${link.discordId}>`);
                }
              }
            }
            //(ch as TextChannel).send(messageToAnnounce);
            chatOut(`#${(ch as TextChannel).name}: ${messageToAnnounce} [${Discord.client.user?.tag}]`);
          }
        }
      }
    }
  }
}

export async function autoLoad(directory: string): Promise<{ [x: string]: any }> {
  const directoryListing = readdirSync(directory);
  const loaded: { [x: string]: any } = {};
  for (const file of directoryListing) {
    if (file.startsWith('_')) {
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(normalize(join(process.cwd(), directory, file)));
    if (typeof imported.default !== 'undefined') {
      loaded[file.split('.')[0]] = imported.default; // remap default to root object
    } else {
      loaded[file.split('.')[0]] = imported;
    }
  }
  return loaded;
}

export function getIgnoreList() {
  return tmi.ignorelist.map((o) => {
    return typeof o === 'string' ? o.trim().toLowerCase() : o;
  });
}

export function getGlobalIgnoreList() {
  return Object.keys(globalIgnoreList)
    .filter(o => !tmi.globalIgnoreListExclude.map((ex: number | string) => String(ex)).includes(o))
    .map(o => {
      const id = Number(o);
      return { id, ...globalIgnoreList[id as unknown as keyof typeof globalIgnoreList] };
    });
}

export function isIgnored(sender: { username: string | null; userId?: number }) {
  if (sender.username === null) {
    return false; // null can be bot from dashboard or event
  }

  const isInIgnoreList = getIgnoreList().includes(sender.username) || getIgnoreList().includes(sender.userId);
  const isInGlobalIgnoreList = typeof getGlobalIgnoreList().find(data => {
    return data.id === sender.userId || data.known_aliases.includes((sender.username || '').toLowerCase());
  }) !== 'undefined';
  return (isInGlobalIgnoreList || isInIgnoreList) && !isBroadcaster(sender);
}

/**
 * Prepares strings with replacement attributes
 * @param translate Translation key
 * @param attr Attributes to replace { 'replaceKey': 'value' }
 * @param isTranslation consider if translation key to be translate key or pure message
 */
export function prepare(toTranslate: string, attr?: {[x: string]: any }, isTranslation = true): string {
  attr = attr || {};
  let msg = (() => {
    if (isTranslation) {
      return translate(toTranslate);
    } else {
      return toTranslate;
    }
  })();
  for (const key of Object.keys(attr).sort((a, b) => b.length - a.length)) {
    let value = attr[key];
    if (['username', 'who', 'winner', 'sender', 'loser'].includes(key)) {
      if (typeof value.username !== 'undefined') {
        value = tmi.showWithAt ? `@${value.username}` : value.username;
      } else {
        value = tmi.showWithAt ? `@${value}` : value;
      }
    }
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value);
  }
  return msg;
}

export function getTime(time: null | number, isChat: boolean) {
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

    if (days === '' && hours === '' && minutes === '' && seconds === '') {
      seconds = 1; // set seconds to 1 if everything else is missing
    }
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

export async function sendMessage(messageToSend: string | Promise<string>, sender: Partial<UserStateTags> | null, attr?: {
  sender?: Partial<UserStateTags>;
  quiet?: boolean;
  skip?: boolean;
  force?: boolean;
  [x: string]: any;
}) {
  messageToSend = await messageToSend as string; // await if messageToSend is promise (like prepare)
  attr = attr || {};
  sender = sender || null;

  if (tmi.sendWithMe) {
    // replace /me in message if we are already sending with /me
    messageToSend = messageToSend.replace(/^(\/me)/gi, '').trim();
  }

  debug('sendMessage.message', messageToSend);
  debug('commons.sendMessage', JSON.stringify({messageToSend, sender, attr}));

  if (sender) {
    attr.sender = sender;
  }

  if (!attr.skip) {
    messageToSend = await new Message(messageToSend).parse(attr) as string;
  }
  if (messageToSend.length === 0) {
    return false;
  } // if message is empty, don't send anything

  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (!sender && !attr.force) {
    return false;
  } // we don't want to reply on bot commands

  if (sender) {
    messageToSend = !_.isNil(sender.username) ? messageToSend.replace(/\$sender/g, (tmi.showWithAt ? '@' : '') + sender.username) : messageToSend;
    if (!tmi.mute || attr.force) {
      if ((!_.isNil(attr.quiet) && attr.quiet)) {
        return true;
      }
      if (sender['message-type'] === 'whisper') {
        clusteredWhisperOut(`${messageToSend} [${sender.username}]`);
        message('whisper', sender.username, messageToSend);
      } else {
        clusteredChatOut(`${messageToSend} [${sender.username}]`);
        if (tmi.sendWithMe && !messageToSend.startsWith('/')) {
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
export async function message(type: 'say' | 'whisper' | 'me', username: string | undefined | null, messageToSend: string, retry = true) {
  try {
    if (username === null || typeof username === 'undefined') {
      username = await oauth.generalChannel;
    }
    if (username === '') {
      error('TMI: channel is not defined, message cannot be sent');
    } else {
      clusteredClientChat(type, username, messageToSend);
    }
  } catch (e) {
    if (retry) {
      setTimeout(() => message(type, username, messageToSend, false), 5000);
    } else {
      error(e);
    }
  }
}

/* TODO: move to tmi */
export async function timeout(username: string, reason: string, timeMs: number, isMod: boolean) {
  if (reason) {
    reason = reason.replace(/\$sender/g, username);
  }
  clusteredClientTimeout(username, timeMs, reason, isMod);
}

export function getOwnerAsSender(): Readonly<UserStateTags & { userId: number }> {
  return {
    username: getOwner(),
    displayName: getOwner(),
    emotes: [],
    badges: {
      subscriber: 1,
    },
    'message-type': 'chat',
    color: '#000000',
    userType: 'empty',
    emoteSets: [],
    userId: Number(oauth.channelId),
  };
}

export function getOwner() {
  try {
    return oauth.generalOwners[0].trim();
  } catch (e) {
    return '';
  }
}
export function getOwners() {
  return oauth.generalOwners;
}

export function getBot() {
  try {
    return oauth.botUsername.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function getBotID() {
  try {
    return Number(oauth.botId);
  } catch (e) {
    return 0;
  }
}
export function getBotSender(): Readonly<CommandOptions['sender']> {
  return {
    username: getBot(),
    displayName: getBot(),
    userId: getBotID(),
    emotes: [],
    badges: {},
    'message-type': 'chat',
    color: '#000000',
    userType: 'empty',
    emoteSets: [],
    discord: undefined,
  };
}

export function getChannel() {
  try {
    return oauth.generalChannel.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function getBroadcaster() {
  try {
    return oauth.broadcasterUsername.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}

export function isBroadcaster(user: string | CommandOptions['sender'] | { username: string | null; userId?: number } | UserStateTags) {
  try {
    return oauth.broadcasterUsername.toLowerCase().trim() === (_.isString(user) ? user : user.username?.toLowerCase().trim());
  } catch (e) {
    return false;
  }
}

export function isModerator(user: UserInterface | UserStateTags): boolean {
  if ('mod' in user) {
    return user.mod === '1';
  }
  return user.isModerator ?? false;
}

export function isVIP(user: UserInterface): boolean {
  return user.isVIP ?? false;
}

export function isFollower(user: UserInterface): boolean {
  return user.isFollower ?? false;
}

export function isSubscriber(user: UserInterface): boolean {
  return user.isSubscriber ?? false;
}

export function isBot(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (oauth.botUsername) {
      return oauth.botUsername.toLowerCase().trim() === (_.isString(user) ? user : user.username.toLowerCase().trim());
    } else {
      return false;
    }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function isOwner(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (oauth.generalOwners) {
      const owners = _.map(_.filter(oauth.generalOwners, _.isString), (owner) => {
        return _.trim(owner.toLowerCase());
      });
      return _.includes(owners, (_.isString(user) ? user : user.username.toLowerCase().trim()));
    } else {
      return false;
    }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function getLocalizedName(number: number | string, translation: string): string {
  let single;
  let multi;
  let xmulti: { [x: string]: number } | null = null;
  let name;
  const names = translate(translation).split('|').map(Function.prototype.call, String.prototype.trim);
  number = _.isString(number) ? parseInt(number, 10) : number;

  switch (names.length) {
    case 1:
      single = multi = names[0];
      break;
    case 2:
      single = names[0];
      multi = names[1];
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

export function isUUID(s: string): boolean {
  const uuidRegex = /([0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12})/;
  return s.search(uuidRegex) >= 0;
}
