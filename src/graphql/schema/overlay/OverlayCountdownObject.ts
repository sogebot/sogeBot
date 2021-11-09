import { OverlayMapperCountdown } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayCountdownOptionsObject } from './OverlayCountdownOptionsObject';

@ObjectType()
export class OverlayCountdownObject implements OverlayMapperCountdown {
  @Field(type => ID)
    id: string;
  @Field()
    value: 'countdown';
  @Field(type => OverlayCountdownOptionsObject, { nullable: true })
    opts: OverlayMapperCountdown['opts'];
}