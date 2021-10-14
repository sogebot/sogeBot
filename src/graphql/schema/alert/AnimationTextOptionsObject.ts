import {
  Field, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class AnimationTextOptionsObject {
  @Field(type => String)
  speed: number | 'slower' | 'slow' | 'fast' | 'faster';
  @Field(type => Int)
  maxTimeToDecrypt: number;
  @Field()
  characters: string;
}