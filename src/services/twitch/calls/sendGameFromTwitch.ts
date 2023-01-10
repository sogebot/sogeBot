import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';

async function sendGameFromTwitch (game: string): Promise<string[]> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const clientBot = await client('bot');
    const searchCategories = await clientBot.search.searchCategoriesPaginated(game).getAll();
    return searchCategories.map(o => o.name);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`sendGameFromTwitch => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return sendGameFromTwitch(game);
      }
      if (e.message.includes('Cannot initialize Twitch API, bot token invalid')) {
        return [];
      }
      if (e.message.includes('Invalid OAuth token')) {
        warning(`sendGameFromTwitch => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`sendGameFromTwitch => ${e.stack ?? e.message}`);
      }
    }
    return [];
  }
}

export { sendGameFromTwitch };