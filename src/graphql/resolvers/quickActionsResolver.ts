import { JwtPayload } from 'jsonwebtoken';
import {
  Arg, Authorized, Ctx, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { QuickAction, SearchResultUnion } from '../../database/entity/dashboard';

@Resolver()
export class QuickActionResolver {
  @Authorized()
  @Query(returns => [SearchResultUnion])
  quickAction(@Ctx('user') user: JwtPayload, @Arg('id', { nullable: true }) id?: string) {
    if (id) {
      return getRepository(QuickAction).find({ where: { userId: user.userId, id } });
    } else {
      return getRepository(QuickAction).find({ where: { userId: user.userId } });
    }
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async quickActionDelete(@Arg('id') id: string) {
    await getRepository(QuickAction).delete(id);
    return true;
  }
}