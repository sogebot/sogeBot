import {
  Field, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class OverlayMarathonOptionsValuesTierObject {
  @Field(type => Int)
    tier1: number;
  @Field(type => Int)
    tier2: number;
  @Field(type => Int)
    tier3: number;
}