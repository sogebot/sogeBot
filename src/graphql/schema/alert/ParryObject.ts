import {
  Field, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class ParryObject {
  @Field()
    enabled: boolean;
  @Field(type => Int)
    delay: number;
}