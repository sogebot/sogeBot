import { OverlayMapperEmotes } from '@entity/overlay';
import {
  Field, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperEmotesOptions = NonNullable<OverlayMapperEmotes['opts']>;

@ObjectType()
export class OverlayEmotesOptionsObject implements OverlayMapperEmotesOptions {
  @Field(type => Int) emotesSize: 1 | 2 | 3;
  @Field(type => Int) maxEmotesPerMessage: number;
  @Field() animation: 'fadeup' | 'fadezoom' | 'facebook';
  @Field(type => Int) animationTime: number;
  @Field(type => Int, { nullable: true }) maxRotation: number;
  @Field(type => Int, { nullable: true }) offsetX: number;
}