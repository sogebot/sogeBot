import { OverlayMapperCountdown } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { CustomizationFontObject } from '../customization';

type OverlayMapperCountdownOptions = NonNullable<OverlayMapperCountdown['opts']>;

@ObjectType()
export class OverlayCountdownOptionsObject implements OverlayMapperCountdownOptions {
  @Field(type => String)
  time: number;
  @Field(type => String)
  currentTime: number;
  @Field()
  isPersistent: boolean;
  @Field()
  isStartedOnSourceLoad: boolean;
  @Field()
  messageWhenReachedZero: string;
  @Field()
  showMessageWhenReachedZero: boolean;
  @Field()
  showMilliseconds: boolean;
  @Field(type => CustomizationFontObject)
  countdownFont: CustomizationFontObject<undefined, string>;
  @Field(type => CustomizationFontObject)
  messageFont: CustomizationFontObject<undefined, string>;
}