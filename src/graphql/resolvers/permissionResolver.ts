import {
  Arg,
  Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import {
  PermissionInput, Permissions, PermissionsInterface, 
} from '../../database/entity/permissions';
import { cleanViewersCache } from '../../helpers/permissions';

@Resolver()
export class PermissionResolver {
  @Authorized()
  @Query(returns => [PermissionsInterface])
  permissions(@Arg('id', { nullable: true }) id?: string) {
    cleanViewersCache();
    if (id) {
      return getRepository(Permissions).find({
        where:     { id },
        relations: ['filters'],
      });
    } else {
      return getRepository(Permissions).find({
        relations: ['filters'],
        order:     { order: 'ASC' },
      });
    }
  }

  @Mutation(returns => PermissionsInterface)
  @Authorized()
  permissionUpdate(
    @Arg('id') id: string,
      @Arg('data') data: PermissionInput,
  ): Promise<PermissionsInterface> {
    cleanViewersCache();
    return getRepository(Permissions).save({ id, ...data });
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async permissionDelete(@Arg('id') id: string) {
    cleanViewersCache();
    await getRepository(Permissions).delete(id);
    return true;
  }
}