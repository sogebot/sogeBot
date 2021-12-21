import { shuffle } from '@sogebot/ui-helpers/array';
import { DAY } from '@sogebot/ui-helpers/constants';

import { HelixClip } from '../../../../node_modules/@twurple/api/lib';
import client from '../api/client';
import { refresh } from '../token/refresh.js';
import { getGameNameFromId } from './getGameNameFromId';

import { streamStatusChangeSince } from '~/helpers/api';
import { error } from '~/helpers/log';
import { variables } from '~/watchers';

export async function getTopClips (opts: any) {
  const channelId = variables.get('services.twitch.channelId') as string;
  try {
    const period = {
      startDate: opts.period === 'stream'
        ? (new Date(streamStatusChangeSince.value)).toISOString()
        : new Date(Date.now() - opts.days * DAY).toISOString(),
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
    return shuffle(clips).slice(0, opts.first);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'Invalid OAuth token') {
        await refresh('bot');
      } else {
        error('getTopClips => ' + e.stack ?? e.message);
      }
    }
  }
  return [];
}