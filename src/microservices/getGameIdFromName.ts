import axios from 'axios';
import { getRepository } from 'typeorm';

import { CacheGames } from '../database/entity/cacheGames';
import {
  calls, getClientId, getToken, setRateLimit, stats,
} from '../helpers/api';
import { error, warning } from '../helpers/log';
import { ioServer } from '../helpers/panel';

async function getGameIdFromName (name: string): Promise<number | null> {
  let request;
  const url = `https://api.twitch.tv/helix/games?name=${encodeURIComponent(name)}`;

  const gameFromDb = await getRepository(CacheGames).findOne({ name });

  // check if name is cached
  if (gameFromDb) {
    return gameFromDb.id;
  }

  try {
    request = await axios.get(url, {
      headers: {
        'Authorization': 'Bearer ' + await getToken('bot'),
        'Client-ID':     await getClientId('bot'),
      },
      timeout: 20000,
    });

    // save remaining api calls
    setRateLimit('bot', request.headers);
    ioServer?.emit('api.stats', {
      method: request.config.method?.toUpperCase(), data: request.data, timestamp: Date.now(), call: 'getGameIdFromName', api: 'helix', endpoint: request.config.url, code: request.status, remaining: calls.bot,
    });

    // add id->game to cache
    const id = Number(request.data.data[0].id);
    await getRepository(CacheGames).save({ id, name });
    return id;
  } catch (e) {
    warning(`Couldn't find name of game for name ${name} - fallback to ${stats.value.currentGame}`);
    if (e.isAxiosError) {
      error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getGameIdFromName', api: 'helix', endpoint: e.config.url, code: e.response.status, data: e.response?.data ?? 'n/a', remaining: calls.bot,
      });
    } else {
      error(e.stack);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getGameIdFromName', api: 'helix', endpoint: e.config.url, code: 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    return null;
  }
}

export { getGameIdFromName };