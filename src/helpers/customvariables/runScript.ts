import { getTime } from '@sogebot/ui-helpers/getTime';
import axios from 'axios';
import { js as jsBeautify } from 'js-beautify';
import _ from 'lodash';
import {
  filter, get, isNil, map, sample,
} from 'lodash';
import safeEval from 'safe-eval';
import strip from 'strip-comments';
import { getRepository } from 'typeorm';

import { User, UserInterface } from '../../database/entity/user';
import Message from '../../message';
import { getUserFromTwitch } from '../../microservices/getUserFromTwitch';
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
import { isModerator } from '../user/isModerator';
import { getAll } from './getAll';

async function runScript (script: string, opts: { sender: { userId: string; username: string; source: 'twitch' | 'discord' } | string | null, isUI: boolean; param?: string | number, _current: any }) {
  debug('customvariables.eval', opts);
  let sender = !isNil(opts.sender) ? opts.sender : null;
  const isUI = !isNil(opts.isUI) ? opts.isUI : false;
  const param = !isNil(opts.param) ? opts.param : null;
  if (typeof sender === 'string') {
    sender = {
      username: sender,
      userId:   await users.getIdByName(sender),
      source:   'twitch',
    };
  }

  const strippedScript = strip(script);
  // we need to check +1 variables, as they are part of commentary
  const containUsers = strippedScript.match(/users/g) !== null;
  const containRandom = strippedScript.replace(/Math\.random|_\.random/g, '').match(/random/g) !== null;
  const containOnline = strippedScript.match(/online/g) !== null;
  debug('customvariables.eval', {
    strippedScript, containOnline, containRandom, containUsers,
  });

  let usersList: UserInterface[] = [];
  if (containUsers || containRandom) {
    usersList = await getRepository(User).find();
  }

  let onlineViewers: string[] = [];
  let onlineSubscribers: string[] = [];
  let onlineFollowers: string[] = [];

  if (containOnline) {
    onlineViewers = await getAllOnlineUsernames();
    onlineSubscribers = (await getRepository(User).find({
      where: {
        isSubscriber: true,
        isOnline:     true,
      },
    })).map(o => o.username);
    onlineFollowers = (await getRepository(User).find({
      where: {
        isFollower: true,
        isOnline:   true,
      },
    })).map(o => o.username);
  }

  const randomVar = {
    online: {
      viewer:     sample(onlineViewers),
      follower:   sample(onlineFollowers),
      subscriber: sample(onlineSubscribers),
    },
    viewer:     sample(map(usersList, 'username')),
    follower:   sample(map(filter(usersList, (o) => get(o, 'isFollower', false)), 'username')),
    subscriber: sample(map(filter(usersList, (o) => get(o, 'isSubscriber', false)), 'username')),
  };

  // get custom variables
  const customVariables = await getAll();

  // update globals and replace theirs values
  script = (await new Message(script).global({ escape: '\'' }));

  const context = {
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
    user:     async (username: string) => {
      const _user = await getRepository(User).findOne({ username });
      if (_user) {
        const userObj = {
          username,
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
          const userFromTwitch = await getUserFromTwitch(username);
          const createdUser = await getRepository(User).save({
            username,
            userId:          userFromTwitch.id,
            displayname:     userFromTwitch.display_name,
            profileImageUrl: userFromTwitch.profile_image_url,
          });

          const userObj = {
            username,
            id:          createdUser.userId,
            displayname: createdUser.displayname,
            is:          {
              online:     createdUser.isOnline ?? false,
              follower:   get(createdUser, 'is.follower', false),
              vip:        get(createdUser, 'is.vip', false),
              subscriber: get(createdUser, 'is.subscriber', false),
              mod:        isModerator(createdUser),
            },
          };
          return userObj;
        } catch (e) {
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
  const toEval = `(async function evaluation () { ${opCounterFnc} ${jsBeautify(script).split(';\n').map(line => '__opCounter__();' + line).join(';\n')} })()`;
  try {
    const value = await safeEval(toEval, context);
    debug('customvariables.eval', value);
    return value;
  } catch (e) {
    debug('customvariables.eval', 'Running script seems to be in infinite loop.');
    error(`Script is causing error:`);
    error(`${jsBeautify(script)}`);
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