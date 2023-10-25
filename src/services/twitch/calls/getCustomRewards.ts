import { HelixCustomReward } from '@twurple/api/lib';

import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { debug, error, warning } from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

export const getCustomRewards = async (): Promise<HelixCustomReward[]> => {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    return await twitch.apiClient?.asIntent(['broadcaster'], ctx=> ctx.channelPoints.getCustomRewards(broadcasterId)) ?? [];
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return getCustomRewards();
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return [];
  }
};