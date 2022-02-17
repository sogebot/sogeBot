import { OverlayMapperClips } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayClipsOptionsObject } from './OverlayClipsOptionsObject';

@ObjectType()
export class OverlayClipsObject implements OverlayMapperClips {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field()
    value: 'clips';
  @Field(type => OverlayClipsOptionsObject, { nullable: true })
    opts: OverlayMapperClips['opts'];
}