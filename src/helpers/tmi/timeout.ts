import { error, info } from '../log';
import { generalChannel } from '../oauth/generalChannel';

import tmi from '~/services/twitch/chat';

export async function timeout(username: string, seconds: number, isMod: boolean) {
  if (isMod) {
    if (tmi.client.broadcaster) {
      tmi.client.broadcaster.timeout(generalChannel.value, username, seconds);
      info(`Bot will set mod status for ${username} after ${seconds} seconds.`);
      setTimeout(() => {
        // we need to remod user
        tmi.client.broadcaster?.mod(generalChannel.value, username);
      }, (seconds * 1000) + 1000);
    } else {
      error('Cannot timeout mod user, as you don\'t have set broadcaster in chat');
    }
  } else {
    tmi.client.bot?.timeout(generalChannel.value, username, seconds);
  }
}