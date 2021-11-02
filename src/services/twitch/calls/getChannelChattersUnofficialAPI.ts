import {
  isMainThread, parentPort, Worker,
} from 'worker_threads';

import { Settings } from '@entity/settings';
import { ThreadEvent } from '@entity/threadEvent';
import { User } from '@entity/user';
import axios from 'axios';
import {
  chunk, flatMap, includes,
} from 'lodash';
import {
  createConnection,
  getConnection,
  getConnectionOptions,
  getManager,
  getRepository,
} from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';

import { fetchAccountAge } from './fetchAccountAge';
import { getUsersFromTwitch } from './getUserFromTwitch';

import { getAllOnlineUsernames } from '~/helpers/getAllOnlineUsernames';
import {
  debug, error, setDEBUG, warning,
} from '~/helpers/log';
import { TypeORMLogger } from '~/helpers/logTypeorm.js';
import { SQLVariableLimit } from '~/helpers/sql';
import { isIgnored } from '~/helpers/user/isIgnored';

const isThreadingEnabled = process.env.THREAD !== '0';

export const getChannelChattersUnofficialAPI = async (): Promise<{ partedUsers: string[]; joinedUsers: string[] }> => {
  debug('microservice', 'getChannelChattersUnofficialAPI::isThreadingEnabled ' + isThreadingEnabled);
  debug('microservice', 'getChannelChattersUnofficialAPI::isMainThread ' + isMainThread);
  debug('microservice', 'getChannelChattersUnofficialAPI::start');

  if (isMainThread) {
    debug('microservice', 'getChannelChattersUnofficialAPI::getConnection');
    const connection = await getConnection();
    // spin up worker
    if (connection.options.type !== 'better-sqlite3' && isThreadingEnabled) {
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
      return value as unknown as { partedUsers: string[]; joinedUsers: string[] };
    }
  } else {
    if (process.env.DEBUG) {
      setDEBUG(process.env.DEBUG);
    }
    debug('microservice', 'getChannelChattersUnofficialAPI::createConnection');
    const connectionOptions = await getConnectionOptions();
    if (['mysql', 'mariadb'].includes(connectionOptions.type)) {
      try {
        await createConnection({
          ...connectionOptions,
          logging:       ['error'],
          logger:        new TypeORMLogger(),
          synchronize:   false,
          migrationsRun: false,
          charset:       'UTF8MB4_GENERAL_CI',
          entities:      [ 'dest/database/entity/*.js' ],
        } as MysqlConnectionOptions);
      } catch (e) {
        if (e instanceof Error) {
          if (!e.message.includes('it now has an active connection session')) {
            error(`getChannelChattersUnofficialAPI: ${e.stack}`);
          }
        }
      }
    } else {
      try {
        await createConnection({
          ...connectionOptions,
          logging:       ['error'],
          logger:        new TypeORMLogger(),
          synchronize:   false,
          migrationsRun: false,
          entities:      [ 'dest/database/entity/*.js' ],
        });
      } catch (e) {
        if (e instanceof Error) {
          if (!e.message.includes('it now has an active connection session')) {
            error(`getChannelChattersUnofficialAPI: ${e.stack}`);
          }
        }
      }
    }
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
    const request = await axios.get<any>(url);

    if (typeof request.data.chatters === 'undefined') {
      throw Error('chatters undefined');
    }

    const chatters: string[] = flatMap<string>(request.data.chatters).filter(userName => {
      // exclude global ignore list
      const shouldExclude = isIgnored({ userName });
      debug('microservice', `${userName} - shouldExclude: ${shouldExclude}`);
      return !shouldExclude;
    });
    const allOnlineUsers = await getAllOnlineUsernames();

    const partedUsers: string[] = [];
    for (const userName of allOnlineUsers) {
      if (!includes(chatters, userName) && userName !== bot) {
        // user is no longer in channel
        await getRepository(User).update({ userName }, { isOnline: false });
        partedUsers.push(userName);
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
      for (const userName of joinedUsers) {
        const user = await getRepository(User).findOne({ where: { userName } });
        if (user) {
          await getRepository(User).save({ ...user, isOnline: true });
          if (user.createdAt === 0) {
            // run this after we save new user
            await fetchAccountAge(user.userId);
          }
        } else {
          usersToFetch.push(userName);
        }
      }
    }

    for (const usernameBatch of chunk(usersToFetch, 100)) {
      getUsersFromTwitch(usernameBatch).then(users => {
        if (users) {
          getRepository(User).save(
            users.map(user => {
              return {
                userId:          user.id,
                userName:        user.login,
                displayname:     user.display_name,
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
      parentPort?.postMessage({ partedUsers, joinedUsers });
    }
    debug('microservice', 'return::getChannelChattersUnofficialAPI');
    debug('microservice', { partedUsers, joinedUsers });
    return { partedUsers, joinedUsers };
  } catch (e: any) {
    warning('Microservice getChannelChattersUnofficialAPI ended with error');
    warning(e);
    if (!isMainThread) {
      parentPort?.postMessage({ partedUsers: [], joinedUsers: [] });
    }
    debug('microservice', 'getChannelChattersUnofficialAPI::return');
    debug('microservice', { partedUsers: [], joinedUsers: [] });
    return { partedUsers: [], joinedUsers: [] };
  } finally {
    setTimeout(() => {
      if (!isMainThread) {
        debug('microservice', 'getChannelChattersUnofficialAPI::kill');
        process.exit(0);
      }
    }, 100);
  }
};

if (!isMainThread) {
  // init if not master
  getChannelChattersUnofficialAPI();
}