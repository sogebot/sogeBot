import { OverlayMapperClipsCarousel } from '@entity/overlay';
import {
  Field, Float, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperClipsCarouselOptions = NonNullable<OverlayMapperClipsCarousel['opts']>;

@ObjectType()
export class OverlayClipsCarouselOptionsObject implements OverlayMapperClipsCarouselOptions {
  @Field() animation: string;
  @Field(type => Int) customPeriod: number;
  @Field(type => Int) numOfClips: number;
  @Field(type => Float) volume: number;
}