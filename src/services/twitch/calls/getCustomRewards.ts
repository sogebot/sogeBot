import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { error } from '~/helpers/log';
import { variables } from '~/watchers';

export const getCustomRewards = async () => {
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const clientBroadcaster = await client('broadcaster');
    return await clientBroadcaster.channelPoints.getCustomRewards(broadcasterId);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'Invalid OAuth token') {
        await refresh('broadcaster');
      } else {
        error('getCustomRewards => ' + e.stack ?? e.message);
      }
    }
  }
};