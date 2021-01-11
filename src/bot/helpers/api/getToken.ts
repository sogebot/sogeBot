import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';

async function getToken(type: 'bot' | 'broadcaster'){
  const token = await getRepository(Settings).findOne({
    where: {
      name: type + 'AccessToken',
      namespace: '/core/oauth',
    },
  });

  if (!token) {
    throw Error('Missing oauth token');
  }

  return JSON.parse(token.value);
}

export { getToken };