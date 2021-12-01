import {
  Field, ObjectType,
} from 'type-graphql';

import { GooglePrivateKeysInterface } from '~/database/entity/google';

@ObjectType()
export class GooglePrivateKeysObject extends GooglePrivateKeysInterface {
  @Field()
    id: string;
  @Field()
    clientEmail: string;
  @Field()
    privateKey: string;
  @Field()
    createdAt: string;
}