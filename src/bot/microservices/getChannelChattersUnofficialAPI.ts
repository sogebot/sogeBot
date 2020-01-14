require('module-alias/register');

import axios from 'axios';
import { flatMap, includes } from 'lodash';
import { isMainThread, parentPort, Worker } from 'worker_threads';

import {
  createConnection,
  getConnection,
  getConnectionOptions,
  getManager,
  getRepository,
} from 'typeorm';

import { User } from '../database/entity/user';
import { ThreadEvent } from '../database/entity/threadEvent';
import { getAllOnlineUsernames } from '../helpers/getAllOnlineUsernames';
import { Settings } from '../database/entity/settings';
import { getUserFromTwitch } from './getUserFromTwitch';
import { clusteredFetchAccountAge } from '../cluster';
import { debug } from '../helpers/log';

export const getChannelChattersUnofficialAPI = async (): Promise<{ modStatus: boolean; partedUsers: string[]; joinedUsers: string[] }> => {
  if (!isMainThread) {
    const connectionOptions = await getConnectionOptions();
    await createConnection({
      ...connectionOptions,
    });
  }
  const connection = await getConnection();

  // spin up worker
  if (isMainThread && connection.options.type !== 'sqlite') {
    const value = await new Promise((resolve, reject) => {
      const worker = new Worker(__filename);
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        debug('microservice', 'exit::getChannelChattersUnofficialAPI with code ' + code);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
    return value as unknown as { modStatus: boolean; partedUsers: string[]; joinedUsers: string[] };
  }

  debug('microservice', 'start::getChannelChattersUnofficialAPI');
  try {
    // lock thread
    await getManager()
      .createQueryBuilder()
      .insert()
      .into(ThreadEvent)
      .values([
        { event: 'getChannelChattersUnofficialAPI' },
      ])
      .execute();

    let channel = (await getRepository(Settings).findOne({ name: 'generalChannel' }))?.value;
    let bot = (await getRepository(Settings).findOne({ name: 'botUsername' }))?.value;

    if (typeof channel === 'undefined') {
      throw Error('channel undefined');
    } else {
      channel = JSON.parse(channel);
    }
    if (bot) {
      bot = JSON.parse(bot);
    }

    const url = `https://tmi.twitch.tv/group/user/${channel}/chatters`;
    const request = await axios.get(url);

    if (typeof request.data.chatters === 'undefined') {
      throw Error('chatters undefined');
    }

    const chatters: any[] = flatMap(request.data.chatters);
    const modStatus = request.data.chatters.moderators.map(o => o.toLowerCase()).includes(bot);

    const allOnlineUsers = await getAllOnlineUsernames();

    const partedUsers: string[] = [];
    for (const username of allOnlineUsers) {
      if (!includes(chatters, username) && username !== bot) {
        // user is no longer in channel
        await getRepository(User).update({ username }, { isOnline: false });
        partedUsers.push(username);
      }
    }

    const joinedUsers: string[] = [];
    for (const chatter of chatters) {
      if (!includes(allOnlineUsers, chatter) && chatter !== bot) {
        joinedUsers.push(chatter);
      }
    }

    // insert joined online users
    if (joinedUsers.length > 0) {
      for (const username of joinedUsers) {
        const user = await getRepository(User).findOne({ where: { username }});
        if (user) {
          if (user.createdAt === 0) {
            clusteredFetchAccountAge(username, user.userId);
          }
          await getRepository(User).save({...user, isOnline: true});
        } else {
          // add new user to db
          try {
            const twitchObj = await getUserFromTwitch(username);
            await getRepository(User).save({
              userId: Number(twitchObj.id),
              username: twitchObj.login,
              displayname: twitchObj.display_name,
              profileImageUrl: twitchObj.profile_image_url,
            });

            clusteredFetchAccountAge(twitchObj.login, Number(twitchObj.id));
          } catch (e) {
            process.stderr.write('Something went wrong when getting user data of ' + username + '\n');
            continue;
          }
        }
      }
    }

    if (!isMainThread) {
      parentPort?.postMessage({ modStatus, partedUsers, joinedUsers });
    }
    return { modStatus, partedUsers, joinedUsers };
  } catch (e) {
    debug('microservice', e);
    if (!isMainThread) {
      parentPort?.postMessage({ modStatus: false, partedUsers: [], joinedUsers: [] });
    }
    return { modStatus: false, partedUsers: [], joinedUsers: [] };
  } finally {
    // free event
    await getManager()
      .createQueryBuilder()
      .delete()
      .from(ThreadEvent)
      .where('event = :event', { event: 'getChannelChattersUnofficialAPI' })
      .execute();
    if (!isMainThread) {
      debug('microservice', 'kill::getChannelChattersUnofficialAPI');
      process.exit(0);
    }
  };
};

if (!isMainThread) {
  // init if not master
  getChannelChattersUnofficialAPI();
}