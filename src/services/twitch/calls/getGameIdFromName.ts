import { CacheGames } from '@entity/cacheGames.js';

import { AppDataSource } from '~/database.js';
import { stats } from '~/helpers/api/index.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { debug, warning } from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';

async function getGameIdFromName (name: string): Promise<string | undefined> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  const gameFromDb = await AppDataSource.getRepository(CacheGames).findOneBy({ name });
  // check if name is cached
  if (gameFromDb) {
    return String(gameFromDb.id);
  }

  try {
    const getGameByName = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.games.getGameByName(name));
    if (!getGameByName) {
      throw new Error(`Game ${name} not found on Twitch - fallback to ${stats.value.currentGame}.`);
    }
    // add id->game to cache
    const id = Number(getGameByName.id);
    await AppDataSource.getRepository(CacheGames).save({ id, name, thumbnail: getGameByName.boxArtUrl });
    return String(id);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`getGameIdFromName => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return getGameIdFromName(name);
      } else {
        warning(`getGameIdFromName => ${e.stack ?? e.message}`);
      }
    }
    return undefined;
  }
}

export { getGameIdFromName };