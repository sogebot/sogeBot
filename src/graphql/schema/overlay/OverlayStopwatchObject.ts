import { OverlayMapperStopwatch } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayStopwatchOptionsObject } from './OverlayStopwatchOptionsObject';

@ObjectType()
export class OverlayStopwatchObject implements OverlayMapperStopwatch {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'stopwatch';
  @Field(type => OverlayStopwatchOptionsObject, { nullable: true })
    opts: OverlayMapperStopwatch['opts'];
}