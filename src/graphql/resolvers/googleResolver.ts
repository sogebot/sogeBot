import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { GooglePrivateKeys } from '~/database/entity/google';
import { GooglePrivateKeysObject } from '~/graphql/schema/google/googlePrivateKeysObject';

@Resolver()
export class GoogleResolver {
  @Mutation(returns => GooglePrivateKeysObject)
  @Authorized()
  privateKeyUpload(
  @Arg('data') data_json: string,
  ) {
    const data = JSON.parse(data_json) as GooglePrivateKeysObject;
    return getRepository(GooglePrivateKeys).save({
      createdAt: new Date().toISOString(), clientEmail: data.clientEmail, privateKey: data.privateKey,
    });
  }

  @Mutation(returns => Boolean)
  @Authorized()
  async privateKeyDelete(@Arg('id') id: string) {
    await getRepository(GooglePrivateKeys).delete({ id });
    return true;
  }

  @Query(returns => [GooglePrivateKeysObject])
  @Authorized()
  privateKeys() {
    return getRepository(GooglePrivateKeys).find();
  }
}