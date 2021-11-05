import { error } from '../../../helpers/log';
import client from '../api/client';

import { variable } from '~/helpers/variables';

export async function createMarker () {
  const channelId = variable.get('services.twitch.channelId') as string;

  try {
    const clientBot = await client('bot');
    clientBot.streams.createStreamMarker(channelId, 'Marked from sogeBot');
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack || e.message);
    }
  }
}