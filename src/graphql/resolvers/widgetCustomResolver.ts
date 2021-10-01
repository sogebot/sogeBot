import { JwtPayload } from 'jsonwebtoken';
import {
  Arg, Authorized, Ctx, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { WidgetCustomInput, WidgetCustomInterface } from '../../database/entity/widget';

@Resolver()
export class WidgetCustomResolver {
  @Query(returns => [WidgetCustomInterface])
  widgetCustomGet(@Ctx('user') user: JwtPayload) {
    return getRepository(WidgetCustomInterface).find({
      where: { userId: user.userId },
      order: { name: 'DESC' },
    });
  }

  @Mutation(returns => WidgetCustomInterface)
  @Authorized()
  widgetCustomSet(
    @Arg('id') id: string,
      @Arg('data') data: WidgetCustomInput,
      @Ctx('user') user: JwtPayload,
  ): Promise<WidgetCustomInterface> {
    return getRepository(WidgetCustomInterface).save({
      id, ...data, userId: user.userId,
    });
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async widgetCustomRemove(@Arg('id') id: string,
    @Ctx('user') user: JwtPayload,
  ) {
    await getRepository(WidgetCustomInterface).delete({ id, userId: user.userId });
    return true;
  }
}