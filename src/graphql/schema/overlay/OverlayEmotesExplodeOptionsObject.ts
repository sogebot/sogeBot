import { OverlayMapperEmotesExplode } from '@entity/overlay';
import {
  Field, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperEmotesExplodeOptions = NonNullable<OverlayMapperEmotesExplode['opts']>;

@ObjectType()
export class OverlayEmotesExplodeOptionsObject implements OverlayMapperEmotesExplodeOptions {
  @Field(type => Int) emotesSize: 1 | 2 | 3;
  @Field(type => Int) animationTime: number;
  @Field(type => Int) numOfEmotes: number;
}