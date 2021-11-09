import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { Source as SourceType } from '~/helpers/obswebsocket/sources';

@ObjectType()
export class Source implements SourceType {
  @Field(type => ID)
  typeId: string;
  @Field()
  name: string;
  @Field()
  type: string;
}