import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';

async function getClientId(type: 'bot' | 'broadcaster'){
  const clientId = await getRepository(Settings).findOne({
    where: {
      name: type + 'ClientId',
      namespace: '/core/oauth',
    },
  });

  if (!clientId) {
    throw Error('Missing oauth clientId');
  }

  return JSON.parse(clientId.value);
}

export { getClientId };