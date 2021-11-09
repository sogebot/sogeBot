import {
  Field, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class GoalsCurrent {
  @Field(type => Int)
    subscribers: number;
  @Field(type => Int)
    followers: number;
}