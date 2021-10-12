import {
  Field, Float, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class ImageOptionsObject {
  @Field(type => Float)
  translateX: number;
  @Field(type => Float)
  translateY: number;
  @Field(type => Float)
  scale: number;
}