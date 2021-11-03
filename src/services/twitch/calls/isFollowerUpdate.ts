import { UserInterface } from '@entity/user';

import { eventEmitter } from '../../../helpers/events';
import { unfollow } from '../../../helpers/log';

import { follow } from '~/helpers/events/follow';
import { get } from '~/helpers/interfaceEmitter';
import * as changelog from '~/helpers/user/changelog.js';
import client from '~/services/twitch/api/client';

export async function isFollowerUpdate (user: UserInterface | null) {
  if (!user || !user.userId) {
    return;
  }
  const id = user.userId;
  const cid = await get<string>('/services/twitch', 'channelId');

  try {
    const clientBot = await client('bot');
    const helixFollow = await clientBot.users.getFollowFromUserToBroadcaster(id, cid);

    if (!helixFollow) {
      if (user.isFollower) {
        unfollow(user.userName);
        eventEmitter.emit('unfollow', { userName: user.userName });
      }
      changelog.update(user.userId, {
        followedAt:    user.haveFollowedAtLock ? user.followedAt : 0,
        isFollower:    user.haveFollowerLock? user.isFollower : false,
        followCheckAt: Date.now(),
      });
    } else {
      // is follower
      if (!user.isFollower && new Date().getTime() - new Date(helixFollow.followDate).getTime() < 60000 * 60) {
        follow(user.userId, user.userName, new Date(helixFollow.followDate).getTime());
      }
      return { isFollower: user.isFollower, followedAt: user.followedAt };
    }
  } catch (e: any) {
    return null;
  }
}