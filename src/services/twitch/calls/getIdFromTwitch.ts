import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { error } from '~/helpers/log';

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
      if (e.message === 'Invalid OAuth token') {
        await refresh('bot');
      } else {
        error('getIdFromTwitch => ' + e.stack ?? e.message);
      }
    }
    throw(e);
  }
}

export { getIdFromTwitch };