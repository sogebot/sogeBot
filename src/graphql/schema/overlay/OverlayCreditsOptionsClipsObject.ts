import { OverlayMapperCredits } from '@entity/overlay';
import {
  Field, Float, Int, ObjectType,
} from 'type-graphql';

type Implementation = NonNullable<OverlayMapperCredits['opts']>['clips'];

@ObjectType()
export class OverlayCreditsOptionsClipsObject implements Implementation {
  @Field()
  play: boolean;
  @Field()
  period: 'custom' | 'stream';
  @Field(type => Int)
  periodValue: number;
  @Field(type => Int)
  numOfClips: number;
  @Field(type => Float)
  volume: number;
}