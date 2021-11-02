import { OverlayMapperWordcloud } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayWordcloudOptionsObject } from './OverlayWordcloudOptionsObject';

@ObjectType()
export class OverlayWordcloudObject implements OverlayMapperWordcloud {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'wordcloud';
  @Field(type => OverlayWordcloudOptionsObject, { nullable: true })
  opts: OverlayMapperWordcloud['opts'];
}