import { OverlayMapperGroup } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayGroupOptionsObject } from './OverlayGroupOptionsObject';

@ObjectType()
export class OverlayGroupObject implements OverlayMapperGroup {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field()
    value: 'group';
  @Field(type => OverlayGroupOptionsObject, { nullable: true })
    opts: OverlayMapperGroup['opts'];
}