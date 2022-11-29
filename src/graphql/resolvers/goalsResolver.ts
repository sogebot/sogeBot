import {
  Goal, GoalGroup, GoalGroupInterface,
} from '@entity/goal';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository, IsNull } from 'typeorm';

import { GoalGroupObject, GoalsCurrent } from '~/graphql/schema/goals';
import { stats } from '~/helpers/api';
import { recountIntervals, types } from '~/helpers/goals/recountIntervals';

@Resolver()
export class goalsResolver {
  @Query(returns => [GoalGroupObject])
  goals(@Arg('id', { nullable: true }) id: string) {
    if (id) {
      return getRepository(GoalGroup).find({ where: { id }, relations: ['goals'] });
    } else {
      return getRepository(GoalGroup).find({ relations: ['goals'] });
    }
  }

  @Query(returns => GoalsCurrent)
  goalsCurrent() {
    return {
      subscribers: stats.value.currentSubscribers,
      followers:   stats.value.currentFollowers,
    };
  }

  @Authorized()
  @Mutation(returns => GoalGroupObject)
  async goalsSave(
    @Arg('data') data_json: string,
  ): Promise<GoalGroupInterface> {
    const data: GoalGroupInterface = JSON.parse(data_json);
    const item = await getRepository(GoalGroup).save(data);
    getRepository(Goal).delete({ groupId: IsNull() });

    const toRecount = new Set();
    data.goals?.forEach(goal => {
      if (goal.type.includes('interval')) {
        toRecount.add(goal.type.replace('interval', '').toLowerCase());
      }
    });
    toRecount.forEach(value => {
      recountIntervals(value as typeof types[number]);
    });
    return item;
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async goalsRemove(@Arg('id') id: string) {
    const item = await getRepository(GoalGroup).findOneBy({ id });
    if (item) {
      await getRepository(GoalGroup).remove(item);
    }
    return true;
  }
}