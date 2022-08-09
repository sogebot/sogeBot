import * as constants from '@sogebot/ui-helpers/constants';
import axios from 'axios';

import { setStatus } from '../../../helpers/parser';
import { tmiEmitter } from '../../../helpers/tmi';
import client from '../api/client';
import { refresh } from './refresh';

import emitter from '~/helpers/interfaceEmitter';
import {
  debug,
  error,
  warning,
} from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { variables } from '~/watchers';

let botTokenErrorSent = false;
let broadcasterTokenErrorSent = false;

export const invalidDataErrorSent = {
  bot:         false,
  broadcaster: false,
};

export const expirationDate = {
  bot:         -1,
  broadcaster: -1,
};
const isValidating = {
  bot:         false,
  broadcaster: false,
};

export const cache: { bot: string; broadcaster: string } = { bot: '', broadcaster: '' };

const waitUntilValidationDone = async (type: 'bot' | 'broadcaster') => {
  return new Promise((resolve) => {
    debug('oauth.validate', `Checking validation status of ${type}.`);
    const check = async () => {
      while(isValidating[type]) {
        await setImmediateAwait();
      }
    };
    debug('oauth.validate', `Validation of ${type} free.`);
    check().then(resolve);
  });
};

/*
  * Validates OAuth access tokens
  * and sets this[type + 'Username']
  * and sets this[type + 'CurrentScopes']
  * if invalid refresh()
  * @param {string} type - bot or broadcaster
  *
  * Example output:
    {
      "client_id": "<your client ID>",
      "login": "<authorized user login>",
      "scopes": [
        "<requested scopes>"
      ],
      "user_id": "<authorized user ID>"
    }
  */
export const validate = async (type: 'bot' | 'broadcaster', retry = 0): Promise < boolean > => {
  try {
    debug('oauth.validate', `Validation: ${type} - ${retry} retries`);

    await waitUntilValidationDone(type);
    isValidating[type] = true;

    const refreshToken = variables.get('services.twitch.' + type + 'RefreshToken') as string;
    if (refreshToken === '') {
      throw new Error('no refresh token for ' + type);
    } else if (!['bot', 'broadcaster'].includes(type)) {
      throw new Error(`Type ${type} is not supported`);
    }

    let token: string | null;
    if (expirationDate[type] - Date.now() > 5 * constants.MINUTE && expirationDate[type] !== -1) {
      debug('oauth.validate', `Skipping refresh token for ${type}, expiration time: ${new Date(expirationDate[type]).toISOString()}`);
      return true;
    } else {
      debug('oauth.validate', `Refreshing token for ${type}`);
      token = await refresh(type);
    }

    if ((global as any).mocha) {
      return true;
    }

    const url = 'https://id.twitch.tv/oauth2/validate';

    debug('oauth.validate', `Checking ${type} - retry no. ${retry}`);
    const request = await axios.get<{
      expires_in: number,
      user_id: string,
      login: string,
      scopes: string[]
    }>(url, {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });
    expirationDate[type] = Date.now() + request.data.expires_in * 1000;

    setTimeout(() => {
      const botId = variables.get('services.twitch.botId') as string;
      const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

      if (type === 'bot' && botId === broadcasterId) {
        warning('You shouldn\'t use same account for bot and broadcaster!');
      }
    }, 10000);

    if (request.data.user_id && request.data.user_id.length > 0
      && request.data.login && request.data.login.length > 0) {
      emitter.emit('set', '/services/twitch', `${type}TokenValid`, true);
      invalidDataErrorSent[type] = false;
    } else {
      emitter.emit('set', '/services/twitch', `${type}TokenValid`, false);
      throw new Error(`No valid data from Twitch for ${type}.\n${JSON.stringify(request.data, null, 2)}`);
    }

    emitter.emit('set', '/services/twitch', `${type}Id`, request.data.user_id);
    emitter.emit('set', '/services/twitch', `${type}Username`, request.data.login);
    emitter.emit('set', '/services/twitch', `${type}CurrentScopes`, request.data.scopes);
    if (type === 'bot') {
      botTokenErrorSent = false;

      setTimeout(async () => {
        // load profile image of a bot
        const clientBot = await client('bot');
        const userFromTwitch = await clientBot.users.getUserByName(request.data.login);
        if (userFromTwitch) {
          emitter.emit('set', '/services/twitch', 'botProfileImageUrl', userFromTwitch.profilePictureUrl);
        } else {
          throw new Error(`User ${request.data.login} not found on Twitch.`);
        }
      }, constants.MINUTE);
    } else {
      broadcasterTokenErrorSent = false;
    }

    if (cache[type] !== '' && cache[type] !== request.data.login + request.data.scopes.join(',')) {
      tmiEmitter.emit('reconnect', type); // force TMI reconnect
      cache[type] = request.data.login + request.data.scopes.join(',');
    }

    setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);
    debug('oauth.validate', `Token for ${type} is ${request.status ? 'valid' : 'invalid'}.`);
    return true;
  } catch (e: any) {
    expirationDate[type] = -1;

    if (axios.isAxiosError(e)) {
      if ((typeof e.response === 'undefined' || (e.response.status !== 401 && e.response.status !== 403)) && retry < 5) {
        // retry validation if error is different than 401 Invalid Access Token
        await new Promise < void > ((resolve) => {
          setTimeout(() => resolve(), 1000 + (retry ** 2));
        });
        return validate(type, retry++);
      }
      if (await refresh(type)) {
        return true;
      }

      if (e.response) {
        throw new Error(`Error on validate ${type} OAuth token, error: ${e.response.status} - ${e.response.statusText} - ${(e.response.data as any).message}`);
      }
    } else {
      debug('oauth.validate', e.stack);
      if (e.message.includes('No valid data from Twitch')) {
        if (!invalidDataErrorSent[type]) {
          warning(e.message);
        }
        invalidDataErrorSent[type] = true;
        // retry validation if error is different than 401 Invalid Access Token
        await new Promise < void > ((resolve) => {
          setTimeout(() => resolve(), 1000 + (retry ** 2));
        });
        return validate(type, retry++);
      }
      if (e.message.includes('no refresh token for')) {
        if ((type === 'bot' && !botTokenErrorSent) || (type === 'broadcaster' && !broadcasterTokenErrorSent)) {
          warning(`Refresh token ${type} account not found. Please set it in UI.`);
          if (type === 'broadcaster') {
            broadcasterTokenErrorSent = true;
          } else {
            botTokenErrorSent = true;
          }
        }
        return false;
      } else {
        error(e);
        error(e.stack);
      }

      const refreshToken = variables.get(`services.twitch.${type}RefreshToken`) as string;

      if (refreshToken !== '') {
        refresh(type);
      } else {
        emitter.emit('set', '/services/twitch', `${type}TokenValid`, false);
        emitter.emit('set', '/services/twitch', `${type}Id`, '');
        emitter.emit('set', '/services/twitch', `${type}Username`, '');
        emitter.emit('set', '/services/twitch', `${type}CurrentScopes`, []);
      }
    }
    throw new Error(e);
  } finally {
    isValidating[type] = false;
  }
};
