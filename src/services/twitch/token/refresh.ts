import * as constants from '@sogebot/ui-helpers/constants';
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
const lastRefresh = {
  'bot':         0,
  'broadcaster': 0,
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
export const refresh = async (type: 'bot' | 'broadcaster', clear = false) => {

  if (isDebugEnabled('oauth.refresh')) {
    debug('oauth.refresh', `Refresh stacktrace: ${new Error().stack}`);
  }

  if (clear) {
    errorCount[type] = 0;
    lastRefresh[type] = 0;
  }
  const channel = variables.get('services.twitch.broadcasterUsername') as string;
  const tokenService = variables.get('services.twitch.tokenService') as keyof typeof urls;
  const generalOwners = variables.get('services.twitch.generalOwners') as string[];
  const botRefreshToken = variables.get('services.twitch.botRefreshToken') as string;
  const broadcasterRefreshToken = variables.get('services.twitch.broadcasterRefreshToken') as string;
  const tokenServiceCustomClientId = variables.get('services.twitch.tokenServiceCustomClientId') as string;
  const tokenServiceCustomClientSecret = variables.get('services.twitch.tokenServiceCustomClientSecret') as string;

  if (type === 'bot') {
    if (botRefreshToken.trim().length === 0) {
      return undefined;
    }
  } else {
    if (broadcasterRefreshToken.trim().length === 0) {
      return undefined;
    }
  }

  if (errorCount[type] > 20) {
    warning(`Limit of token refresh for ${type} reached, please change your tokens!`);
    addUIError({
      name:    'Token Error!',
      message: `Limit of token refresh for ${type} reached, please change your tokens!`,
    });
    return undefined;
  }

  if (Date.now() < lastRefresh[type] + constants.MINUTE * 5) {
    addUIError({
      name:    'Token Error!',
      message: `You can refresh token for ${type} once per 5 minutes.`,
    });
    warning(`You can refresh token for ${type} once per 5 minutes.`);
    return undefined;
  } else {
    lastRefresh[type] = Date.now();
  }

  debug('oauth.validate', 'Refreshing access token of ' + type);
  const url = urls[tokenService];
  try {
    if ((type === 'bot' ? botRefreshToken : broadcasterRefreshToken) === '') {
      throw new Error('no refresh token for ' + type);
    }

    if (!url) {
      // custom app is selected
      const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${tokenServiceCustomClientId}&client_secret=${tokenServiceCustomClientSecret}&refresh_token=${type === 'bot' ? botRefreshToken : broadcasterRefreshToken}&grant_type=refresh_token`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();

        if (type === 'bot') {
          emitter.emit('set', '/services/twitch', 'botAccessToken', data.access_token);
          emitter.emit('set', '/services/twitch', 'botRefreshToken', data.refresh_token);
        } else {
          emitter.emit('set', '/services/twitch', 'broadcasterAccessToken', data.access_token);
          emitter.emit('set', '/services/twitch', 'broadcasterRefreshToken', data.refresh_token);
        }

        debug('oauth.validate', 'Access token of ' + type + ' was refreshed.');
        debug('oauth.validate', 'New access token of ' + type + ': ' + data.access_token.replace(/(.{25})/, '*'.repeat(25)));
        debug('oauth.validate', 'New refresh token of ' + type + ': ' + data.refresh_token.replace(/(.{45})/, '*'.repeat(45)));
        errorCount[type] = 0;

        return data.access_token;
      } else {
        throw new Error('Custom token refresh failed');
      }
    } else {
      const request = await axios(url + encodeURIComponent(type === 'bot' ? botRefreshToken.trim() : broadcasterRefreshToken.trim()), {
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
        }
        throw new Error(`Token refresh for ${type}: ${request.data.message}`);
      }
      if (typeof request.data.token !== 'string' || request.data.token.length === 0) {
        throw new Error(`Access token for ${type} was not correctly fetched (not a string)`);
      }
      if (typeof request.data.refresh !== 'string' || request.data.refresh.length === 0) {
        throw new Error(`Refresh token for ${type} was not correctly fetched (not a string)`);
      }
      if (type === 'bot') {
        emitter.emit('set', '/services/twitch', 'botAccessToken', request.data.token);
        emitter.emit('set', '/services/twitch', 'botRefreshToken', request.data.refresh);
      } else {
        emitter.emit('set', '/services/twitch', 'broadcasterAccessToken', request.data.token);
        emitter.emit('set', '/services/twitch', 'broadcasterRefreshToken', request.data.refresh);
      }
      emitter.emit('services::twitch::api::init', type);

      debug('oauth.validate', 'Access token of ' + type + ' was refreshed.');
      debug('oauth.validate', 'New access token of ' + type + ': ' + request.data.token.replace(/(.{25})/, '*'.repeat(25)));
      debug('oauth.validate', 'New refresh token of ' + type + ': ' + request.data.refresh.replace(/(.{45})/, '*'.repeat(45)));

      return request.data.token;
    }
  } catch (e: any) {
    errorCount[type]++;
    if (type === 'bot') {
      emitter.emit('set', '/services/twitch', 'botTokenValid', false);
      emitter.emit('set', '/services/twitch', 'botId', '');
      emitter.emit('set', '/services/twitch', 'botUsername', '');
      emitter.emit('set', '/services/twitch', 'botCurrentScopes', []);
    } else {
      emitter.emit('set', '/services/twitch', 'broadcasterTokenValid', false);
      emitter.emit('set', '/services/twitch', 'broadcasterId', '');
      emitter.emit('set', '/services/twitch', 'broadcasterUsername', '');
      emitter.emit('set', '/services/twitch', 'broadcasterCurrentScopes', []);
    }

    error('Access token of ' + type + ' was not refreshed.');
    error(e.stack);
  }
};
