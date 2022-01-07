import { Field, ObjectType } from 'type-graphql';

import { CommonSettingsObject } from './CommonSettingsObject';
import { MessageObject } from './MessageObject';

import { AlertRewardRedeemInterface } from '~/database/entity/alert';

@ObjectType()
export class AlertRewardRedeemObject extends CommonSettingsObject implements AlertRewardRedeemInterface {
  @Field()
    ttsTemplate: string;
  @Field(type => String, { nullable: true })
    rewardId: null | string;
  @Field(type => MessageObject)
    message: MessageObject;
}