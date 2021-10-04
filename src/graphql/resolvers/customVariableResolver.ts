import { JwtPayload } from 'jsonwebtoken';
import {
  Arg, Authorized, Ctx, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { Variable } from '../../database/entity/variable';

@Resolver()
export class CustomVariableResolver {
  @Authorized()
  @Query(returns => [VariableInterface])
  customVariable(@Ctx('user') user: JwtPayload, @Arg('id', { nullable: true }) id?: string) {
    if (id) {
      return getRepository(Variable).find({ where: { userId: user.userId, id } });
    } else {
      return getRepository(Variable).find({ where: { userId: user.userId } });
    }
  }
}