import { OverlayMapperChat } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { CustomizationFontObject } from '../customization';

type OverlayMapperChatOptions = NonNullable<OverlayMapperChat['opts']>;

@ObjectType()
export class OverlayChatOptionsObject implements OverlayMapperChatOptions {
  @Field()
    isHorizontal: boolean;
  @Field()
    showTimestamp: boolean;
  @Field()
    hideMessageAfter: number;
  @Field(type => CustomizationFontObject)
    font: CustomizationFontObject<undefined, string>;
}