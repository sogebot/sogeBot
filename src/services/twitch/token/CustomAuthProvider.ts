import { Enumerable } from '@d-fischer/shared-utils';
import type { AuthProvider, AccessToken } from '@twurple/auth';

import { variables } from '../../../watchers.js';
import { expirationDate, validate } from './validate.js';

export class CustomAuthProvider implements AuthProvider {
  @Enumerable(false) private _accessToken: AccessToken;

  readonly typeOfToken: 'broadcaster' | 'bot';
  readonly tokenType = 'user';

  constructor(
    type: 'broadcaster' | 'bot',
  ) {
    this.typeOfToken = type;
    this._accessToken = variables.get(`services.twitch.${this.typeOfToken}AccessToken`);
  }

  async getAccessToken(requestedScopes?: string[]): Promise<AccessToken | null> {
    if (variables.get(`services.twitch.${this.typeOfToken}AccessToken`) === '') {
      return null;
    }

    await validate(this.typeOfToken);

    this._accessToken = {
      accessToken:         variables.get(`services.twitch.${this.typeOfToken}AccessToken`),
      refreshToken:        variables.get(`services.twitch.${this.typeOfToken}RefreshToken`),
      scope:               [],
      expiresIn:           expirationDate[this.typeOfToken],
      obtainmentTimestamp: Date.now(),
    };

    return this._accessToken;
  }

  /**
	 * The client ID.
	 */
  get clientId(): string {
    const tokenService = variables.get(`services.twitch.tokenService`);
    switch (tokenService) {
      case 'SogeBot Token Generator':
        return 't8cney2xkc7j4cu6zpv9ijfa27w027';
      case 'Sogebot Token Generator v2':
        return '89k6demxtifvq0vzgjpvr1mykxaqmf';
      default:
        return variables.get(`services.twitch.tokenServiceCustomClientId`);
    }
  }

  /**
	 * The scopes that are currently available using the access token.
	 */
  get currentScopes(): string[] {
    return [];
  }
}