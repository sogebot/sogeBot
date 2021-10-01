import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import {
  Alias, AliasInput, AliasInterface,
} from '../../database/entity/alias';
import * as cache from '../../helpers/cache/alias.js';

@Resolver()
export class AliasResolver {
  @Query(returns => AliasInterface)
  alias(@Arg('id') id: string) {
    return getRepository(Alias).findOneOrFail({ id });
  }
  @Query(returns => [AliasInterface])
  aliases() {
    return getRepository(Alias).find();
  }

  @Mutation(returns => AliasInterface)
  @Authorized()
  setAlias(
    @Arg('id') id: string,
      @Arg('data') data: AliasInput,
  ): Promise<AliasInterface> {
    cache.invalidate();
    return getRepository(Alias).save({ id, ...data });
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async removeAlias(@Arg('id') id: string) {
    await getRepository(Alias).delete(id);
    cache.invalidate();
    return true;
  }
}