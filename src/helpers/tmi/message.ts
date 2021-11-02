import { error, isDebugEnabled } from '../log';
import { generalChannel } from '../oauth/generalChannel';

import twitch from '~/services/twitch';
import tmi from '~/services/twitch/chat';

export async function message(type: 'say' | 'whisper' | 'me', username: string | undefined | null, messageToSend: string, messageId?: string, retry = true) {
  try {
    if (username === null || typeof username === 'undefined') {
      username = generalChannel.value;
    }
    if (username === '') {
      error('TMI: channel is not defined, message cannot be sent');
    } else {
      if (isDebugEnabled('tmi.message') || !tmi.client.bot) {
        return;
      }
      if (type === 'me') {
        tmi.client.bot.say(username, `/me ${messageToSend}`);
      } else {
        if (twitch.sendAsReply) {
          tmi.client.bot.say(username, messageToSend, { replyTo: messageId });
        } else {
          tmi.client.bot[type](username, messageToSend);
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