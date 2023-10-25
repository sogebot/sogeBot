import { CacheGames } from '@entity/cacheGames.js';

import { AppDataSource } from '~/database.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { debug, warning } from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';

async function getGameThumbnailFromName (name: string): Promise<string | undefined> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  const gameFromDb = await AppDataSource.getRepository(CacheGames).findOneBy({ name });
  // check if name is cached
  if (gameFromDb && gameFromDb.thumbnail) {
    return String(gameFromDb.thumbnail);
  }

  try {
    const getGameByName = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.games.getGameByName(name));
    if (!getGameByName) {
      return undefined;
    }
    // add id->game to cache
    const id = Number(getGameByName.id);
    await AppDataSource.getRepository(CacheGames).save({ id, name, thumbnail: getGameByName.boxArtUrl });
    return String(id);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`getGameThumbnailFromName => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return getGameThumbnailFromName(name);
      } else {
        warning(`getGameThumbnailFromName => ${e.stack ?? e.message}`);
      }
    }
    return undefined;
  }
}

export { getGameThumbnailFromName };