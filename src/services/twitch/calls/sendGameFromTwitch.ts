import { isDebugEnabled } from '~/helpers/debug.js';
import { debug, error, warning } from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';

async function sendGameFromTwitch (game: string): Promise<string[]> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const searchCategories = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.search.searchCategoriesPaginated(game).getAll()) ?? [];
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
      } else {
        error(`sendGameFromTwitch => ${e.stack ?? e.message}`);
      }
    }
    return [];
  }
}

export { sendGameFromTwitch };