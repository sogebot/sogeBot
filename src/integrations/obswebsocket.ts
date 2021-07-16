import { SECOND } from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import { Events } from '../database/entity/event';
import { OBSWebsocket as OBSWebsocketEntity, OBSWebsocketInterface } from '../database/entity/obswebsocket';
import {
  command, default_permission, settings, ui,
} from '../decorators';
import { onChange, onStartup } from '../decorators/on';
import events from '../events';
import Expects from '../expects';
import { eventEmitter } from '../helpers/events';
import {
  error, info, warning,
} from '../helpers/log';
import { obs } from '../helpers/obswebsocket/client';
import { switchScenes } from '../helpers/obswebsocket/listeners';
import { taskRunner } from '../helpers/obswebsocket/taskrunner';
import { ioServer } from '../helpers/panel';
import { ParameterError } from '../helpers/parameterError';
import { defaultPermissions } from '../helpers/permissions';
import { publicEndpoint } from '../helpers/socket';
import { translate } from '../translate';
import Integration from './_interface';

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
  password = '';

  @onStartup()
  @onChange('accessBy')
  @onChange('address')
  @onChange('password')
  @onChange('enabled')
  async onLoadAccessBy() {
    this.initOBSWebsocket();
  }

  @onStartup()
  addEvent() {
    if (typeof events === 'undefined') {
      setTimeout(() => this.addEvent(), 1000);
    } else {
      events.supportedEventsList.push({
        id:          'obs-scene-changed',
        variables:   [ 'sceneName' ],
        definitions: { linkFilter: '' },
        check:       this.eventIsProperlyFiltered,
      },
      );
    }
  }
  protected async eventIsProperlyFiltered(event: any, attributes: Events.Attributes): Promise<boolean> {
    const isDirect = attributes.isDirect;
    const isTriggeredByCorrectOverlay = (function triggeredByCorrectOverlayCheck () {
      const match = new RegExp('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').exec(attributes.linkFilter);
      if (match) {
        return match[0] === event.definitions.linkFilter
          || attributes.linkFilter === event.definitions.linkFilter;
      } else {
        return false;
      }
    })();
    return isDirect || isTriggeredByCorrectOverlay;
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

          // add listeners
          switchScenes(obs);

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
    this.addMenu({
      category: 'registry', name: 'obswebsocket', id: 'registry/obswebsocket', this: null,
    });
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
    publicEndpoint(this.nsp, 'integration::obswebsocket::event', (opts) => {
      eventEmitter.emit(opts.type, {
        sceneName:  opts.sceneName,
        isDirect:   false,
        linkFilter: opts.location,
      });
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
        const match = new RegExp('matching: "(.*)"').exec(err.message);
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
