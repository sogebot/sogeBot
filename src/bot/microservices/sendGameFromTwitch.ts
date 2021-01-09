import { error } from 'console';

import axios from 'axios';
import { isNull, map } from 'lodash';
import { Socket } from 'socket.io';

import { calls, getClientId, getToken, setRateLimit } from '../helpers/api';
import { ioServer } from '../helpers/panel';
import oauth from '../oauth';

async function sendGameFromTwitch (socket: Socket | null, game: string) {
  const url = `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(game)}`;

  const token = oauth.botAccessToken;
  if (token === '') {
    return;
  }

  let request;
  try {
    request = await axios.get(url, {
      headers: {
        'Authorization': 'Bearer ' + getToken('bot'),
        'Client-ID': getClientId('bot'),
      },
      timeout: 20000,
    });
    // save remaining api calls
    setRateLimit('bot', request.headers);

    ioServer?.emit('api.stats', { method: 'GET', data: request.data, timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot });
  } catch (e) {
    if (e.isAxiosError) {
      error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
      ioServer?.emit('api.stats', { method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.response.data, remaining: calls.bot });
    } else {
      error(e.stack);
      ioServer?.emit('api.stats', { method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'sendGameFromTwitch', api: 'helix', endpoint: e.config.url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot });
    }
    return;
  }

  if (isNull(request.data.data)) {
    if (socket) {
      socket.emit('sendGameFromTwitch', []);
    }
    return false;
  } else {
    if (socket) {
      socket.emit('sendGameFromTwitch', map(request.data.data, 'name'));
    }
    return map(request.data.data, 'name');
  }
}

export { sendGameFromTwitch };