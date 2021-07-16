import { sample } from '@sogebot/ui-helpers/array';
import { getRepository } from 'typeorm';

import { User } from '../database/entity/user';
import { isIgnored } from '../helpers/user/isIgnored';
import oauth from '../oauth';

import type { ResponseFilter } from '.';

const random: ResponseFilter = {
  '(random.online.viewer)': async function () {
    const viewers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .cache(true)
      .getMany())
      .filter(o => {
        return !isIgnored({ username: o.username, userId: o.userId });
      });
    if (viewers.length === 0) {
      return 'unknown';
    }
    return sample(viewers.map(o => o.username ));
  },
  '(random.online.follower)': async function () {
    const followers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isFollower = :isFollower', { isFollower: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ username: o.username, userId: o.userId });
    });
    if (followers.length === 0) {
      return 'unknown';
    }
    return sample(followers.map(o => o.username ));
  },
  '(random.online.subscriber)': async function () {
    const subscribers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
      .andWhere('user.isOnline = :isOnline', { isOnline: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ username: o.username, userId: o.userId });
    });
    if (subscribers.length === 0) {
      return 'unknown';
    }
    return sample(subscribers.map(o => o.username ));
  },
  '(random.viewer)': async function () {
    const viewers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ username: o.username, userId: o.userId });
    });
    if (viewers.length === 0) {
      return 'unknown';
    }
    return sample(viewers.map(o => o.username ));
  },
  '(random.follower)': async function () {
    const followers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isFollower = :isFollower', { isFollower: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ username: o.username, userId: o.userId });
    });
    if (followers.length === 0) {
      return 'unknown';
    }
    return sample(followers.map(o => o.username ));
  },
  '(random.subscriber)': async function () {
    const subscribers = (await getRepository(User).createQueryBuilder('user')
      .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
      .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
      .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
      .cache(true)
      .getMany()).filter(o => {
      return !isIgnored({ username: o.username, userId: o.userId });
    });
    if (subscribers.length === 0) {
      return 'unknown';
    }
    return sample(subscribers.map(o => o.username ));
  },
  '(random.number-#-to-#)': async function (filter: string) {
    const numbers = filter.replace('(random.number-', '')
      .replace(')', '')
      .split('-to-');

    try {
      return Math.floor(Number(numbers[0]) + (Math.random() * (Number(numbers[1]) - Number(numbers[0]))));
    } catch (e) {
      return 0;
    }
  },
  '(random.true-or-false)': async function () {
    return Math.random() < 0.5;
  },
};

export { random };