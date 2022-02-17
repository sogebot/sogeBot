import { OverlayMapperClipsCarousel } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayClipsCarouselOptionsObject } from './OverlayClipsCarouselOptionsObject';

@ObjectType()
export class OverlayClipsCarouselObject implements OverlayMapperClipsCarousel {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field()
    value: 'clipscarousel';
  @Field(type => OverlayClipsCarouselOptionsObject, { nullable: true })
    opts: OverlayMapperClipsCarousel['opts'];
}