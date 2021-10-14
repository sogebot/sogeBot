import { OverlayMapperEmotesFireworks } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayEmotesFireworksOptionsObject } from './OverlayEmotesFireworksOptionsObject';

@ObjectType()
export class OverlayEmotesFireworksObject implements OverlayMapperEmotesFireworks {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'emotesfireworks';
  @Field(type => OverlayEmotesFireworksOptionsObject, { nullable: true })
  opts: OverlayMapperEmotesFireworks['opts'];
}