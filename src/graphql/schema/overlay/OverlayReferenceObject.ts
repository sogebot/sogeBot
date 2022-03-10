import { OverlayMapperReference } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayReferenceOptionsObject } from './OverlayReferenceOptionsObject';

@ObjectType()
export class OverlayReferenceObject implements OverlayMapperReference {
  @Field(type => ID)
    id: string;
  @Field(type => String)
    groupId: string;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'reference';
  @Field(type => OverlayReferenceOptionsObject, { nullable: true })
    opts: OverlayMapperReference['opts'];
}