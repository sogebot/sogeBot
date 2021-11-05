import { defaults } from 'lodash';
import { getRepository } from 'typeorm';

import { TwitchClips } from '../../../database/entity/twitch';
import { error } from '../../../helpers/log';
import client from '../api/client';

import { isStreamOnline } from '~/helpers/api';
import { variable } from '~/helpers/variables';

export async function createClip (opts: { createAfterDelay: boolean }) {
  if (!(isStreamOnline.value)) {
    return;
  } // do nothing if stream is offline

  const isClipChecked = async function (id: string) {
    return new Promise((resolve: (value: boolean) => void) => {
      const check = async () => {
        const clip = await getRepository(TwitchClips).findOne({ clipId: id });
        if (!clip) {
          resolve(false);
        } else if (clip.isChecked) {
          resolve(true);
        } else {
          // not checked yet
          setTimeout(() => check(), 100);
        }
      };
      check();
    });
  };

  defaults(opts, { createAfterDelay: true });

  const channelId = variable.get('services.twitch.channelId') as string;
  try {
    const clientBot = await client('bot');
    const clipId = await clientBot.clips.createClip({ ...opts, channelId });
    return (await isClipChecked(clipId)) ? clipId : null;
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
  return null;
}