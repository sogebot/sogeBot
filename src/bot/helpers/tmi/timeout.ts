import tmi from '../../tmi';
import { error, info } from '../log';
import { generalChannel } from '../oauth/generalChannel';

export async function timeout(username: string, seconds: number, isMod: boolean) {
  if (isMod) {
    if (tmi.client.broadcaster) {
      tmi.client.broadcaster.chat.timeout(generalChannel.value, username, seconds);
      info(`Bot will set mod status for ${username} after ${seconds} seconds.`);
      setTimeout(() => {
        // we need to remod user
        tmi.client.broadcaster?.chat.say(generalChannel.value, '/mod ' + username);
      }, (seconds * 1000) + 1000);
    } else {
      error('Cannot timeout mod user, as you don\'t have set broadcaster in chat');
    }
  } else {
    tmi.client.bot?.chat.timeout(generalChannel.value, username, seconds);
  }
}