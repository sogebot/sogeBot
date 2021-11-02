import {
  Field, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class OverlayWordcloudOptionsFontObject {
  @Field()
  family: string;
  @Field(type => String)
  color: string;
  @Field(type => Int)
  weight: number;
}