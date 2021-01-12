import tmi from '../../tmi';
import { error, isDebugEnabled } from '../log';
import { generalChannel } from '../oauth/generalChannel';

export async function message(type: 'say' | 'whisper' | 'me', username: string | undefined | null, messageToSend: string, retry = true) {
  try {
    if (username === null || typeof username === 'undefined') {
      username = generalChannel.value;
    }
    if (username === '') {
      error('TMI: channel is not defined, message cannot be sent');
    } else {
      if (isDebugEnabled('tmi.message')) {
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