import { TextChannel } from 'discord.js';
import _ from 'lodash';
import { UserStateTags } from 'twitch-js';

import { UserInterface } from './database/entity/user';
import { chatOut, debug, isDebugEnabled, warning, whisperOut } from './helpers/log';
import { error, info } from './helpers/log';
import Discord from './integrations/discord';
import { Message } from './message';
import oauth from './oauth';
import tmi from './tmi';
import { translate } from './translate';

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
    const sender = senderObject.discord
      ? { ...senderObject, discord: { author: senderObject.discord.author, channel: senderObject.discord.channel } } : senderObject;
    if (opts.attr?.skip) {
      return prepare(await response as string, { ...opts, sender }, false);
    } else {
      return await new Message(await response as string).parse({ ...opts, sender }) as string;
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
 * announce('Lorem Ipsum Dolor', 'timers);
 */
export const announceTypes = ['bets', 'duel', 'heist', 'timers', 'songs', 'scrim', 'raffles', 'polls', 'general'] as const;
export async function announce(messageToAnnounce: string, type: typeof announceTypes[number]) {
  messageToAnnounce = await new Message(messageToAnnounce).parse({ sender: getBotSender() }) as string;
  sendMessage(messageToAnnounce, {
    username: oauth.botUsername,
    displayName: oauth.botUsername,
    userId: oauth.botId,
    emotes: [],
    badges: {},
    'message-type': 'chat',
  }, { force: true, skip: true });

  if (Discord.sendAnnouncesToChannel[type].length > 0 && Discord.client) {
    // search discord channel by ID
    for (const [ id, channel ] of Discord.client.channels.cache) {
      if (channel.type === 'text') {
        if (id === Discord.sendAnnouncesToChannel[type] || (channel as TextChannel).name === Discord.sendAnnouncesToChannel[type]) {
          const ch = Discord.client.channels.cache.find(o => o.id === id);
          if (ch) {
            (ch as TextChannel).send(await Discord.replaceLinkedUsernameInMessage(messageToAnnounce));
            chatOut(`#${(ch as TextChannel).name}: ${messageToAnnounce} [${Discord.client.user?.tag}]`);
          }
        }
      }
    }
  }
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

export async function sendMessage(messageToSend: string | Promise<string>, sender: Partial<UserStateTagsWithId> | null, attr?: {
  sender?: Partial<UserStateTagsWithId>;
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
    messageToSend = await new Message(messageToSend).parse({...attr, sender: attr.sender ? attr.sender as UserStateTagsWithId : getBotSender()  }) as string;
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
        whisperOut(`${messageToSend} [${sender.username}]`);
        message('whisper', sender.username, messageToSend);
      } else {
        chatOut(`${messageToSend} [${sender.username}]`);
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
      if (isDebugEnabled('tmi')) {
        return;
      }
      if (type === 'me') {
        tmi.client.bot?.chat.say(username, `/me ${messageToSend}`);
      } else {
        tmi.client.bot?.chat[type](username, messageToSend);
      }
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
export async function timeout(username: string, reason: string, seconds: number, isMod: boolean) {
  if (reason) {
    reason = reason.replace(/\$sender/g, username);
  }
  if (isMod) {
    if (tmi.client.broadcaster) {
      tmi.client.broadcaster.chat.timeout(oauth.generalChannel, username, seconds, reason);
      info(`Bot will set mod status for ${username} after ${seconds} seconds.`);
      setTimeout(() => {
        // we need to remod user
        tmi.client.broadcaster?.chat.say(oauth.generalChannel, '/mod ' + username);
      }, (seconds * 1000) + 1000);
    } else {
      error('Cannot timeout mod user, as you don\'t have set broadcaster in chat');
    }
  } else {
    tmi.client.bot?.chat.timeout(oauth.generalChannel, username, seconds, reason);
  }
}

export function getOwnerAsSender(): Readonly<UserStateTags & { userId: string }> {
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
    userId: oauth.channelId,
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
    return oauth.botId;
  } catch (e) {
    return '0';
  }
}
export function getBotSender(): Readonly<CommandOptions['sender']> {
  return {
    username: getBot(),
    displayName: getBot(),
    userId: getBotID(),
    emotes: [],
    badges: {
      admin: false,
    },
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

export function isVIP(user: UserInterface): boolean {
  return user.isVIP ?? false;
}

export function isFollower(user: UserInterface): boolean {
  return user.isFollower ?? false;
}

export function isSubscriber(user: UserInterface): boolean {
  return user.isSubscriber ?? false;
}

export function isOwner(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (oauth.generalOwners) {
      const owners = oauth.generalOwners.filter(o => typeof o === 'string').map(o => o.trim().toLowerCase());
      return owners.includes(typeof user === 'string' ? user : user.username.toLowerCase().trim());
    } else {
      return false;
    }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
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
