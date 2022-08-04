import client from '../api/client';
import { refresh } from '../token/refresh.js';

import {
  stats as apiStats,
} from '~/helpers/api';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import { variables } from '~/watchers';

export async function getLatest100Followers () {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const clientBot = await client('bot');

    const getFollows = await clientBot.users.getFollows({ followedUser: broadcasterId, limit: 100 });
    apiStats.value.currentFollowers = getFollows.total;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false };
  }
  return { state: true };
}