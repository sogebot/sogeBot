import { error } from 'console';

import axios from 'axios';
import { defaults, isNil } from 'lodash';

import { getGameIdFromName } from './getGameIdFromName';

import {
  calls, gameCache, gameOrTitleChangedManually, rawStatus, setRateLimit, stats,
} from '~/helpers/api';
import { parseTitle } from '~/helpers/api/parseTitle';
import { eventEmitter } from '~/helpers/events/emitter';
import { warning } from '~/helpers/log';
import { ioServer } from '~/helpers/panel';
import { addUIError } from '~/helpers/panel/';
import { translate } from '~/translate';

async function setTitleAndGame (args: { title?: string | null; game?: string | null }): Promise<{ response: string; status: boolean } | null> {
  args = defaults(args, { title: null }, { game: null });
  const cid = await get<string>('/services/twitch', 'channelId');
  const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${cid}`;

  const token = oauth.broadcasterAccessToken;
  const needToWait = isNil(cid) || cid === '' || token === '';

  if (!oauth.broadcasterCurrentScopes.includes('channel_editor')) {
    warning('Missing Broadcaster oAuth scope channel_editor to change game or title. This mean you can have inconsistent game set across Twitch: https://github.com/twitchdev/issues/issues/224');
    addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope channel_editor to change game or title. This mean you can have inconsistent game set across Twitch: <a href="https://github.com/twitchdev/issues/issues/224">Twitch Issue # 224</a>' });
  }
  if (!oauth.broadcasterCurrentScopes.includes('user:edit:broadcast')) {
    warning('Missing Broadcaster oAuth scope user:edit:broadcast to change game or title');
    addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope user:edit:broadcast to change game or title' });
    return { response: '', status: false };
  }
  if (needToWait) {
    warning('Missing Broadcaster oAuth to change game or title');
    addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth to change game or title' });
    return { response: '', status: false };
  }

  let request;
  let title;
  let game;

  let requestData = {};
  try {
    if (!isNil(args.title)) {
      rawStatus.value = args.title; // save raw status to cache, if changing title
    }
    title = await parseTitle(rawStatus.value);

    if (!isNil(args.game)) {
      game = args.game;
      gameCache.value = args.game; // save game to cache, if changing gae
    } else {
      game = gameCache.value;
    } // we are not setting game -> load last game

    requestData = { game_id: await getGameIdFromName(game), title };

    request = await axios({
      method:  'patch',
      url,
      data:    requestData,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Client-ID':     oauth.broadcasterClientId,
        'Content-Type':  'application/json',
      },
    });
    // save remaining api calls
    setRateLimit('bot', request.headers as any);

    ioServer?.emit('api.stats', {
      method: 'PATCH', request: requestData, timestamp: Date.now(), call: 'setTitleAndGame', api: 'helix', endpoint: url, code: request.status, remaining: calls.bot,
    });
  } catch (e: any) {
    if (e.isAxiosError) {
      error(`API: ${e.config.method.toUpperCase()} ${e.config.url} - ${e.response.status ?? 0}
        \n${JSON.stringify({
    headers: {
      'Authorization': 'Bearer ' + token,
      'Client-ID':     oauth.broadcasterClientId,
      'Content-Type':  'application/json',
    },
    request: requestData,
  }, null, 4)}\n${JSON.stringify(e.response?.data ?? '--nodata--', null, 4)}\n\n${e.stack}`);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), request: requestData, timestamp: Date.now(), call: 'setTitleAndGame', api: 'helix', endpoint: e.config.url, code: e.response.status, data: e.response?.data ?? 'n/a', remaining: calls.bot,
      });
    } else {
      error(e.stack);
      ioServer?.emit('api.stats', {
        method: e.config.method.toUpperCase(), timestamp: Date.now(), call: 'setTitleAndGame', api: 'helix', endpoint: e.config.url, code: 'n/a', data: e.stack, remaining: calls.bot,
      });
    }
    return { response: '', status: false };
  }

  const responses: { response: string; status: boolean } = { response: '', status: false };

  if (request.status === 204) {
    if (!isNil(args.game)) {
      responses.response = translate('game.change.success').replace(/\$game/g, args.game);
      responses.status = true;
      if (stats.value.currentGame !== args.game) {
        eventEmitter.emit('game-changed', { oldGame: stats.value.currentGame ?? 'n/a', game: args.game });
      }
      stats.value.currentGame = args.game;
    }

    if (!isNil(args.title)) {
      responses.response = translate('title.change.success').replace(/\$title/g, args.title);
      responses.status = true;
      stats.value.currentTitle = args.title;
    }
    gameOrTitleChangedManually.value = true;
    return responses;
  }
  return { response: '', status: false };
}

export { setTitleAndGame };