import client from '../api/client';
import { refresh } from '../token/refresh';

import { getFunctionName } from '~/helpers/getFunctionName';
import { error, warning } from '~/helpers/log';

async function getIdFromTwitch (userName: string): Promise<string> {
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
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    throw(e);
  }
}

export { getIdFromTwitch };