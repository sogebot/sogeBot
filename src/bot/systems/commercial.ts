'use strict';

import axios from 'axios';
import * as _ from 'lodash';

import api from '../api';
import { getOwner } from '../commons';
import { command, default_permission, helper } from '../decorators';
import events from '../events';
import { error, warning } from '../helpers/log';
import { ioServer } from '../helpers/panel';
import { permission } from '../helpers/permissions';
import { adminEndpoint } from '../helpers/socket';
import oauth from '../oauth';
import { addUIError } from '../panel';
import tmi from '../tmi';
import System from './_interface';

/*
 * !commercial                        - gets an info about alias usage
 * !commercial [duration] [?message]  - run commercial
 */

class Commercial extends System {
  constructor () {
    super();
    this.addWidget('commercial', 'widget-title-commercial', 'fas fa-dollar-sign');
  }

  sockets() {
    adminEndpoint(this.nsp, 'commercial.run', (data) => {
      tmi.message({
        message: {
          tags: { username: getOwner() },
          message: '!commercial ' + data.seconds,
        },
        skip: true,
      });
    });
  }

  @command('!commercial')
  @default_permission(permission.CASTERS)
  @helper()
  async main (opts: CommandOptions) {
    const parsed = opts.parameters.match(/^([\d]+)? ?(.*)?$/);

    if (_.isNil(parsed)) {
      return [{ response: '$sender, something went wrong with !commercial', ...opts }];
    }

    const commercial = {
      duration: !_.isNil(parsed[1]) ? parseInt(parsed[1], 10) : null,
      message: !_.isNil(parsed[2]) ? parsed[2] : null,
    };

    if (_.isNil(commercial.duration)) {
      return [{ response: 'Usage: !commercial [duration] [optional-message]', ...opts }];
    }

    const cid = oauth.channelId;
    // check if duration is correct (30, 60, 90, 120, 150, 180)
    if (_.includes([30, 60, 90, 120, 150, 180], commercial.duration)) {
      const url = `https://api.twitch.tv/helix/channels/commercial`;

      const token = oauth.broadcasterAccessToken;
      if (!oauth.broadcasterCurrentScopes.includes('channel:edit:commercial')) {
        warning('Missing Broadcaster oAuth scope channel:edit:commercial to start commercial');
        addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope channel:edit:commercial to start commercial' });
        return;
      }
      if (token === '') {
        warning('Missing Broadcaster oAuth to change game or title');
        addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth to change game or title' });
        return;
      }

      try {
        const request = await axios({
          method: 'post',
          url,
          data: { broadcaster_id: String(cid), length: commercial.duration },
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID': oauth.broadcasterClientId,
            'Content-Type': 'application/json',
          },
        });

        // save remaining api calls
        api.calls.broadcaster.remaining = request.headers['ratelimit-remaining'];
        api.calls.broadcaster.refresh = request.headers['ratelimit-reset'];
        api.calls.broadcaster.limit = request.headers['ratelimit-limit'];

        ioServer?.emit('api.stats', { method: 'POST', request: { data: { broadcaster_id: String(cid), length: commercial.duration } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: request.status, data: request.data, remaining: api.calls.broadcaster });
        events.fire('commercial', { duration: commercial.duration });
        if (!_.isNil(commercial.message)) {
          return [{ response: 'commercial.message', ...opts }];
        }
      } catch (e) {
        error(`API: ${url} - ${e.stack}`);
        if (e.isAxiosError) {
          ioServer?.emit('api.stats', { method: 'POST', request: { data: { broadcaster_id: String(cid), length: commercial.duration } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.response.data, remaining: api.calls.broadcaster });
        } else {
          ioServer?.emit('api.stats', { method: 'POST', request: { data: { broadcaster_id: String(cid), length: commercial.duration } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: api.calls.broadcaster });
        }
      }
      return [];
    } else {
      return [{ response: '$sender, available commercial duration are: 30, 60, 90, 120, 150 and 180', ...opts }];
    }
  }
}

export default new Commercial();
