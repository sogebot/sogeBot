import { defaults } from 'lodash';

import { TwitchClips } from '../../../database/entity/twitch';
import { debug, error, warning } from '../../../helpers/log';

import { AppDataSource } from '~/database';
import { isStreamOnline } from '~/helpers/api';
import { isDebugEnabled } from '~/helpers/debug';
import { getFunctionName } from '~/helpers/getFunctionName';
import twitch from '~/services/twitch';
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
        return { state: false }; // ignore etimedout error
      }
      error(`${getFunctionName()} => ${e.stack ?? e.message}`);
    }
  }
  return null;
}