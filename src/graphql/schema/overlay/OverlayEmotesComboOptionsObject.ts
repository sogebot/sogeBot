import { OverlayMapperEmotesCombo } from '@entity/overlay';
import {
  Field, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperEmotesComboOptions = NonNullable<OverlayMapperEmotesCombo['opts']>;

@ObjectType()
export class OverlayEmotesComboOptionsObject implements OverlayMapperEmotesComboOptions {
  @Field(type => Int) showEmoteInOverlayThreshold: number;
  @Field(type => Int) hideEmoteInOverlayAfter: number;
}