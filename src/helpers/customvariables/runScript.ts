import { User, UserInterface } from '@entity/user';
import { getTime } from '@sogebot/ui-helpers/getTime';
import axios from 'axios';
import { js as jsBeautify } from 'js-beautify';
import _ from 'lodash';
import {
  filter, get, isNil, map, sample,
} from 'lodash';
import strip from 'strip-comments';
import { getRepository } from 'typeorm';
import { VM } from 'vm2';

import Message from '../../message';
import client from '../../services/twitch/api/client';
import users from '../../users';
import {
  chatMessagesAtStart, isStreamOnline, stats, streamStatusChangeSince,
} from '../api';
import { mainCurrency, symbol } from '../currency';
import { getAllOnlineUsernames } from '../getAllOnlineUsernames';
import {
  debug, error, info, warning,
} from '../log';
import { linesParsed } from '../parser';
import * as changelog from '../user/changelog.js';
import { isModerator } from '../user/isModerator';
import { getAll } from './getAll';

async function runScript (script: string, opts: { sender: { userId: string; userName: string; source: 'twitch' | 'discord' } | string | null, isUI: boolean; param?: string | number, _current: any }) {
  debug('customvariables.eval', opts);
  let sender = !isNil(opts.sender) ? opts.sender : null;
  const isUI = !isNil(opts.isUI) ? opts.isUI : false;
  const param = !isNil(opts.param) ? opts.param : null;
  if (typeof sender === 'string') {
    sender = {
      userName: sender,
      userId:   await users.getIdByName(sender),
      source:   'twitch',
    };
  }let strippedScript = strip(script);
  // we need to check +1 variables, as they are part of commentary
  const containUsers = strippedScript.match(/users/g) !== null;
  const containRandom = strippedScript.replace(/Math\.random|_\.random/g, '').match(/random/g) !== null;
  const containOnline = strippedScript.match(/online/g) !== null;
  debug('customvariables.eval', {
    strippedScript, containOnline, containRandom, containUsers,
  });

  let usersList: UserInterface[] = [];
  if (containUsers || containRandom) {
    await changelog.flush();
    usersList = await getRepository(User).find();
  }

  let onlineViewers: string[] = [];
  let onlineSubscribers: string[] = [];
  let onlineFollowers: string[] = [];

  if (containOnline) {
    await changelog.flush();
    onlineViewers = await getAllOnlineUsernames();
    onlineSubscribers = (await getRepository(User).find({
      where: {
        isSubscriber: true,
        isOnline:     true,
      },
    })).map(o => o.userName);
    await changelog.flush();
    onlineFollowers = (await getRepository(User).find({
      where: {
        isFollower: true,
        isOnline:   true,
      },
    })).map(o => o.userName);
  }

  const randomVar = {
    online: {
      viewer:     sample(onlineViewers),
      follower:   sample(onlineFollowers),
      subscriber: sample(onlineSubscribers),
    },
    viewer:     sample(map(usersList, 'userName')),
    follower:   sample(map(filter(usersList, (o) => get(o, 'isFollower', false)), 'userName')),
    subscriber: sample(map(filter(usersList, (o) => get(o, 'isSubscriber', false)), 'userName')),
  };

  // get custom variables
  const customVariables = await getAll();

  // update globals and replace theirs values
  strippedScript = (await new Message(strippedScript).global({ escape: '\'' }));

  const sandbox = {
    waitMs: (ms: number) => {
      return new Promise((resolve) => setTimeout(resolve, ms, null));
    },
    url: async (url: string, urlOpts?: { url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', headers: undefined, data: undefined }) => {
      if (typeof urlOpts === 'undefined') {
        urlOpts = {
          url,
          method:  'GET',
          headers: undefined,
          data:    undefined,
        };
      } else {
        urlOpts.url = url;
      }

      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(urlOpts.method.toUpperCase())) {
        throw Error('only GET, POST, PUT, DELETE methods are supported');
      }

      if (urlOpts.url.trim().length === 0) {
        throw Error('url was not properly specified');
      }

      const request = await axios(urlOpts);
      return {
        data: request.data, status: request.status, statusText: request.statusText,
      };
    },
    _:      _,
    users:  users,
    random: randomVar,
    stream: {
      uptime:             getTime(isStreamOnline.value ? streamStatusChangeSince.value : null, false),
      currentViewers:     stats.value.currentViewers,
      currentSubscribers: stats.value.currentSubscribers,
      currentBits:        stats.value.currentBits,
      currentTips:        stats.value.currentTips,
      currency:           symbol(mainCurrency.value),
      chatMessages:       (isStreamOnline.value) ? linesParsed - chatMessagesAtStart.value : 0,
      currentFollowers:   stats.value.currentFollowers,
      currentViews:       stats.value.currentViews,
      maxViewers:         stats.value.maxViewers,
      newChatters:        stats.value.newChatters,
      game:               stats.value.currentGame,
      status:             stats.value.currentTitle,
      currentWatched:     stats.value.currentWatchedTime,
    },
    sender,
    info:     info,
    warning:  warning,
    param:    param,
    _current: opts._current,
    user:     async (userName: string) => {
      await changelog.flush();
      const _user = await getRepository(User).findOne({ userName });
      if (_user) {
        const userObj = {
          userName,
          id:          String(_user.userId),
          displayname: _user.displayname,
          is:          {
            online:     _user.isOnline ?? false,
            follower:   get(_user, 'is.follower', false),
            vip:        get(_user, 'is.vip', false),
            subscriber: get(_user, 'is.subscriber', false),
            mod:        isModerator(_user),
          },
        };
        return userObj;
      } else {
        try {
          // we don't have data of user, we will try to get them
          const clientBot = await client('bot');
          const getUserByName = await clientBot.users.getUserByName(userName);
          if (!getUserByName) {
            return null;
          } else {
            changelog.update(getUserByName.id, {
              userName,
              userId:          getUserByName.id,
              displayname:     getUserByName.displayName,
              profileImageUrl: getUserByName.profilePictureUrl,
            });

            const userObj = {
              userName,
              id:          getUserByName.id,
              displayname: getUserByName.displayName,
              is:          {
                online:     false,
                follower:   false,
                vip:        false,
                subscriber: false,
                mod:        false,
              },
            };
            return userObj;
          }
        } catch (e: any) {
          error(e.stack);
          return null;
        }
      }
    },
    ...customVariables,
  };
    // we need to add operation counter function
  const opCounterFnc = 'let __opCount__ = 0; function __opCounter__() { if (__opCount__ > 100000) { throw new Error("Running script seems to be in infinite loop."); } else { __opCount__++; }};';
  // add __opCounter__() after each ;
  const toEval = `(async function () { ${opCounterFnc} ${jsBeautify(strippedScript).split(';\n').map(line => '__opCounter__();' + line).join(';')} })`.replace(/\n/g, '');
  try {
    const vm = new VM({ sandbox });
    const value = await vm.run(toEval)();
    debug('customvariables.eval', value);
    return value;
  } catch (e: any) {
    debug('customvariables.eval', 'Running script seems to be in infinite loop.');
    error(`Script is causing error:`);
    error(`${jsBeautify(strippedScript)}`);
    error(e.stack);
    if (isUI) {
      // if we have UI, rethrow error to show in UI
      throw(e);
    } else {
      return '';
    }
  }
}

export { runScript };