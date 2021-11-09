import { error } from '../../../helpers/log';
import client from '../api/client';

import { variables } from '~/watchers';

export async function createMarker () {
  const channelId = variables.get('services.twitch.channelId') as string;

  try {
    const clientBot = await client('bot');
    clientBot.streams.createStreamMarker(channelId, 'Marked from sogeBot');
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack || e.message);
    }
  }
}