import { shuffle } from '@sogebot/ui-helpers/array';
import { DAY } from '@sogebot/ui-helpers/constants';
import { HelixClip } from '@twurple/api';

import client from '../api/client';
import { refresh } from '../token/refresh.js';
import { getGameNameFromId } from './getGameNameFromId';

import { streamStatusChangeSince } from '~/helpers/api';
import { getFunctionName } from '~/helpers/getFunctionName';
import { error, warning } from '~/helpers/log';
import { variables } from '~/watchers';

export async function getTopClips (opts: any) {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
  try {
    const period = {
      startDate: opts.period === 'stream'
        ? (new Date(streamStatusChangeSince.value)).toISOString()
        : new Date(Date.now() - opts.days * DAY).toISOString(),
      endDate: (new Date()).toISOString(),
    };

    const clientBot = await client('bot');
    const getClipsForBroadcaster = await clientBot.clips.getClipsForBroadcasterPaginated(broadcasterId, { ...period }).getAll();

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
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return [];
}