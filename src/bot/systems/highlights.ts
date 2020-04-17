import axios from 'axios';
import { Request, Response } from 'express';
import { isNil } from 'lodash';
import moment from 'moment';
import 'moment-precise-range-plugin';

import { command, default_permission, settings, ui } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { error } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Highlight, HighlightInterface } from '../database/entity/highlight';
import api from '../api';
import oauth from '../oauth';
import { translate } from '../translate';
import { ioServer } from '../helpers/panel';

const ERROR_STREAM_NOT_ONLINE = '1';
const ERROR_MISSING_TOKEN = '2';

/*
 * !highlight <?description> - save highlight with optional description
 * !highlight list           - get list of highlights in current running or latest stream
 */

class Highlights extends System {
  @settings('generator')
  @ui({ type: 'highlights-url-generator' })
  urls: { url: string; clip: boolean; highlight: boolean }[] = [];

  constructor() {
    super();
    this.addMenu({ category: 'manage', name: 'highlights', id: 'manage/highlights' });
  }

  public sockets() {
    adminEndpoint(this.nsp, 'highlight', () => {
      this.main({ parameters: '', sender: null });
    });
    adminEndpoint(this.nsp, 'highlights::getAll', async (cb) => {
      try {
        cb(null, await getRepository(Highlight).find({ order: { createdAt: 'DESC' } }));
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'highlights::deleteById', async (id, cb) => {
      await getRepository(Highlight).delete({ id });
      cb(null);
    });
  }

  public async url(req: Request, res: Response) {
    const url = this.urls.find((o) => o.url.endsWith(req.get('host') + req.originalUrl));
    if (url) {
      if (!this.enabled) {
        return res.status(412).send({ error: 'Highlights system is disabled' });
      } else {
        if (!(api.isStreamOnline)) {
          return res.status(412).send({ error: 'Stream is offline' });
        } else {
          if (url.clip) {
            const cid = await api.createClip({ hasDelay: false });
            if (!cid) { // Something went wrong
              return res.status(403).send({ error: 'Clip was not created!'});
            }
          }
          if (url.highlight) {
            this.main({ parameters: '', sender: null });
          }
          return res.status(200).send({ ok: true });
        }
      }
    } else {
      return res.status(404).send({ error: 'Unknown highlights link' });
    }
  }

  @command('!highlight')
  @default_permission(permission.CASTERS)
  public async main(opts): Promise<CommandResponse[]> {
    const token = oauth.botAccessToken;
    const cid = oauth.channelId;
    const url = `https://api.twitch.tv/helix/videos?user_id=${cid}&type=archive&first=1`;

    try {
      if (!api.isStreamOnline) {
        throw Error(ERROR_STREAM_NOT_ONLINE);
      }
      if (token === '' || cid === '') {
        throw Error(ERROR_MISSING_TOKEN);
      }

      // we need to load video id
      const request = await axios.get(url, {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });
      // save remaining api calls
      api.calls.bot.remaining = request.headers['ratelimit-remaining'];
      api.calls.bot.refresh = request.headers['ratelimit-reset'];

      const timestamp = moment.preciseDiff(moment.utc(), moment.utc(api.streamStatusChangeSince), true);
      const highlight = {
        videoId: request.data.data[0].id,
        timestamp: { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds },
        game: api.stats.currentGame || 'n/a',
        title: api.stats.currentTitle || 'n/a',
        createdAt: Date.now(),
      };

      ioServer?.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'highlights', api: 'helix', endpoint: url, code: request.status, remaining: api.calls.bot.remaining });
      return this.add(highlight, timestamp, opts);
    } catch (e) {
      ioServer?.emit('api.stats', { timestamp: Date.now(), call: 'highlights', api: 'helix', endpoint: url, code: e.stack, remaining: api.calls.bot.remaining });
      switch (e.message) {
        case ERROR_STREAM_NOT_ONLINE:
          error('Cannot highlight - stream offline');
          return [{ response: translate('highlights.offline'), ...opts }];
        case ERROR_MISSING_TOKEN:
          error('Cannot highlight - missing token');
          break;
        default:
          error(e.stack);
      }
      return [];
    }
  }

  public async add(highlight: HighlightInterface, timestamp, opts): Promise<CommandResponse[]> {
    api.createMarker();
    getRepository(Highlight).insert(highlight);
    return [{ response: translate('highlights.saved')
      .replace(/\$hours/g, (timestamp.hours < 10) ? '0' + timestamp.hours : timestamp.hours)
      .replace(/\$minutes/g, (timestamp.minutes < 10) ? '0' + timestamp.minutes : timestamp.minutes)
      .replace(/\$seconds/g, (timestamp.seconds < 10) ? '0' + timestamp.seconds : timestamp.seconds), ...opts }];
  }

  @command('!highlight list')
  @default_permission(permission.CASTERS)
  public async list(opts): Promise<CommandResponse[]> {
    const sortedHighlights = await getRepository(Highlight).find({
      order: {
        createdAt: 'DESC',
      },
    });
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
