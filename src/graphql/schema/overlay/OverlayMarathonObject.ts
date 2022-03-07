import { OverlayMapperMarathon } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayMarathonOptionsObject } from './OverlayMarathonOptionsObject';

@ObjectType()
export class OverlayMarathonObject implements OverlayMapperMarathon {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'marathon';
  @Field(type => OverlayMarathonOptionsObject, { nullable: true })
    opts: OverlayMapperMarathon['opts'];
}