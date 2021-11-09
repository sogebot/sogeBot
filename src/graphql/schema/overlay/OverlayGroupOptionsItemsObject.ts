import { OverlayMapperGroup } from '@entity/overlay';
import {
  Field, Float, ID, ObjectType,
} from 'type-graphql';

type Impl = NonNullable<OverlayMapperGroup['opts']>['canvas'];

@ObjectType()
export class OverlayGroupOptionsItemsObject implements Impl {
  @Field(type => ID)
    id: string;
  @Field(type => Float)
    width: number;
  @Field(type => Float)
    height: number;
  @Field(type => Float)
    alignX: number;
  @Field(type => Float)
    alignY: number;
  @Field()
    type: string;
  @Field()
    opts: string; // JSON.stringify
}