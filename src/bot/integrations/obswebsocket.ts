import OBSWebSocket from 'obs-websocket-js';
import { getRepository } from 'typeorm';

import { SECOND } from '../constants';
import { OBSWebsocket as OBSWebsocketEntity, OBSWebsocketInterface } from '../database/entity/obswebsocket';
import {
  command, default_permission, settings, ui, 
} from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import Expects from '../expects';
import {
  error, info, warning,
} from '../helpers/log';
import { listScenes } from '../helpers/obswebsocket/scenes';
import {
  getSourcesList, getSourceTypesList, Source, Type,
} from '../helpers/obswebsocket/sources';
import { taskRunner } from '../helpers/obswebsocket/taskrunner';
import { ioServer } from '../helpers/panel';
import { ParameterError } from '../helpers/parameterError';
import { defaultPermissions } from '../helpers/permissions';
import { adminEndpoint } from '../helpers/socket';
import { translate } from '../translate';
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

    adminEndpoint(this.nsp, 'integration::obswebsocket::listSources', async (cb) => {
      try {
        const availableSources = this.accessBy === 'direct'
          ? await getSourcesList(obs)
          : new Promise((resolve: (value: Source[]) => void) => {
            const resolveSources = (sources: Source[]) => {
              resolve(sources);
            };

            // we need to send on all sockets on /integrations/obswebsocket
            const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
            if (sockets) {
              for (const socket of sockets.values()) {
                socket.emit('integration::obswebsocket::function', 'getSourcesList', resolveSources);
              }
            }
            setTimeout(() => resolve([]), 10000);
          });

        const availableTypes = this.accessBy === 'direct'
          ? await getSourceTypesList(obs)
          : new Promise((resolve: (value: Type[]) => void) => {
            const resolveTypes = (type: Type[]) => {
              resolve(type);
            };

            // we need to send on all sockets on /integrations/obswebsocket
            const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
            if (sockets) {
              for (const socket of sockets.values()) {
                socket.emit('integration::obswebsocket::function', 'getTypesList', resolveTypes);
              }
            }
            setTimeout(() => resolve([]), 10000);
          });
        cb(null, await availableSources, await availableTypes);
      } catch (e) {
        cb(e.message, [], []);
      }
    });

    adminEndpoint(this.nsp, 'integration::obswebsocket::listScene', async (cb) => {
      try {
        const availableScenes = this.accessBy === 'direct'
          ? await listScenes(obs)
          : new Promise((resolve: (value: OBSWebSocket.Scene[]) => void) => {
            const resolveScenes = (scenes: OBSWebSocket.Scene[]) => {
              resolve(scenes);
            };

            // we need to send on all sockets on /integrations/obswebsocket
            const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
            if (sockets) {
              for (const socket of sockets.values()) {
                socket.emit('integration::obswebsocket::function', 'listScenes', resolveScenes);
              }
            }
            setTimeout(() => resolve([]), 10000);
          });
        cb(null, await availableScenes);
      } catch (e) {
        cb(e.message, []);
      }
    });
    adminEndpoint(this.nsp, 'integration::obswebsocket::getCommand', (cb) => {
      cb(obsws.getCommand('!obsws run'));
    });

    adminEndpoint(this.nsp, 'integration::obswebsocket::test', async (tasks, cb) => {
      try {
        await this.triggerTask(tasks);
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
  }

  async triggerTask(tasks: OBSWebsocketInterface['simpleModeTasks'] | string) {
    if (this.accessBy === 'direct') {
      await taskRunner(obs, tasks);
    } else {
      await new Promise((resolve, reject) => {
        // we need to send on all sockets on /integrations/obswebsocket
        const sockets = ioServer?.of('/integrations/obswebsocket').sockets;
        if (sockets) {
          for (const socket of sockets.values()) {
            socket.emit('integration::obswebsocket::trigger', tasks, () => resolve(true));
          }
        }
        setTimeout(() => reject('Test timed out. Please check if your overlay is opened.'), 10000);
      });
    }
  }

  @command('!obsws run')
  @default_permission(defaultPermissions.CASTERS)
  async runTask(opts: CommandOptions) {
    try {
      const [ taskId ] = new Expects(opts.parameters).string().toArray();
      const task = await getRepository(OBSWebsocketEntity).findOneOrFail(taskId);

      info(`OBSWEBSOCKETS: User ${opts.sender.username}#${opts.sender.userId} triggered task ${task.id}`);
      await this.triggerTask(task.advancedMode ? task.advancedModeCode : task.simpleModeTasks);

      return [];
    } catch (err) {
      const isEntityNotFound = err.name === 'EntityNotFound';
      const isParameterError = (err instanceof ParameterError);

      if (isEntityNotFound) {
        const match = new RegExp('matching: \"(.*)\"').exec(err.message);
        return [{ response: translate('integrations.obswebsocket.runTask.EntityNotFound').replace('$id', match ? match[1] : 'n/a'), ...opts }];
      } else if (isParameterError) {
        return [{ response: translate('integrations.obswebsocket.runTask.ParameterError'), ...opts }];
      } else {
        error(err.stack ?? err);
        return [{ response: translate('integrations.obswebsocket.runTask.UnknownError'), ...opts }];
      }
    }
  }
}

const obsws = new OBSWebsocket();
export default obsws;
