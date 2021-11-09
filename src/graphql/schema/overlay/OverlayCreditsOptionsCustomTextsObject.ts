import { OverlayMapperCredits } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

type Implementation = NonNullable<OverlayMapperCredits['opts']>['customTexts'][number];

@ObjectType()
export class OverlayCreditsOptionsCustomTextsObject implements Implementation {
  @Field()
    type: 'bigHeader' | 'header' | 'text' | 'smallText' | 'separator';
  @Field()
    left: string;
  @Field()
    middle: string;
  @Field()
    right: string;
}