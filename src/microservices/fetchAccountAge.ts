import axios from 'axios';
import { getRepository } from 'typeorm';

import { User } from '../database/entity/user';
import { getToken } from '../helpers/api';
import { error } from '../helpers/log';
import { ioServer } from '../helpers/panel';

async function fetchAccountAge (id?: string | null) {
  if (id === '0' || id === null || typeof id === 'undefined') {
    return;
  }

  const url = `https://api.twitch.tv/kraken/users/${id}`;
  let request;
  try {
    request = await axios.get(url, {
      headers: {
        'Accept':        'application/vnd.twitchtv.v5+json',
        'Authorization': 'OAuth ' + await getToken('bot'),
      },
      timeout: 20000,
    });

    ioServer?.emit('api.stats', {
      method: 'GET', data: request.data, timestamp: Date.now(), call: 'fetchAccountAge', api: 'helix', endpoint: url, code: request.status, remaining: request.headers,
    });
  } catch (e) {
    if (e.errno === 'ECONNRESET' || e.errno === 'ECONNREFUSED' || e.errno === 'ETIMEDOUT') {
      return;
    } // ignore ECONNRESET errors

    let logError;
    try {
      logError = e.response.data.status !== 422;
    } catch (e2) {
      logError = true;
    }

    if (logError) {
      if (e.isAxiosError) {
        error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'fetchAccountAge', api: 'helix', endpoint: e.config.url, code: e.response.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: e.request.headers,
        });
      } else {
        error(e.stack);
        ioServer?.emit('api.stats', {
          method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'fetchAccountAge', api: 'helix', endpoint: e.config.url, code: 'n/a', data: e.stack, remaining: e.request.headers,
        });
      }
    }
    return;
  }
  await getRepository(User).update({ userId: id }, { createdAt: new Date(request.data.created_at).getTime() });
}

export { fetchAccountAge };