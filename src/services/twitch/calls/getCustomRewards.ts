import client from '../api/client';

import { error } from '~/helpers/log';
import { variable } from '~/helpers/variables';

export const getCustomRewards = async () => {
  try {
    const channelId = variable.get('services.twitch.channelId') as string;
    const clientBot = await client('bot');
    return await clientBot.channelPoints.getCustomRewards(channelId);
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
};