import {
  Field, Int, ObjectType,
} from 'type-graphql';

import { CustomizationFontShadowObject } from './customizationFontShadowObject';

@ObjectType()
export class CustomizationFontObject {
  @Field()
  family: string;
  @Field({ nullable: true }) // optional in some cases
  color?: string;
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