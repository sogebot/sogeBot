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
import { getRepository, IsNull } from 'typeorm';

import {
  Goal, GoalGroup, GoalGroupInterface,
} from '../../database/entity/goal';
import { stats } from '../../helpers/api';

@Route('/api/v1/registry/goals')
@Tags('Registries / Goals')
export class RegistryGoalsController extends Controller {
  /**
  * Retrieves the quick actions of an authenticated user.
  */
  @Get()
  public async getAll(): Promise<{ data: GoalGroupInterface[], paging: null}> {
    const items = await getRepository(GoalGroup).find({ relations: ['goals'] });
    return {
      data:   items,
      paging: null,
    };
  }
  @Get('/current')
  public async getCurrent(): Promise<{ subscribers: number; followers: number; }> {
    return {
      subscribers: stats.value.currentSubscribers,
      followers:   stats.value.currentFollowers,
    };
  }
  @Response('404', 'Not Found')
  @Get('/{id}')
  public async getOne(@Path() id: string): Promise<GoalGroupInterface | void> {
    try {
      const item = await getRepository(GoalGroup).findOneOrFail({ where: { id }, relations: ['goals'] });
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
  public async post(@Body() requestBody: GoalGroupInterface): Promise<void> {
    try {
      await getRepository(GoalGroup).save(requestBody);
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
  public async patch(@Path() id: string, @Body() data: Partial<GoalGroupInterface>): Promise<GoalGroupInterface | void> {
    try {
      const item = await getRepository(GoalGroup).save({ ...data, id });
      getRepository(Goal).delete({ groupId: IsNull() });
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
    const item = await getRepository(GoalGroup).findOne({ id });
    if (item) {
      await getRepository(GoalGroup).remove(item);
    }
    this.setStatus(404);
    return;
  }
}