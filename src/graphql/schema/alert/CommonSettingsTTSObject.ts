import {
  Field, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class CommonSettingsTTSObject {
  @Field()
    enabled: boolean;
  @Field(type => Boolean, { nullable: true })
    skipUrls: boolean | null;
  @Field()
    keepAlertShown: boolean;
  @Field(type => Int, { nullable: true })
    minAmountToPlay: number | null;
}