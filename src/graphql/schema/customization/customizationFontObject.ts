import {
  Field, Int, ObjectType,
} from 'type-graphql';

import { CustomizationFontShadowObject } from './customizationFontShadowObject';

@ObjectType()
export class CustomizationFontObject<
  ALIGN = undefined,
  COLOR = undefined,
  HIGHLIGHTCOLOR = undefined,
> {
  @Field()
  family: string;
  @Field(type => String, { nullable: true }) // optional in some cases
  align: ALIGN;
  @Field(type => String, { nullable: true }) // optional in some cases
  color: COLOR;
  @Field(type => String, { nullable: true }) // optional in some cases
  highlightcolor: HIGHLIGHTCOLOR;
  @Field(type => Int)
  size: number;
  @Field(type => Int)
  weight: number;
  @Field()
  borderColor: string;
  @Field(type => Int)
  borderPx: number;
  @Field(type => [CustomizationFontShadowObject])
  shadow: CustomizationFontShadowObject[];
}