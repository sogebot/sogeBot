import axios from 'axios';
import fetch from 'node-fetch';

import emitter from '~/helpers/interfaceEmitter';
import {
  debug,
  error,
  isDebugEnabled,
  warning,
} from '~/helpers/log';
import {
  addUIError,
} from '~/helpers/panel/index';
import { variables } from '~/watchers';

const errorCount = {
  'bot':         0,
  'broadcaster': 0,
};
export function cleanErrors(type: keyof typeof errorCount) {
  errorCount[type] = 0;
}

const errorSent = {
  bot:         false,
  broadcaster: false,
};

const urls = {
  'SogeBot Token Generator': 'https://twitch-token-generator.soge.workers.dev/refresh/',
};

/*
   * Refresh OAuth access tokens
   * @param {string} type - bot or broadcaster
   *
   * Example output:
      {
        "access_token": "asdfasdf",
        "refresh_token": "eyJfMzUtNDU0OC04MWYwLTQ5MDY5ODY4NGNlMSJ9%asdfasdf=",
        "scope": "viewing_activity_read"
      }
    */
export const refresh = async (type: 'bot' | 'broadcaster'): Promise<string | null> => {
  if (isDebugEnabled('oauth.refresh')) {
    debug('oauth.refresh', `Refresh stacktrace: ${new Error().stack}`);
  }
  const channel = variables.get('services.twitch.broadcasterUsername') as string;
  const tokenService = variables.get('services.twitch.tokenService') as keyof typeof urls;
  const generalOwners = variables.get('services.twitch.generalOwners') as string[];
  const refreshToken = variables.get(`services.twitch.${type}RefreshToken`) as string;
  const tokenServiceCustomClientId = variables.get('services.twitch.tokenServiceCustomClientId') as string;
  const tokenServiceCustomClientSecret = variables.get('services.twitch.tokenServiceCustomClientSecret') as string;

  if (refreshToken.trim().length === 0) {
    return null;
  }

  if (errorCount[type] > 20) {
    if (!errorSent[type]) {
      warning(`Limit of token refresh for ${type} reached, please change your tokens!`);
      addUIError({
        name:    'Token Error!',
        message: `Limit of token refresh for ${type} reached, please change your tokens!`,
      });
    }
    errorSent[type] = true;
    return null;
  }
  errorSent[type] = false;

  debug('oauth.validate', 'Refreshing access token of ' + type);
  const url = urls[tokenService];
  try {
    /* if ((type === 'bot' ? botRefreshToken : broadcasterRefreshToken) === '') {
      throw new Error('no refresh token for ' + type);
    }*/

    if (!url) {
      // custom app is selected
      const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${tokenServiceCustomClientId}&client_secret=${tokenServiceCustomClientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();

        emitter.emit('set', '/services/twitch', `${type}AccessToken`, data.access_token);
        emitter.emit('set', '/services/twitch', `${type}RefreshToken`, data.refresh_token);

        debug('oauth.validate', 'Access token of ' + type + ' was refreshed.');
        debug('oauth.validate', 'New access token of ' + type + ': ' + data.access_token.replace(/(.{25})/, '*'.repeat(25)));
        debug('oauth.validate', 'New refresh token of ' + type + ': ' + data.refresh_token.replace(/(.{45})/, '*'.repeat(45)));
        errorCount[type] = 0;

        return data.access_token;
      } else {
        throw new Error('Custom token refresh failed');
      }
    } else {
      const request = await axios(url + encodeURIComponent(refreshToken.trim()), {
        method:  'POST',
        headers: {
          'SogeBot-Channel': channel,
          'SogeBot-Owners':  generalOwners.join(', '),
        },
      }) as any;
      debug('oauth.validate', urls[tokenService] + ' =>');
      debug('oauth.validate', JSON.stringify(request.data, null, 2));
      if (!request.data.success) {
        if (request.data.message.includes('Invalid refresh token received')) {
          warning(`Invalid refresh token for ${type}. Please reset your token.`);
          addUIError({
            name:    'Token Error!',
            message: `Invalid refresh token for ${type}. Please reset your token.`,
          });
          errorCount[type] = 1000;
          return null;
        }
        throw new Error(`Token refresh for ${type}: ${request.data.message}`);
      }
      if (typeof request.data.token !== 'string' || request.data.token.length === 0) {
        throw new Error(`Access token for ${type} was not correctly fetched (not a string)`);
      }
      if (typeof request.data.refresh !== 'string' || request.data.refresh.length === 0) {
        throw new Error(`Refresh token for ${type} was not correctly fetched (not a string)`);
      }

      emitter.emit('set', '/services/twitch', `${type}AccessToken`, request.data.token);
      emitter.emit('set', '/services/twitch', `${type}RefreshToken`, request.data.refresh);
      emitter.emit('services::twitch::api::init', type);

      debug('oauth.validate', 'Access token of ' + type + ' was refreshed.');
      debug('oauth.validate', 'New access token of ' + type + ': ' + request.data.token.replace(/(.{25})/, '*'.repeat(25)));
      debug('oauth.validate', 'New refresh token of ' + type + ': ' + request.data.refresh.replace(/(.{45})/, '*'.repeat(45)));

      errorCount[type] = 0;
      return request.data.token;
    }
  } catch (e) {
    errorCount[type]++;
    if (axios.isAxiosError(e) && (e.response?.data as any)?.message === 'Invalid refresh token received') {
      error(`Invalid refresh token used for ${type}.`);
      errorCount[type] = 1000;
      return null;
    }
    if (e instanceof Error && (e.message.includes('ETIMEDOUT') || e.message.includes('EHOSTUNREACH'))) {
      warning(`Refresh operation for ${type} access token failed. Caused by ETIMEDOUT or EHOSTUNREACH, retrying in 10 seconds.`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      return refresh(type);
    }

    emitter.emit('set', '/services/twitch', `${type}TokenValid`, false);
    emitter.emit('set', '/services/twitch', `${type}Id`, '');
    emitter.emit('set', '/services/twitch', `${type}Username`, '');
    emitter.emit('set', '/services/twitch', `${type}CurrentScopes`, []);

    error('Access token of ' + type + ' was not refreshed.');
    throw e;
  }
};
