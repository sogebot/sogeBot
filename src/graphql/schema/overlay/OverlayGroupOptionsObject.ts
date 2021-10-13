import { OverlayMapperGroup } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { OverlayGroupOptionsCanvasObject } from './OverlayGroupOptionsCanvasObject';
import { OverlayGroupOptionsItemsObject } from './OverlayGroupOptionsItemsObject';

type OverlayMapperGroupOptions = NonNullable<OverlayMapperGroup['opts']>;

@ObjectType()
export class OverlayGroupOptionsObject implements OverlayMapperGroupOptions {
  @Field(type => OverlayGroupOptionsCanvasObject) canvas: OverlayGroupOptionsCanvasObject;
  @Field(type => [OverlayGroupOptionsItemsObject]) items: OverlayGroupOptionsItemsObject[];
}