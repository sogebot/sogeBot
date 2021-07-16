import axios from 'axios';
import { getRepository } from 'typeorm';

import { CacheGames } from '../database/entity/cacheGames';
import {
  calls, emptyRateLimit, getClientId, getToken, setRateLimit, stats,
} from '../helpers/api';
import { error, warning } from '../helpers/log';
import { ioServer } from '../helpers/panel';

async function getGameNameFromId (id: number) {
  let request;
  const url = `https://api.twitch.tv/helix/games?id=${id}`;

  if (id.toString().trim().length === 0 || id === 0) {
    return '';
  } // return empty game if gid is empty

  const gameFromDb = await getRepository(CacheGames).findOne({ id });

  // check if id is cached
  if (gameFromDb) {
    return gameFromDb.name;
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
      method: 'GET', data: request.data, timestamp: Date.now(), call: 'getGameNameFromId', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
    });

    // add id->game to cache
    const name = request.data.data[0].name;
    await getRepository(CacheGames).save({ id, name });
    return name;
  } catch (e) {
    if (typeof e.response !== 'undefined' && e.response.status === 429) {
      emptyRateLimit('bot', e.response.headers);
    }

    warning(`Couldn't find name of game for gid ${id} - fallback to ${stats.value.currentGame}`);
    if (e.isAxiosError) {
      error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getGameNameFromId', api: 'helix', endpoint: e.config.url, code: e.response.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.bot,
      });
    } else {
      error(e.stack);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'getGameNameFromId', api: 'helix', endpoint: e.config.url, code: 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    return stats.value.currentGame;
  }
}

export { getGameNameFromId };