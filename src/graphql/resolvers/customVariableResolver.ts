import { Variable, VariableInterface } from '@entity/variable';
import {
  Arg, Authorized, Query, Resolver,
} from 'type-graphql';
import { AppDataSource } from '~/database';

@Resolver()
export class customVariableResolver {
  @Authorized()
  @Query(returns => [VariableInterface])
  async customVariable(@Arg('id', { nullable: true }) id?: string, @Arg('name', { nullable: true }) name?: string) {
    if (id) {
      return AppDataSource.getRepository(Variable).find({ where: { id } });
    } else if (name) {
      return AppDataSource.getRepository(Variable).find({ where: { variableName: name } });
    } else {
      return AppDataSource.getRepository(Variable).find();
    }
  }
}