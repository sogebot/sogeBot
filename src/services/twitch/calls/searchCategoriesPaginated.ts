import { HelixGame } from '@twurple/api/lib';

import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { debug, error, warning } from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';

async function searchCategoriesPaginated (game: string): Promise<HelixGame[]> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    return await twitch.apiClient?.asIntent(['bot'], ctx => ctx.search.searchCategoriesPaginated(game).getAll()) ?? [];
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return searchCategoriesPaginated(game);
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return [];
  }
}

export { searchCategoriesPaginated };