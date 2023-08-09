import {
  stats as apiStats,
} from '~/helpers/api';
import { isDebugEnabled } from '~/helpers/debug';
import { debug } from '~/helpers/log';
import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

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
