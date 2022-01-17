import { CacheGames } from '@entity/cacheGames';
import { getRepository } from 'typeorm';

import client from '../api/client';

import { stats } from '~/helpers/api';
import { warning } from '~/helpers/log';

async function getGameIdFromName (name: string): Promise<string | undefined> {
  const gameFromDb = await getRepository(CacheGames).findOne({ name });
  // check if name is cached
  if (gameFromDb) {
    return String(gameFromDb.id);
  }

  try {
    const clientBot = await client('bot');
    const getGameByName = await clientBot.games.getGameByName(name);
    if (!getGameByName) {
      throw new Error(`Game ${name} not found on Twitch - fallback to ${stats.value.currentGame}.`);
    }
    // add id->game to cache
    const id = Number(getGameByName.id);
    await getRepository(CacheGames).save({ id, name });
    return String(id);
  } catch (e: unknown) {
    if (e instanceof Error) {
      warning(`getGameIdFromName => ${e.stack ?? e.message}`);
    }
    return undefined;
  }
}

export { getGameIdFromName };