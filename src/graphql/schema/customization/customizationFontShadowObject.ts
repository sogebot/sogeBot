import {
  Field, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class CustomizationFontShadowObject {
  @Field(type => Int)
  shiftRight: number;
  @Field(type => Int)
  shiftDown: number;
  @Field(type => Int)
  blur: number;
  @Field(type => Int)
  opacity: number;
  @Field()
  color: string;
}