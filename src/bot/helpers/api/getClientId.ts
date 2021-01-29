import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';

async function getClientId(type: 'bot' | 'broadcaster'){
  const clientId = await getRepository(Settings).findOne({
    where: {
      name:      type + 'ClientId',
      namespace: '/core/oauth',
    },
  });

  if (!clientId || JSON.parse(clientId.value).trim().length === 0) {
    throw Error(`Missing ${type} oauth clientId`);
  }

  return JSON.parse(clientId.value);
}

export { getClientId };