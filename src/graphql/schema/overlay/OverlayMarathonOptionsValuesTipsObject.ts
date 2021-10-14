import {
  Field, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class OverlayMarathonOptionsValuesTipsObject {
  @Field()
  addFraction: boolean;
  @Field(type => Int)
  tips: number;
  @Field(type => String)
  time: number;
}