/*import OBSWebSocket from 'obs-websocket-js';
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
  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post()
  public async post(@Body() requestBody: OBSWebsocketInterface): Promise<void> {
    try {
      await getRepository(OBSWebsocketEntity).save(requestBody);
      this.setStatus(201);

    } catch (e: any) {
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
    } catch (e: any) {
      this.setStatus(400);
    }
    return;
  }
}*/