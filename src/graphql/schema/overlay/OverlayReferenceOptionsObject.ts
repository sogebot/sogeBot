import { OverlayMapperReference } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

type OverlayMapperReferenceOptions = NonNullable<OverlayMapperReference['opts']>;

@ObjectType()
export class OverlayReferenceOptionsObject implements OverlayMapperReferenceOptions {
  @Field(type => String, { nullable: true })
    overlayId: string | null;
}