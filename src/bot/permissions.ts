'use strict';

import * as _ from 'lodash';
import XRegExp from 'xregexp';
import { permissions } from './_constants';
import Core from './_interface';
import * as Parser from './parser';

class Permissions extends Core {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        warnings: {
          sendWarning: false,
          sendByWhisper: true,
        },
      },
      // TBD permissions commands
    };
    super(options);
  }

  private sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('permissions', (cb) => {
        cb([
          { id: permissions.CASTERS, name: 'Casters', preserve: true, automation: 'casters', order: 0 },
          { id: permissions.ADMINISTRATORS, name: 'Administrators', preserve: true, automation: null, order: 1 },
          { id: permissions.MODERATORS, name: 'Moderators', preserve: true, automation: 'moderators', order: 2 },
          { id: permissions.SUBSCRIBERS, name: 'Subscribers', preserve: true, automation: 'subscribers', order: 3 },
          { id: permissions.VIEWERS, name: 'Viewers', preserve: true, automation: 'viewers', order: 4 },
        ]);
      });
    });
  }
}

module.exports = Permissions;
