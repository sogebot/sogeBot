import { OverlayMapperMarathon } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { OverlayMarathonOptionsValuesBitsObject } from './OverlayMarathonOptionsValuesBitsObject';
import { OverlayMarathonOptionsValuesTierObject } from './OverlayMarathonOptionsValuesTierObject';
import { OverlayMarathonOptionsValuesTipsObject } from './OverlayMarathonOptionsValuesTipsObject';

type OverlayMapperMarathonOptionsValues = NonNullable<OverlayMapperMarathon['opts']>['values'];

@ObjectType()
export class OverlayMarathonOptionsValuesObject implements OverlayMapperMarathonOptionsValues {
  @Field(type => OverlayMarathonOptionsValuesTierObject)
    sub: OverlayMarathonOptionsValuesTierObject;
  @Field(type => OverlayMarathonOptionsValuesTierObject)
    resub: OverlayMarathonOptionsValuesTierObject;
  @Field(type => OverlayMarathonOptionsValuesBitsObject)
    bits: OverlayMarathonOptionsValuesBitsObject;
  @Field(type => OverlayMarathonOptionsValuesTipsObject)
    tips: OverlayMarathonOptionsValuesTipsObject;
}