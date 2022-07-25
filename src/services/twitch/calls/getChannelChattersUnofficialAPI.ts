import { User } from '@entity/user';
import {
  chunk, includes,
} from 'lodash';
import {
  getRepository,
} from 'typeorm';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { eventEmitter } from '~/helpers/events';
import { getAllOnlineUsernames } from '~/helpers/getAllOnlineUsernames';
import { getFunctionName } from '~/helpers/getFunctionName';
import {
  debug, error, isDebugEnabled, warning,
} from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { SQLVariableLimit } from '~/helpers/sql';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored';
import { followerUpdatePreCheck } from '~/services/twitch/calls/isFollowerUpdate';
import { variables } from '~/watchers';
import joinpart from '~/widgets/joinpart';

export const getChannelChattersUnofficialAPI = async (opts: any) => {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const botUsername = variables.get('services.twitch.botUsername') as string;
    const clientBot = await client('bot');

    const getChatters = await clientBot.unsupported.getChatters(broadcasterUsername);
    const chatters = getChatters.allChatters.filter(userName => {
      // exclude global ignore list
      const shouldExclude = isIgnored({ userName });
      debug('api.getChannelChattersUnofficialAPI', `${userName} - shouldExclude: ${shouldExclude}`);
      return !shouldExclude;
    });
    const allOnlineUsers = await getAllOnlineUsernames();

    const partedUsers: string[] = [];
    for (const userName of allOnlineUsers) {
      if (!includes(chatters, userName) && userName.toLocaleLowerCase() !== botUsername.toLocaleLowerCase()) {
        // user is no longer in channel
        await getRepository(User).update({ userName }, { isOnline: false });
        partedUsers.push(userName);
      }
    }

    const joinedUsers: string[] = [];
    for (const chatter of chatters) {
      if (!includes(allOnlineUsers, chatter) && chatter.toLocaleLowerCase() !== botUsername.toLocaleLowerCase()) {
        joinedUsers.push(chatter);
      }
    }

    // insert joined online users
    const usersToFetch: string[] = [];
    if (joinedUsers.length > 0) {
      for (const userName of joinedUsers) {
        const user = await getRepository(User).findOne({ where: { userName } });
        if (user) {
          await getRepository(User).save({ ...user, isOnline: true });
          if (!user.createdAt) {
            // run this after we save new user
            const getUserByName = await clientBot.users.getUserByName(userName);
            if (getUserByName) {
              changelog.update(getUserByName.id, { createdAt: new Date(getUserByName.creationDate).toISOString() });
            }
          }
        } else {
          usersToFetch.push(userName);
        }
      }
    }

    for (const usernameBatch of chunk(usersToFetch, 100)) {
      clientBot.users.getUsersByNames(usernameBatch).then(users => {
        if (users) {
          getRepository(User).save(
            users.map(user => {
              return {
                userId:          user.id,
                userName:        user.name,
                displayname:     user.displayName,
                profileImageUrl: user.profilePictureUrl,
              };
            }),
            { chunk: Math.floor(SQLVariableLimit / 4) },
          ).catch(() => {
            // ignore
            return;
          });
        }
      });
    }

    joinpart.send({ users: partedUsers, type: 'part' });
    for (const username of partedUsers) {
      if (!isIgnored({ userName: username })) {
        await setImmediateAwait();
        eventEmitter.emit('user-parted-channel', { userName: username });
      }
    }

    joinpart.send({ users: joinedUsers, type: 'join' });
    for (const username of joinedUsers) {
      if (isIgnored({ userName: username })) {
        continue;
      } else {
        await setImmediateAwait();
        followerUpdatePreCheck(username);
        eventEmitter.emit('user-joined-channel', { userName: username });
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false, opts };
  }
  return { state: true, opts };
};