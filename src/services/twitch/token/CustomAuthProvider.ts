import { Enumerable } from '@d-fischer/shared-utils';
import type { AuthProvider, AccessToken } from '@twurple/auth';

import { variables } from '../../../watchers.js';
import { expirationDate, validate } from './validate.js';

export class CustomAuthProvider implements AuthProvider {
  @Enumerable(false) private _clientId: string;
  @Enumerable(false) private _accessToken: AccessToken;

  readonly typeOfToken: 'broadcaster' | 'bot';
  readonly tokenType = 'user';

  constructor(
    type: 'broadcaster' | 'bot',
  ) {
    this.typeOfToken = type;
    this._accessToken = variables.get(`services.twitch.${this.typeOfToken}AccessToken`);
    this.updateClientId();
  }

  async getAccessToken(requestedScopes?: string[]): Promise<AccessToken | null> {
    this.updateClientId();
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

  updateClientId() {
    const tokenService = variables.get(`services.twitch.tokenService`);
    switch (tokenService) {
      case 'SogeBot Token Generator':
        this._clientId = 't8cney2xkc7j4cu6zpv9ijfa27w027';
        break;
      case 'SogeBot Token Generator v2':
        this._clientId = '89k6demxtifvq0vzgjpvr1mykxaqmf';
        break;
      default:
        this._clientId = variables.get(`services.twitch.tokenServiceCustomClientId`);
    }
  }

  /**
	 * The client ID.
	 */
  get clientId(): string {
    this.updateClientId();
    return this._clientId;
  }

  /**
	 * The scopes that are currently available using the access token.
	 */
  get currentScopes(): string[] {
    return [];
  }
}