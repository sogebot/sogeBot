import { AlertResubInterface } from '@entity/alert';
import { Field, ObjectType } from 'type-graphql';

import { CommonSettingsObject } from './CommonSettingsObject';
import { MessageResubObject } from './MessageObject';

@ObjectType()
export class AlertResubObject extends CommonSettingsObject implements AlertResubInterface{
  @Field()
    ttsTemplate: string;
  @Field(type => MessageResubObject)
    message: MessageResubObject;
}