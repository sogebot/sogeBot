import { GoalInterface } from '@entity/goal';
import {
  Field, Float, ID, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class GoalCustomizationBarObject {
  @Field()
  color: string;
  @Field()
  backgroundColor: string;
  @Field()
  borderColor: string;
  @Field(type => Int)
  borderPx: number;
  @Field(type => Int)
  height: number;
}

@ObjectType()
export class GoalCustomizationFontShadowObject {
  @Field(type => Int)
  shiftRight: number;
  @Field(type => Int)
  shiftDown: number;
  @Field(type => Int)
  blur: number;
  @Field(type => Int)
  opacity: number;
  @Field()
  color: string;
}

@ObjectType()
export class GoalCustomizationFontObject {
  @Field()
  family: string;
  @Field()
  color: string;
  @Field(type => Int)
  size: number;
  @Field(type => Int)
  weight: number;
  @Field()
  borderColor: string;
  @Field(type => Int)
  borderPx: number;
  @Field(type => [GoalCustomizationFontShadowObject])
  shadow: GoalCustomizationFontShadowObject[];
}

@ObjectType()
export class GoalObject implements GoalInterface {
  @Field(type => ID)
  id?: string;
  @Field()
  name: string;
  @Field()
  type:
  'followers' | 'currentFollowers' | 'currentSubscribers'
  | 'subscribers' | 'tips' | 'bits' | 'intervalSubscribers'
  | 'intervalFollowers' | 'intervalTips' | 'intervalBits';
  @Field()
  countBitsAsTips: boolean;
  @Field()
  display: 'simple' | 'full' | 'custom';
  @Field(type => String)
  timestamp: number;
  @Field(type => Int)
  interval: number;
  @Field(type => Int)
  goalAmount: number;
  @Field(type => Float)
  currentAmount: number;
  @Field(type => String)
  endAfter: number;
  @Field()
  endAfterIgnore: boolean;
  @Field(type => GoalCustomizationBarObject)
  customizationBar: GoalCustomizationBarObject;
  @Field(type => GoalCustomizationFontObject)
  customizationFont: GoalCustomizationFontObject;
  @Field()
  customizationHtml: string;
  @Field()
  customizationJs: string;
  @Field()
  customizationCss: string;
}