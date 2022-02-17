import { OverlayMapperCredits } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayCreditsOptionsObject } from './OverlayCreditsOptionsObject';

@ObjectType()
export class OverlayCreditsObject implements OverlayMapperCredits {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field()
    value: 'credits';
  @Field(type => OverlayCreditsOptionsObject, { nullable: true })
    opts: OverlayMapperCredits['opts'];
}