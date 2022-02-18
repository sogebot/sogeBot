import { Enumerable } from '@d-fischer/shared-utils';
import type { AuthProvider, AccessToken } from '@twurple/auth';

import { variables } from '../../../watchers';
import { expirationDate, validate } from './validate';

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
    this._clientId = variables.get(`services.twitch.${this.typeOfToken}ClientId`);
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
    this._clientId = variables.get(`services.twitch.${this.typeOfToken}ClientId`);
    return this._clientId;
  }

  /**
	 * The scopes that are currently available using the access token.
	 */
  get currentScopes(): string[] {
    return [];
  }
}