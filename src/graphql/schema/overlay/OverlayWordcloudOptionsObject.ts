import { OverlayMapperWordcloud } from '@entity/overlay';
import { Field, Float, ObjectType } from 'type-graphql';

import { OverlayWordcloudOptionsFontObject } from './OverlayWordcloudOptionsFontObject';

type OverlayMapperWordcloudOptions = NonNullable<OverlayMapperWordcloud['opts']>;

@ObjectType()
export class OverlayWordcloudOptionsObject implements OverlayMapperWordcloudOptions {
  @Field(type => Float)
  fadeOutInterval: number;
  @Field(type => String)
  fadeOutIntervalType: 'seconds' | 'minutes' | 'hours';
  @Field(type => OverlayWordcloudOptionsFontObject)
  wordFont: OverlayWordcloudOptionsFontObject;
}