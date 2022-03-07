import { OverlayMapperEmotesFireworks } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayEmotesFireworksOptionsObject } from './OverlayEmotesFireworksOptionsObject';

@ObjectType()
export class OverlayEmotesFireworksObject implements OverlayMapperEmotesFireworks {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'emotesfireworks';
  @Field(type => OverlayEmotesFireworksOptionsObject, { nullable: true })
    opts: OverlayMapperEmotesFireworks['opts'];
}