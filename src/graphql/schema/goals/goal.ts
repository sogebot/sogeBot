import { GoalInterface } from '@entity/goal';
import {
  Field, Float, ID, Int, ObjectType,
} from 'type-graphql';

import { CustomizationFontObject } from '../customization';

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
  @Field(type => Number, { nullable: true })
    tiltifyCampaign?: number | null | undefined;
  @Field()
    display: 'simple' | 'full' | 'custom';
  @Field(type => String)
    timestamp: string;
  @Field(type => String)
    interval: 'hour' | 'day' | 'week' | 'month' | 'year';
  @Field(type => Int)
    goalAmount: number;
  @Field(type => Float)
    currentAmount: number;
  @Field(type => String)
    endAfter: string;
  @Field()
    endAfterIgnore: boolean;
  @Field(type => GoalCustomizationBarObject)
    customizationBar: GoalCustomizationBarObject;
  @Field(type => CustomizationFontObject)
    customizationFont: GoalInterface['customizationFont'];
  @Field()
    customizationHtml: string;
  @Field()
    customizationJs: string;
  @Field()
    customizationCss: string;
}