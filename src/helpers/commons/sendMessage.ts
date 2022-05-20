import _ from 'lodash';

import { timer } from '../../decorators.js';
import { Message } from '../../message';
import {
  chatOut, debug, whisperOut,
} from '../log';
import {
  getMuteStatus, message, sendWithMe, showWithAt,
} from '../tmi';

import { getBotSender } from '.';

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
      messageToSend = await new Message(messageToSend).parse({ ...attr, sender: attr.sender ? attr.sender as UserStateTagsWithId : getBotSender(), discord: attr.discord  }) as string;
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
            message('say', sender.userName, messageToSend, id);
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