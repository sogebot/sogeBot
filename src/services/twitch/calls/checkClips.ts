import { debug } from 'console';

import { TwitchClips } from '../../../database/entity/twitch.js';
import { error, warning } from '../../../helpers/log.js';

import { AppDataSource } from '~/database.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import twitch from '~/services/twitch.js';

export async function checkClips () {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    let notCheckedClips = (await AppDataSource.getRepository(TwitchClips).findBy({ isChecked: false }));

    // remove clips which failed
    for (const clip of notCheckedClips.filter((o) => new Date(o.shouldBeCheckedAt).getTime() < new Date().getTime())) {
      await AppDataSource.getRepository(TwitchClips).remove(clip);
    }
    notCheckedClips = notCheckedClips.filter((o) => new Date(o.shouldBeCheckedAt).getTime() >= new Date().getTime());
    if (notCheckedClips.length === 0) { // nothing to do
      return { state: true };
    }

    const getClipsByIds = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.clips.getClipsByIds(notCheckedClips.map((o) => o.clipId)));
    for (const clip of getClipsByIds ?? []) {
      // clip found in twitch api
      await AppDataSource.getRepository(TwitchClips).update({ clipId: clip.id }, { isChecked: true });
    }
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