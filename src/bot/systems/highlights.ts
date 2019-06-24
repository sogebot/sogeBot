import axios from 'axios';
import { Request, Response } from 'express';
import { get, isNil, orderBy } from 'lodash';
import moment from 'moment';
import 'moment-precise-range-plugin';

import { sendMessage } from '../commons';
import { command, default_permission, settings, ui } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';

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

    this.addMenu({ category: 'manage', name: 'highlights', id: 'highlights/list' });
  }

  public sockets() {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }

    this.socket.on('connection', (socket) => {
      socket.on('highlight', () => {
        this.main({ parameters: '', sender: null });
      });
      socket.on('list', async (cb) => {
        cb(null, await global.db.engine.find(this.collection.data));
      });
      socket.on('delete', async (_id, cb) => {
        await global.db.engine.remove(this.collection.data, { _id });
        cb(null);
      });
    });
  }

  public async url(req: Request, res: Response) {
    const url = req.get('host') + req.originalUrl;
    const settings = this.urls.find((o) => o.url.endsWith(url));
    if (settings) {
      if (!(await this.isEnabled())) {
        return res.status(412).send({ error: 'Highlights system is disabled' });
      } else {
        if (!(await global.cache.isOnline())) {
          return res.status(412).send({ error: 'Stream is offline' });
        } else {
          if (settings.clip) {
            const cid = await global.api.createClip({ hasDelay: false });
            if (!cid) { // Something went wrong
              return res.status(403).send({ error: 'Clip was not created!'});
            }
          }
          if (settings.highlight) {
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
  public async main(opts) {
    const when = await global.cache.when();
    const token = global.oauth.botAccessToken;
    const cid = global.oauth.channelId;
    const url = `https://api.twitch.tv/helix/videos?user_id=${cid}&type=archive&first=1`;

    try {
      if (isNil(when.online)) { throw Error(ERROR_STREAM_NOT_ONLINE); }
      if (token === '' || cid === '') { throw Error(ERROR_MISSING_TOKEN); }

      // we need to load video id
      const request = await axios.get(url, {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });
      // save remaining api calls
      global.api.remainingAPICalls = request.headers['ratelimit-remaining'];
      global.api.refreshAPICalls = request.headers['ratelimit-reset'];

      const timestamp = moment.preciseDiff(moment.utc(), moment.utc(global.api.streamStartedAt), true);
      const highlight = {
        id: request.data.data[0].id,
        timestamp: { hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds },
        game: get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a'),
        title: get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a'),
        created_at: Date.now(),
      };

      global.panel.io.emit('api.stats', { data: request.data, timestamp: Date.now(), call: 'highlights', api: 'helix', endpoint: url, code: request.status, remaining: global.api.remainingAPICalls });

      this.add(highlight, timestamp, opts.sender);
    } catch (e) {
      global.panel.io.emit('api.stats', { timestamp: Date.now(), call: 'highlights', api: 'helix', endpoint: url, code: e.stack, remaining: global.api.remainingAPICalls });
      switch (e.message) {
        case ERROR_STREAM_NOT_ONLINE:
          global.log.error('Cannot highlight - stream offline');
          sendMessage(global.translate('highlights.offline'), opts.sender, opts.attr);
          break;
        case ERROR_MISSING_TOKEN:
          global.log.error('Cannot highlight - missing token');
          break;
        default:
          global.log.error(e.stack);
      }
    }
  }

  public async add(highlight, timestamp, sender) {
    global.api.createMarker();
    sendMessage(global.translate('highlights.saved')
      .replace(/\$hours/g, (timestamp.hours < 10) ? '0' + timestamp.hours : timestamp.hours)
      .replace(/\$minutes/g, (timestamp.minutes < 10) ? '0' + timestamp.minutes : timestamp.minutes)
      .replace(/\$seconds/g, (timestamp.seconds < 10) ? '0' + timestamp.seconds : timestamp.seconds), sender);

    global.db.engine.insert(this.collection.data, highlight);
  }

  @command('!highlight list')
  @default_permission(permission.CASTERS)
  public async list(opts) {
    let highlights: any[] = await global.db.engine.find(this.collection.data);
    const sortedHighlights = orderBy(highlights, 'id', 'desc');
    const latestStreamId = sortedHighlights.length > 0 ? sortedHighlights[0].id : null;

    if (isNil(latestStreamId)) {
      sendMessage(global.translate('highlights.list.empty'), opts.sender, opts.attr);
      return;
    }
    highlights = highlights.filter((o) => o.id === latestStreamId);
    const list: string[] = [];

    for (const highlight of highlights) {
      list.push(highlight.timestamp.hours + 'h' +
        highlight.timestamp.minutes + 'm' +
        highlight.timestamp.seconds + 's');
    }
    sendMessage(global.translate(list.length > 0 ? 'highlights.list.items' : 'highlights.list.empty')
      .replace(/\$items/g, list.join(', ')), opts.sender);
  }
}

export default Highlights;
export { Highlights };
