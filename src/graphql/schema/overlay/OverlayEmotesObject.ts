import { OverlayMapperEmotes } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayEmotesOptionsObject } from './OverlayEmotesOptionsObject';

@ObjectType()
export class OverlayEmotesObject implements OverlayMapperEmotes {
  @Field(type => ID)
    id: string;
  @Field()
    value: 'emotes';
  @Field(type => OverlayEmotesOptionsObject, { nullable: true })
    opts: OverlayMapperEmotes['opts'];
}