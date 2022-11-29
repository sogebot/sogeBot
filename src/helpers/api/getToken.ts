import { Settings } from '@entity/settings';
import { getRepository } from 'typeorm';

async function getToken(type: 'bot' | 'broadcaster'){
  const token = await getRepository(Settings).findOne({
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