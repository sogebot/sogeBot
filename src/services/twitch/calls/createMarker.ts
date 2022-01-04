import { error, warning } from '../../../helpers/log';
import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName';
import { variables } from '~/watchers';

export async function createMarker (description = 'Marked from sogeBot') {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    const clientBot = await client('bot');
    clientBot.streams.createStreamMarker(broadcasterId, description);
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
}