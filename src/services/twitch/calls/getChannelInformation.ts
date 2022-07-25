import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { gameCache, gameOrTitleChangedManually, rawStatus } from '~/helpers/api';
import {
  stats as apiStats,
} from '~/helpers/api';
import { parseTitle } from '~/helpers/api/parseTitle';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, info, isDebugEnabled, warning } from '~/helpers/log';
import { setTitleAndGame } from '~/services/twitch/calls/setTitleAndGame';
import { variables } from '~/watchers';

let retries = 0;

export async function getChannelInformation (opts: any) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const isTitleForced = variables.get('services.twitch.isTitleForced') as string;
    const clientBot = await client('bot');
    const getChannelInfo = await clientBot.channels.getChannelInfo(broadcasterId);

    if (!getChannelInfo) {
      throw new Error(`Channel ${broadcasterId} not found on Twitch`);
    }

    if (!gameOrTitleChangedManually.value) {
      // Just polling update
      let _rawStatus = rawStatus.value;
      const title = await parseTitle(null);

      if (getChannelInfo.title !== title && retries === -1) {
        return { state: true, opts };
      } else if (getChannelInfo.title !== title && !opts.forceUpdate) {
        // check if title is same as updated title
        const numOfRetries = isTitleForced ? 1 : 5;
        if (retries >= numOfRetries) {
          retries = 0;

          // if we want title to be forced
          if (isTitleForced) {
            const game = gameCache.value;
            if ((process.env.NODE_ENV || 'development') !== 'production') {
              info(`Title/category force enabled (but disabled in debug mode) => ${game} | ${_rawStatus}`);
            } else {
              info(`Title/category force enabled => ${game} | ${_rawStatus}`);
              setTitleAndGame({});
            }
            return { state: true, opts };
          } else {
            info(`Title/game changed outside of a bot => ${getChannelInfo.gameName} | ${getChannelInfo.title}`);
            retries = -1;
            _rawStatus = getChannelInfo.title;
          }
        } else {
          retries++;
          return { state: false, opts };
        }
      } else {
        retries = 0;
      }

      apiStats.value.language = getChannelInfo.language;
      apiStats.value.currentGame = getChannelInfo.gameName;
      apiStats.value.currentTitle = getChannelInfo.title;

      gameCache.value = getChannelInfo.gameName;
      rawStatus.value = _rawStatus;
    } else {
      gameOrTitleChangedManually.value = false;
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false, opts };
  }

  retries = 0;
  return { state: true, opts };
}