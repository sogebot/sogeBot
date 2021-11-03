import { ApiClient } from '@twurple/api';
import { StaticAuthProvider } from '@twurple/auth';

import { get } from '~/helpers/interfaceEmitter';

const client = async (account: 'broadcaster' | 'bot') => {
  const [ clientId, accessToken, isValidToken ] = await Promise.all([
    get<string>('/services/twitch', 'clientId'),
    get<string>('/services/twitch', account + 'AccessToken'),
    get<string>('/services/twitch', account + 'TokenValid'),
  ]);

  if (!isValidToken) {
    throw new Error(`Cannot initialize Twitch API, ${account} token invalid.`);
  }
  const authProvider = new StaticAuthProvider(clientId, accessToken);
  return new ApiClient({ authProvider });
};

export default client;