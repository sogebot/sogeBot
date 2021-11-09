import { Field, ObjectType } from 'type-graphql';

import { AlertTipObject } from './AlertTipObject';

@ObjectType()
export class AlertRewardRedeemObject extends AlertTipObject {
  @Field(type => String, { nullable: true })
    rewardId: null | string;
}