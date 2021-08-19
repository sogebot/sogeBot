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

import {
  OverlayMapper, OverlayMapperAlerts, OverlayMapperClips, OverlayMapperClipsCarousel, OverlayMapperCredits, OverlayMapperEmotes, OverlayMapperEmotesCombo, OverlayMapperEmotesExplode, OverlayMapperEmotesFireworks, OverlayMapperEventlist, OverlayMapperGroup, OverlayMapperInterface, OverlayMapperOBSWebsocket, OverlayMapperPolls, OverlayMappers, OverlayMapperTTS,
} from '../../database/entity/overlay';

@Route('/api/v1/overlay')
@Tags('Registries / Overlay')
export class RegistryOverlayController extends Controller {
  /**
  * Retrieves the quick actions of an authenticated user.
  */
  @Get()
  public async getAll(): Promise<{ data: OverlayMappers[], paging: null}> {
    const items = await getRepository(OverlayMapper).find();
    return {
      data:   items,
      paging: null,
    };
  }
  @Response('404', 'Not Found')
  @Get('/{id}')
  public async getOne(@Path() id: string): Promise<OverlayMappers | void> {
    try {
      const item = await getRepository(OverlayMapper).findOneOrFail({ id });
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
  public async post(@Body() requestBody: OverlayMappers): Promise<void> {
    try {
      await getRepository(OverlayMapper).save(requestBody);
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
  public async patch(
    @Path() id: string,
      @Body() data:
      Partial<OverlayMapperGroup>
      | Partial<OverlayMapperAlerts>
      | Partial<OverlayMapperEventlist>
      | Partial<OverlayMapperEmotesCombo>
      | Partial<OverlayMapperCredits>
      | Partial<OverlayMapperClips>
      | Partial<OverlayMapperEmotes>
      | Partial<OverlayMapperEmotesExplode>
      | Partial<OverlayMapperEmotesFireworks>
      | Partial<OverlayMapperClipsCarousel>
      | Partial<OverlayMapperPolls>
      | Partial<OverlayMapperInterface>
      | Partial<OverlayMapperOBSWebsocket>
      | Partial<OverlayMapperTTS>): Promise<void> {
    try {
      await getRepository(OverlayMapper).update({ id }, data);
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
    const item = await getRepository(OverlayMapper).findOne({ id });
    if (item) {
      await getRepository(OverlayMapper).remove(item);
    }
    this.setStatus(404);
    return;
  }
}