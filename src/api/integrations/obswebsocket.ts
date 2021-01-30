import OBSWebSocket from 'obs-websocket-js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { OBSWebsocket as OBSWebsocketEntity, OBSWebsocketInterface } from '../../database/entity/obswebsocket';
import { error } from '../../helpers/log';
import { obs } from '../../helpers/obswebsocket/client';
import { listScenes } from '../../helpers/obswebsocket/scenes';
import {
  getSourcesList, getSourceTypesList, Source, Type,
} from '../../helpers/obswebsocket/sources';
import { ioServer } from '../../helpers/panel';

@Route('/api/v1/integration/obswebsocket')
@Tags('Integrations / OBSWebsocket')
export class IntegrationOBSWebsocketController extends Controller {
  @Get()
  public async getAll(): Promise<{ data: OBSWebsocketInterface[], paging: null}> {
    const items = await getRepository(OBSWebsocketEntity).find();
    return {
      data:   items,
      paging: null,
    };
  }
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post('/trigger')
  public async triggerTask(@Body() tasks: any): Promise<void> {
    const integration = (await import('../../integrations/obswebsocket')).default;
    try {
      await integration.triggerTask(tasks);
      this.setStatus(201);
    } catch (e) {
      this.setStatus(400);
      error(e);
    }
    return;
  }
  @Get('/command')
  @Security('bearerAuth', [])
  public async getCommand(): Promise<string> {
    const integration = (await import('../../integrations/obswebsocket')).default;
    return integration.getCommand('!obsws run');
  }
  @Get('/listScene')
  @Security('bearerAuth', [])
  public async getScene(): Promise<{ data: OBSWebSocket.Scene[] }> {
    const integration = (await import('../../integrations/obswebsocket')).default;
    try {
      const availableScenes = integration.accessBy === 'direct'
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
      return { data: await availableScenes };
    } catch (e) {
      return { data: [] };
    }
  }
  @Get('/sources')
  @Security('bearerAuth', [])
  public async getSources(): Promise<{ data: { sources: Source[], types: Type[] } }> {
    const integration = (await import('../../integrations/obswebsocket')).default;
    try {
      const availableSources = integration.accessBy === 'direct'
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

      const availableTypes = integration.accessBy === 'direct'
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
      return { data: { sources: await availableSources, types: await availableTypes } };
    } catch (e) {
      return { data: { sources: [], types: [] } };
    }
  }
  @Response('404', 'Not Found')
  @Get('/{id}')
  @Security('bearerAuth', [])
  public async getOne(@Path() id: string): Promise<OBSWebsocketInterface | void> {
    try {
      const item = await getRepository(OBSWebsocketEntity).findOneOrFail({ where: { id } });
      return item;
    } catch (e) {
      this.setStatus(404);
    }
    return;
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post()
  public async post(@Body() requestBody: OBSWebsocketInterface): Promise<void> {
    try {
      await getRepository(OBSWebsocketEntity).save(requestBody);
      this.setStatus(201);

    } catch (e) {
      this.setStatus(400);
    }
    return;
  }

  @SuccessResponse('200', 'Ok')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Patch('/{id}')
  public async patch(@Path() id: string, @Body() data: Partial<OBSWebsocketInterface>): Promise<OBSWebsocketInterface | void> {
    try {
      const item = await getRepository(OBSWebsocketEntity).save({ ...data, id });
      this.setStatus(200);
      return item;
    } catch (e) {
      this.setStatus(400);
    }
    return;
  }
  @SuccessResponse('404', 'Not Found')
  @Security('bearerAuth', [])
  @Delete('/{id}')
  public async delete(@Path() id: string): Promise<void> {
    const item = await getRepository(OBSWebsocketEntity).findOne({ id });
    if (item) {
      await getRepository(OBSWebsocketEntity).remove(item);
    }
    this.setStatus(404);
    return;
  }
}