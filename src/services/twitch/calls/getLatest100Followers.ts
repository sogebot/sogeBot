import client from '../api/client';

import {
  stats as apiStats,
} from '~/helpers/api';
import { get } from '~/helpers/interfaceEmitter';
import { debug, error } from '~/helpers/log';
import { processFollowerState } from '~/services/twitch/api/processFollowerState';

let latestFollowedAtTimestamp = 0;

export async function getLatest100Followers () {
  try {
    const [ channelId, clientBot ] = await Promise.all([
      get<string>('/services/twitch', 'channelId'),
      client('bot'),
    ]);

    const getFollows = await clientBot.users.getFollows({ followedUser: channelId, limit: 100 });

    // we will go through only new users
    if (getFollows.data.length > 0 && getFollows.data[0].followDate.getTime() !== latestFollowedAtTimestamp) {
      processFollowerState(getFollows.data
        .filter(f => latestFollowedAtTimestamp < f.followDate.getTime())
        .map(f => {
          return {
            from_name:   String(f.followedUserName).toLowerCase(),
            from_id:     String(f.followedUserId),
            followed_at: f.followDate.toISOString(),
          };
        }));
      latestFollowedAtTimestamp = getFollows.data[0].followDate.getTime();
    } else {
      debug('api.followers', 'No new followers found.');
    }
    apiStats.value.currentFollowers = getFollows.data.length;
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
    return { state: false };
  }
  return { state: true };
}