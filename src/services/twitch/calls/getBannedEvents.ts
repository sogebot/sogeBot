import { chunk } from 'lodash';
import { getRepository } from 'typeorm';

import { rawDataSymbol } from '~/../node_modules/@twurple/common/lib';
import { BannedEventsTable } from '~/database/entity/bannedEvents';
import { debug, error, warning } from '~/helpers/log';
import { addUIError } from '~/helpers/panel/';
import { variable } from '~/helpers/variables';
import client from '~/services/twitch/api/client';

export async function getBannedEvents (opts: any) {
  const channelId = variable.get('services.twitch.channelId') as string;
  const broadcasterCurrentScopes = variable.get('services.twitch.broadcasterCurrentScopes') as string[];

  if (!broadcasterCurrentScopes.includes('moderation:read')) {
    if (!opts.isWarned) {
      opts.isWarned = true;
      warning('Missing Broadcaster oAuth scope moderation:read to read channel bans.');
      addUIError({ name: 'OAUTH', message: 'Missing Broadcaster oAuth scope moderation:read to read channel bans.' });
    }
    return { state: false, opts };
  }
  try {
    const clientBroadcaster = await client('broadcaster');
    const getBanEvents = await clientBroadcaster.moderation.getBanEventsPaginated(channelId).getAll();

    // save to db
    for (const data of chunk(getBanEvents, 50)) {
      getRepository(BannedEventsTable).save(
        data.map((item) => {
          return {
            id:              item.eventId,
            event_type:      item.eventType,
            event_timestamp: item.eventDate.toISOString(),
            version:         item.eventVersion,
            event_data:      {
              broadcaster_id:    item.broadcasterId,
              broadcaster_login: item.broadcasterDisplayName,
              broadcaster_name:  item.broadcasterName,
              user_id:           item.userId,
              user_login:        item.userDisplayName,
              user_name:         item.userName,
              expires_at:        item.expiryDate ? item.expiryDate.toISOString() : '',
              reason:            (item[rawDataSymbol].event_data as any).reason,
              moderator_id:      (item[rawDataSymbol].event_data as any).moderator_id,
              moderator_login:   (item[rawDataSymbol].event_data as any).moderator_login,
              moderator_name:    (item[rawDataSymbol].event_data as any).moderator_name,
            },
          };
        }));
    }

    debug('api.stream', 'API: ' + JSON.stringify(getBanEvents));
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }

  return { state: true, opts };
}