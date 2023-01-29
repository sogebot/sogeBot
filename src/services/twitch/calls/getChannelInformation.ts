import isEqual from 'lodash/isEqual';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import {  currentStreamTags, gameCache, gameOrTitleChangedManually, rawStatus, tagsCache } from '~/helpers/api';
import {
  stats as apiStats,
} from '~/helpers/api';
import { parseTitle } from '~/helpers/api/parseTitle';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, info, isDebugEnabled, warning } from '~/helpers/log';
import { updateChannelInfo } from '~/services/twitch/calls/updateChannelInfo';
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
    const getChannelInfo = await clientBot.channels.getChannelInfoById(broadcasterId);

    if (!getChannelInfo) {
      throw new Error(`Channel ${broadcasterId} not found on Twitch`);
    }

    while (currentStreamTags.length) {
      currentStreamTags.pop();
    }
    for (const tag of getChannelInfo.tags) {
      currentStreamTags.push(tag);
    }

    if (!gameOrTitleChangedManually.value) {
      // Just polling update
      let _rawStatus = rawStatus.value;

      const title = await parseTitle(null);
      const game = gameCache.value;
      const tags = JSON.parse(tagsCache.value) as string[];

      const titleEquals = getChannelInfo.title === title;
      const gameEquals = getChannelInfo.gameName === game;
      const tagsEquals = isEqual(getChannelInfo.tags.sort(), tags.sort());
      const isChanged = !titleEquals || !gameEquals || !tagsEquals;

      if (isChanged && retries === -1) {
        return { state: true, opts };
      } else if (isChanged && !opts.forceUpdate) {
        // check if title is same as updated title
        const numOfRetries = isTitleForced ? 1 : 5;
        if (retries >= numOfRetries) {
          retries = 0;

          // if we want title to be forced
          if (isTitleForced) {
            if ((process.env.NODE_ENV || 'development') !== 'production') {
              info(`Title/category force enabled (but disabled in debug mode) => ${game} | ${_rawStatus} ${tags.map(o => `#${o}`).join(' ')}`);
            } else {
              info(`Title/category force enabled => ${game} | ${_rawStatus} ${tags.map(o => `#${o}`).join(' ')}`);
              updateChannelInfo({});
            }
            return { state: true, opts };
          } else {
            info(`Title/game changed outside of a bot => ${getChannelInfo.gameName} | ${getChannelInfo.title} ${getChannelInfo.tags.map(o => `#${o}`).join(' ')}`);
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
      tagsCache.value = JSON.stringify(getChannelInfo.tags);
    } else {
      gameOrTitleChangedManually.value = false;
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        return { state: false, opts }; // ignore etimedout error
      }
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