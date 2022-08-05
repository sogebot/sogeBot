import { User } from '@entity/user';
import { getConnection, getRepository } from 'typeorm';

import * as changelog from '~/helpers/user/changelog.js';
import { variables } from '~/watchers';

async function getRandOrder() {
  const connection = await getConnection();
  if (connection.options.type === 'better-sqlite3' || connection.options.type === 'postgres') {
    return 'RANDOM()';
  } else {
    return 'RAND()';
  }
}

async function getRandomViewer() {
  await changelog.flush();
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  return getRepository(User).createQueryBuilder('user')
    .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
    .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
    .orderBy(await getRandOrder())
    .limit(1)
    .getOne();
}

async function getRandomSubscriber() {
  await changelog.flush();
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  return getRepository(User).createQueryBuilder('user')
    .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
    .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
    .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
    .orderBy(await getRandOrder())
    .limit(1)
    .getOne();
}

async function getRandomOnlineViewer() {
  await changelog.flush();
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  return getRepository(User).createQueryBuilder('user')
    .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
    .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
    .andWhere('user.isOnline = :isOnline', { isOnline: true })
    .orderBy(await getRandOrder())
    .limit(1)
    .getOne();
}

async function getRandomOnlineSubscriber() {
  await changelog.flush();
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  return getRepository(User).createQueryBuilder('user')
    .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
    .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
    .andWhere('user.isOnline = :isOnline', { isOnline: true })
    .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
    .orderBy(await getRandOrder())
    .limit(1)
    .getOne();
}

export {
  getRandomViewer, getRandomOnlineViewer,
  getRandomSubscriber, getRandomOnlineSubscriber,
};