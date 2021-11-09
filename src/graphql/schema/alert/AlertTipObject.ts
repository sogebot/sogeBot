import { AlertTipInterface } from '@entity/alert';
import { Field, ObjectType } from 'type-graphql';

import { CommonSettingsObject } from './CommonSettingsObject';
import { MessageObject } from './MessageObject';

@ObjectType()
export class AlertTipObject extends CommonSettingsObject implements AlertTipInterface {
  @Field(type => MessageObject)
    message: MessageObject;
}