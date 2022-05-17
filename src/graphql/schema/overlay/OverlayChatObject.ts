import { OverlayMapperChat } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayChatOptionsObject } from './OverlayChatOptionsObject';

@ObjectType()
export class OverlayChatObject implements OverlayMapperChat {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'chat';
  @Field(type => OverlayChatOptionsObject, { nullable: true })
    opts: OverlayMapperChat['opts'];
}