import {
  Field, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class OverlayMarathonOptionsValuesBitsObject {
  @Field()
    addFraction: boolean;
  @Field(type => Int)
    bits: number;
  @Field(type => String)
    time: number;
}