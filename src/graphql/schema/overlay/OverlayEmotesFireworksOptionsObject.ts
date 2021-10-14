import { OverlayMapperEmotesFireworks } from '@entity/overlay';
import {
  Field, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperEmotesFireworksOptions = NonNullable<OverlayMapperEmotesFireworks['opts']>;

@ObjectType()
export class OverlayEmotesFireworksOptionsObject implements OverlayMapperEmotesFireworksOptions {
  @Field(type => Int) emotesSize: 1 | 2 | 3;
  @Field(type => Int) animationTime: number;
  @Field(type => Int) numOfEmotesPerExplosion: number;
  @Field(type => Int) numOfExplosions: number;
}