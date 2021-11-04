import { HelixClip } from '../../../../node_modules/@twurple/api/lib';
import client from '../api/client';
import { getGameNameFromId } from './getGameNameFromId';

import { streamStatusChangeSince } from '~/helpers/api';
import { get } from '~/helpers/interfaceEmitter';
import { error } from '~/helpers/log';

export async function getTopClips (opts: any) {
  const channelId = await get<string>('/services/twitch', 'channelId');
  try {
    const period = {
      startDate: opts.period === 'stream'
        ? (new Date(streamStatusChangeSince.value)).toISOString()
        : (new Date((new Date()).setDate(-Math.min(opts.days, 0)))).toISOString(),
      endDate: (new Date()).toISOString(),
    };

    const clientBot = await client('bot');
    const getClipsForBroadcaster = await clientBot.clips.getClipsForBroadcasterPaginated(channelId, { ...period }).getAll();

    // get mp4 from thumbnail
    const clips: (Partial<HelixClip> & { mp4: string; game: string | null })[] = [];
    for (const c of getClipsForBroadcaster) {
      clips.push({
        ...c,
        mp4:  c.thumbnailUrl.replace('-preview-480x272.jpg', '.mp4'),
        game: await getGameNameFromId(Number(c.gameId)),
      });
    }
    return clips;
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
}