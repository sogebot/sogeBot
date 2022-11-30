import { Randomizer, RandomizerInterface } from '@entity/randomizer';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { AppDataSource } from '~/database';

import { RandomizerObject } from '~/graphql/schema/randomizer';

@Resolver()
export class randomizerResolver {
  @Query(returns => [RandomizerObject])
  randomizers(@Arg('id', { nullable: true }) id: string) {
    if (id) {
      return AppDataSource.getRepository(Randomizer).find({ where: { id }, relations: ['items'] });
    } else {
      return AppDataSource.getRepository(Randomizer).find({ relations: ['items'] });
    }
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async randomizerSetVisibility(
  @Arg('id') id: string, @Arg('value') isShown: boolean) {
    await AppDataSource.getRepository(Randomizer).update({}, { isShown: false });
    await AppDataSource.getRepository(Randomizer).update({ id }, { isShown });
    return true;
  }

  @Authorized()
  @Mutation(returns => RandomizerObject)
  async randomizersSave(
    @Arg('data') data_json: string,
  ): Promise<RandomizerInterface> {
    const data: RandomizerInterface = JSON.parse(data_json);
    return AppDataSource.getRepository(Randomizer).save(data);
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async randomizersRemove(@Arg('id') id: string) {
    const item = await AppDataSource.getRepository(Randomizer).findOneBy({ id });
    if (item) {
      await AppDataSource.getRepository(Randomizer).remove(item);
    }
    return true;
  }
}