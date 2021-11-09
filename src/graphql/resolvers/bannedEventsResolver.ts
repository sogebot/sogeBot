import { BannedEventsInterface, BannedEventsTable } from '@entity/bannedEvents';
import {
  Arg, Authorized, Query,
} from 'type-graphql';
import { getRepository } from 'typeorm';

export class bannedEventsResolver {
  @Authorized()
  @Query(returns => [BannedEventsInterface])
  public async bannedEventsGet(@Arg('page', { defaultValue: 0 }) page: number, @Arg('limit', { defaultValue: 100 }) limit: number) {
    return getRepository(BannedEventsTable).find({
      take: limit,
      skip: page * limit,
    });
  }
}