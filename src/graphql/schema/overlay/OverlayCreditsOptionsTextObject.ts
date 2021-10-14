import { OverlayMapperCredits } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

type Implementation = NonNullable<OverlayMapperCredits['opts']>['text'];

@ObjectType()
export class OverlayCreditsOptionsTextObject implements Implementation {
  @Field() lastMessage:      string;
  @Field() lastSubMessage:   string;
  @Field() streamBy:         string;
  @Field() follow:           string;
  @Field() host:             string;
  @Field() raid:             string;
  @Field() cheer:            string;
  @Field() sub:              string;
  @Field() resub:            string;
  @Field() subgift:          string;
  @Field() subcommunitygift: string;
  @Field() tip:              string;
}