'use strict';

import axios from 'axios';
import * as _ from 'lodash';

import { permission } from '../helpers/permissions';
import { command, default_permission, helper } from '../decorators';
import System from './_interface';
import { getOwner } from '../commons';
import { error } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import oauth from '../oauth';
import events from '../events';
import { ioServer } from '../helpers/panel';
import tmi from '../tmi';

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
  async main (opts) {
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
      const url = `https://api.twitch.tv/kraken/channels/${cid}/commercial`;

      const token = await oauth.botAccessToken;
      if (token === '') {
        return;
      }

      try {
        await axios({
          method: 'post',
          url,
          data: { length: commercial.duration },
          headers: {
            'Authorization': 'OAuth ' + token,
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Content-Type': 'application/json',
          },
        });

        events.fire('commercial', { duration: commercial.duration });
        if (!_.isNil(commercial.message)) {
          return [{ response: 'commercial.message', ...opts }];
        }
      } catch (e) {
        error(`API: ${url} - ${e.stack}`);
        if (ioServer) {
          ioServer.emit('api.stats', { timestamp: Date.now(), call: 'commercial', api: 'kraken', endpoint: url, code: e.response.status, data: e.stack });
        }
      }
    } else {
      return [{ response: '$sender, available commercial duration are: 30, 60, 90, 120, 150 and 180', ...opts }];
    }
  }
}

export default new Commercial();
