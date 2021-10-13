import { OverlayMapperClips } from '@entity/overlay';
import {
  Field, Int, ObjectType, 
} from 'type-graphql';

type OverlayMapperClipsOptions = NonNullable<OverlayMapperClips['opts']>;

@ObjectType()
export class OverlayClipsOptionsObject implements OverlayMapperClipsOptions {
  @Field(type => Int) volume: number;
  @Field() filter: 'none' | 'grayscale' | 'sepia' | 'tint' | 'washed';
  @Field() showLabel: boolean;
}