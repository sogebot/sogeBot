import { rawDataSymbol } from '../../../../node_modules/@twurple/common/lib';
import client from '../api/client';

import { currentStreamTags } from '~/helpers/api';
import { error } from '~/helpers/log';
import { variables } from '~/watchers';

export async function getCurrentStreamTags (opts: any) {
  try {
    const channelId = variables.get('services.twitch.channelId') as string;
    const clientBot = await client('bot');
    const getStreamTags = await clientBot.streams.getStreamTags(channelId);
    while (currentStreamTags.length) {
      currentStreamTags.pop();
    }
    for (const tag of getStreamTags) {
      currentStreamTags.push({ is_auto: tag.isAuto, localization_names: tag[rawDataSymbol].localization_names });
    }
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
    return { state: false, opts };
  }
  return { state: true, opts };
}