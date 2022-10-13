import { debug, error, isDebugEnabled, warning } from '../../../helpers/log';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName';
import client from '~/services/twitch/api/client';
import { variables } from '~/watchers';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';

export async function isFollowerUpdate (id: string): Promise<string | false> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }

  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    const clientBot = await client('bot');
    const helixFollow = await clientBot.users.getFollowFromUserToBroadcaster(id, broadcasterId);

    if (helixFollow) {
      return new Date(helixFollow.followDate).toISOString();
    }
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return isFollowerUpdate(id);
      }
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return false;
}