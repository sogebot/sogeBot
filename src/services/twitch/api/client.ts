import { ApiClient } from '@twurple/api';
import { StaticAuthProvider } from '@twurple/auth';

import { variable } from '~/helpers/variables';

const client = async (account: 'broadcaster' | 'bot') => {
  const clientId = variable.get(`services.twitch.${account}ClientId`) as string;
  const accessToken = variable.get(`services.twitch.${account}AccessToken`) as string;
  const isValidToken = variable.get(`services.twitch.${account}TokenValid`) as string;

  if (!isValidToken) {
    throw new Error(`Cannot initialize Twitch API, ${account} token invalid.`);
  }
  const authProvider = new StaticAuthProvider(clientId, accessToken);
  return new ApiClient({ authProvider });
};

export default client;