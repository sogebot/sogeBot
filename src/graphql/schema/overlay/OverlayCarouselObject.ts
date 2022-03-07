import { OverlayMapperCarousel } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
export class OverlayCarouselObject implements OverlayMapperCarousel {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'carousel';
  opts: null;
}