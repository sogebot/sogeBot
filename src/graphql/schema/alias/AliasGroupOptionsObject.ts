import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AliasGroupOptionsObject {
  @Field(type => String, { nullable: true })
    filter: string | null;
  @Field(type => String, { nullable: true })
    permission: string | null;
}