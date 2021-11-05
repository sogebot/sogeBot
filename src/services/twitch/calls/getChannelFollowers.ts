import client from '../api/client';

import { debug, error } from '~/helpers/log';
import { variable } from '~/helpers/variables';
import { processFollowerState } from '~/services/twitch/api/processFollowerState';

export async function getChannelFollowers (opts: any) {
  opts = opts || {};

  try {
    const channelId = variable.get('services.twitch.channelId') as string;
    const clientBot = await client('bot');

    debug('api.getChannelFollowers', 'started');
    const getFollowsPaginated = await clientBot.users.getFollowsPaginated({ followedUser: channelId }).getAll();
    debug('api.getChannelFollowers', `Followers list: \n\t${getFollowsPaginated.map(o => o.userName)}`);
    processFollowerState(getFollowsPaginated.map(f => {
      return {
        from_name:   String(f.userName).toLowerCase(),
        from_id:     String(f.userId),
        followed_at: f.followDate.toISOString(),
      };
    }), true);
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
  return { state: true, opts };
}