import * as constants from '@sogebot/ui-helpers/constants';
import axios from 'axios';

import { setStatus } from '../../../helpers/parser';
import { tmiEmitter } from '../../../helpers/tmi';
import client from '../api/client';
import { getChannelId } from '../calls/getChannelId';
import { refresh } from './refresh';

import {
  getToken,
} from '~/helpers/api/getToken';
import emitter, { get } from '~/helpers/interfaceEmitter';
import {
  debug,
  error,
  warning,
} from '~/helpers/log';

let botTokenErrorSent = false;
let broadcasterTokenErrorSent = false;

let lastBotTokenValidation = 0;
let lastBroadcasterTokenValidation = 0;

export const cache: { bot: string; broadcaster: string } = { bot: '', broadcaster: '' };
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
export const validate = async (type: 'bot' | 'broadcaster', retry = 0, clear = false): Promise < boolean > => {
  debug('oauth.validate', `Validation: ${type} - ${retry} retries`);
  if (type === 'bot' && Date.now() - lastBotTokenValidation < constants.MINUTE) {
    debug('oauth.validate', `Validation: ${type} - ${retry} retries - Already validated`);
    return true;
  }
  if (type === 'broadcaster' && Date.now() - lastBroadcasterTokenValidation < constants.MINUTE) {
    debug('oauth.validate', `Validation: ${type} - ${retry} retries - Already validated`);
    return true;
  }

  if (type === 'bot') {
    lastBotTokenValidation = Date.now();
  }

  if (type === 'broadcaster') {
    lastBroadcasterTokenValidation = Date.now();
  }

  if ((global as any).mocha) {
    return true;
  }

  const url = 'https://id.twitch.tv/oauth2/validate';
  let status = true;
  try {
    const token = await getToken(type);
    if (token === '') {
      throw new Error('no access token for ' + type);
    } else if (!['bot', 'broadcaster'].includes(type)) {
      throw new Error(`Type ${type} is not supported`);
    }

    let request;
    try {
      debug('oauth.validate', `Checking ${type} - retry no. ${retry}`);
      request = await axios.get < any > (url, {
        headers: {
          Authorization: 'OAuth ' + token,
        },
      });
      debug('oauth.validate', JSON.stringify(request.data));

      if (request.data.expires_in < 300) {
        debug('oauth.validate', `Refreshing token for ${type} as it is near expiration.`);
        await refresh(type, clear);
        return true;
      }
    } catch (e: any) {
      if (type === 'bot') {
        lastBotTokenValidation = 0;
      }

      if (type === 'broadcaster') {
        lastBroadcasterTokenValidation = 0;
      }

      if (e.isAxiosError) {
        if ((typeof e.response === 'undefined' || (e.response.status !== 401 && e.response.status !== 403)) && retry < 5) {
          // retry validation if error is different than 401 Invalid Access Token
          await new Promise < void > ((resolve) => {
            setTimeout(() => resolve(), 1000 + (retry ** 2));
          });
          return validate(type, retry++);
        }
        if (e.response.status === 401) {
          await refresh(type, clear);
          return true;
        }
        throw new Error(`Error on validate ${type} OAuth token, error: ${e.response.status} - ${e.response.statusText} - ${e.response.data.message}`);
      } else {
        debug('oauth.validate', e.stack);
        throw new Error(e);
      }
    }

    if (type === 'bot') {
      emitter.emit('set', '/services/twitch', 'botId', request.data.user_id);
    } else {
      emitter.emit('set', '/services/twitch', 'broadcasterId', request.data.user_id);
    }

    const [ botId, broadcasterId ] = await Promise.all([
      get<string>('/services/twitch', 'botId'),
      get<string>('/services/twitch', 'broadcasterId'),
    ]);

    if (type === 'bot' && botId === broadcasterId) {
      warning('You shouldn\'t use same account for bot and broadcaster!');
    }

    if (type === 'bot') {
      emitter.emit('set', '/services/twitch', 'botUsername', request.data.login);
      emitter.emit('set', '/services/twitch', 'botCurrentScopes', request.data.scopes);
      emitter.emit('set', '/services/twitch', 'botTokenValid', true);
      botTokenErrorSent = false;

      // load profile image of a bot
      const clientBot = await client('bot');
      const userFromTwitch = await clientBot.users.getUserByName(request.data.login);
      if (userFromTwitch) {
        emitter.emit('set', '/services/twitch', 'botProfileImageUrl', userFromTwitch.profilePictureUrl);
      } else {
        throw new Error(`User ${request.data.login} not found on Twitch.`);
      }
    } else {
      emitter.emit('set', '/services/twitch', 'broadcasterUsername', request.data.login);
      emitter.emit('set', '/services/twitch', 'broadcasterCurrentScopes', request.data.scopes);
      emitter.emit('set', '/services/twitch', 'broadcasterTokenValid', true);
      broadcasterTokenErrorSent = false;
    }

    if (cache[type] !== '' && cache[type] !== request.data.login + request.data.scopes.join(',')) {
      tmiEmitter.emit('reconnect', type); // force TMI reconnect
      cache[type] = request.data.login + request.data.scopes.join(',');
    }

    setStatus('API', request.status === 200 ? constants.CONNECTED : constants.DISCONNECTED);

    if (type === 'bot') {
      getChannelId();
    }
  } catch (e: any) {
    if (e.message.includes('no access token for')) {
      if ((type === 'bot' && !botTokenErrorSent) || (type === 'broadcaster' && !broadcasterTokenErrorSent)) {
        warning(`Access token ${type} account not found. Please set it in UI.`);
        if (type === 'broadcaster') {
          broadcasterTokenErrorSent = true;
        } else {
          botTokenErrorSent = true;
        }
      }
    } else {
      error(e);
      error(e.stack);
    }
    status = false;
    const [ botRefreshToken, broadcasterRefreshToken ] = await Promise.all([
      get<string>('/services/twitch', 'botRefreshToken'),
      get<string>('/services/twitch', 'broadcasterRefreshToken'),
    ]);

    if ((type === 'bot' ? botRefreshToken : broadcasterRefreshToken) !== '') {
      refresh(type, clear);
    } else {
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
    }
  }
  debug('oauth.validate', `Token for ${type} is ${status ? 'valid' : 'invalid'}.`);
  return status;
};
