import { defaults } from 'lodash';
import { getRepository } from 'typeorm';

import { TwitchClips } from '../../../database/entity/twitch';
import { debug, error, isDebugEnabled, warning } from '../../../helpers/log';
import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { isStreamOnline } from '~/helpers/api';
import { getFunctionName } from '~/helpers/getFunctionName';
import { variables } from '~/watchers';

export async function createClip (opts: { createAfterDelay: boolean }) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
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

  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
  try {
    const clientBot = await client('bot');
    const clipId = await clientBot.clips.createClip({ ...opts, channelId: broadcasterId });
    await getRepository(TwitchClips).save({
      clipId: clipId, isChecked: false, shouldBeCheckedAt: Date.now() + 120 * 1000,
    });
    return (await isClipChecked(clipId)) ? clipId : null;
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return null;
}