import { User } from '@entity/user';
import {
  chunk, includes,
} from 'lodash';
import {
  getRepository,
} from 'typeorm';

import client from '../api/client';

import { eventEmitter } from '~/helpers/events';
import { getAllOnlineUsernames } from '~/helpers/getAllOnlineUsernames';
import { get } from '~/helpers/interfaceEmitter';
import {
  debug, error,
} from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { SQLVariableLimit } from '~/helpers/sql';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored';
import { followerUpdatePreCheck } from '~/services/twitch/calls/isFollowerUpdate';
import joinpart from '~/widgets/joinpart';

export const getChannelChattersUnofficialAPI = async (opts: any) => {
  try {
    const [generalChannel, botUsername, clientBot] = await Promise.all([
      get<string>('/services/twitch', 'generalChannel'),
      get<string>('/services/twitch', 'botUsername'),
      client('bot'),
    ]);

    const getChatters = await clientBot.unsupported.getChatters(generalChannel);
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
          if (user.createdAt === 0) {
            // run this after we save new user
            const getUserByName = await clientBot.users.getUserByName(userName);
            if (getUserByName) {
              changelog.update(getUserByName.id, { createdAt: new Date(getUserByName.creationDate).getTime() });
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
    return { state: true, opts };
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
};