import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AdvancedModeObject {
  @Field(type => String, { nullable: true })
  html: null | string;
  @Field()
  css: string;
  @Field(type => String, { nullable: true })
  js: null | string;
}