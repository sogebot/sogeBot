import { HelixGame } from '@twurple/api/lib';

import { isDebugEnabled } from '~/helpers/debug';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, warning } from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import twitch from '~/services/twitch';

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