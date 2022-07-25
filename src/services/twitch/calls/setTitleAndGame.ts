import { error } from 'console';

import { defaults, isNil } from 'lodash';

import client from '../api/client';
import { refresh } from '../token/refresh.js';
import { getGameIdFromName } from './getGameIdFromName';

import {
  gameCache, gameOrTitleChangedManually, rawStatus, stats,
} from '~/helpers/api';
import { parseTitle } from '~/helpers/api/parseTitle';
import { eventEmitter } from '~/helpers/events/emitter';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, isDebugEnabled, warning } from '~/helpers/log';
import { addUIError } from '~/helpers/panel/index';
import { translate } from '~/translate';
import { variables } from '~/watchers';

async function setTitleAndGame (args: { title?: string | null; game?: string | null }): Promise<{ response: string; status: boolean } | null> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  args = defaults(args, { title: null }, { game: null });
  const cid = variables.get('services.twitch.broadcasterId') as string;
  const broadcasterCurrentScopes = variables.get('services.twitch.broadcasterCurrentScopes') as string[];

  if (!broadcasterCurrentScopes.includes('channel_editor')) {
    warning('Missing Broadcaster oAuth scope channel_editor to change game or title. This mean you can have inconsistent game set across Twitch: https://github.com/twitchdev/issues/issues/224');
    addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope channel_editor to change game or title. This mean you can have inconsistent game set across Twitch: <a href="https://github.com/twitchdev/issues/issues/224">Twitch Issue # 224</a>' });
  }
  if (!broadcasterCurrentScopes.includes('user:edit:broadcast')) {
    warning('Missing Broadcaster oAuth scope user:edit:broadcast to change game or title');
    addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope user:edit:broadcast to change game or title' });
    return { response: '', status: false };
  }

  let title;
  let game;

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

    const clientBroadcaster = await client('broadcaster');
    clientBroadcaster.channels.updateChannelInfo(cid, {
      title, gameId: await getGameIdFromName(game),
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { response: '', status: false };
  }

  const responses: { response: string; status: boolean } = { response: '', status: false };

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

export { setTitleAndGame };