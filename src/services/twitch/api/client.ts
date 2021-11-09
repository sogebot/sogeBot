import { ApiClient } from '@twurple/api';
import { StaticAuthProvider } from '@twurple/auth';

import { warning } from '../../../helpers/log.js';

import { variables } from '~/watchers';

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
  const authProvider = new StaticAuthProvider(clientId, accessToken);
  return new ApiClient({ authProvider });
};

export default client;