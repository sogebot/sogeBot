import { TwitchTag, TwitchTagLocalizationName } from '@entity/twitch';
import {
  getRepository, IsNull, Not,
} from 'typeorm';

import client from '../api/client';

import { get } from '~/helpers/interfaceEmitter';
import { error } from '~/helpers/log';

async function setTags (tagsArg: string[]) {
  const tag_ids: string[] = [];
  try {
    const [ cid, clientBroadcaster ] = await Promise.all([
      get<string>('/services/twitch', 'channelId'),
      client('broadcaster'),
    ]);

    for (const tag of tagsArg) {
      const name = await getRepository(TwitchTagLocalizationName).findOne({
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
    await getRepository(TwitchTag).update({ is_auto: false }, { is_current: false });
    for (const tag_id of tag_ids) {
      await getRepository(TwitchTag).update({ tag_id }, { is_current: true });
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
    return false;
  }
}

export { setTags };