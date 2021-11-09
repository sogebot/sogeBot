import { RandomizerItemInterface } from '@entity/randomizer';
import {
  Field, ID, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class RandomizerItemObject implements RandomizerItemInterface {
  @Field(type => ID)
    id?: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field()
    name: string;
  @Field()
    color: string;
  @Field(type => Int)
    numOfDuplicates?: number; // number of duplicates
  @Field(type => Int)
    minimalSpacing?: number; // minimal space between duplicates
  @Field(type => Int)
    order: number;
}