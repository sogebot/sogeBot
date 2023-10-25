import { User } from '@entity/user.js';

import { AppDataSource } from '~/database.js';
import * as changelog from '~/helpers/user/changelog.js';
import { variables } from '~/watchers.js';

async function getRandOrder() {
  if (AppDataSource.options.type === 'better-sqlite3' || AppDataSource.options.type === 'postgres') {
    return 'RANDOM()';
  } else {
    return 'RAND()';
  }
}

async function getRandomViewer() {
  await changelog.flush();
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  return AppDataSource.getRepository(User).createQueryBuilder('user')
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
  return AppDataSource.getRepository(User).createQueryBuilder('user')
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
  return AppDataSource.getRepository(User).createQueryBuilder('user')
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
  return AppDataSource.getRepository(User).createQueryBuilder('user')
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