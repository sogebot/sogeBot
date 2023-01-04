import { Highlight } from '@entity/highlight';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';
import { timestampToObject } from '@sogebot/ui-helpers/getTime';
import { Request, Response } from 'express';
import { isNil } from 'lodash';

import {
  command, default_permission, settings, ui,
} from '../decorators';
import client from '../services/twitch/api/client';
import { createClip } from '../services/twitch/calls/createClip';
import System from './_interface';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api';
import { getBotSender } from '~/helpers/commons';
import { error } from '~/helpers/log';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';
import { adminEndpoint } from '~/helpers/socket';
import { createMarker } from '~/services/twitch/calls/createMarker';
import { translate } from '~/translate';
import { variables } from '~/watchers';

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
    adminEndpoint('/systems/highlights', 'highlight', () => {
      this.main({
        parameters: '', sender: getBotSender(), attr: {}, command: '!highlight', createdAt: Date.now(), isAction: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
      });
    });
    adminEndpoint('/systems/highlights', 'generic::getAll', async (cb) => {
      (async function getAll(callback): Promise<void> {
        const highlightsToCheck = await Highlight.find({ order: { createdAt: 'DESC' }, where: { expired: false } });
        try {
          const clientBot = await client('bot');
          const availableVideos = await clientBot.videos.getVideosByIds(highlightsToCheck.map(o => o.videoId));

          for (const highlight of highlightsToCheck) {
            if (!availableVideos.find(o => o.id === highlight.videoId)) {
              await Highlight.update(highlight.id, { expired: true });
            }
          }
          const highlights = await Highlight.find({ order: { createdAt: 'DESC' } });
          callback(null, highlights, availableVideos);
        } catch (err: any) {
          if (err._statusCode === 404) {
            for (const highlight of highlightsToCheck) {
              await Highlight.update(highlight.id, { expired: true });
            }
            return getAll(callback);
          }
          callback(err.stack, [], []);
        }
      })(cb);
    });
    adminEndpoint('/systems/highlights', 'generic::deleteById', async (id, cb) => {
      try {
        await Highlight.delete({ id });
        cb(null);
      } catch (err: any) {
        cb(err.message);
      }
    });
  }

  public async url(req: Request, res: Response) {
    const url = this.urls.find((o) => {
      const splitURL = o.url.split('/');
      const id = splitURL[splitURL.length - 1];
      return req.params.id === id;
    });
    if (url) {
      if (!this.enabled) {
        return res.status(412).send({ error: 'Highlights system is disabled' });
      } else {
        if (!(isStreamOnline.value)) {
          return res.status(412).send({ error: 'Stream is offline' });
        } else {
          if (url.clip) {
            try {
              const cid = await createClip({ createAfterDelay: false });
              if (!cid) {
                throw new Error('Clip was not created!');
              }
            } catch (e) {
              if (e instanceof Error) {
                error(e.stack ?? e.message);
              }
              return res.status(403).send({ error: 'Clip was not created!' });
            }
          }
          if (url.highlight) {
            this.main({
              parameters: '', sender: getBotSender(), attr: {}, command: '!highlight', createdAt: Date.now(), isAction: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
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
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

    try {
      if (!isStreamOnline.value) {
        throw Error(ERROR_STREAM_NOT_ONLINE);
      }

      const clientBot = await client('bot');
      const videos = await clientBot.videos.getVideosByUser(broadcasterId, { type: 'archive', limit: 1 });

      const timestamp = timestampToObject(dayjs().valueOf() - dayjs(streamStatusChangeSince.value).valueOf());
      const highlight = new Highlight({
        videoId:   videos.data[0].id,
        timestamp: {
          hours: timestamp.hours, minutes: timestamp.minutes, seconds: timestamp.seconds,
        },
        game:    stats.value.currentGame || 'n/a',
        title:   stats.value.currentTitle || 'n/a',
        expired: false,
      });
      return this.add(highlight, timestamp, opts);
    } catch (err: any) {
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

  public async add(highlight: Highlight, timestamp: TimestampObject, opts: CommandOptions): Promise<CommandResponse[]> {
    createMarker();
    Highlight.insert(highlight);
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
    const sortedHighlights = await Highlight.find({ order: { createdAt: 'DESC' } });
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
