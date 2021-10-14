import { OverlayMapperEventlist } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayEventlistOptionsObject } from './OverlayEventlistOptionsObject';

@ObjectType()
export class OverlayEventlistObject implements OverlayMapperEventlist {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'eventlist';
  @Field(type => OverlayEventlistOptionsObject, { nullable: true })
  opts: OverlayMapperEventlist['opts'];
}