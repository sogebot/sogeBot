import safeEval from 'safe-eval';
import axios from 'axios';
import _ from 'lodash';
import { setTimeout } from 'timers';
import { filter, get, isNil, map, sample } from 'lodash';

import Message from './message';
import { permission } from './helpers/permissions';
import { getAllOnlineUsernames } from './helpers/getAllOnlineUsernames';
import { getOwnerAsSender, getTime, isModerator, prepare, sendMessage } from './commons';

import { getRepository } from 'typeorm';
import { User } from './database/entity/user';
import { Variable, VariableHistory, VariableWatch } from './database/entity/variable';
import { addToViewersCache, getfromViewersCache } from './helpers/permissions';
import users from './users';
import api from './api';
import permissions from './permissions';
import panel from './panel';
import custom_variables from './widgets/custom_variables';
import currency from './currency';
import { isDbConnected } from './helpers/database';

class CustomVariables {
  timeouts: {
    [x: string]: NodeJS.Timeout;
  } = {};

  constructor () {
    this.addMenuAndListenersToPanel();
    this.checkIfCacheOrRefresh();
  }

  async getURL(req, res) {
    try {
      const variable = (await getRepository(Variable).find({
        relations: ['urls'],
      }))
        .find(variable => {
          return variable.urls.find(url => url.id === req.params.id);
        });
      if (variable) {
        if (variable.urls.find(url => url.id === req.params.id)?.GET) {
          return res.status(200).send({ value: await this.getValueOf(variable.variableName) });
        } else {
          return res.status(403).send({ error: 'This endpoint is not enabled for GET', code: 403 });
        }
      } else {
        return res.status(404).send({ error: 'Variable not found', code: 404 });
      }
    } catch (e) {
      res.status(500).send({ error: 'Internal Server Error', code: 500 });
      throw e;
    }
  }

  async postURL(req, res) {
    try {
      const variable = (await getRepository(Variable).find({
        relations: ['urls'],
      }))
        .find(variable => {
          return variable.urls.find(url => url.id === req.params.id);
        });
      if (variable) {
        if (variable.urls.find(url => url.id === req.params.id)?.POST) {
          const value = await this.setValueOf(variable.variableName, req.body.value, {});

          if (value.isOk) {
            if (variable.urls.find(url => url.id === req.params.id)?.showResponse) {
              if (value.updated.responseType === 0) {
                sendMessage(
                  prepare('filters.setVariable', { value: value.updated.currentValue, variable: variable }),
                  getOwnerAsSender(), { skip: true, quiet: false }
                );
              } else if (value.updated.responseType === 1) {
                sendMessage(
                  value.updated.responseText.replace('$value', value.updated.currentValue),
                  getOwnerAsSender(), { skip: true, quiet: false }
                );
              }
            }
            return res.status(200).send({ oldValue: variable.currentValue, value: value.updated.currentValue });
          } else {
            return res.status(400).send({ error: 'This value is not applicable for this endpoint', code: 400 });
          }
        } else {
          return res.status(403).send({ error: 'This endpoint is not enabled for POST', code: 403 });
        }
      } else {
        return res.status(404).send({ error: 'Variable not found', code: 404 });
      }
    } catch (e) {
      res.status(500).send({ error: 'Internal Server Error', code: 500 });
      throw e;
    }
  }

  async addMenuAndListenersToPanel () {
    clearTimeout(this.timeouts[`${this.constructor.name}.addMenuAndListenersToPanel`]);

    if (isNil(panel)) {
      this.timeouts[`${this.constructor.name}.addMenuAndListenersToPanel`] = setTimeout(() => this.addMenuAndListenersToPanel(), 1000);
    } else {
      panel.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables/list' });
      this.sockets();
    }
  }

  sockets () {
    const io = panel.io.of('/registry/customVariables');

    io.on('connection', (socket) => {
      socket.on('list.variables', async (cb) => {
        const variables = await getRepository(Variable).find();
        cb(null, variables);
      });
      socket.on('run.script', async (id, cb) => {
        let item;
        try {
          const item = await getRepository(Variable).findOne({ id });
          if (!item) {
            throw new Error('Variable not found');
          }
          item.currentValue = await this.runScript(item.evalValue, { _current: item.currentValue });
          item.runAt = Date.now();
          cb(null, await getRepository(Variable).save(item));
        } catch (e) {
          cb(e.stack, null);
        }
        cb(null, item);
      });
      socket.on('test.script', async (opts, cb) => {
        let returnedValue;
        try {
          returnedValue = await this.runScript(opts.evalValue, { _current: opts.currentValue, sender: { username: 'testuser', userId: 0 }});
        } catch (e) {
          cb(e.stack, null);
        }
        cb(null, returnedValue);
      });
      socket.on('isUnique', async ({ variable, id }, cb) => {
        cb(null, (await getRepository(Variable).find({ variableName: String(variable) })).filter(o => o.id !== id).length === 0);
      });
      socket.on('delete', async (id, cb) => {
        const item = await getRepository(Variable).findOne({ id });
        if (item) {
          await getRepository(Variable).remove(item);
          await getRepository(VariableWatch).delete({ variableId: id });
          this.updateWidgetAndTitle();
        }
        cb();
      });
      socket.on('load', async (id, cb) => {
        cb(await getRepository(Variable).findOne({
          relations: ['history', 'urls'],
          where: { id },
        }));
      });
      socket.on('save', async (item: Variable, cb) => {
        try {
          await getRepository(Variable).save(item);
          this.updateWidgetAndTitle(item.variableName);
          cb(null, item.id);
        } catch (e) {
          cb(e.stack, item.id);
        }
      });
    });
  }

  async runScript (script, opts) {
    let sender = isNil(opts.sender) ? opts.sender : null;
    const param = isNil(opts.param) ? opts.param : null;

    if (typeof sender === 'string') {
      sender = {
        username: sender,
        userId: await users.getIdByName(sender),
      };
    }
    // we need to check +1 variables, as they are part of commentary
    const containUsers = isNil(script.match(/users/g)) && script.match(/users/g)?.length > 1;
    const containRandom = isNil(script.replace(/Math\.random|_\.random/g, '').match(/random/g));
    const containOnline = isNil(script.match(/online/g));

    let usersList: User[] = [];
    if (containUsers || containRandom) {
      usersList = await getRepository(User).find();
    }

    let onlineViewers: string[] = [];
    const onlineSubscribers: string[] = [];
    const onlineFollowers: string[] = [];

    if (containOnline) {
      onlineViewers = await getAllOnlineUsernames();

      for (const viewer of onlineViewers) {
        const user = await getRepository(User).findOne({
          where: {
            username: viewer,
            isSubscriber: true,
          },
        });
        if (user) {
          onlineSubscribers.push(user.username);
        };
      }

      for (const viewer of onlineViewers) {
        const user = await getRepository(User).findOne({
          where: {
            username: viewer,
            isFollower: true,
          },
        });
        if (user) {
          onlineFollowers.push(user.username);
        };
      }
    }

    const randomVar = {
      online: {
        viewer: sample(map(onlineViewers, 'username')),
        follower: sample(map(onlineFollowers, 'username')),
        subscriber: sample(map(onlineSubscribers, 'username')),
      },
      viewer: sample(map(usersList, 'username')),
      follower: sample(map(filter(usersList, (o) => get(o, 'is.follower', false)), 'username')),
      subscriber: sample(map(filter(usersList, (o) => get(o, 'is.subscriber', false)), 'username')),
    };

    // get custom variables
    const customVariablesDb = await getRepository(Variable).find();
    const customVariables = {};
    for (const cvar of customVariablesDb) {
      customVariables[cvar.variableName] = cvar.currentValue;
    }

    // update globals and replace theirs values
    script = (await new Message(script).global({ escape: '\'' }));

    const toEval = `(async function evaluation () {  ${script} })()`;
    const context = {
      url: async (url, opts) => {
        if (typeof opts === 'undefined') {
          opts = {
            url,
            method: 'GET',
            headers: undefined,
            data: undefined,
          };
        } else {
          opts.url = url;
        }

        if (!['GET', 'POST', 'PUT', 'DELETE'].includes(opts.method.toUpperCase())) {
          throw Error('only GET, POST, PUT, DELETE methods are supported');
        }

        if (opts.url.trim().length === 0) {
          throw Error('url was not properly specified');
        }

        const request = await axios(opts);
        return { data: request.data, status: request.status, statusText: request.statusText };
      },
      _: _,
      users: users,
      random: randomVar,
      stream: {
        uptime: getTime(api.isStreamOnline ? api.streamStatusChangeSince : null, false),
        currentViewers: api.stats.currentViewers,
        currentSubscribers: api.stats.currentSubscribers,
        currentBits: api.stats.currentBits,
        currentTips: api.stats.currentTips,
        currency: currency.symbol(currency.mainCurrency),
        chatMessages: (api.isStreamOnline) ? global.linesParsed - api.chatMessagesAtStart : 0,
        currentFollowers: api.stats.currentFollowers,
        currentViews: api.stats.currentViews,
        maxViewers: api.stats.maxViewers,
        newChatters: api.stats.newChatters,
        game: api.stats.currentGame,
        status: api.stats.currentTitle,
        currentHosts: api.stats.currentHosts,
        currentWatched: api.stats.currentWatchedTime,
      },
      sender,
      param: param,
      _current: opts._current,
      user: async (username) => {
        const _user = await getRepository(User).findOne({ username });
        const userObj = {
          username,
          id: await users.getIdByName(username),
          is: {
            online: _user?.isOnline ?? false,
            follower: get(_user, 'is.follower', false),
            vip: get(_user, 'is.vip', false),
            subscriber: get(_user, 'is.subscriber', false),
            mod: await isModerator(username),
          },
        };
        return userObj;
      },
      ...customVariables,
    };
    return (safeEval(toEval, context));
  }

  async isVariableSet (variableName) {
    return await getRepository(Variable).findOne({ variableName });
  }

  async isVariableSetById (id) {
    return await getRepository(Variable).findOne({ id });
  }

  async getValueOf (variableName, opts?: any) {
    if (!variableName.startsWith('$_')) {
      variableName = `$_${variableName}`;
    };
    const item = await getRepository(Variable).findOne({ variableName });
    if (!item) {
      return '';
    }; // return empty if variable doesn't exist

    if (item.type === 'eval' && Number(item.runEvery) === 0) {
      item.currentValue = await this.runScript(item.evalValue, {
        _current: item.currentValue,
        ...opts,
      });
      await getRepository(Variable).save(item);
    }

    return item.currentValue;
  }

  /* Sets value of variable with proper checks
   *
   * @return object
   * { updated, isOK }
   */
  async setValueOf (variableName, currentValue, opts) {
    let item = await getRepository(Variable).findOne({ variableName });
    let isOk = true;
    let isEval = false;
    let oldValue = '';

    opts.sender = isNil(opts.sender) ? null : opts.sender;
    opts.readOnlyBypass = isNil(opts.readOnlyBypass) ? false : opts.readOnlyBypass;
    // add simple text variable, if not existing
    if (!item) {
      item = new Variable();
      item.variableName = variableName;
      item.currentValue = String(currentValue);
      item.responseType = 0;
      item.evalValue = '';
      item.usableOptions = [];
      item.type = 'text';
      item.permission = permission.MODERATORS;
    } else {
      // set item permission to owner if missing
      item.permission = typeof item.permission === 'undefined' ? permission.CASTERS : item.permission;
      if (typeof opts.sender === 'string') {
        opts.sender = {
          username: opts.sender,
          userId: await users.getIdByName(opts.sender),
        };
      }

      if (opts.sender) {
        if (typeof getfromViewersCache(opts.sender.userId, item.permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, item.permission, (await permissions.check(opts.sender.userId, item.permission, false)).access);
        }
      }
      const permissionsAreValid = isNil(opts.sender) || getfromViewersCache(opts.sender.userId, item.permission);
      if ((item.readOnly && !opts.readOnlyBypass) || !permissionsAreValid) {
        isOk = false;
      } else {
        oldValue = item.currentValue;
        if (item.type === 'number') {
          if (['+', '-'].includes(currentValue)) {
            if (currentValue === '+') {
              item.currentValue = String(Number(item.currentValue) + 1);
            } else {
              item.currentValue = String(Number(item.currentValue) - 1);
            }
            isOk = true;
          } else {
            const isNumber = isFinite(Number(currentValue));
            isOk = isNumber;
            item.currentValue = isNumber ? currentValue : item.currentValue;
          }
        } else if (item.type === 'options') {
          // check if is in usableOptions
          const isUsableOption = item.usableOptions.map((o) => o.trim()).includes(currentValue);
          isOk = isUsableOption;
          item.currentValue = isUsableOption ? currentValue : item.currentValue;
        } else if (item.type === 'eval') {
          opts.param = currentValue;
          item.currentValue = await this.getValueOf(variableName, opts);
          isEval = true;
        } else if (item.type === 'text') {
          item.currentValue = String(item.currentValue);
          isOk = true;
        }
      }
    }
    // do update only on non-eval variables
    if (item.type !== 'eval' && isOk) {
      item = await getRepository(Variable).save(item);
    };

    const setValue = item.currentValue;
    if (isOk) {
      this.updateWidgetAndTitle(variableName);
      if (!isEval) {
        this.addChangeToHistory({ sender: opts.sender, item, oldValue });
        item.currentValue = ''; // be silent if parsed correctly
      }
    }
    return { updated: item, setValue, isOk, isEval };
  }

  async addChangeToHistory(opts) {
    const variable = await getRepository(Variable).findOne({
      relations: ['history'],
      where: { id: opts.item.id },
    });
    if (variable) {
      const history = new VariableHistory();
      history.username = opts.sender?.username ?? 'n/a';
      history.userId = opts.sender?.userId ?? 0;
      history.oldValue = opts.oldValue;
      history.currentValue = opts.item.currentValue;
      history.changedAt = Date.now();
      variable.history.push(history);
      await getRepository(Variable).save(variable);
    }
  }

  async checkIfCacheOrRefresh () {
    if (!isDbConnected) {
      return setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
    }

    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await getRepository(Variable).find({ type: 'eval' });

    for (const item of items) {
      try {
        item.runAt = isNil(item.runAt) ? 0 : item.runAt;
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery;
        if (shouldRun) {
          const newValue = await this.runScript(item.evalValue, { _current: item.currentValue });
          item.runAt = Date.now();
          item.currentValue = newValue;
          await getRepository(Variable).save(item);
          await this.updateWidgetAndTitle(item.variableName);
        }
      } catch (e) {} // silence errors
    }
    this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`] = setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
  }

  async updateWidgetAndTitle (variable: string | null = null) {
    if (custom_variables.socket) {
      custom_variables.socket.emit('refresh');
    }; // send update to widget

    if (isNil(variable)) {
      const regexp = new RegExp(`\\${variable}`, 'ig');

      if (api.rawStatus.match(regexp)) {
        api.setTitleAndGame(null, null);
      }
    }
  }
}

export default new CustomVariables();
