import { OverlayMapperTTS } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayTTSOptionsObject } from './OverlayTTSOptionsObject';

@ObjectType()
export class OverlayTTSObject implements OverlayMapperTTS {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'tts';
  @Field(type => OverlayTTSOptionsObject, { nullable: true })
  opts: OverlayMapperTTS['opts'];
}