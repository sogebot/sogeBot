import { HelixChatBadgeSet } from '@twurple/api/lib';

import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import twitch from '~/services/twitch';
import { variables } from '~/watchers';

export let badgesCache: HelixChatBadgeSet[] = [];

export async function getChannelChatBadges() {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    if (!twitch.apiClient) {
      return { state: false };
    }

    badgesCache = [
      ...await twitch.apiClient.asIntent(['broadcaster'], ctx => ctx.chat.getChannelBadges(broadcasterId)),
      ...await twitch.apiClient.asIntent(['broadcaster'], ctx => ctx.chat.getGlobalBadges()),
    ];
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        return { state: false }; // ignore etimedout error
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return { state: true };
}