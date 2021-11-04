import client from '../api/client';

import { get } from '~/helpers/interfaceEmitter';
import { error } from '~/helpers/log';

export const getCustomRewards = async () => {
  try {
    const channelId = await get<string>('/services/twitch', 'channelId');
    const clientBot = await client('bot');
    return await clientBot.channelPoints.getCustomRewards(channelId);
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
};