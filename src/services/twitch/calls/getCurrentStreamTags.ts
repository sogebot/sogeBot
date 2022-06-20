import { rawDataSymbol } from '@twurple/common';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { currentStreamTags } from '~/helpers/api';
import { getFunctionName } from '~/helpers/getFunctionName';
import { error, warning } from '~/helpers/log';
import { variables } from '~/watchers';

export async function getCurrentStreamTags (opts: any) {
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const clientBot = await client('bot');
    const getStreamTags = await clientBot.streams.getStreamTags(broadcasterId);
    while (currentStreamTags.length) {
      currentStreamTags.pop();
    }
    for (const tag of getStreamTags) {
      currentStreamTags.push({ is_auto: tag.isAuto, localization_names: tag[rawDataSymbol].localization_names });
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false, opts };
  }
  return { state: true, opts };
}