import client from '../api/client';
import { refresh } from '../token/refresh.js';

import {
  stats as apiStats,
} from '~/helpers/api';
import { debug, error } from '~/helpers/log';
import { processFollowerState } from '~/services/twitch/api/processFollowerState';
import { variables } from '~/watchers';

let latestFollowedAtTimestamp = 0;

export async function getLatest100Followers () {
  try {
    const channelId = variables.get('services.twitch.channelId') as string;
    const clientBot = await client('bot');

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
    apiStats.value.currentFollowers = getFollows.total;
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'Invalid OAuth token') {
        await refresh('bot');
      } else {
        error('getLatest100Followers => ' + e.stack ?? e.message);
      }
    }
    return { state: false };
  }
  return { state: true };
}