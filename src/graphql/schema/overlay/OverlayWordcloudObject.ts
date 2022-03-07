import { OverlayMapperWordcloud } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayWordcloudOptionsObject } from './OverlayWordcloudOptionsObject';

@ObjectType()
export class OverlayWordcloudObject implements OverlayMapperWordcloud {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'wordcloud';
  @Field(type => OverlayWordcloudOptionsObject, { nullable: true })
    opts: OverlayMapperWordcloud['opts'];
}