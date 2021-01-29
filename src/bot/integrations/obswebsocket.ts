import OBSWebSocket from 'obs-websocket-js';
import { getRepository } from 'typeorm';

import { SECOND } from '../constants';
import { OBSWebsocket as OBSWebsocketEntity } from '../database/entity/obswebsocket';
import { settings, ui } from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import {
  error, info, warning,
} from '../helpers/log';
import { listScenes, taskRunner } from '../helpers/obswebsocket';
import { adminEndpoint } from '../helpers/socket';
import Integration from './_interface';

const obs = new OBSWebSocket();

let reconnectingTimeout: null | NodeJS.Timeout = null;

class OBSWebsocket extends Integration {
  reconnecting = false;
  enableHeartBeat = false;

  @settings('connection')
  @ui({ type: 'selector', values: ['direct', 'overlay'] })
  accessBy: 'direct' | 'overlay' = 'overlay';
  @settings('connection')
  address = 'localhost:4444';
  @settings('connection')
  @ui({ type: 'text-input', secret: true })
  password = '';

  @onStartup()
  @onChange('accessBy')
  @onChange('address')
  @onChange('password')
  @onChange('enabled')
  async onLoadAccessBy() {
    this.initOBSWebsocket();
  }

  async initOBSWebsocket(isHeartBeat = false) {
    obs.disconnect();
    if (this.enabled) {
      if (this.accessBy === 'direct') {
        reconnectingTimeout = null; // free up setTimeout

        isHeartBeat || this.reconnecting ? null : info('OBSWEBSOCKET: Connecting using direct access from bot.');
        try {
          if (this.password === '') {
            await obs.connect({ address: this.address });
          } else {
            await obs.connect({ address: this.address, password: this.password });
          }
          info(isHeartBeat ? 'OBSWEBSOCKET: Reconnected OK!' : 'OBSWEBSOCKET: Connected OK!');
          this.reconnecting = false;
          this.enableHeartBeat = true;
        } catch (e) {
          this.enableHeartBeat = false;
          if (e.code === 'CONNECTION_ERROR') {
            if (!this.reconnecting && !isHeartBeat) {
              warning(`OBSWEBSOCKET: Couldn't connect to OBS Websockets. Will be periodically trying to connect.`);
              this.reconnecting = true;
            }

            if (!reconnectingTimeout) { // run timeout only once (race condition with heartBeat)
              reconnectingTimeout = setTimeout(() => this.initOBSWebsocket(isHeartBeat), 10 * SECOND);
            }
          } else if (e.error === 'Authentication Failed.') {
            error(`OBSWEBSOCKET: Authentication Failed to OBS Websocket. Please check your credentials.`);
          } else {
            error(e);
          }
        }
      } else {
        this.enableHeartBeat = false;
        info('OBSWEBSOCKET: Integration is enabled, but you need to use overlay to connect to OBS Websocket.');
      }
    }
  }

  @onStartup()
  initialize() {
    this.addMenu({ category: 'registry', name: 'obswebsocket', id: 'registry/obswebsocket/list', this: null });
  }

  @onStartup()
  async heartBeat() {
    try {
      if (this.enabled && this.accessBy === 'direct' && !this.reconnecting && this.enableHeartBeat) {
        // getting just stream status to check connection
        await obs.send('GetStreamingStatus');
      }
    } catch {
      // try to reconnect on error (connection lost, OBS is not running)
      if (!this.reconnecting) {
        warning(`OBSWEBSOCKET: Lost connection to OBS Websockets. Will be periodically trying to reconnect.`);
        this.initOBSWebsocket(true);
      }
    } finally {
      setTimeout(() => this.heartBeat(), 10 * SECOND);
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(OBSWebsocketEntity).find());
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::setById', async (opts, cb) => {
      try {
        console.log(opts.item);
        const item = await getRepository(OBSWebsocketEntity).save({
          ...(await getRepository(OBSWebsocketEntity).findOne({ id: String(opts.id) })),
          ...opts.item,
        });
        cb(null, item);
      } catch (e) {
        cb(e.stack, null);
      }
    });

    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        cb(null, await getRepository(OBSWebsocketEntity).findOne({ id: String(id) }));
      } catch (e) {
        cb(e.stack);
      }
    });

    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      await getRepository(OBSWebsocketEntity).delete({ id: String(id) });
      cb(null);
    });

    adminEndpoint(this.nsp, 'integration::obswebsocket::listScene', async (cb) => {
      try {
        cb(null, await listScenes(obs));
      } catch (e) {
        cb(e.message, []);
      }
    });
    adminEndpoint(this.nsp, 'integration::obswebsocket::test', async (tasks, cb) => {
      try {
        await taskRunner(obs, tasks);
        cb(null);
      } catch (e) {
        cb(e.message);
      }
    });

  }
}

export default new OBSWebsocket();
