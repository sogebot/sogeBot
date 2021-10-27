import {
  CommandsGroup,
} from '@entity/commands';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { CustomCommandsGroupObject } from '../schema/customCommands/CustomCommandsGroupObject';

@Resolver()
export class CustomCommandsResolver {
  @Query(returns => [CustomCommandsGroupObject])
  customCommandsGroup() {
    return getRepository(CommandsGroup).find();
  }

  @Mutation(returns => CustomCommandsGroupObject)
  @Authorized()
  setCustomCommandsGroup(
    @Arg('name') name: string,
      @Arg('data') data: string,
  ): Promise<CustomCommandsGroupObject> {
    require('../../systems/customcommands').default.invalidateCache();
    return getRepository(CommandsGroup).save({ name, options: JSON.parse(data) });
  }
}