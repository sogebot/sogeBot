import { User } from '@entity/user';
import { HelixChatChatter, HelixForwardPagination } from '@twurple/api/lib';
import {
  chunk, includes,
} from 'lodash';

import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { AppDataSource } from '~/database';
import { eventEmitter } from '~/helpers/events';
import { getAllOnline } from '~/helpers/getAllOnlineUsernames';
import { getFunctionName } from '~/helpers/getFunctionName';
import {
  debug, error, isDebugEnabled, warning,
} from '~/helpers/log';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { SQLVariableLimit } from '~/helpers/sql';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored';
import { variables } from '~/watchers';
import joinpart from '~/widgets/joinpart';

const getChannelChattersAll = async (chatters: HelixChatChatter[] = [], after?: HelixForwardPagination['after']): Promise<HelixChatChatter[]> => {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
  const botId = variables.get('services.twitch.botId') as string;
  const clientBot = await client('bot');

  const response = await clientBot.chat.getChatters(broadcasterId, botId, { after, limit: 100 });
  chatters.push(...response.data);

  if (response.total === chatters.length) {
    return chatters;
  }

  return getChannelChattersAll(chatters, response.cursor);
};

export const getChannelChatters = async (opts: any) => {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const botId = variables.get('services.twitch.botId') as string;

    const [
      clientBot,
      chatters,
      allOnlineUsers,
    ] = await Promise.all([
      client('bot'),
      new Promise<HelixChatChatter[]>(resolve => {
        getChannelChattersAll().then(response => resolve(response.filter(data => {
          // exclude global ignore list
          const shouldExclude = isIgnored({ userName: data.userName, userId: data.userId });
          debug('api.getChannelChatter', `${data.userName} - shouldExclude: ${shouldExclude}`);
          return !shouldExclude;
        })));
      }),
      getAllOnline(),
    ]);

    const partedUsers: string[] = [];
    for (const user of allOnlineUsers) {
      if (!includes(chatters.map(o => o.userId), user.userId) && user.userId !== botId) {
        // user is no longer in channel
        await AppDataSource.getRepository(User).update({ userId: user.userId }, { isOnline: false, displayname: chatters.find(o => o.userId === user.userId)?.userDisplayName || chatters.find(o => o.userId === user.userId)?.userName, userName: chatters.find(o => o.userId === user.userId)?.userName });
        partedUsers.push(user.userName);
      }
    }

    const joinedUsers: HelixChatChatter[] = [];
    for (const chatter of chatters) {
      if (!includes(allOnlineUsers.map(o => o.userId), chatter.userId) && chatter.userId !== botId) {
        joinedUsers.push(chatter);
      }
    }

    // insert joined online users
    const usersToFetch: string[] = [];
    if (joinedUsers.length > 0) {
      for (const joinedUser of joinedUsers) {
        const user = await AppDataSource.getRepository(User).findOne({ where: { userId: joinedUser.userId } });
        if (user) {
          await AppDataSource.getRepository(User).save({ ...user, isOnline: true });
          if (!user.createdAt) {
            // run this after we save new user
            const getUserById = await clientBot.users.getUserById(joinedUser.userId);
            if (getUserById) {
              changelog.update(getUserById.id, { createdAt: new Date(getUserById.creationDate).toISOString() });
            }
          }
        } else {
          usersToFetch.push(joinedUser.userId);
        }
      }
    }

    for (const userIdBatch of chunk(usersToFetch, 100)) {
      clientBot.users.getUsersByIds(userIdBatch).then(users => {
        if (users) {
          AppDataSource.getRepository(User).save(
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
      await setImmediateAwait();
      eventEmitter.emit('user-parted-channel', { userName: username });
    }

    joinpart.send({ users: joinedUsers.map(o => o.userDisplayName), type: 'join' });
    for (const user of joinedUsers) {
      await setImmediateAwait();
      eventEmitter.emit('user-joined-channel', { userName: user.userDisplayName });
    }
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
    return { state: false, opts };
  }
  return { state: true, opts };
};