import {
  stats as apiStats,
} from '~/helpers/api/index.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { debug } from '~/helpers/log.js';
import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import twitch from '~/services/twitch.js';

export async function getChannelFollowers() {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }

  const response = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.channels.getChannelFollowers(getBroadcasterId(), getBroadcasterId()));
  if (!response) {
    return { state: false };
  }

  apiStats.value.currentFollowers = response.total;

  return { state: true };
}
