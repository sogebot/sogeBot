import { ApiClient } from '@twurple/api';
import { StaticAuthProvider } from '@twurple/auth';

import { variables } from '~/watchers';

const client = async (account: 'broadcaster' | 'bot') => {
  const clientId = variables.get(`services.twitch.${account}ClientId`) as string;
  const accessToken = variables.get(`services.twitch.${account}AccessToken`) as string;
  const isValidToken = variables.get(`services.twitch.${account}TokenValid`) as string;

  if (!isValidToken) {
    throw new Error(`Cannot initialize Twitch API, ${account} token invalid.`);
  }
  const authProvider = new StaticAuthProvider(clientId, accessToken);
  return new ApiClient({ authProvider });
};

export default client;