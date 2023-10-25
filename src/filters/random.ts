import { User } from '@entity/user.js';
import { sample } from '@sogebot/ui-helpers/array.js';
import { AppDataSource } from '~/database.js';

import type { ResponseFilter } from './index.js';

import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored.js';
import { variables } from '~/watchers.js';

const random: ResponseFilter = {
  '(random.online.viewer)': async function () {
    await changelog.flush();
    const botUsername = variables.get('services.twitch.botUsername') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const viewers = (await AppDataSource.getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .cache(true)
      .getMany())
      .filter(o => {
        return !isIgnored({ userName: o.userName, userId: o.userId });
      });
    if (viewers.length === 0) {
      return 'unknown';
    }
    return sample(viewers.map(o => o.userName ));
  },
  '(random.online.subscriber)': async function () {
    await changelog.flush();
    const botUsername = variables.get('services.twitch.botUsername') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const subscribers = (await AppDataSource.getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
      .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ userName: o.userName, userId: o.userId });
    });
    if (subscribers.length === 0) {
      return 'unknown';
    }
    return sample(subscribers.map(o => o.userName ));
  },
  '(random.viewer)': async function () {
    await changelog.flush();
    const botUsername = variables.get('services.twitch.botUsername') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const viewers = (await AppDataSource.getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ userName: o.userName, userId: o.userId });
    });
    if (viewers.length === 0) {
      return 'unknown';
    }
    return sample(viewers.map(o => o.userName ));
  },
  '(random.subscriber)': async function () {
    await changelog.flush();
    const botUsername = variables.get('services.twitch.botUsername') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const subscribers = (await AppDataSource.getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
      .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ userName: o.userName, userId: o.userId });
    });
    if (subscribers.length === 0) {
      return 'unknown';
    }
    return sample(subscribers.map(o => o.userName ));
  },
  '(random.number-#-to-#)': async function (filter: string) {
    const numbers = filter.replace('(random.number-', '')
      .replace(')', '')
      .split('-to-');

    try {
      return Math.floor(Number(numbers[0]) + (Math.random() * (Number(numbers[1]) - Number(numbers[0]))));
    } catch (e: any) {
      return 0;
    }
  },
  '(random.true-or-false)': async function () {
    return Math.random() < 0.5;
  },
};

export { random };