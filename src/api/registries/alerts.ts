import {
  Body,
  Controller,
  Get,
  Patch,
  Path,
  Post,
  Put,
  Query,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
  UploadedFile,
} from 'tsoa';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';

import {
  Alert, AlertInterface, AlertMedia, AlertMediaInterface,
} from '../../database/entity/alert';

@Route('/api/v1/registry/alerts')
@Tags('Registries / Alerts')
export class RegistryAlertsController extends Controller {
  @Get('/settings')
  public async getSettings(
    @Query() name: 'areAlertsMuted' | 'isSoundMuted' | 'isTTSMuted',
  ): Promise<boolean> {
    const alerts = (await import('../../registries/alerts')).default;
    switch(name) {
      case 'areAlertsMuted':
        return alerts.areAlertsMuted;
      case 'isSoundMuted':
        return alerts.isSoundMuted;
      case 'isTTSMuted':
        return alerts.isTTSMuted;
    }
  }

  @Post('/settings')
  @Security('bearerAuth', [])
  public async postSettings(
    @Query() name: 'areAlertsMuted' | 'isSoundMuted' | 'isTTSMuted',
      @Body() body: { value: boolean },
  ): Promise<void> {
    const alerts = (await import('../../registries/alerts')).default;
    switch(name) {
      case 'areAlertsMuted':
        alerts.areAlertsMuted = body.value;
        break;
      case 'isSoundMuted':
        alerts.isSoundMuted = body.value;
        break;
      case 'isTTSMuted':
        alerts.isTTSMuted = body.value;
        break;
    }
    this.setStatus(201);
    return;
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post('/')
  public async post(@Body() requestBody: AlertInterface): Promise<void> {
    try {
      await getRepository(Alert).save(requestBody);
      //await clearMedia();
      this.setStatus(201);

    } catch (e: any) {
      this.setStatus(400);
    }
    return;
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post('/media/')
  public async upload(@UploadedFile() file: any): Promise<AlertMediaInterface | string> {
    try {
      const item = await getRepository(AlertMedia).save({
        id:      v4(),
        b64data: file.buffer.toString('base64'),
        chunkNo: 0,
      });
      this.setStatus(201);
      return item;
    } catch (e: any) {
      this.setStatus(400);
    }
    return 'Something went wrong';
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Put('/media/{id}')
  public async uploadPut(@Path() id: string, @UploadedFile() file: any): Promise<AlertMediaInterface | string> {
    try {
      const item = await getRepository(AlertMedia).save({
        id,
        b64data: file.buffer.toString('base64'),
        chunkNo: 0,
      });
      this.setStatus(201);
      return item;
    } catch (e: any) {
      this.setStatus(400);
    }
    return 'Something went wrong';
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Patch('/{id}')
  public async patch(@Path() id: string, @Body() requestBody: AlertInterface): Promise<AlertInterface | void> {
    try {
      const item = await getRepository(Alert).save({
        ...requestBody, id, updatedAt: Date.now(),
      });
      //await clearMedia();
      this.setStatus(201);
      return item;

    } catch (e: any) {
      this.setStatus(400);
    }
    return;
  }
}