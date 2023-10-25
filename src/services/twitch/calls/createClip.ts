import { defaults } from 'lodash-es';

import { TwitchClips } from '../../../database/entity/twitch.js';
import { debug, error, warning } from '../../../helpers/log.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline } from '~/helpers/api/index.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

export async function createClip (opts: { createAfterDelay: boolean }): Promise<string | null> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  if (!(isStreamOnline.value)) {
    return null;
  } // do nothing if stream is offline

  const isClipChecked = async function (id: string) {
    return new Promise((resolve: (value: boolean) => void) => {
      const check = async () => {
        const clip = await AppDataSource.getRepository(TwitchClips).findOneBy({ clipId: id });
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
    const clipId = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.clips.createClip({ ...opts, channel: broadcasterId }));
    if (!clipId) {
      return null;
    }
    await AppDataSource.getRepository(TwitchClips).save({
      clipId: clipId, isChecked: false, shouldBeCheckedAt: Date.now() + 120 * 1000,
    });
    return (await isClipChecked(clipId)) ? clipId : null;
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        return null;
      }
      error(`${getFunctionName()} => ${e.stack ?? e.message}`);
    }
  }
  return null;
}