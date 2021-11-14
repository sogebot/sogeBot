import { error, isDebugEnabled } from '../log';

import { tmiEmitter } from '~/helpers/tmi';
import twitch from '~/services/twitch';
import { variables } from '~/watchers';

export async function message(type: 'say' | 'whisper' | 'me', username: string | undefined | null, messageToSend: string, messageId?: string, retry = true) {
  const generalChannel = variables.get('services.twitch.generalChannel') as string;
  try {
    if (username === null || typeof username === 'undefined') {
      username = generalChannel;
    }
    if (username === '') {
      error('TMI: channel is not defined, message cannot be sent');
    } else {
      if (isDebugEnabled('tmi.message')) {
        return;
      }
      if (type === 'me') {
        tmiEmitter.emit('say', username, `/me ${messageToSend}`);
      } else {
        if (twitch.sendAsReply) {
          if (messageToSend.startsWith(username) || messageToSend.startsWith('@' + username)) {
            const regexp = new RegExp(`^@?${username}\\s?\\W?`);
            messageToSend = messageToSend.replace(regexp, '').trim();
          }
          tmiEmitter.emit('say', username, `${messageToSend}`, { replyTo: messageId });
        } else {
          tmiEmitter.emit(type as any, username, `${messageToSend}`);
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