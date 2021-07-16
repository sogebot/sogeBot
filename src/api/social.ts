import {
  Get,
  Query,
  Response,
  Route,
  Security,
  Tags,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { WidgetSocial, WidgetSocialInterface } from '../database/entity/widget';

@Route('/api/v1/social')
@Tags('Widgets')
@Security('bearerAuth', [])
export class WidgetSocialController {
  /**
   * Retrieves social interactions
   * @isInt _page
   * @isInt _limit
   */
  @Response('401', 'Unauthorized')
  @Get()
  public async get(@Query() _page?: number, @Query() _limit?: number): Promise<{ data: WidgetSocialInterface[], paging: { count: number, _limit: number, _page: number }}> {
    const page = _page ? _page : 0;
    const limit = _limit ? _limit: 0;

    const count = await getRepository(WidgetSocial).count();
    const items = await getRepository(WidgetSocial).find({
      take:  limit,
      order: { timestamp: 'DESC' },
      skip:  page * limit,
    });
    return {
      data:   items,
      paging: {
        count, _limit: limit, _page: page,
      },
    };
  }
}