import {
  Alias, AliasGroup, AliasInput, AliasInterface,
} from '@entity/alias';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import * as cache from '../../helpers/cache/alias';
import { AliasGroupObject } from '../schema/alias/AliasGroupObject';

@Resolver()
export class AliasResolver {
  @Query(returns => [AliasGroupObject])
  aliasGroup() {
    return getRepository(AliasGroup).find();
  }

  @Mutation(returns => AliasGroupObject)
  @Authorized()
  setAliasGroup(
    @Arg('name') name: string,
      @Arg('data') data: string,
  ): Promise<AliasGroupObject> {
    cache.invalidate();
    return getRepository(AliasGroup).save({ name, options: JSON.parse(data) });
  }

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