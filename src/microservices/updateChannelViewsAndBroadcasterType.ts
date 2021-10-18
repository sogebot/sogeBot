import axios from 'axios';

import {
  calls, emptyRateLimit, getClientId, getToken, setRateLimit, stats,
} from '../helpers/api';
import { apiEmitter } from '../helpers/api/emitter';
import { error } from '../helpers/log';
import { channelId } from '../helpers/oauth';
import { ioServer } from '../helpers/panel';
import oauth from '../oauth';

apiEmitter.on('updateChannelViewsAndBroadcasterType', () => updateChannelViewsAndBroadcasterType());

async function updateChannelViewsAndBroadcasterType () {
  const cid = channelId.value;
  const url = `https://api.twitch.tv/helix/users/?id=${cid}`;

  const notEnoughAPICalls = calls.bot.remaining <= 30 && calls.bot.refresh > Date.now() / 1000;
  if (notEnoughAPICalls || cid === '') {
    return { state: false };
  }

  let request;
  try {
    request = await axios.get<any>(url, {
      headers: {
        'Authorization': 'Bearer ' + await getToken('bot'),
        'Client-ID':     await getClientId('bot'),
      },
    });
    // save remaining api calls
    setRateLimit('bot', request.headers as any);

    ioServer?.emit('api.stats', {
      method: 'GET', data: request.data, timestamp: Date.now(), call: 'updateChannelViewsAndBroadcasterType', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
    });

    if (request.data.data.length > 0) {
      oauth.profileImageUrl = request.data.data[0].profile_image_url;
      oauth.broadcasterType = request.data.data[0].broadcaster_type;
      stats.value.currentViews = request.data.data[0].view_count;
    }
  } catch (e: any) {
    if (typeof e.response !== 'undefined' && e.response.status === 429) {
      emptyRateLimit('bot', e.response.headers);
    }

    error(`${url} - ${e.message}`);
    ioServer?.emit('api.stats', {
      method: 'GET', timestamp: Date.now(), call: 'updateChannelViewsAndBroadcasterType', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.bot,
    });
  }
  return { state: true };
}

export { updateChannelViewsAndBroadcasterType };