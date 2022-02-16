import { OverlayMapperEmotesExplode } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayEmotesExplodeOptionsObject } from './OverlayEmotesExplodeOptionsObject';

@ObjectType()
export class OverlayEmotesExplodeObject implements OverlayMapperEmotesExplode {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field()
    value: 'emotesexplode';
  @Field(type => OverlayEmotesExplodeOptionsObject, { nullable: true })
    opts: OverlayMapperEmotesExplode['opts'];
}