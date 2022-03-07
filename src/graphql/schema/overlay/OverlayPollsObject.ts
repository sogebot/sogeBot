import { OverlayMapperPolls } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayPollsOptionsObject } from './OverlayPollsOptionsObject';

@ObjectType()
export class OverlayPollsObject implements OverlayMapperPolls {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'polls';
  @Field(type => OverlayPollsOptionsObject, { nullable: true })
    opts: OverlayMapperPolls['opts'];
}