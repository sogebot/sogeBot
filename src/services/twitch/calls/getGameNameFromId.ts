import { CacheGames } from '@entity/cacheGames';
import { getRepository } from 'typeorm';

import client from '../api/client';

import { stats } from '~/helpers/api';
import { debug, isDebugEnabled, warning } from '~/helpers/log';

async function getGameNameFromId (id: number) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  if (id.toString().trim().length === 0 || id === 0) {
    return '';
  } // return empty game if gid is empty

  const gameFromDb = await getRepository(CacheGames).findOne({ id });

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
    await getRepository(CacheGames).save({ id, name: getGameById.name });
    return getGameById.name;
  } catch (e: unknown) {
    if (e instanceof Error) {
      warning(`getGameNameFromId => ${e.stack ?? e.message}`);
    }
    return stats.value.currentGame;
  }
}

export { getGameNameFromId };