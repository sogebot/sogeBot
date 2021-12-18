import { User, UserInterface } from '@entity/user';
import * as constants from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import { eventEmitter } from '../../../helpers/events';
import { unfollow } from '../../../helpers/log';

import { follow } from '~/helpers/events/follow';
import * as changelog from '~/helpers/user/changelog.js';
import client from '~/services/twitch/api/client';
import { variables } from '~/watchers';

export async function followerUpdatePreCheck (userName: string) {
  const user = await getRepository(User).findOne({ userName });
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  const botUsername = variables.get('services.twitch.botUsername') as string;

  if (user) {
    const isSkipped = user.userName.toLowerCase() === broadcasterUsername.toLowerCase() || user.userName.toLowerCase() === botUsername.toLowerCase();
    if (new Date().getTime() - user.followCheckAt <= constants.DAY || isSkipped) {
      return;
    }
    isFollowerUpdate(user);
  }
}

export async function isFollowerUpdate (user: UserInterface | null) {
  if (!user || !user.userId) {
    return;
  }
  const id = user.userId;

  const channelId = variables.get('services.twitch.channelId') as string;

  try {
    const clientBot = await client('bot');
    const helixFollow = await clientBot.users.getFollowFromUserToBroadcaster(id, channelId);

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
      if (!user.isFollower) {
        follow(user.userId, user.userName, new Date(helixFollow.followDate).getTime());
      }
      return { isFollower: true, followedAt: user.followedAt };
    }
  } catch (e: any) {
    return null;
  }
}