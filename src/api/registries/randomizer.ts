import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Query,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';
import { getRepository, IsNull } from 'typeorm';

import {
  Randomizer, RandomizerInterface, RandomizerItem,
} from '../../database/entity/randomizer';

@Route('/api/v1/registry/randomizer')
@Tags('Registries / Randomizer')
export class RegistryRegistryController extends Controller {
  /**
  * Retrieves the quick actions of an authenticated user.
  * @example isShown true
  */
  @Get()
  public async getAll(
    @Query() isShown?: boolean,
  ): Promise<{ data: RandomizerInterface[], paging: null}> {
    const where = typeof isShown !=='undefined' ? { where: { isShown } } : {};
    const items = await getRepository(Randomizer).find({ ...where, relations: ['items'] });

    return {
      data:   items,
      paging: null,
    };
  }
  /**
   * @example id "e77ef155-bd12-46f0-8559-bf55f6dd4c63"
   */
  @Response('404', 'Not Found')
  @Get('/{id}')
  public async getOne(
    @Path() id: string,
  ): Promise<RandomizerInterface | void> {
    try {
      const item = await getRepository(Randomizer).findOneOrFail({ where: { id }, relations: ['items'] });
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
  public async post(@Body() requestBody: RandomizerInterface): Promise<void> {
    try {
      await getRepository(Randomizer).save(requestBody);
      this.setStatus(201);
    } catch (e) {
      this.setStatus(400);
    }
    return;
  }

  @SuccessResponse('200', 'OK')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Post('/hideall')
  public async postHideAll(): Promise<void> {
    try {
      await getRepository(Randomizer).update({}, { isShown: false });
      this.setStatus(200);

    } catch (e) {
      this.setStatus(400);
    }
    return;
  }

  @SuccessResponse('200', 'Ok')
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Patch('/{id}')
  public async patch(@Path() id: string, @Body() data: Partial<RandomizerInterface>): Promise<RandomizerInterface | void> {
    try {
      const item = await getRepository(Randomizer).save({ ...data, id });
      if (data.items) {
        await getRepository(RandomizerItem).delete({ randomizerId: id });
        for (const value of (data.items ?? [])) {
          value.randomizerId = id;
          delete value.id;
          await getRepository(RandomizerItem).insert(value);
        }
      }
      await getRepository(RandomizerItem).delete({ randomizerId: IsNull() });
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
    const item = await getRepository(Randomizer).findOne({ id });
    if (item) {
      await getRepository(Randomizer).remove(item);
    }
    this.setStatus(404);
    return;
  }
}