import { ApiClient } from '@twurple/api';
import { StaticAuthProvider } from '@twurple/auth';

import { warning, debug } from '../../../helpers/log.js';

import { variables } from '~/watchers';

const clients = {
  bot: {
    client: null as null | ApiClient,
    token:  '',
  },
  broadcaster: {
    client: null as null | ApiClient,
    token:  '',
  },
};

const client = async (account: 'broadcaster' | 'bot') => {
  const clientId = variables.get(`services.twitch.${account}ClientId`) as string;
  const accessToken = variables.get(`services.twitch.${account}AccessToken`) as string;
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

  if (clients[account].token !== accessToken) {
    debug('oauth.client', 'New client for access token ' + accessToken.replace(/(.{25})/, '*'.repeat(25)));
    clients[account].token = accessToken;
    const authProvider = new StaticAuthProvider(clientId, accessToken);
    clients[account].client = new ApiClient({ authProvider });
  } else {
    debug('oauth.client', 'Reusing client for access token ' + accessToken.replace(/(.{25})/, '*'.repeat(25)));
  }

  if(clients[account].client) {
    return clients[account].client as ApiClient;
  } else {
    throw new Error('Client for ' + account + ' is not initialized.');
  }
};

export default client;