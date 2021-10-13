import { OverlayMapperEventlist } from '@entity/overlay';
import {
  Field, Int, ObjectType, 
} from 'type-graphql';

type OverlayMapperEventlistOptions = NonNullable<OverlayMapperEventlist['opts']>;

@ObjectType()
export class OverlayEventlistOptionsObject implements OverlayMapperEventlistOptions {
  @Field(type => Int) count: number;
  @Field(type => [String]) ignore: string[];
  @Field(type => [String]) display: string[];
  @Field() order: 'asc' | 'desc';
}