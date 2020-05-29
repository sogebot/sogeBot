import axios from 'axios';
import { chunk, flatMap, includes } from 'lodash';
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
import { getUsersFromTwitch } from './getUserFromTwitch';
import { clusteredFetchAccountAge } from '../cluster';
import { debug, warning } from '../helpers/log';
import { SQLVariableLimit } from '../helpers/sql';

const isThreadingEnabled = process.env.THREAD !== '0';

export const getChannelChattersUnofficialAPI = async (): Promise<{ modStatus: boolean; partedUsers: string[]; joinedUsers: string[] }> => {
  debug('microservice', 'getChannelChattersUnofficialAPI::isThreadingEnabled ' + isThreadingEnabled);
  debug('microservice', 'getChannelChattersUnofficialAPI::start');
  if (!isMainThread && isThreadingEnabled) {
    debug('microservice', 'getChannelChattersUnofficialAPI::createConnection');
    const connectionOptions = await getConnectionOptions();
    await createConnection({
      ...connectionOptions,
    });
    await new Promise( resolve => setTimeout(resolve, 3000) );
  }
  debug('microservice', 'getChannelChattersUnofficialAPI::getConnection');
  const connection = await getConnection();

  // spin up worker
  if (isMainThread && connection.options.type !== 'sqlite' && isThreadingEnabled) {
    debug('microservice', 'getChannelChattersUnofficialAPI::worker');
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
      channel = JSON.parse(channel).toLowerCase();
    }
    if (bot) {
      bot = String(JSON.parse(bot)).toLowerCase();
    }

    const url = `https://tmi.twitch.tv/group/user/${channel}/chatters`;
    const request = await axios.get(url);

    if (typeof request.data.chatters === 'undefined') {
      throw Error('chatters undefined');
    }

    const chatters: any[] = flatMap(request.data.chatters);
    const modStatus = typeof bot !== 'undefined' && (request.data.chatters.moderators as string[]).map(o => o.toLowerCase()).includes(bot);

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
    const usersToFetch: string[] = [];
    if (joinedUsers.length > 0) {
      for (const username of joinedUsers) {
        const user = await getRepository(User).findOne({ where: { username }});
        if (user) {
          await getRepository(User).save({...user, isOnline: true});
          if (user.createdAt === 0) {
            // run this after we save new user
            await clusteredFetchAccountAge(user.userId);
          }
        } else {
          usersToFetch.push(username);
        }
      }
    }

    for (const usernameBatch of chunk(usersToFetch, 100)) {
      getUsersFromTwitch(usernameBatch).then(users => {
        if (users) {
          getRepository(User).save(
            users.map(user => {
              return {
                userId: Number(user.id),
                username: user.login,
                displayname: user.display_name,
                profileImageUrl: user.profile_image_url,
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

    if (!isMainThread) {
      parentPort?.postMessage({ modStatus, partedUsers, joinedUsers });
    }
    debug('microservice', 'return::getChannelChattersUnofficialAPI');
    debug('microservice', { modStatus, partedUsers, joinedUsers });
    return { modStatus, partedUsers, joinedUsers };
  } catch (e) {
    warning('Microservice getChannelChattersUnofficialAPI ended with error');
    warning(e);
    if (!isMainThread) {
      parentPort?.postMessage({ modStatus: false, partedUsers: [], joinedUsers: [] });
    }
    debug('microservice', 'getChannelChattersUnofficialAPI::return');
    debug('microservice', { modStatus: false, partedUsers: [], joinedUsers: [] });
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
      debug('microservice', 'getChannelChattersUnofficialAPI::kill');
      process.exit(0);
    }
  }
};

if (!isMainThread) {
  // init if not master
  getChannelChattersUnofficialAPI();
}