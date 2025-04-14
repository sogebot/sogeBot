import { HelixClip } from '@twurple/api/lib';
import { shuffle } from 'lodash-es';
import youtubeDlExec from 'youtube-dl-exec';

import { getGameNameFromId } from './getGameNameFromId.js';

import { streamStatusChangeSince } from '~/helpers/api/index.js';
import { DAY } from '~/helpers/constants.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { debug, error, warning } from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

export async function getTopClips (opts: any): Promise<(Partial<HelixClip> & { mp4: string; game: string | null })[]> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
  try {
    const period = {
      startDate: opts.period === 'stream'
        ? (new Date(streamStatusChangeSince.value)).toISOString()
        : new Date(Date.now() - opts.days * DAY).toISOString(),
      endDate: (new Date()).toISOString(),
    };
    // shuffle and pick clips before getting URLs
    const getClipsForBroadcaster = shuffle(await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.clips.getClipsForBroadcasterPaginated(broadcasterId, { ...period }).getAll()) as unknown as (HelixClip & { mp4: string; game: string | null })[]).slice(0, opts.first);

    // get mp4 from thumbnail
    const clips: (Partial<HelixClip> & { mp4: string; game: string | null })[] = [];
    await Promise.all(getClipsForBroadcaster.map(async(c) => {
      const payload = await youtubeDlExec(c.url, {
        getUrl: true,
      });
      c.mp4 = payload.toString();
      // c.mp4 = c.thumbnailUrl.replace('-preview-480x272.jpg', '.mp4');
      c.game = await getGameNameFromId(Number(c.gameId));
      clips.push(c);
    }));
    return clips;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return getTopClips(opts);
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return [];
}