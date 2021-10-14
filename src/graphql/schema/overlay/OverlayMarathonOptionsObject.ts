import { OverlayMapperMarathon } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { CustomizationFontObject } from '../customization';
import { OverlayMarathonOptionsValuesObject } from './OverlayMarathonOptionsValuesObject';

type OverlayMapperMarathonOptions = NonNullable<OverlayMapperMarathon['opts']>;

@ObjectType()
export class OverlayMarathonOptionsObject implements OverlayMapperMarathonOptions {
  @Field()
  disableWhenReachedZero: boolean;
  @Field()
  showProgressGraph: boolean;
  @Field(type => String)
  endTime: number;
  @Field(type => String, { nullable: true })
  maxEndTime: number | null;
  @Field()
  showMilliseconds: boolean;
  @Field(type => OverlayMarathonOptionsValuesObject)
  values: OverlayMarathonOptionsValuesObject;
  @Field(type => CustomizationFontObject)
  marathonFont: CustomizationFontObject<undefined, string>;
}