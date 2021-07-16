import {
  Body,
  Controller,
  Delete,
  Get,
  Hidden,
  Patch,
  Path,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
  UploadedFile,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { Carousel, CarouselInterface } from '../../database/entity/carousel';

export type CarouselItem = Omit<CarouselInterface, 'base64' | 'type'> & { imageUrl: string };

@Route('/api/v1/carousel')
@Tags('Registries / Carousel')
export class RegistryCarouselController extends Controller {
  /**
  * Retrieves the quick actions of an authenticated user.
  */
  @Get()
  public async getAll(): Promise<{ data: CarouselItem[], paging: null}> {
    const items = (await getRepository(Carousel).find({
      select: [
        'id', 'order', 'waitAfter',
        'waitBefore', 'duration',
        'animationIn', 'animationInDuration',
        'animationOut', 'animationOutDuration', 'showOnlyOncePerStream',
      ],
      order: { order: 'ASC' },
    })).map(item => ({ ...item, imageUrl: '/api/v1/carousel/image/' + item.id })) as CarouselItem[];
    return {
      data:   items,
      paging: null,
    };
  }

  @Hidden()
  @Get('/image/{id}')
  public async getImage(@Request() request: any, @Path() id: string) {
    try {
      const response = (<any>request).res;

      const file = await getRepository(Carousel).findOneOrFail({ id });
      const data = Buffer.from(file.base64, 'base64');
      response.writeHead(200, {
        'Content-Type':   file.type,
        'Content-Length': data.length,
        'Cache-Control':  'public, max-age=31536000',
        'ETag':           id,
      });
      response.end(data);
    } catch (e) {
      this.setStatus(404);
    }
    return;
  }
  @Response('404', 'Not Found')
  @Get('/{id}')
  public async getOne(@Path() id: string): Promise<CarouselItem | void> {
    try {
      const item = {
        ...(await getRepository(Carousel).findOneOrFail({
          select: [
            'id', 'order', 'waitAfter',
            'waitBefore', 'duration',
            'animationIn', 'animationInDuration',
            'animationOut', 'animationOutDuration', 'showOnlyOncePerStream',
          ],
          where: { id },
        })),
        imageUrl: '/api/v1/carousel/image/' + id,
      };
      return item;
    } catch (e) {
      this.setStatus(404);
    }
    return;
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post('/upload')
  public async upload(@UploadedFile() file: any): Promise<any> {
    try {
      const type = file.mimetype;
      const base64 = file.buffer.toString('base64');
      const order = await getRepository(Carousel).count();
      const item = await getRepository(Carousel).save({
        type,
        base64,
        // timers in ms
        waitBefore:            0,
        waitAfter:             0,
        duration:              5000,
        // animation
        animationInDuration:   1000,
        animationIn:           'fadeIn',
        animationOutDuration:  1000,
        animationOut:          'fadeOut',
        // order
        order,
        // showOnlyOncePerStream
        showOnlyOncePerStream: false,
      });
      this.setStatus(201);
      return item.id;
    } catch (e) {
      this.setStatus(400);
    }
    return {};
  }

  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post()
  public async post(@Body() requestBody: CarouselInterface): Promise<void> {
    try {
      if (requestBody.order === -1) {
        requestBody.order = await getRepository(Carousel).count();
      }
      await getRepository(Carousel).save(requestBody);
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
  public async patch(@Path() id: string, @Body() data: Partial<CarouselInterface>): Promise<void> {
    try {
      await getRepository(Carousel).update({ id }, data);
      this.setStatus(200);
    } catch (e) {
      this.setStatus(400);
    }
    return;
  }
  @SuccessResponse('404', 'Not Found')
  @Security('bearerAuth', [])
  @Delete('/{id}')
  public async delete(@Path() id: string): Promise<void> {
    const item = await getRepository(Carousel).findOne({ id });
    if (item) {
      await getRepository(Carousel).remove(item);
    }
    this.setStatus(404);
    return;
  }
}