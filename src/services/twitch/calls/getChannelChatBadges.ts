import { HelixChatBadgeSet } from '@twurple/api/lib';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName';
import { error, warning } from '~/helpers/log';
import { variables } from '~/watchers';

export let badgesCache: HelixChatBadgeSet[] = [];

export async function getChannelChatBadges() {
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