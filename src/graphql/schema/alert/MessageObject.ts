import {
  Field, Float, ObjectType,
} from 'type-graphql';

import { CustomizationFontObject } from '../customization';
import { AllowEmotesObject } from './AllowEmotesObject';

@ObjectType()
export class MessageResubObject {
  @Field(type => AllowEmotesObject)
  allowEmotes: AllowEmotesObject;
  @Field(type => CustomizationFontObject, { nullable: true })
  font: CustomizationFontObject<'left' | 'center' | 'right', string> | null;
}

@ObjectType()
export class MessageObject extends MessageResubObject {
  @Field(type => Float)
  minAmountToShow: number;
}