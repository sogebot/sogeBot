import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName';
import { error, warning } from '~/helpers/log';
import { variables } from '~/watchers';

export const getCustomRewards = async () => {
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const clientBroadcaster = await client('broadcaster');
    return await clientBroadcaster.channelPoints.getCustomRewards(broadcasterId);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
};