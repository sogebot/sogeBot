import { CacheGames } from '@entity/cacheGames';
import { AppDataSource } from '~/database';

import client from '../api/client';

import { stats } from '~/helpers/api';
import { debug, isDebugEnabled, warning } from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';

async function getGameNameFromId (id: number): Promise<string> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  if (id.toString().trim().length === 0 || id === 0) {
    return '';
  } // return empty game if gid is empty

  const gameFromDb = await AppDataSource.getRepository(CacheGames).findOneBy({ id });

  // check if id is cached
  if (gameFromDb) {
    return gameFromDb.name;
  }

  try {
    const clientBot = await client('bot');
    const getGameById = await clientBot.games.getGameById(String(id));
    if (!getGameById) {
      throw new Error(`Couldn't find name of game for gid ${id} - fallback to ${stats.value.currentGame}`);
    }
    await AppDataSource.getRepository(CacheGames).save({ id, name: getGameById.name, thumbnail: getGameById.boxArtUrl });
    return getGameById.name;
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`getGameIdFromName => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return getGameNameFromId(id);
      } else {
        warning(`getGameNameFromId => ${e.stack ?? e.message}`);
      }
    }
    return stats.value.currentGame as string;
  }
}

export { getGameNameFromId };