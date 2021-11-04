import { User } from '@entity/user';
import { sample } from '@sogebot/ui-helpers/array';
import { getRepository } from 'typeorm';

import type { ResponseFilter } from '.';

import { get } from '~/helpers/interfaceEmitter';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored';

const random: ResponseFilter = {
  '(random.online.viewer)': async function () {
    await changelog.flush();
    const [ botUsername, broadcasterUsername ] = await Promise.all([
      get<string>('/services/twitch', 'botUsername'),
      get<string>('/services/twitch', 'broadcasterUsername'),
    ]);
    const viewers = (await getRepository(User).createQueryBuilder('user')
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
  '(random.online.follower)': async function () {
    await changelog.flush();
    const [ botUsername, broadcasterUsername ] = await Promise.all([
      get<string>('/services/twitch', 'botUsername'),
      get<string>('/services/twitch', 'broadcasterUsername'),
    ]);
    const followers = (await getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
      .andWhere('user.isFollower = :isFollower', { isFollower: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ userName: o.userName, userId: o.userId });
    });
    if (followers.length === 0) {
      return 'unknown';
    }
    return sample(followers.map(o => o.userName ));
  },
  '(random.online.subscriber)': async function () {
    await changelog.flush();
    const [ botUsername, broadcasterUsername ] = await Promise.all([
      get<string>('/services/twitch', 'botUsername'),
      get<string>('/services/twitch', 'broadcasterUsername'),
    ]);
    const subscribers = (await getRepository(User).createQueryBuilder('user')
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
    const [ botUsername, broadcasterUsername ] = await Promise.all([
      get<string>('/services/twitch', 'botUsername'),
      get<string>('/services/twitch', 'broadcasterUsername'),
    ]);
    const viewers = (await getRepository(User).createQueryBuilder('user')
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
  '(random.follower)': async function () {
    await changelog.flush();
    const [ botUsername, broadcasterUsername ] = await Promise.all([
      get<string>('/services/twitch', 'botUsername'),
      get<string>('/services/twitch', 'broadcasterUsername'),
    ]);
    const followers = (await getRepository(User).createQueryBuilder('user')
      .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
      .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
      .andWhere('user.isFollower = :isFollower', { isFollower: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ userName: o.userName, userId: o.userId });
    });
    if (followers.length === 0) {
      return 'unknown';
    }
    return sample(followers.map(o => o.userName ));
  },
  '(random.subscriber)': async function () {
    await changelog.flush();
    const [ botUsername, broadcasterUsername ] = await Promise.all([
      get<string>('/services/twitch', 'botUsername'),
      get<string>('/services/twitch', 'broadcasterUsername'),
    ]);
    const subscribers = (await getRepository(User).createQueryBuilder('user')
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