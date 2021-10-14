import { OverlayMapperCredits } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

type Implementation = NonNullable<OverlayMapperCredits['opts']>['show'];

@ObjectType()
export class OverlayCreditsOptionsShowObject implements Implementation {
  @Field() follow:           boolean;
  @Field() host:             boolean;
  @Field() raid:             boolean;
  @Field() sub:              boolean;
  @Field() subgift:          boolean;
  @Field() subcommunitygift: boolean;
  @Field() resub:            boolean;
  @Field() cheer:            boolean;
  @Field() clips:            boolean;
  @Field() tip:              boolean;
}