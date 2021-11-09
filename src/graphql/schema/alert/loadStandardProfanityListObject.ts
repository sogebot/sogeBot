import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class LoadStandardProfanityListObject {
  @Field()
    cs: boolean;
  @Field()
    en: boolean;
  @Field()
    ru: boolean;
}