import { getRepository } from 'typeorm';

import { TwitchClips } from '../../../database/entity/twitch';
import { error } from '../../../helpers/log';
import client from '../api/client';
import { refresh } from '../token/refresh.js';

export async function checkClips () {
  try {
    const clientBot = await client('bot');
    let notCheckedClips = (await getRepository(TwitchClips).find({ isChecked: false }));

    // remove clips which failed
    for (const clip of notCheckedClips.filter((o) => new Date(o.shouldBeCheckedAt).getTime() < new Date().getTime())) {
      await getRepository(TwitchClips).remove(clip);
    }
    notCheckedClips = notCheckedClips.filter((o) => new Date(o.shouldBeCheckedAt).getTime() >= new Date().getTime());
    if (notCheckedClips.length === 0) { // nothing to do
      return { state: true };
    }

    const getClipsByIds = await clientBot.clips.getClipsByIds(notCheckedClips.map((o) => o.clipId));
    for (const clip of getClipsByIds) {
      // clip found in twitch api
      await getRepository(TwitchClips).update({ clipId: clip.id }, { isChecked: true });
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'Invalid OAuth token') {
        await refresh('bot');
      } else {
        error('checkClips => ' + e.stack ?? e.message);
      }
    }
  }
  return { state: true };
}