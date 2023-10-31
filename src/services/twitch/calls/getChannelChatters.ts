import { User } from '@entity/user.js';
import { HelixChatChatter, HelixForwardPagination } from '@twurple/api/lib';
import { HttpStatusCodeError } from '@twurple/api-call';
import {
  capitalize,
  chunk, includes,
} from 'lodash-es';

import { AppDataSource } from '~/database.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { getAllOnline } from '~/helpers/getAllOnlineUsernames.js';
import {
  debug, error, warning,
} from '~/helpers/log.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import { SQLVariableLimit } from '~/helpers/sql.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';
import joinpart from '~/widgets/joinpart.js';

const getChannelChattersAll = async (chatters: HelixChatChatter[] = [], after?: HelixForwardPagination['after']): Promise<HelixChatChatter[]> => {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

  try {
    const response = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.getChatters(broadcasterId, { after, limit: 100 }));
    if (!response) {
      return [];
    }
    chatters.push(...response.data);

    if (response.total === chatters.length) {
      return chatters;
    }

    return getChannelChattersAll(chatters, response.cursor);
  } catch (e)  {
    if (e instanceof Error) {
      if (e instanceof HttpStatusCodeError) {
        if (e.statusCode === 403) {
          error(`No chatters found. ${capitalize(JSON.parse(e.body).message)}`);
        } else {
          error(`getChannelChattersAll => ${e.statusCode} - ${JSON.parse(e.body).message}`);
        }
      } else {
        error(`getChannelChattersAll => ${e.stack ?? e.message}`);
      }
    }
    return [];
  }
};

export const getChannelChatters = async (opts: any) => {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const botId = variables.get('services.twitch.botId') as string;

    const [
      chatters,
      allOnlineUsers,
    ] = await Promise.all([
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
            const getUserById = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserById(joinedUser.userId));
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
      twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUsersByIds(userIdBatch).then(users => {
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
      }));
    }

    joinpart.send({ users: partedUsers, type: 'part' });
    for (const username of partedUsers) {
      await setImmediateAwait();
      eventEmitter.emit('user-parted-channel', { userName: username });
    }

    joinpart.send({ users: joinedUsers.map(o => o.userDisplayName), type: 'join' });
    for (const user of joinedUsers) {
      await setImmediateAwait();
      eventEmitter.emit('user-joined-channel', { userName: user.userName });
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`getChannelChattersAll => Connection to Twitch timed out. Will retry request.`);
      } else {
        error(`getChannelChattersAll => ${e.stack ?? e.message}`);
      }
    }
    return { state: false, opts };
  }
  return { state: true, opts };
};