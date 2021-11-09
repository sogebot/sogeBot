import {
  Field, Int, ObjectType,
} from 'type-graphql';

@ObjectType()
export class CommonSettingsTTSObject {
  @Field()
    enabled: boolean;
  @Field()
    skipUrls: boolean;
  @Field()
    keepAlertShown: boolean;
  @Field(type => Int)
    minAmountToPlay: number;
}