import { OverlayMapperCredits } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

type Implementation = NonNullable<OverlayMapperCredits['opts']>['social'][number];

@ObjectType()
export class OverlayCreditsOptionsSocialObject implements Implementation {
  @Field()
    type: string;
  @Field()
    text: string;
}