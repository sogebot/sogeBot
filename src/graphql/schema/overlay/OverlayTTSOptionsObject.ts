import { OverlayMapperTTS } from '@entity/overlay';
import {
  Field, Float, ObjectType,
} from 'type-graphql';

type OverlayMapperTTSOptions = NonNullable<OverlayMapperTTS['opts']>;

@ObjectType()
export class OverlayTTSOptionsObject implements OverlayMapperTTSOptions {
  @Field() voice: string;
  @Field(type => Float) volume: number;
  @Field(type => Float) rate: number;
  @Field(type => Float) pitch: number;
  @Field() triggerTTSByHighlightedMessage: boolean;
}