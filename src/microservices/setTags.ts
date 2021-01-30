import axios from 'axios';
import {
  getRepository, IsNull, Not,
} from 'typeorm';

import { TwitchTag, TwitchTagLocalizationName } from '../database/entity/twitch';
import {
  calls, getClientId, getToken, setRateLimit,
} from '../helpers/api';
import { error } from '../helpers/log';
import { channelId } from '../helpers/oauth';
import { ioServer } from '../helpers/panel';

async function setTags (tagsArg: string[]) {
  const cid = channelId.value;
  const url = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${cid}`;

  const tag_ids: string[] = [];
  try {
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

    const request = await axios({
      method:  'put',
      url,
      data:    { tag_ids },
      headers: {
        'Authorization': 'Bearer ' + await getToken('bot'),
        'Content-Type':  'application/json',
        'Client-ID':     await getClientId('bot'),
      },
    });
    // save remaining api calls
    setRateLimit('bot', request.headers);

    await getRepository(TwitchTag).update({ is_auto: false }, { is_current: false });
    for (const tag_id of tag_ids) {
      await getRepository(TwitchTag).update({ tag_id }, { is_current: true });
    }
    ioServer?.emit('api.stats', {
      method: 'PUT', request: { data: { tag_ids } }, timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: url, code: request.status, data: request.data, remaining: calls.bot,
    });
  } catch (e) {
    if (e.isAxiosError) {
      error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response?.status ?? 0}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: e.config.url, code: e.response.status, data: e.response?.data ?? 'n/a', remaining: calls.bot,
      });
    } else {
      error(e.stack);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'setTags', api: 'helix', endpoint: e.config.url, code: 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    return false;
  }
}

export { setTags };