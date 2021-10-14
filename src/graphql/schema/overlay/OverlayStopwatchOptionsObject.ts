import { OverlayMapperStopwatch } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { CustomizationFontObject } from '../customization';

type OverlayMapperStopwatchOptions = NonNullable<OverlayMapperStopwatch['opts']>;

@ObjectType()
export class OverlayStopwatchOptionsObject implements OverlayMapperStopwatchOptions {
  @Field(type => String)
  currentTime: number;
  @Field()
  isPersistent: boolean;
  @Field()
  isStartedOnSourceLoad: boolean;
  @Field()
  showMilliseconds: boolean;
  @Field(type => CustomizationFontObject)
  stopwatchFont: CustomizationFontObject<undefined, string>;
}