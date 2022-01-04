import { ApiClient } from '@twurple/api';

import { warning } from '../../../helpers/log.js';
import { CustomAuthProvider } from '../token/CustomAuthProvider.js';

import { variables } from '~/watchers';

const clients = {
  bot: {
    client: null as null | ApiClient,
  },
  broadcaster: {
    client: null as null | ApiClient,
  },
};

const client = async (account: 'broadcaster' | 'bot') => {
  const isValidToken = variables.get(`services.twitch.${account}TokenValid`) as string;

  if ((global as any).mocha) {
    warning('Mocking client for ' + account);
    return {
      clips: {
        getClipById: () => {
          warning('Mocking call clips.getClipById for ' + account);
        },
      },
    } as unknown as ApiClient;
  }

  if (!isValidToken) {
    throw new Error(`Cannot initialize Twitch API, ${account} token invalid.`);
  }

  if (clients[account].client === null) {
    const authProvider = new CustomAuthProvider(account);
    clients[account].client = new ApiClient({ authProvider });
  }

  if(clients[account].client) {
    return clients[account].client as ApiClient;
  } else {
    throw new Error('Client for ' + account + ' is not initialized.');
  }
};

export default client;