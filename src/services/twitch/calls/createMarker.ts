import { error } from '../../../helpers/log';
import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { variables } from '~/watchers';

export async function createMarker (description = 'Marked from sogeBot') {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    const clientBot = await client('bot');
    clientBot.streams.createStreamMarker(broadcasterId, description);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'Invalid OAuth token') {
        await refresh('bot');
      } else {
        error('createMarker => ' + e.stack ?? e.message);
      }
    }
  }
}