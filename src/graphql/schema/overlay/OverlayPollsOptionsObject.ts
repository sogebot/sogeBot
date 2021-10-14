import { OverlayMapperPolls } from '@entity/overlay';
import {
  Field, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperPollsOptions = NonNullable<OverlayMapperPolls['opts']>;

@ObjectType()
export class OverlayPollsOptionsObject implements OverlayMapperPollsOptions {
  @Field() theme: 'light' | 'dark' | 'Soge\'s green';
  @Field() hideAfterInactivity: boolean;
  @Field(type => Int) inactivityTime: number;
  @Field() align: 'top' | 'bottom';
}