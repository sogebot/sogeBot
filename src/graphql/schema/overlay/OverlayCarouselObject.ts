import { OverlayMapperCarousel } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
export class OverlayCarouselObject implements OverlayMapperCarousel {
  @Field(type => ID)
    id: string;
  @Field()
    value: 'carousel';
  opts: null;
}