import {
  KeywordGroup,
} from '@entity/keyword';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { KeywordGroupObject } from '../schema/keyword/KeywordGroupObject';

@Resolver()
export class KeywordResolver {
  @Query(returns => [KeywordGroupObject])
  keywordGroup() {
    return getRepository(KeywordGroup).find();
  }

  @Mutation(returns => KeywordGroupObject)
  @Authorized()
  setKeywordGroup(
    @Arg('name') name: string,
      @Arg('data') data: string,
  ): Promise<KeywordGroupObject> {
    return getRepository(KeywordGroup).save({ name, options: JSON.parse(data) });
  }
}