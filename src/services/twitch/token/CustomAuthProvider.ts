import { MakeOptional } from '@d-fischer/shared-utils';
import { UserIdResolvable, extractUserId } from '@twurple/api';
import { RefreshingAuthProvider, AccessTokenWithUserId, AccessToken, refreshUserToken, accessTokenIsExpired, getTokenInfo, InvalidTokenError, InvalidTokenTypeError, TokenInfo } from '@twurple/auth';
import axios from 'axios';

import { debug } from '~/helpers/log.js';
import { variables } from '~/watchers.js';

const urls = {
  'SogeBot Token Generator v2': 'https://credentials.sogebot.xyz/twitch/refresh/',
};

function createAccessTokenFromData(data: any): AccessToken {
  return {
    accessToken:         data.access_token,
    refreshToken:        data.refresh_token || null,
    scope:               data.scope ?? [],
    expiresIn:           data.expires_in ?? null,
    obtainmentTimestamp: Date.now(),
  };
}

export class CustomAuthProvider extends RefreshingAuthProvider {
  async refreshUserToken(refreshToken: string) {
    let tokenData: AccessToken;

    const tokenService = variables.get('services.twitch.tokenService') as keyof typeof urls;
    const url = urls[tokenService];
    if (!url) {
      // we have custom app so we are using original code
      const tokenServiceCustomClientId = variables.get('services.twitch.tokenServiceCustomClientId') as string;
      const tokenServiceCustomClientSecret = variables.get('services.twitch.tokenServiceCustomClientSecret') as string;
      tokenData = await refreshUserToken(tokenServiceCustomClientId, tokenServiceCustomClientSecret, refreshToken);
    } else {
      // we are using own generator
      const generalOwners = variables.get('services.twitch.generalOwners') as string[];
      const channel = variables.get('services.twitch.broadcasterUsername') as string;
      const response = await axios.post(url + encodeURIComponent(refreshToken.trim()), undefined, {
        headers: {
          'SogeBot-Channel': channel,
          'SogeBot-Owners':  generalOwners.join(', '),
        },
        timeout: 120000,
      });
      tokenData = createAccessTokenFromData(response.data);
    }

    debug('twitch.token', JSON.stringify({ tokenData }));
    return tokenData;
  }

  async addUserForToken(
    initialToken: MakeOptional<AccessToken, 'accessToken' | 'scope'>,
    intents?: string[],
  ): Promise<string> {
    let tokenWithInfo: [MakeOptional<AccessToken, 'accessToken' | 'scope'>, TokenInfo] | null = null;
    if (initialToken.accessToken && !accessTokenIsExpired(initialToken)) {
      try {
        const tokenInfo = await getTokenInfo(initialToken.accessToken);
        tokenWithInfo = [initialToken, tokenInfo];
      } catch (e) {
        if (!(e instanceof InvalidTokenError)) {
          throw e;
        }
      }
    }

    if (!tokenWithInfo) {
      if (!initialToken.refreshToken) {
        throw new InvalidTokenError();
      }

      const refreshedToken = await this.refreshUserToken(
        initialToken.refreshToken,
      );

      const tokenInfo = await getTokenInfo(refreshedToken.accessToken);
      this.emit(this.onRefresh, tokenInfo.userId!, refreshedToken);
      tokenWithInfo = [refreshedToken, tokenInfo];
    }

    const [tokenToAdd, tokenInfo] = tokenWithInfo;

    if (!tokenInfo.userId) {
      throw new InvalidTokenTypeError(
        'Could not determine a user ID for your token; you might be trying to disguise an app token as a user token.',
      );
    }

    const token = tokenToAdd.scope
      ? tokenToAdd
      : {
        ...tokenToAdd,
        scope: tokenInfo.scopes,
      };

    this.addUser(tokenInfo.userId, token, intents);

    return tokenInfo.userId;
  }
  async refreshAccessTokenForUser(user: UserIdResolvable): Promise<AccessTokenWithUserId> {
    const userId = extractUserId(user);
    const previousTokenData = this._userAccessTokens.get(userId);
    if (!previousTokenData) {
      throw new Error('Trying to refresh token for user that was not added to the provider');
    }

    const tokenData = await this.refreshUserToken(previousTokenData.refreshToken!);

    this._userAccessTokens.set(userId, {
      ...tokenData,
      userId,
    });

    this.emit(this.onRefresh, userId, tokenData);
    return {
      ...tokenData,
      userId,
    };
  }
}