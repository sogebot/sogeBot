import { rawDataSymbol } from '@twurple/common';
import { AppDataSource } from '~/database';
import { IsNull } from 'typeorm';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { TwitchTag, TwitchTagLocalizationDescription, TwitchTagLocalizationName } from '~/database/entity/twitch';
import { getFunctionName } from '~/helpers/getFunctionName';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';

export async function getAllStreamTags(opts: any) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  opts = opts || {};
  try {
    const clientBot = await client('bot');
    const getAllStreamTagsPaginated = await clientBot.tags.getAllStreamTagsPaginated().getAll();
    for(const tag of getAllStreamTagsPaginated) {
      await setImmediateAwait();
      const localizationNames = await AppDataSource.getRepository(TwitchTagLocalizationName).findBy({ tagId: tag.id });
      const localizationDescriptions = await AppDataSource.getRepository(TwitchTagLocalizationDescription).findBy({ tagId: tag.id });
      await AppDataSource.getRepository(TwitchTag).save({
        tag_id:             tag.id,
        is_auto:            tag.isAuto,
        localization_names: Object.keys(tag[rawDataSymbol].localization_names).map(key => {
          return {
            id:     localizationNames.find(o => o.locale === key && o.tagId === tag.id)?.id,
            locale: key,
            value:  tag[rawDataSymbol].localization_names[key],
          };
        }),
        localization_descriptions: Object.keys(tag[rawDataSymbol].localization_descriptions).map(key => {
          return {
            id:     localizationDescriptions.find(o => o.locale === key && o.tagId === tag.id)?.id,
            locale: key,
            value:  tag[rawDataSymbol].localization_descriptions[key],
          };
        }),
      });
    }
    await AppDataSource.getRepository(TwitchTagLocalizationDescription).delete({ tagId: IsNull() });
    await AppDataSource.getRepository(TwitchTagLocalizationName).delete({ tagId: IsNull() });
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
  }
  return { state: true, opts };

}