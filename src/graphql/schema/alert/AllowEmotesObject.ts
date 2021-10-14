import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class AllowEmotesObject {
  @Field()
  twitch: boolean;
  @Field()
  ffz: boolean;
  @Field()
  bttv: boolean;
}