import { capitalize } from 'lodash-es';
import XRegExp from 'xregexp';

import { error } from '../log.js';

import { isDebugEnabled } from '~/helpers/debug.js';
import { tmiEmitter } from '~/helpers/tmi/index.js';
import { variables } from '~/watchers.js';

export async function message(type: 'say' | 'whisper' | 'me', username: string | undefined | null, messageToSend: string, messageId?: string, retry = true) {
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const sendAsReply = variables.get('services.twitch.sendAsReply') as string;
  try {
    if (username === null || typeof username === 'undefined') {
      username = botUsername;
    }
    if (broadcasterUsername === '') {
      error('TMI: channel is not defined, message cannot be sent');
    } else {
      if (isDebugEnabled('tmi.message')) {
        return;
      }
      if (type === 'me') {
        tmiEmitter.emit('say', broadcasterUsername, `/me ${messageToSend}`);
      } else {
        // strip username if username is bot or is reply
        if ((sendAsReply && messageId) || username === botUsername) {
          if (messageToSend.startsWith(username) || messageToSend.startsWith('@' + username)) {
            const regexp = XRegExp(`^@?${username}\\s?\\P{L}?`);
            messageToSend = capitalize(messageToSend.replace(regexp, '').trim());
          }
          tmiEmitter.emit('say', broadcasterUsername, `${messageToSend}`, { replyTo: messageId });
        } else {
          tmiEmitter.emit(type as any, broadcasterUsername, `${messageToSend}`);
        }
      }
    }
  } catch (e: any) {
    if (retry) {
      setTimeout(() => message(type, username, messageToSend, messageId, false), 5000);
    } else {
      error(JSON.stringify({
        e: e.stack, type, username, messageToSend, messageId, retry,
      }, null, 2));
    }
  }
}
