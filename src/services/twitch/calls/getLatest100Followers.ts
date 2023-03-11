import {
  stats as apiStats,
} from '~/helpers/api';
import { follow } from '~/helpers/events/follow';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import twitch from '~/services/twitch';
import { variables } from '~/watchers';

export async function getLatest100Followers () {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const getFollows = await twitch.apiClient?.channels.getChannelFollowers(broadcasterId, broadcasterId, undefined, { limit: 100 });

    if (!getFollows) {
      return { state: false };
    }

    for (const follower of getFollows.data ?? []) {
      follow(follower.userId, follower.userName, new Date(follower.followDate).toISOString());
    }
    apiStats.value.currentFollowers = await getFollows.total;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        return { state: false }; // ignore etimedout error
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false };
  }
  return { state: true };
}