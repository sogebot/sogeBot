import { Variable, VariableInterface } from '@entity/variable';
import {
  Arg, Authorized, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

@Resolver()
export class customVariableResolver {
  @Authorized()
  @Query(returns => [VariableInterface])
  async customVariable(@Arg('id', { nullable: true }) id?: string, @Arg('name', { nullable: true }) name?: string) {
    if (id) {
      return getRepository(Variable).find({ where: { id } });
    } else if (name) {
      return getRepository(Variable).find({ where: { variableName: name } });
    } else {
      return getRepository(Variable).find();
    }
  }
}