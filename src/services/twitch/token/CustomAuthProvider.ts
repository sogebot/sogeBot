import { UserIdResolvable, extractUserId } from '@twurple/api/lib/index.js';
import { RefreshingAuthProvider, AccessTokenWithUserId, refreshUserToken, AccessToken } from '@twurple/auth/lib';
import fetch from 'node-fetch';

import { isBotId } from '~/helpers/user';
import { variables } from '~/watchers';

const urls = {
  'SogeBot Token Generator':    'https://twitch-token-generator.soge.workers.dev/refresh/',
  'SogeBot Token Generator v2': 'https://credentials.sogebot.xyz/twitch/refresh/',
};

export class CustomAuthProvider extends RefreshingAuthProvider {
  async refreshAccessTokenForUser(user: UserIdResolvable): Promise<AccessTokenWithUserId> {
    const userId = extractUserId(user);
    const previousTokenData = this._userAccessTokens.get(userId);
    let tokenData: AccessToken;
    if (!previousTokenData) {
      throw new Error('Trying to refresh token for user that was not added to the provider');
    }

    const tokenService = variables.get('services.twitch.tokenService') as keyof typeof urls;
    const url = urls[tokenService];

    if (!url) {
      // we have custom app so we are using original code
      const tokenServiceCustomClientId = variables.get('services.twitch.tokenServiceCustomClientId') as string;
      const tokenServiceCustomClientSecret = variables.get('services.twitch.tokenServiceCustomClientSecret') as string;
      tokenData = await refreshUserToken(tokenServiceCustomClientId, tokenServiceCustomClientSecret, previousTokenData.refreshToken!);
    } else {
      // we are using own generator
      const generalOwners = variables.get('services.twitch.generalOwners') as string[];
      const channel = variables.get('services.twitch.broadcasterUsername') as string;
      const response = await fetch(url + encodeURIComponent(previousTokenData.refreshToken!.trim()), {
        timeout: 120000,
        method:  'POST',
        headers: {
          'SogeBot-Channel': channel,
          'SogeBot-Owners':  generalOwners.join(', '),
        },
      });
      tokenData = await response.json();
    }

    this._userAccessTokens.set(userId, {
      ...tokenData,
      userId,
    });

    this._callOnRefresh(userId, tokenData);
    return {
      ...tokenData,
      userId,
    };
  }
}