import axios from 'axios';

import {
  calls, emptyRateLimit, getClientId, getToken, setRateLimit, 
} from '../helpers/api';
import { error } from '../helpers/log';
import { ioServer } from '../helpers/panel';

async function getIdFromTwitch (username: string, isChannelId = false): Promise<string> {
  const url = `https://api.twitch.tv/helix/users?login=${username}`;
  let request;
  /*
    {
      "data": [{
        "id": "44322889",
        "login": "dallas",
        "display_name": "dallas",
        "type": "staff",
        "broadcaster_type": "",
        "description": "Just a gamer playing games and chatting. :)",
        "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
        "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
        "view_count": 191836881,
        "email": "login@provider.com"
      }]
    }
  */

  const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
  if (notEnoughAPICalls && !isChannelId) {
    throw new Error('API calls not available.');
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
    calls.bot.limit = request.headers['ratelimit-limit'];
    setRateLimit('bot', request.headers);
    calls.bot.remaining = request.headers['ratelimit-remaining'];
    calls.bot.refresh = request.headers['ratelimit-reset'];

    ioServer?.emit('api.stats', {
      method: 'GET', data: request.data, timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot, 
    });

    return String(request.data.data[0].id);
  } catch (e) {
    if (typeof e.response !== 'undefined' && e.response.status === 429) {
      emptyRateLimit('bot', e.response.headers);

      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot, 
      });
    } else {
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'getIdFromTwitch', api: 'helix', endpoint: url, code: 'n/a', data: e.stack, remaining: calls.bot, 
      });
    }
    error(`User ${username} not found on Twitch.`);
    throw(e);
  }
}

export { getIdFromTwitch };