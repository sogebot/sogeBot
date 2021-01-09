import oauth from '../../oauth';
import tmi from '../../tmi';
import { error, info } from '../log';

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