import { debug, error, isDebugEnabled, warning } from '../../../helpers/log';

import { getFunctionName } from '~/helpers/getFunctionName';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import twitch from '~/services/twitch';
import { variables } from '~/watchers';

export async function isFollowerUpdate (id: string): Promise<string | false> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }

  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    const helixFollow = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getFollowFromUserToBroadcaster(id, broadcasterId));

    if (helixFollow) {
      return new Date(helixFollow.followDate).toISOString();
    }
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return isFollowerUpdate(id);
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return false;
}