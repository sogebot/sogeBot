import {
  Field, Float, ObjectType, 
} from 'type-graphql';

import { CustomizationFontObject } from '../customization';
import { AllowEmotesObject } from './AllowEmotesObject';

@ObjectType()
export class MessageResubObject {
  @Field(type => AllowEmotesObject)
  allowEmotes: AllowEmotesObject;
  @Field(type => CustomizationFontObject)
  font: CustomizationFontObject<'left' | 'center' | 'right', string>;
}

@ObjectType()
export class MessageObject extends MessageResubObject {
  @Field(type => Float)
  minAmountToShow: number;
}