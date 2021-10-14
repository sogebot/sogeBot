import {
  createUnionType, Field, ID, Int, ObjectType,
} from 'type-graphql';

import { GoalObject } from './goal';

export const GoalGroupDisplayObjects = createUnionType({
  name:        'GoalGroupDisplayObjects',
  types:       () => [GoalGroupDisplayFadeObject, GoalGroupDisplayMultiObject] as const,
  // our implementation of detecting returned object type
  resolveType: value => {
    if (value.type === 'fade') {
      return GoalGroupDisplayFadeObject; // we can return object type class (the one with `@ObjectType()`)
    }
    if (value.type === 'multi') {
      return GoalGroupDisplayMultiObject; // we can return object type class (the one with `@ObjectType()`)
    }
    return undefined;
  },
});

@ObjectType()
export class GoalGroupDisplayFadeObject {
  @Field()
  type: 'fade';
  @Field(type => Int)
  durationMs: number;
  @Field(type => Int)
  animationInMs: number;
  @Field(type => Int)
  animationOutMs: number;
}

@ObjectType()
export class GoalGroupDisplayMultiObject {
  @Field()
  type: 'multi';
  @Field(type => Int)
  spaceBetweenGoalsInPx: number;
}

@ObjectType()
export class GoalGroupObject {
  @Field(type => ID)
  id?: string;
  @Field(type => [GoalObject])
  goals: GoalObject[];
  @Field(type => String)
  createdAt?: number;
  @Field()
  name: string;
  @Field(type => GoalGroupDisplayObjects)
  display: GoalGroupDisplayFadeObject | GoalGroupDisplayMultiObject;
}