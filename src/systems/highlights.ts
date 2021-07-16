import { timestampToObject } from '@sogebot/ui-helpers/getTime';
import axios from 'axios';
import { Request, Response } from 'express';
import { isNil } from 'lodash';
import { getRepository } from 'typeorm';

import api from '../api';
import { Highlight, HighlightInterface } from '../database/entity/highlight';
import {
  command, default_permission, settings, ui,
} from '../decorators';
import {
  calls, isStreamOnline, setRateLimit, stats, streamStatusChangeSince,
} from '../helpers/api';
import { getBotSender } from '../helpers/commons';
import { dayjs } from '../helpers/dayjs';
import { error } from '../helpers/log';
import { channelId } from '../helpers/oauth';
import { ioServer } from '../helpers/panel';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import oauth from '../oauth';
import { translate } from '../translate';
import System from './_interface';

const ERROR_STREAM_NOT_ONLINE = '1';
const ERROR_MISSING_TOKEN = '2';

/*
 * !highlight <?description> - save highlight with optional description
 * !highlight list           - get list of highlights in current running or latest stream
 */

class Highlights extends System {
  @settings('urls')
  @ui({ type: 'highlights-url-generator' })
  urls: { url: string; clip: boolean; highlight: boolean }[] = [];

  constructor() {
    super();
    this.addMenu({
      category: 'manage', name: 'highlights', id: 'manage/highlights', this: this,
    });
  }

  public sockets() {
    adminEndpoint(this.nsp, 'highlight', () => {
      this.main({
        parameters: '', sender: getBotSender(), attr: {}, command: '!highlight', createdAt: Date.now(),
      });
    });
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const highlightsToCheck = await getRepository(Highlight).find({ order: { createdAt: 'DESC' }, where: { expired: false } });
        const availableVideos = await api.getVideos(highlightsToCheck.map(o => o.videoId));

        for (const highlight of highlightsToCheck) {
          if (!availableVideos.includes(highlight.videoId)) {
            await getRepository(Highlight).update(highlight.id, { expired: true });
          }
        }
        const highlights = await getRepository(Highlight).find({ order: { createdAt: 'DESC' } });
        cb(null, highlights, availableVideos);
      } catch (err) {
        cb(err.stack);
      }
    });
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      try {
        await getRepository(Highlight).delete({ id });
        cb(null);
      } catch (err) {
        cb(err.message);
      }
    });
  }

  public async url(req: Request, res: Response) {
    const url = this.urls.find((o) => o.url.endsWith(req.get('host') + req.originalUrl));
    if (url) {
      if (!this.enabled) {
        return res.status(412).send({ error: 'Highlights system is disabled' });
      } else {
        if (!(isStreamOnline.value)) {
          return res.status(412).send({ error: 'Stream is offline' });
        } else {
          if (url.clip) {
            const cid = await api.createClip({ hasDelay: false });
            if (!cid) { // Something went wrong
              return res.status(403).send({ error: 'Clip was not created!' });
            }
          }
          if (url.highlight) {
            this.main({
              parameters: '', sender: getBotSender(), attr: {}, command: '!highlight', createdAt: Date.now(),
            });
          }
          return res.status(200).send({ ok: true });
        }
      }
    } else {
      return res.status(404).send({ error: 'Unknown highlights link' });
    }
  }

  @command('!highlight')
  @default_permission(defaultPermissions.CASTERS)
  public async main(opts: CommandOptions): Promise<CommandResponse[]> {
    const token = oauth.botAccessToken;
    const cid = channelId.value;
    const url = `https://api.twitch.tv/helix/videos?user_id=${cid}&type=archive&first=1`;

    try {
      if (!isStreamOnline.value) {
        throw Error(ERROR_STREAM_NOT_ONLINE);
      }
      if (token === '' || cid === '') {
        throw Error(ERROR_MISSING_TOKEN);
      }

      // we need to load video id
      const request = await axios.get(url, {
        headers: {
          Authorization: 'Bearer ' + token,
          'Client-ID':   oauth.botClientId,
        },
      });
      // save remaining api calls
      setRateLimit('bot', request.headers);

      const timestamp = timestampToObject(dayjs().valueOf() - dayjs(streamStatusChangeSince.value).valueOf());
      const highlight = {
        videoId:   request.data.data[0].id,
        timestamp: {
          hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds,
        },
        game:      stats.value.currentGame || 'n/a',
        title:     stats.value.currentTitle || 'n/a',
        createdAt: Date.now(),
        expired:   false,
      };

      ioServer?.emit('api.stats', {
        method: 'GET', data: request.data, timestamp: Date.now(), call: 'highlights', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot.remaining,
      });
      return this.add(highlight, timestamp, opts);
    } catch (err) {
      ioServer?.emit('api.stats', {
        method: 'GET', timestamp: Date.now(), call: 'highlights', api: 'helix', endpoint: url, code: err.stack, remaining: calls.bot.remaining,
      });
      switch (err.message) {
        case ERROR_STREAM_NOT_ONLINE:
          error('Cannot highlight - stream offline');
          return [{ response: translate('highlights.offline'), ...opts }];
        case ERROR_MISSING_TOKEN:
          error('Cannot highlight - missing token');
          break;
        default:
          error(err.stack);
      }
      return [];
    }
  }

  public async add(highlight: HighlightInterface, timestamp: TimestampObject, opts: CommandOptions): Promise<CommandResponse[]> {
    api.createMarker();
    getRepository(Highlight).insert(highlight);
    return [{
      response: translate('highlights.saved')
        .replace(/\$hours/g, (timestamp.hours < 10) ? '0' + timestamp.hours : timestamp.hours)
        .replace(/\$minutes/g, (timestamp.minutes < 10) ? '0' + timestamp.minutes : timestamp.minutes)
        .replace(/\$seconds/g, (timestamp.seconds < 10) ? '0' + timestamp.seconds : timestamp.seconds), ...opts,
    }];
  }

  @command('!highlight list')
  @default_permission(defaultPermissions.CASTERS)
  public async list(opts: CommandOptions): Promise<CommandResponse[]> {
    const sortedHighlights = await getRepository(Highlight).find({ order: { createdAt: 'DESC' } });
    const latestStreamId = sortedHighlights.length > 0 ? sortedHighlights[0].videoId : null;

    if (isNil(latestStreamId)) {
      return [{ response: translate('highlights.list.empty'), ...opts }];
    }
    const list: string[] = [];

    for (const highlight of sortedHighlights.filter((o) => o.videoId === latestStreamId)) {
      list.push(highlight.timestamp.hours + 'h'
        + highlight.timestamp.minutes + 'm'
        + highlight.timestamp.seconds + 's');
    }
    return [{ response: translate(list.length > 0 ? 'highlights.list.items' : 'highlights.list.empty').replace(/\$items/g, list.join(', ')), ...opts }];
  }
}

export default new Highlights();
