import { error } from '../../../helpers/log';
import client from '../api/client';

import { get } from '~/helpers/interfaceEmitter';

export async function createMarker () {
  const cid = await get<string>('/services/twitch', 'channelId');

  try {
    const clientBot = await client('bot');
    clientBot.streams.createStreamMarker(cid, 'Marked from sogeBot');
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack || e.message);
    }
  }
}