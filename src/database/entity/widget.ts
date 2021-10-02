import {
  Field, ID, InputType, ObjectType,
} from 'type-graphql';
import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

@ObjectType()
export class WidgetCustomInterface {
  @Field(type => ID)
  id: string;
  @Field()
  userId: string;
  @Field()
  url: string;
  @Field()
  name: string;
}
@InputType()
export class WidgetCustomInput {
  @Field()
  url: string;
  @Field()
  name: string;
}

export const WidgetCustom = new EntitySchema<Readonly<Required<WidgetCustomInterface>>>({
  name:    'widget_custom',
  columns: {
    id: {
      type:    String,
      primary: true,
    },
    userId: { type: String },
    url:    { type: String },
    name:   { type: String },
  },
});

@ObjectType()
export class WidgetSocialInterface {
  @Field(type => ID)
  id: string;
  @Field()
  type: string;
  @Field()
  hashtag: string;
  @Field()
  text: string;
  @Field()
  username: string;
  @Field()
  displayname: string;
  @Field()
  url: string;
  @Field()
  timestamp: number;
}

export const WidgetSocial = new EntitySchema<Readonly<Required<WidgetSocialInterface>>>({
  name:    'widget_social',
  columns: {
    id: {
      type:    String,
      primary: true,
    },
    type:        { type: String },
    hashtag:     { type: String },
    text:        { type: 'text' },
    username:    { type: String },
    displayname: { type: String },
    url:         { type: String },
    timestamp:   {
      type:        'bigint',
      transformer: new ColumnNumericTransformer(),
      default:     0,
    },
  },
});