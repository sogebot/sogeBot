import { HelixChatBadgeSet } from '@twurple/api/lib';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import { variables } from '~/watchers';

export let badgesCache: HelixChatBadgeSet[] = [];

export async function getChannelChatBadges() {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const clientBroadcaster = await client('broadcaster');

    badgesCache = [
      ...await clientBroadcaster.chat.getChannelBadges(broadcasterId),
      ...await clientBroadcaster.chat.getGlobalBadges(),
    ];
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('broadcaster');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return { state: true };
}