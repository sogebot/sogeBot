import { Settings } from '@entity/settings.js';

import { AppDataSource } from '~/database.js';

async function getToken(type: 'bot' | 'broadcaster'){
  const token = await AppDataSource.getRepository(Settings).findOne({
    where: {
      name:      type + 'AccessToken',
      namespace: '/core/oauth',
    },
  });

  if (!token || JSON.parse(token.value).trim().length === 0) {
    throw Error(`Missing ${type} oauth token`);
  }

  return JSON.parse(token.value);
}

export { getToken };