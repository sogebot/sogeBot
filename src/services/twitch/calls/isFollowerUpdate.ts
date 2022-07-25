import { User, UserInterface } from '@entity/user';
import * as constants from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import { eventEmitter } from '../../../helpers/events';
import { debug, error, isDebugEnabled, unfollow, warning } from '../../../helpers/log';
import { refresh } from '../token/refresh.js';

import { follow } from '~/helpers/events/follow';
import { getFunctionName } from '~/helpers/getFunctionName';
import * as changelog from '~/helpers/user/changelog.js';
import client from '~/services/twitch/api/client';
import { variables } from '~/watchers';

const usersToFollowCheck: UserInterface[] = [];

export async function followerUpdatePreCheck (userName: string) {
  const user = await getRepository(User).findOne({ userName });
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  const botUsername = variables.get('services.twitch.botUsername') as string;

  if (user) {
    const isSkipped = user.userName.toLowerCase() === broadcasterUsername.toLowerCase() || user.userName.toLowerCase() === botUsername.toLowerCase();
    if (new Date().getTime() - user.followCheckAt <= constants.DAY || isSkipped) {
      return;
    }
    usersToFollowCheck.push(user);
    changelog.update(user.userId, {
      followCheckAt: Date.now(),
    });
  }
}

// slowdown isFollowerUpdate to twice per second
setInterval(() => {
  const user = usersToFollowCheck.shift();
  if(user) {
    isFollowerUpdate(user);
  }
}, 500);

export async function isFollowerUpdate (user: UserInterface) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }

  const id = user.userId;
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    const clientBot = await client('bot');
    const helixFollow = await clientBot.users.getFollowFromUserToBroadcaster(id, broadcasterId);

    if (!helixFollow) {
      if (user.isFollower) {
        unfollow(user.userName);
        eventEmitter.emit('unfollow', { userName: user.userName });
      }
      changelog.update(user.userId, {
        followedAt:    user.haveFollowedAtLock ? user.followedAt : null,
        isFollower:    user.haveFollowerLock? user.isFollower : false,
        followCheckAt: Date.now(),
      });
    } else {
      if (!user.isFollower) {
        follow(user.userId, user.userName, new Date(helixFollow.followDate).toISOString());
      }
      return { isFollower: true, followedAt: user.followedAt };
    }
  } catch (e: any) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return null;
  }
}