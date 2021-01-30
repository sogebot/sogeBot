import FileType from 'file-type';
import {
  Body,
  Controller,
  Delete,
  Get,
  Hidden,
  Patch,
  Path,
  Post,
  Put,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
  UploadedFile,
} from 'tsoa';
import {
  getRepository, In, Not,
} from 'typeorm';
import { v4 } from 'uuid';

import {
  Alert, AlertInterface, AlertMedia, AlertMediaInterface,
} from '../../database/entity/alert';
import { error } from '../../helpers/log';

async function clearMedia(): Promise<void> {
  try {
    const alerts = await getRepository(Alert).find({ relations: ['rewardredeems', 'cmdredeems', 'cheers', 'follows', 'hosts', 'raids', 'resubs', 'subcommunitygifts', 'subgifts', 'subs', 'tips'] });
    const mediaIds: string[] = [];
    for (const alert of alerts) {
      for (const event of [
        ...alert.cheers,
        ...alert.follows,
        ...alert.hosts,
        ...alert.raids,
        ...alert.resubs,
        ...alert.subgifts,
        ...alert.subcommunitygifts,
        ...alert.subs,
        ...alert.tips,
        ...alert.cmdredeems,
        ...alert.rewardredeems,
      ]) {
        mediaIds.push(event.imageId);
        mediaIds.push(event.soundId);
      }
    }
    if (mediaIds.length > 0) {
      await getRepository(AlertMedia).delete({ id: Not(In(mediaIds)) });
    }
  } catch (e) {
    console.error();
    (e);
  }
  return;
}

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

  @Hidden()
  @Get('/media/{id}')
  public async getImage(@Request() request: any, @Path() id: string) {
    try {
      const res = (<any>request).res;
      const media = await getRepository(AlertMedia).find({ id });
      const b64data = media.sort((a,b) => a.chunkNo - b.chunkNo).map(o => o.b64data).join('');
      if (b64data.trim().length === 0) {
        throw new Error();
      } else {
        const data = Buffer.from(b64data.replace(/(data:.*base64,)/g, ''), 'base64');
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type':                (await FileType.fromBuffer(data))?.mime,
          'Content-Length':              data.length,
        });
        res.end(data);
      }
    } catch (e) {
      this.setStatus(404);
    }
    return;
  }

  @Get('/')
  public async getAll(): Promise<{ data: AlertInterface[], paging: null}> {
    return {
      data:   await getRepository(Alert).find({ relations: ['rewardredeems', 'cmdredeems', 'cheers', 'follows', 'hosts', 'raids', 'resubs', 'subcommunitygifts', 'subgifts', 'subs', 'tips'] }),
      paging: null,
    };
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post('/')
  public async post(@Body() requestBody: AlertInterface): Promise<void> {
    try {
      await getRepository(Alert).save(requestBody);
      await clearMedia();
      this.setStatus(201);

    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      this.setStatus(400);
    }
    return 'Something went wrong';
  }

  @Security('bearerAuth', [])
  @Delete('/media/{id}')
  public async deleteMedia(@Path() id: string): Promise<void> {
    try {
      await getRepository(AlertMedia).delete({ id }),
      this.setStatus(201);

    } catch (e) {
      this.setStatus(400);
    }
    return;
  }

  @Response('404', 'Not Found')
  @Get('/{id}')
  public async getOne(@Path() id: string): Promise<AlertInterface | void> {
    try {
      const item = await getRepository(Alert).findOneOrFail({ where: { id }, relations: ['rewardredeems', 'cmdredeems', 'cheers', 'follows', 'hosts', 'raids', 'resubs', 'subcommunitygifts', 'subgifts', 'subs', 'tips'] });
      return item;
    } catch (e) {
      this.setStatus(404);
    }
    return;
  }

  @SuccessResponse('404', 'Not Found')
  @Response('404', 'Not Found')
  @Delete('/{id}')
  public async deleteOne(@Path() id: string): Promise<void> {
    try {
      await getRepository(Alert).delete(id);
      await clearMedia();
    } catch (e) {
      error(e);
    }
    this.setStatus(404);
    return;
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
      await clearMedia();
      this.setStatus(201);
      return item;

    } catch (e) {
      this.setStatus(400);
    }
    return;
  }
}