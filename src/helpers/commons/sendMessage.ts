import type { HelixChatAnnouncementColor } from '@twurple/api';
import _ from 'lodash-es';

import { getUserSender } from './getUserSender.js';
import { timer } from '../../decorators.js';
import { Message } from '../../message.js';
import {
  chatOut, debug, whisperOut,
} from '../log.js';
import {
  getMuteStatus, message, sendWithMe, showWithAt,
} from '../tmi/index.js';
import getBotId from '../user/getBotId.js';
import getBotUserName from '../user/getBotUserName.js';
import getBroadcasterId from '../user/getBroadcasterId.js';

import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

const getAnnouncementColor = (command: string): HelixChatAnnouncementColor => {
  const color = command.replace('/announce', '');
  if (color.trim().length === 0) {
    return 'primary';
  } else {
    return color.trim() as HelixChatAnnouncementColor;
  }
};

// exposing functions to @timer decorator
class HelpersCommons {
  @timer()
  async sendMessage(messageToSend: string | Promise<string>, sender: Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> | null | { userName: string; userId: string }, attr?: {
    sender?: Partial<Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'>>;
    discord?: CommandOptions['discord'];
    quiet?: boolean;
    skip?: boolean;
    forceWithoutAt?: boolean;
    force?: boolean;
    isWhisper?: boolean;
    [x: string]: any;
  }, id?: string) {
    if (id === 'null') {
      id = undefined;
    }
    messageToSend = await messageToSend as string; // await if messageToSend is promise (like prepare)
    attr = attr || {};
    sender = sender || null;

    if (messageToSend.length > 470) {
      // splitting message
      for (const msg of messageToSend.match(/.{1,470}/g) ?? []) {
        await sendMessage(msg, sender, attr, id);
      }
      return;
    }

    if (sendWithMe.value) {
      // replace /me in message if we are already sending with /me
      messageToSend = messageToSend.replace(/^(\/me)/gi, '').trim();
    }

    debug('sendMessage.message', messageToSend);
    debug('commons.sendMessage', JSON.stringify({
      messageToSend, sender, attr,
    }));

    if (sender) {
      attr.sender = sender;
    }

    if (!attr.skip) {
      messageToSend = await new Message(messageToSend).parse({ ...attr, sender: attr.sender ? attr.sender as UserStateTagsWithId : getUserSender(getBotId(), getBotUserName()), discord: attr.discord  }) as string;
    }
    if (messageToSend.length === 0) {
      return false;
    } // if message is empty, don't send anything

    // if sender is null/undefined, we can assume, that userName is from dashboard -> bot
    if (!sender && !attr.force) {
      return false;
    } // we don't want to reply on bot commands

    if (sender) {
      messageToSend = !_.isNil(sender.userName) ? messageToSend.replace(/\$sender/g, (showWithAt.value ? '@' : '') + sender.userName) : messageToSend;
      if (!getMuteStatus() || attr.force) {
        if ((!_.isNil(attr.quiet) && attr.quiet)) {
          return true;
        }
        if (attr.isWhisper) {
          whisperOut(`${messageToSend} [${sender.userName}]`);
          message('whisper', sender.userName, messageToSend, id);
        } else {
          chatOut(`${messageToSend} [${sender.userName}]`);
          if (sendWithMe.value && !messageToSend.startsWith('/')) {
            message('me', sender.userName, messageToSend, id);
          } else {
            if (messageToSend === '/subscribers') {
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                subscriberOnlyModeEnabled: true,
              }));
            } else if (messageToSend === '/subscribersoff') {
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                subscriberOnlyModeEnabled: false,
              }));
            } else if (messageToSend === '/emoteonly') {
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                emoteOnlyModeEnabled: true,
              }));
            } else if (messageToSend === '/emoteonlyoff') {
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                emoteOnlyModeEnabled: false,
              }));
            } else if (messageToSend === '/followersoff') {
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                followerOnlyModeEnabled: false,
              }));
            } else if (messageToSend.includes('/followers')) {
              const [, duration] = messageToSend.split(' ');
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                followerOnlyModeEnabled: true,
                followerOnlyModeDelay:   duration ? Number(duration) : undefined,
              }));
            } else if (messageToSend === '/slowoff') {
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                slowModeEnabled: true,
              }));
            } else if (messageToSend.includes('/slow')) {
              const [, duration] = messageToSend.split(' ');
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), {
                slowModeEnabled: true,
                slowModeDelay:   duration ? Number(duration) : undefined,
              }));
            } else if (messageToSend.startsWith('/announce')) {
              // get color
              const [ announce, ...messageArray ] = messageToSend.split(' ');

              const botCurrentScopes = variables.get('services.twitch.botCurrentScopes') as string[];
              if (!botCurrentScopes.includes('moderator:manage:announcements')) {
                message('say', sender.userName, 'Bot is missing moderator:manage:announcements scope, please reauthorize in dashboard.', id);
                return true;
              }

              const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
              const color = getAnnouncementColor(announce);
              twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.sendAnnouncement(broadcasterId, {
                message: messageArray.join(' '),
                color,
              }));
            } else {
              message('say', sender.userName, messageToSend, id);
            }
          }
        }
      }
      return true;
    }

  }
}
const self = new HelpersCommons();

export async function sendMessage(messageToSend: string | Promise<string>, sender: Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'> | null | { userName: string; userId: string }, attr?: {
  sender?: Partial<Omit<ChatUser, '_userName' | '_userData' | '_parseBadgesLike'>>;
  quiet?: boolean;
  skip?: boolean;
  force?: boolean;
  isWhisper?: boolean;
  forceWithoutAt?: boolean;
  [x: string]: any;
}, id?: string) {
  return self.sendMessage(messageToSend, sender, attr, id);
}