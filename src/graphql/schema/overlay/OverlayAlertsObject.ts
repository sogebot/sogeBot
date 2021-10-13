import { OverlayMapperAlerts } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayAlertsOptionsObject } from './OverlayAlertsOptionsObject';

@ObjectType()
export class OverlayAlertsObject implements OverlayMapperAlerts {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'alerts';
  @Field(type => OverlayAlertsOptionsObject, { nullable: true })
  opts: OverlayMapperAlerts['opts'];
}