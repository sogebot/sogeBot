import { AlertInterface } from '@entity/alert';
import {
  Field, ID, Int, ObjectType,
} from 'type-graphql';

import { CustomizationFontObject, CustomizationTTSObject } from '../customization';
import { AlertResubObject } from './AlertResubObject';
import { AlertRewardRedeemObject } from './AlertRewardRedeemObject';
import { AlertTipObject } from './AlertTipObject';
import { CommonSettingsObject } from './CommonSettingsObject';
import { LoadStandardProfanityListObject } from './loadStandardProfanityListObject';
import { ParryObject } from './ParryObject';

@ObjectType()
export class AlertObject implements AlertInterface {
  @Field(type => ID)
    id: string;
  @Field(type => String)
    updatedAt: number;
  @Field()
    name: string;
  @Field(type => Int)
    alertDelayInMs: number;
  @Field()
    profanityFilterType: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
  @Field(type => LoadStandardProfanityListObject)
    loadStandardProfanityList: LoadStandardProfanityListObject;
  @Field(type => ParryObject)
    parry: ParryObject;
  @Field(type => CustomizationTTSObject, { nullable: true })
    tts: CustomizationTTSObject;
  @Field(type => CustomizationFontObject)
    fontMessage: CustomizationFontObject<'left' | 'center' | 'right', string>;
  @Field(type => CustomizationFontObject)
    font: CustomizationFontObject<'left' | 'center' | 'right', string, string>;
  @Field()
    customProfanityList: string;
  @Field(type => [AlertResubObject])
    promo: AlertResubObject[];
  @Field(type => [CommonSettingsObject])
    follows: CommonSettingsObject[];
  @Field(type => [CommonSettingsObject])
    subs: CommonSettingsObject[];
  @Field(type => [CommonSettingsObject])
    subgifts: CommonSettingsObject[];
  @Field(type => [CommonSettingsObject])
    subcommunitygifts: CommonSettingsObject[];
  @Field(type => [CommonSettingsObject])
    hosts: CommonSettingsObject[];
  @Field(type => [CommonSettingsObject])
    raids: CommonSettingsObject[];
  @Field(type => [AlertTipObject])
    tips: AlertTipObject[];
  @Field(type => [AlertTipObject])
    cheers: AlertTipObject[];
  @Field(type => [AlertResubObject])
    resubs: AlertResubObject[];
  @Field(type => [CommonSettingsObject])
    cmdredeems: CommonSettingsObject[];
  @Field(type => [AlertRewardRedeemObject])
    rewardredeems: AlertRewardRedeemObject[];
}