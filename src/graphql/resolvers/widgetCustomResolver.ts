import {
  WidgetCustom, WidgetCustomInput, WidgetCustomInterface,
} from '@entity/widget';
import { JwtPayload } from 'jsonwebtoken';
import {
  Arg, Authorized, Ctx, Mutation, Query, Resolver,
} from 'type-graphql';
import { AppDataSource } from '~/database';

@Resolver()
export class WidgetCustomResolver {
  @Query(returns => [WidgetCustomInterface])
  widgetCustomGet(@Ctx('user') user: JwtPayload) {
    return AppDataSource.getRepository(WidgetCustom).find({
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
    return AppDataSource.getRepository(WidgetCustom).save({
      id, ...data, userId: user.userId,
    });
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async widgetCustomRemove(@Arg('id') id: string,
    @Ctx('user') user: JwtPayload,
  ) {
    await AppDataSource.getRepository(WidgetCustom).delete({ id, userId: user.userId });
    return true;
  }
}