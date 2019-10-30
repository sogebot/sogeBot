// import { isMainThread } from 'worker_threads';
import axios from 'axios';
import { flatMap, includes } from 'lodash';
import config from '@config';
import { isMainThread, parentPort, Worker } from 'worker_threads';
import Database from '../databases/database';

const setImmediateAwait = () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), 10);
  });
};

export const getChannelChattersUnofficialAPI = async (): Promise<{ modStatus: boolean; partedUsers: string[]; joinedUsers: string[] }> => {
  // spin up worker
  if (isMainThread && config.database.type === 'mongodb') {
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

  // connect to db, then we can continue
  if (!isMainThread && config.database.type === 'mongodb') {
    // connect to db
    global.db = new Database(false, true);

    await new Promise(resolve => {
      const check = () => {
        if (!global.db.engine.connected) {
          setTimeout(() => check(), 10);
        } else {
          resolve();
        }
      };
      check();
    });
  }

  try {
    await global.db.engine.insert('thread_event', {
      event: 'getChannelChattersUnofficialAPI',
    })

    const channel: string | undefined = (await global.db.engine.findOne('core.settings', {
      key: 'generalChannel',
      system: 'oauth'
    })).value;
    const bot: string | undefined = (await global.db.engine.findOne('core.settings', {
      key: 'botUsername',
      system: 'oauth'
    })).value;

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

    const allOnlineUsers = [
      ...new Set([
        ...((await global.db.engine.find('users.online')).map(o => o.username)),
      ]),
    ];

    const partedUsers: string[] = []
    for (const user of allOnlineUsers) {
      if (!includes(chatters, user) && user !== bot) {
        // user is no longer in channel
        await global.db.engine.remove('users.online', { username: user });
        partedUsers.push(user);
      }
    }

    const joinedUsers: string[] = []
    for (const chatter of chatters) {
      if (!includes(allOnlineUsers, chatter) && chatter !== bot) {
        joinedUsers.push(chatter);
      }
    }

    // always remove bot from online users
    await global.db.engine.remove('users.online', { username: bot });

    if (joinedUsers.length > 0) {
      await setImmediateAwait();
      await global.db.engine.insert('users.online', joinedUsers.map(o => { return { username: o }}))
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
    await global.db.engine.remove('thread_event', {
      event: 'getChannelChattersUnofficialAPI',
    });
  };
};

if (!isMainThread) {
  // init if not master
  getChannelChattersUnofficialAPI();
}