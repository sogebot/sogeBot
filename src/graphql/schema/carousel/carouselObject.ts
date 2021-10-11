import { CarouselInterface } from '@entity/carousel';
import {
  Field, ID, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class CarouselObject implements CarouselInterface {
  @Field(type => ID)
  id: string;
  @Field(type => Int)
  order: number;
  @Field()
  type: string;
  @Field(type => Int)
  waitBefore: number;
  @Field(type => Int)
  waitAfter: number;
  @Field(type => Int)
  duration: number;
  @Field(type => Int)
  animationInDuration: number;
  @Field()
  animationIn: string;
  @Field(type => Int)
  animationOutDuration: number;
  @Field()
  animationOut: string;
  @Field()
  showOnlyOncePerStream: boolean;
  @Field()
  imageUrl: boolean;
  base64: string; // we are not returning base64

}