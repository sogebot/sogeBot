import { HelixStreamMarker } from '@twurple/api/lib';

import { debug, error, warning } from '../../../helpers/log.js';

import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

export async function createMarker (description = 'Marked from sogeBot'): Promise<HelixStreamMarker | null> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    return await twitch.apiClient?.asIntent(['bot'], ctx => ctx.streams.createStreamMarker(broadcasterId, description)) ?? null;
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return createMarker(description);
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return null;
}