import _ from 'lodash';

import { Message } from '../../message';
import {
  chatOut, debug, whisperOut, 
} from '../log';
import {
  getMuteStatus, message, sendWithMe, showWithAt, 
} from '../tmi';

import { getBotSender } from '.';

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
    messageToSend = await new Message(messageToSend).parse({ ...attr, sender: attr.sender ? attr.sender as UserStateTagsWithId : getBotSender()  }) as string;
  }
  if (messageToSend.length === 0) {
    return false;
  } // if message is empty, don't send anything

  // if sender is null/undefined, we can assume, that username is from dashboard -> bot
  if (!sender && !attr.force) {
    return false;
  } // we don't want to reply on bot commands

  if (sender) {
    messageToSend = !_.isNil(sender.username) ? messageToSend.replace(/\$sender/g, (showWithAt.value ? '@' : '') + sender.username) : messageToSend;
    if (!getMuteStatus() || attr.force) {
      if ((!_.isNil(attr.quiet) && attr.quiet)) {
        return true;
      }
      if (sender['message-type'] === 'whisper') {
        whisperOut(`${messageToSend} [${sender.username}]`);
        message('whisper', sender.username, messageToSend);
      } else {
        chatOut(`${messageToSend} [${sender.username}]`);
        if (sendWithMe.value && !messageToSend.startsWith('/')) {
          message('me', null, messageToSend);
        } else {
          message('say', null, messageToSend);
        }
      }
    }
    return true;
  }
}