import { isEqual } from 'lodash-es';

import { CacheTitles } from '~/database/entity/cacheTitles.js';
import { AppDataSource } from '~/database.js';
import {  currentStreamTags, gameCache, gameOrTitleChangedManually, rawStatus, tagsCache } from '~/helpers/api/index.js';
import {
  stats as apiStats,
} from '~/helpers/api/index.js';
import { parseTitle } from '~/helpers/api/parseTitle.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { debug, error, info, warning } from '~/helpers/log.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

let retries = 0;

export async function getChannelInformation (opts: any) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const getChannelInfo = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.channels.getChannelInfoById(broadcasterId));
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
      const gameEquals = getChannelInfo.gameName.toLowerCase() === game.toLowerCase();
      const tagsEquals = isEqual(getChannelInfo.tags.sort(), tags.sort());
      const isChanged = !titleEquals || !gameEquals || !tagsEquals;

      if (gameEquals && game !== getChannelInfo.gameName) {
        gameCache.value = getChannelInfo.gameName;
        await AppDataSource.getRepository(CacheTitles).update({ game }, { game: getChannelInfo.gameName });
      }

      if (isChanged && retries === -1) {
        return { state: true, opts };
      } else if (isChanged && !opts.forceUpdate) {
        // check if title is same as updated title
        const numOfRetries = 1;
        if (retries >= numOfRetries) {
          retries = 0;
          info(`Title/game changed outside of a bot => ${getChannelInfo.gameName} | ${getChannelInfo.title} ${getChannelInfo.tags.map(o => `#${o}`).join(' ')}`);
          retries = -1;
          _rawStatus = getChannelInfo.title;
        } else {
          retries++;
          return { state: false, opts };
        }
      } else {
        retries = 0;
      }

      apiStats.value.language = getChannelInfo.language;
      apiStats.value.currentTags = getChannelInfo.tags;
      apiStats.value.contentClasificationLabels = getChannelInfo.contentClassificationLabels;
      apiStats.value.currentGame = getChannelInfo.gameName;
      apiStats.value.currentTitle = getChannelInfo.title;
      apiStats.value.channelDisplayName = getChannelInfo.displayName;
      apiStats.value.channelUserName = getChannelInfo.name;

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
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false, opts };
  }

  retries = 0;
  return { state: true, opts };
}