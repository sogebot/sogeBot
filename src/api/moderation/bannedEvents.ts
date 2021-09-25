import {
  Get,
  Query,
  Response,
  Route,
  Security,
  Tags,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { BannedEventsInterface, BannedEventsTable } from '../../database/entity/bannedEvents';

@Route('/api/v1/moderation/bannedevents')
@Tags('Widgets')
@Security('bearerAuth', [])
export class BannedEventsController {
  /**
   * Retrieves social interactions
   * @isInt _page
   * @isInt _limit
   */
  @Response('401', 'Unauthorized')
  @Get()
  public async get(@Query() _page?: number, @Query() _limit?: number): Promise<{ data: BannedEventsInterface[], paging: { count: number, _limit: number, _page: number }}> {
    const page = _page ? _page : 0;
    const limit = _limit ? _limit: 0;

    const count = await getRepository(BannedEventsTable).count();
    const items = await getRepository(BannedEventsTable).find({
      take: limit,
      skip: page * limit,
    });
    return {
      data:   items,
      paging: {
        count, _limit: limit, _page: page,
      },
    };
  }
}