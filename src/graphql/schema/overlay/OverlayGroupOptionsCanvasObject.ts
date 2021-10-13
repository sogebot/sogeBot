import { OverlayMapperGroup } from '@entity/overlay';
import {
  Field, Float, ObjectType,
} from 'type-graphql';

type Impl = NonNullable<OverlayMapperGroup['opts']>['canvas'];

@ObjectType()
export class OverlayGroupOptionsCanvasObject implements Impl {
  @Field(type => Float) width: number;
  @Field(type => Float) height: number;
}