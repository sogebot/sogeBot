import { CommonSettingsInterface } from '@entity/alert';
import {
  Field, Float, ID, Int, ObjectType,
} from 'type-graphql';

import { CustomizationFontObject } from '../customization';
import { AdvancedModeObject } from './AdvancedModeObject';
import { AnimationTextOptionsObject } from './AnimationTextOptionsObject';
import { CommonSettingsTTSObject } from './CommonSettingsTTSObject';
import { ImageOptionsObject } from './ImageOptionsObject';

@ObjectType()
export class CommonSettingsObject implements CommonSettingsInterface {
  @Field(type => ID)
    id: string;
  @Field()
    enabled: boolean;
  @Field()
    title: string;
  @Field(type => Int)
    variantAmount: number;
  @Field()
    messageTemplate: string;
  @Field()
    layout: '1' | '2' | '3' | '4' | '5';
  @Field(type => String, { nullable: true })
    filter: string | null;
  @Field(type => Int)
    animationInDuration: number;
  @Field()
    animationIn: 'none' | 'fadeIn' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  | 'fadeInUp' | 'fadeInDownBig' | 'fadeInLeftBig' | 'fadeInRightBig'
  | 'fadeInUpBig' | 'bounceIn' | 'bounceInDown' | 'bounceInLeft'
  | 'bounceInRight' | 'bounceInUp' | 'flipInX' | 'flipInY' | 'lightSpeedIn'
  | 'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft'
  | 'rotateInUpRight' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
  | 'slideInUp' | 'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight'
  | 'zoomInUp' | 'rollIn' | 'jackInTheBox';
  @Field(type => Int)
    animationOutDuration: number;
  @Field()
    animationOut: 'none' | 'fadeOut' | 'fadeOutDown' | 'fadeOutLeft' | 'fadeOutRight' | 'fadeOutUp'
  | 'fadeOutDownBig' | 'fadeOutLeftBig' | 'fadeOutRightBig' | 'fadeOutUpBig'
  | 'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight'
  | 'bounceOutUp' | 'flipOutX' | 'flipOutY' | 'lightSpeedOut' | 'rotateOut'
  | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft'
  | 'rotateOutUpRight' | 'slideOutDown' | 'slideOutLeft' | 'slideOutRight'
  | 'slideOutUp' | 'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight'
  | 'zoomOutUp' | 'rollOut';
  @Field()
    animationText: 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
  | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello';
  @Field(type => AnimationTextOptionsObject)
    animationTextOptions: AnimationTextOptionsObject;
  @Field()
    imageId: string;
  @Field(type => ImageOptionsObject)
    imageOptions: ImageOptionsObject;
  @Field()
    soundId: string;
  @Field(type => Float)
    soundVolume: number;
  @Field(type => CommonSettingsTTSObject)
    tts: CommonSettingsTTSObject;
  @Field(type => Int)
    alertDurationInMs: number;
  @Field(type => Int)
    alertTextDelayInMs: number;
  @Field()
    enableAdvancedMode: boolean;
  @Field(type => AdvancedModeObject)
    advancedMode: AdvancedModeObject;
  @Field(type => CustomizationFontObject, { nullable: true })
    font: CustomizationFontObject<'left' | 'center' | 'right', string, string> | null;
}