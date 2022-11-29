import { TwitchTag, TwitchTagLocalizationName } from '@entity/twitch';
import { AppDataSource } from '~/database';
import { IsNull, Not } from 'typeorm';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import { variables } from '~/watchers';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';

async function setTags (tagsArg: string[]): Promise<boolean> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  const tag_ids: string[] = [];
  try {
    const cid = variables.get('services.twitch.broadcasterId') as string;
    const clientBroadcaster = await client('broadcaster');

    for (const tag of tagsArg) {
      const name = await AppDataSource.getRepository(TwitchTagLocalizationName).findOne({
        where: {
          value: tag,
          tagId: Not(IsNull()),
        },
      });
      if (name && name.tagId) {
        tag_ids.push(name.tagId);
      }
    }

    await clientBroadcaster.streams.replaceStreamTags(cid, tag_ids);
    await AppDataSource.getRepository(TwitchTag).update({ is_auto: false }, { is_current: false });
    for (const tag_id of tag_ids) {
      await AppDataSource.getRepository(TwitchTag).update({ tag_id }, { is_current: true });
    }
    return true;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        await setImmediateAwait();
        return setTags(tagsArg);
      }
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return false;
  }
}

export { setTags };