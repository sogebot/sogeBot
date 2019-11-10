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

import { User } from '../entity/user';
import { ThreadEvent } from '../entity/threadEvent';
import { getAllOnlineUsernames } from '../helpers/getAllOnlineUsernames';
import { Settings } from '../entity/settings';
import { getUserFromTwitch } from './getUserFromTwitch';
import { clusteredFetchAccountAge } from '../cluster';

export const getChannelChattersUnofficialAPI = async (): Promise<{ modStatus: boolean; partedUsers: string[]; joinedUsers: string[] }> => {
  if (!isMainThread) {
    const connectionOptions = await getConnectionOptions();
    await createConnection({
      synchronize: true,
      logging: false,
      entities: [__dirname + '/../entity/*.{js,ts}'],
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
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
    return value as unknown as { modStatus: boolean; partedUsers: string[]; joinedUsers: string[] };
  }

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

    const channel = (await getManager()
      .createQueryBuilder()
      .select('settings')
      .from(Settings, 'settings')
      .where('name = :name', { name: 'generalChannel' })
      .andWhere('namespace = :namespace', { namespace: '/core/oauth'})
      .getOne())?.value;
    const bot = (await getManager()
      .createQueryBuilder()
      .select('settings')
      .from(Settings, 'settings')
      .where('name = :name', { name: 'botUsername' })
      .andWhere('namespace = :namespace', { namespace: '/core/oauth'})
      .getOne())?.value;

    if (typeof channel === 'undefined') {
      throw Error('channel undefined');
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
        let user = await getRepository(User).findOne({ where: { username }});
        if (user) {
          user.isOnline = true;
          if (user.createdAt === 0) {
            clusteredFetchAccountAge(username, user.userId);
          }
          await getRepository(User).save(user);
        } else {
          // add new user to db
          try {
            const twitchObj = await getUserFromTwitch(username);
            user = new User();
            user.userId = Number(twitchObj.id);
            user.username = twitchObj.login;
            user.displayname = twitchObj.display_name;
            user.profileImageUrl = twitchObj.profile_image_url;
            clusteredFetchAccountAge(user.username, user.userId);
            await getRepository(User).save(user);
          } catch (e) {
            console.error('Something went wrong when getting user data of ' + username);
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
  };
};

if (!isMainThread) {
  // init if not master
  getChannelChattersUnofficialAPI();
}