import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { debug, error, isDebugEnabled, warning } from '~/helpers/log';

async function getIdFromTwitch (userName: string): Promise<string> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const clientBot = await client('bot');
    const getUserByName = await clientBot.users.getUserByName(userName);
    if (getUserByName) {
      return getUserByName.id;
    } else {
      throw new Error(`User ${userName} not found on Twitch.`);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`getIdFromTwitch => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else if(e.message.includes('not found on Twitch')) {
        warning(`${e.message}`);
      } else {
        error(`getIdFromTwitch => ${e.stack ?? e.message}`);
      }
    }
    throw(e);
  }
}

export { getIdFromTwitch };