import { OBSWebsocket as OBSWebsocketEntity } from '@entity/obswebsocket.js';
import { Request } from 'express';
import { EntityNotFoundError } from 'typeorm';
import { z } from 'zod';

import Integration from './_interface.js';
import { onStartup } from '../decorators/on.js';
import {
  command, default_permission,
} from '../decorators.js';
import events from '../events.js';
import { Expects } from  '../expects.js';

import { Attributes, Event } from '~/database/entity/event.js';
import { AppDataSource } from '~/database.js';
import { Delete, Get, Post } from '~/decorators/endpoint.js';
import { eventEmitter } from '~/helpers/events/index.js';
import {
  error, info,
} from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { ParameterError } from '~/helpers/parameterError.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { Types } from '~/plugins/ListenTo.js';
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

  async runObswebsocketCommand(operation: Event['operations'][number]['definitions'], attributes: Attributes): Promise<void> {
    const task = await AppDataSource.getRepository(OBSWebsocketEntity).findOneByOrFail({ id: String(operation.taskId) });

    info(`OBSWEBSOCKETS: Task ${task.id} triggered by operation`);
    await obsws.triggerTask(task.code, attributes);
  }

  protected async eventIsProperlyFiltered(event: any, attributes: Attributes): Promise<boolean> {
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
      info('OBSWEBSOCKETS: ' + message);
      res.status(200).send();
    });
  }

  @Post('/', { action: 'trigger', zodValidator: z.object({ code: z.string(), attributes: z.any().optional() }) })
  trigger(req: Request) {
    return this.triggerTask(req.body.code, req.body.attributes);
  }
  @Post('/')
  save(req: Request) {
    return OBSWebsocketEntity.create(req.body).save();
  }
  @Get('/:id')
  getOne(req: Request) {
    return OBSWebsocketEntity.findOneByOrFail({ id: req.params.id });
  }
  @Delete('/:id')
  delete(req: Request) {
    return OBSWebsocketEntity.delete({ id: req.params.id });
  }
  @Get('/')
  getAll() {
    return OBSWebsocketEntity.find();
  }
  @Post('/listener', { scope: 'public' })
  async listener(req: Request) {
    const { event, args } = req.body;
    eventEmitter.emit(Types.onOBSWebsocketEvent, { event, args });
  }
  @Post('/event', { scope: 'public' })
  async event(req: Request) {
    const { type, location, ...data } = req.body;
    eventEmitter.emit(type, {
      linkFilter: location,
      ...data,
    });
  }

  async triggerTask(code: string, attributes?: Attributes) {
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
