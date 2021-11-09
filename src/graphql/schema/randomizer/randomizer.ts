import { RandomizerInterface, RandomizerItemInterface } from '@entity/randomizer';
import {
  Field, Float, ID, Int, ObjectType,
} from 'type-graphql';

import {
  CustomizationFontObject, CustomizationPositionObject, CustomizationTTSObject,
} from '../customization';
import { RandomizerItemObject } from './randomizerItem';

@ObjectType()
export class RandomizerObject implements RandomizerInterface {
  @Field(type => ID)
  id?: string;
  @Field(type => [RandomizerItemObject])
  items: RandomizerItemInterface[];
  @Field(type => String)
  createdAt: number;
  @Field()
  command: string;
  @Field()
  permissionId: string;
  @Field()
  name: string;
  @Field()
  isShown: boolean;
  @Field()
  shouldPlayTick: boolean;
  @Field(type => Float)
  tickVolume: number;
  @Field(type => Int)
  widgetOrder: number;
  @Field(type => String)
  type: 'simple' | 'wheelOfFortune';
  @Field(type => CustomizationPositionObject)
  position: CustomizationPositionObject;
  @Field(type => CustomizationFontObject)
  customizationFont: CustomizationFontObject;
  @Field(type => CustomizationTTSObject)
  tts: CustomizationTTSObject;
}