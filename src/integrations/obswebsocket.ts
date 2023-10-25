import { Events } from '@entity/event.js';
import { OBSWebsocket as OBSWebsocketEntity } from '@entity/obswebsocket.js';
import { EntityNotFoundError } from 'typeorm';

import Integration from './_interface.js';
import { onStartup } from '../decorators/on.js';
import {
  command, default_permission,
} from '../decorators.js';
import events from '../events.js';
import { Expects } from  '../expects.js';

import { AppDataSource } from '~/database.js';
import { eventEmitter } from '~/helpers/events/index.js';
import {
  error, info,
} from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { ParameterError } from '~/helpers/parameterError.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';
import { translate } from '~/translate.js';

class OBSWebsocket extends Integration {
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
      });
      events.supportedEventsList.push({
        id:          'obs-input-mute-state-changed',
        variables:   [ 'inputName', 'inputMuted' ],
        definitions: { linkFilter: '' },
        check:       this.eventIsProperlyFiltered,
      });
      events.supportedOperationsList.push({
        id: 'run-obswebsocket-command', definitions: { taskId: '' }, fire: this.runObswebsocketCommand,
      });
    }
  }

  async runObswebsocketCommand(operation: Events.OperationDefinitions, attributes: Events.Attributes): Promise<void> {
    const task = await AppDataSource.getRepository(OBSWebsocketEntity).findOneByOrFail({ id: String(operation.taskId) });

    info(`OBSWEBSOCKETS: Task ${task.id} triggered by operation`);
    await obsws.triggerTask(task.code, attributes);
  }

  protected async eventIsProperlyFiltered(event: any, attributes: Events.Attributes): Promise<boolean> {
    const isTriggeredByCorrectOverlay = (function triggeredByCorrectOverlayCheck () {
      const match = new RegExp('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}').exec(attributes.linkFilter);
      if (match) {
        return match[0] === event.definitions.linkFilter
          || attributes.linkFilter === event.definitions.linkFilter;
      } else {
        return false;
      }
    })();
    return isTriggeredByCorrectOverlay;
  }

  @onStartup()
  initialize() {
    this.addMenu({
      category: 'registry', name: 'obswebsocket', id: 'registry/obswebsocket', this: null,
    });
  }

  @onStartup()
  initEndpoint() {
    if (!app) {
      setTimeout(() => this.initEndpoint(), 1000);
      return;
    }

    app.post('/integrations/obswebsocket/log', (req, res) => {
      let message = req.body.message;
      if (typeof req.body.message !== 'string') {
        message = JSON.stringify(req.body.message, null, 2);
      }
      ioServer?.of('/').emit('integration::obswebsocket::log', message || '');
      res.status(200).send();
    });
  }

  sockets() {
    adminEndpoint('/', 'integration::obswebsocket::trigger', (data, cb) => {
      this.triggerTask(data.code, data.attributes)
        .then(() => cb(null))
        .catch(e => cb(e));
    });
    adminEndpoint('/', 'integration::obswebsocket::generic::save', async (item, cb) => {
      try {
        cb(null, await AppDataSource.getRepository(OBSWebsocketEntity).save(item));
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message, undefined);
        }
      }
    });
    adminEndpoint('/', 'integration::obswebsocket::generic::getOne', async (id, cb) => {
      cb(null, await AppDataSource.getRepository(OBSWebsocketEntity).findOneBy({ id }));
    });
    adminEndpoint('/', 'integration::obswebsocket::generic::deleteById', async (id, cb) => {
      await AppDataSource.getRepository(OBSWebsocketEntity).delete({ id });
      cb(null);
    });
    adminEndpoint('/', 'integration::obswebsocket::generic::getAll', async (cb) => {
      cb(null, await AppDataSource.getRepository(OBSWebsocketEntity).find());
    });
    publicEndpoint('/', 'integration::obswebsocket::event', (opts) => {
      const { type, location, ...data } = opts;
      eventEmitter.emit(type, {
        linkFilter: location,
        ...data,
      });
    });
  }

  async triggerTask(code: string, attributes?: Events.Attributes) {
    await new Promise((resolve, reject) => {
      // we need to send on all sockets on /
      const sockets = ioServer?.of('/').sockets;
      if (sockets) {
        for (const socket of sockets.values()) {
          socket.emit('integration::obswebsocket::trigger', { code, attributes }, () => resolve(true));
        }
      }
      setTimeout(() => reject('Test timed out. Please check if your overlay is opened.'), 10000);
    });
  }

  @command('!obsws run')
  @default_permission(defaultPermissions.CASTERS)
  async runTask(opts: CommandOptions) {
    try {
      const [ taskId ] = new Expects(opts.parameters).string().toArray();
      const task = await AppDataSource.getRepository(OBSWebsocketEntity).findOneOrFail({ where: { id: taskId } });

      info(`OBSWEBSOCKETS: User ${opts.sender.userName}#${opts.sender.userId} triggered task ${task.id}`);
      await this.triggerTask(task.code);

      return [];
    } catch (err: any) {
      const isEntityNotFound = (err instanceof EntityNotFoundError);
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
