import crypto from 'crypto';

import axios, { AxiosResponse } from 'axios';
import { isNil, sample } from 'lodash';
import _ from 'lodash';
import safeEval from 'safe-eval';
import { getRepository } from 'typeorm';

import { User } from '../database/entity/user';
import { UserInterface } from '../database/entity/user';
import { isIgnored } from '../helpers/user/isIgnored';
import oauth from '../oauth';
import tmi from '../tmi';
import users from '../users';

import type { ResponseFilter } from '.';

const evaluate: ResponseFilter = {
  '(eval#)': async function (filter, attr) {
    let toEvaluate = filter.replace('(eval ', '').slice(0, -1);

    const containUsers = !isNil(toEvaluate.match(/users/g));
    const containRandom = !isNil(toEvaluate.replace(/Math\.random|_\.random/g, '').match(/random/g));
    const containOnline = !isNil(toEvaluate.match(/online/g));
    const containUrl = !isNil(toEvaluate.match(/url\(['"](.*?)['"]\)/g));

    const urls: { id: string; response: AxiosResponse<any> }[] = [];
    if (containUrl) {
      for (const match of toEvaluate.match(/url\(['"](.*?)['"]\)/g) as RegExpMatchArray ) {
        const id = 'url' + crypto.randomBytes(64).toString('hex').slice(0, 5);
        const url = match.replace(/url\(['"]|["']\)/g, '');
        let response = await axios.get(url);
        try {
          response.data = JSON.parse(response.data.toString());
        } catch (e) {
          // JSON failed, treat like string
          response = response.data.toString();
        }
        urls.push({ id, response });
        toEvaluate = toEvaluate.replace(match, `url.${id}`);
      }
    }

    let allUsers: Readonly<Required<UserInterface>>[] = [];
    if (containUsers || containRandom) {
      allUsers = await getRepository(User).find();
    }
    const user = await users.getUserByUsername(attr.sender.username);

    let onlineViewers: Readonly<Required<UserInterface>>[] = [];
    let onlineSubscribers: Readonly<Required<UserInterface>>[] = [];
    let onlineFollowers: Readonly<Required<UserInterface>>[] = [];

    if (containOnline) {
      const viewers = (await getRepository(User).createQueryBuilder('user')
        .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
        .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
        .andWhere('user.isOnline = :isOnline', { isOnline: true })
        .getMany()).filter(o => {
        return isIgnored({ username: o.username, userId: o.userId });
      });

      onlineViewers = viewers;
      onlineSubscribers = viewers.filter(o => o.isSubscriber);
      onlineFollowers = viewers.filter(o => o.isFollower);
    }

    const randomVar = {
      online: {
        viewer:     sample(onlineViewers.map(o => o.username)),
        follower:   sample(onlineFollowers.map(o => o.username)),
        subscriber: sample(onlineSubscribers.map(o => o.username)),
      },
      viewer:     sample(allUsers.map(o => o.username)),
      follower:   sample(allUsers.filter((o) => _.get(o, 'is.follower', false)).map(o => o.username)),
      subscriber: sample(allUsers.filter((o) => _.get(o, 'is.subscriber', false)).map(o => o.username)),
    };
    const is = {
      follower: user.isFollower, subscriber: user.isSubscriber, moderator: user.isModerator, vip: user.isVIP, online: user.isOnline,
    };

    const toEval = `(function evaluation () {  ${toEvaluate} })()`;
    const context: {
      _: typeof _;
      users: typeof allUsers;
      is: typeof is;
      random: typeof randomVar;
      sender: string;
      param: string | null;
      url: {
        [urlId: string]: AxiosResponse<any>
      };
    } = {
      _:      _,
      users:  allUsers,
      is:     is,
      random: randomVar,
      sender: tmi.showWithAt ? `@${attr.sender.username}` : `${attr.sender.username}`,
      param:  typeof attr.param === 'undefined'  ? null : attr.param,
      url:    {},
    };

    if (containUrl) {
      // add urls to context
      for (const url of urls) {
        context.url[url.id] = url.response;
      }
    }

    return (safeEval(toEval, context));
  },
};

export { evaluate };