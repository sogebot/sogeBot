import { OverlayMapperCredits } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayStopwatchOptionsObject } from './OverlayStopwatchOptionsObject';

@ObjectType()
export class OverlayCreditsObject implements OverlayMapperCredits {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'credits';
  @Field(type => OverlayStopwatchOptionsObject, { nullable: true })
  opts: OverlayMapperCredits['opts'];
}