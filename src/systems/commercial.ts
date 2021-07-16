'use strict';

import axios from 'axios';
import * as _ from 'lodash';

import {
  command, default_permission, helper,
} from '../decorators';
import { calls, setRateLimit } from '../helpers/api';
import { getOwner } from '../helpers/commons';
import { eventEmitter } from '../helpers/events';
import { error, warning } from '../helpers/log';
import { channelId } from '../helpers/oauth';
import { ioServer } from '../helpers/panel';
import { addUIError } from '../helpers/panel/alerts';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import oauth from '../oauth';
import tmi from '../tmi';
import System from './_interface';

/*
 * !commercial                        - gets an info about alias usage
 * !commercial [duration] [?message]  - run commercial
 */

class Commercial extends System {
  sockets() {
    adminEndpoint(this.nsp, 'commercial.run', (data) => {
      tmi.message({
        message: {
          tags:    { username: getOwner() },
          message: '!commercial ' + data.seconds,
        },
        skip: true,
      });
    });
  }

  @command('!commercial')
  @default_permission(defaultPermissions.CASTERS)
  @helper()
  async main (opts: CommandOptions) {
    const parsed = opts.parameters.match(/^([\d]+)? ?(.*)?$/);

    if (_.isNil(parsed)) {
      return [{ response: '$sender, something went wrong with !commercial', ...opts }];
    }

    const commercial = {
      duration: !_.isNil(parsed[1]) ? parseInt(parsed[1], 10) : null,
      message:  !_.isNil(parsed[2]) ? parsed[2] : null,
    };

    if (_.isNil(commercial.duration)) {
      return [{ response: `Usage: ${opts.command} [duration] [optional-message]`, ...opts }];
    }

    const cid = channelId.value;
    // check if duration is correct (30, 60, 90, 120, 150, 180)
    if ([30, 60, 90, 120, 150, 180].includes(commercial.duration)) {
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
          method:  'post',
          url,
          data:    { broadcaster_id: String(cid), length: commercial.duration },
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID':     oauth.broadcasterClientId,
            'Content-Type':  'application/json',
          },
        });

        // save remaining api calls
        setRateLimit('broadcaster', request.headers);

        ioServer?.emit('api.stats', {
          method: 'POST', request: { data: { broadcaster_id: String(cid), length: commercial.duration } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: request.status, data: request.data, remaining: calls.broadcaster,
        });
        eventEmitter.emit('commercial', { duration: commercial.duration });
        if (!_.isNil(commercial.message)) {
          return [{ response: commercial.message, ...opts }];
        }
      } catch (e) {
        if (e.isAxiosError) {
          error(`API: ${url} - ${e.response.data.message}`);
          ioServer?.emit('api.stats', {
            method: 'POST', request: { data: { broadcaster_id: String(cid), length: commercial.duration } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.response?.data ?? 'n/a', remaining: calls.broadcaster,
          });
        } else {
          error(`API: ${url} - ${e.stack}`);
          ioServer?.emit('api.stats', {
            method: 'POST', request: { data: { broadcaster_id: String(cid), length: commercial.duration } }, timestamp: Date.now(), call: 'commercial', api: 'helix', endpoint: url, code: e.response?.status ?? 'n/a', data: e.stack, remaining: calls.broadcaster,
          });
        }
      }
      return [];
    } else {
      return [{ response: '$sender, available commercial duration are: 30, 60, 90, 120, 150 and 180', ...opts }];
    }
  }
}

export default new Commercial();
