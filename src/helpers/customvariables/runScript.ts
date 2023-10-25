import { User } from '@entity/user.js';
import { getTime } from '@sogebot/ui-helpers/getTime.js';
import axios from 'axios';
import _ from 'lodash-es';
import {
  get, isNil,
} from 'lodash-es';
import { minify } from 'terser';
import { VM } from 'vm2';

import { getAll } from './getAll.js';
import { Message } from  '../../message.js';
import users from '../../users.js';
import {
  chatMessagesAtStart, isStreamOnline, stats, streamStatusChangeSince,
} from '../api/index.js';
import { mainCurrency, symbol } from '../currency/index.js';
import {
  debug, error, info, warning,
} from '../log.js';
import { linesParsed } from '../parser.js';
import * as changelog from '../user/changelog.js';
import { isModerator } from '../user/isModerator.js';
import { getRandomOnlineSubscriber, getRandomOnlineViewer, getRandomSubscriber, getRandomViewer } from '../user/random.js';

import { AppDataSource } from '~/database.js';
import twitch from '~/services/twitch.js';

async function runScript (script: string, opts: { sender: { userId: string; userName: string; source: 'twitch' | 'discord' } | string | null, isUI: boolean; param?: string | number, _current: any, parameters?: { [x: string]: any }, variables?: { [x: string]: any } }) {
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
  }

  const minified = await minify(script, {
    module: true,
    parse:  {
      bare_returns: true, // allows top-level return
    },
    output: {
      beautify: true,  // beautify output
      braces:   true,  // always insert braces even on one line if
    },
    compress: {
      loops:     false, // disable compressing while(true) -> for(;;)
      sequences: false, // disable chaining with commas
    },
  });

  if (!minified.code) {
    throw new Error('Error during minify');
  }

  let strippedScript = minified.code;
  debug('customvariables.eval', {
    strippedScript,
  });

  // get custom variables
  const customVariables = await getAll();

  // update globals and replace theirs values
  // we need to escape " as stripped script replaces all ' to " and text containing " may cause issues
  strippedScript = (await new Message(strippedScript).global({ escape: '"' }));

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
    stream: {
      uptime:             getTime(isStreamOnline.value ? streamStatusChangeSince.value : null, false),
      currentViewers:     stats.value.currentViewers,
      currentSubscribers: stats.value.currentSubscribers,
      currentBits:        stats.value.currentBits,
      currentTips:        stats.value.currentTips,
      currency:           symbol(mainCurrency.value),
      chatMessages:       (isStreamOnline.value) ? linesParsed - chatMessagesAtStart.value : 0,
      currentFollowers:   stats.value.currentFollowers,
      maxViewers:         stats.value.maxViewers,
      newChatters:        stats.value.newChatters,
      game:               stats.value.currentGame,
      status:             stats.value.currentTitle,
      currentWatched:     stats.value.currentWatchedTime,
    },
    sender,
    info:                   info,
    warning:                warning,
    param:                  param,
    parameters:             opts.parameters,
    variables:              opts.variables,
    _current:               opts._current,
    randomOnlineSubscriber: async () => getRandomOnlineSubscriber(),
    randomOnlineViewer:     async () => getRandomOnlineViewer(),
    randomSubscriber:       async () => getRandomSubscriber(),
    randomViewer:           async () => getRandomViewer(),
    user:                   async (userName: string) => {
      await changelog.flush();
      const _user = await AppDataSource.getRepository(User).findOneBy({ userName });
      if (_user) {
        const userObj = {
          userName,
          id:          String(_user.userId),
          displayname: _user.displayname,
          is:          {
            online:     _user.isOnline ?? false,
            vip:        get(_user, 'is.vip', false),
            subscriber: get(_user, 'is.subscriber', false),
            mod:        isModerator(_user),
          },
        };
        return userObj;
      } else {
        try {
          // we don't have data of user, we will try to get them
          const getUserByName = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(userName));
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
    ...opts.variables,
  };
    // we need to add operation counter function
  const opCounterFnc = 'let __opCount__ = 0; function __opCounter__() { if (__opCount__ > 100000) { throw new Error("Running script seems to be in infinite loop."); } else { __opCount__++; }};';
  // add __opCounter__() after each ;
  const toEval = `(async function () { ${opCounterFnc} ${strippedScript.split(';\n').map(line => '__opCounter__();' + line).join(';')} })`.replace(/\n/g, '');
  try {
    const vm = new VM({ sandbox });
    const value = await vm.run(toEval)();
    debug('customvariables.eval', value);
    return value;
  } catch (e: any) {
    debug('customvariables.eval', 'Running script seems to be in infinite loop.');
    error(`Script is causing error:`);
    error(`${script}`);
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