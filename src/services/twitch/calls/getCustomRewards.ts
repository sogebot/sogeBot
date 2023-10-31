import { HelixCustomReward } from '@twurple/api/lib';
import { HttpStatusCodeError } from '@twurple/api-call';
import { capitalize } from 'lodash-es';

import { isDebugEnabled } from '~/helpers/debug.js';
import { debug, error, info, warning } from '~/helpers/log.js';
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
        warning(`getCustomRewards => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return getCustomRewards();
      } else {
        if (e instanceof HttpStatusCodeError) {
          if (e.statusCode === 403) {
            info(`No channel custom rewards found. ${capitalize(JSON.parse(e.body).message)}`);
          } else {
            error(`getCustomRewards => ${e.statusCode} - ${JSON.parse(e.body).message}`);
          }
        } else {
          error(`getCustomRewards => ${e.stack ?? e.message}`);
        }
      }
    }
    return [];
  }
};