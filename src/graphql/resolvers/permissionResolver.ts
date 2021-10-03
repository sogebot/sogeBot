import {
  Authorized, Query, Resolver, 
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { Permissions, PermissionsInterface } from '../../database/entity/permissions';

@Resolver()
export class PermissionResolver {
  @Authorized()
  @Query(returns => [PermissionsInterface])
  permissions() {
    return getRepository(Permissions).find();
  }
}