

import safeEval from 'safe-eval';
import axios from 'axios';
import mathjs from 'mathjs';
import _ from 'lodash';
import { filter, get, isNil, map, sample } from 'lodash';

import Message from './message';
import { permission } from './permissions';
import { getAllOnlineUsernames } from './helpers/getAllOnlineUsernames';
import { getOwnerAsSender, getTime, isModerator, prepare, sendMessage } from './commons';

import { getRepository } from 'typeorm';
import { User } from './entity/user';
import { Variable } from './entity/variable';

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
      const variable = (await global.db.engine.find('custom.variables'))
        .find(variable => {
          return get(variable, 'urls', []).find(url => url.id === req.params.id);
        });
      if (variable) {
        if (get(variable.urls.find(url => url.id === req.params.id), 'access.GET', false)) {
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
      const variable = (await global.db.engine.find('custom.variables'))
        .find(variable => {
          return get(variable, 'urls', []).find(url => url.id === req.params.id);
        });
      if (variable) {
        if (get(variable.urls.find(url => url.id === req.params.id), 'access.POST', false)) {
          const value = await this.setValueOf(variable.variableName, req.body.value, {});

          if (value.isOk) {
            if (get(variable.urls.find(url => url.id === req.params.id), 'showResponse', false)) {
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

    if (isNil(global.panel)) {
      this.timeouts[`${this.constructor.name}.addMenuAndListenersToPanel`] = setTimeout(() => this.addMenuAndListenersToPanel(), 1000);
    } else {
      global.panel.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables/list' });
      this.sockets();
    }
  }

  sockets () {
    const io = global.panel.io.of('/registry/customVariables');

    io.on('connection', (socket) => {
      socket.on('list.variables', async (cb) => {
        const variables = await global.db.engine.find('custom.variables');
        cb(null, variables);
      });
      socket.on('run.script', async (id, cb) => {
        let item;
        try {
          item = await global.db.engine.findOne('custom.variables', { id });
          item = await global.db.engine.update('custom.variables', { id }, { currentValue: await this.runScript(item.evalValue, { _current: item.currentValue }), runAt: Date.now() });
        } catch (e) {
          cb(e.stack, null);
        }
        cb(null, item);
      });
      socket.on('test.script', async (opts, cb) => {
        let returnedValue;
        try {
          returnedValue = await this.runScript(opts.evalValue, { _current: opts.currentValue, sender: { username: 'testuser', userId: '0' }});
        } catch (e) {
          cb(e.stack, null);
        }
        cb(null, returnedValue);
      });
      socket.on('isUnique', async ({ variable, id }, cb) => {
        cb(null, (await global.db.engine.find('custom.variables', { variableName: String(variable) })).filter(o => o.id !== id).length === 0);
      });
      socket.on('delete', async (id, cb) => {
        await global.db.engine.remove('custom.variables', { id });
        await global.db.engine.remove('custom.variables.watch', { variableId: id }); // force unwatch
        this.updateWidgetAndTitle();
        cb();
      });
      socket.on('load', async (id, cb) => {
        const variable = await global.db.engine.findOne('custom.variables', { id });
        const history = await global.db.engine.find('custom.variables.history', { cvarId: id });
        cb({variable, history});
      });
      socket.on('save', async (data, cb) => {
        try {
          if (isNil(data.id)) {
            await global.db.engine.update('custom.variables', { id: data.id }, data);
            this.updateWidgetAndTitle(data.variableName);
            cb(null, data.id);
          } else {
            const item = await global.db.engine.insert('custom.variables', data);
            this.updateWidgetAndTitle(data.variableName);
            cb(null, item.id);
          }
        } catch (e) {
          cb(e.stack, data.id);
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
        userId: await global.users.getIdByName(sender),
      };
    }

    // we need to check +1 variables, as they are part of commentary
    const containUsers = isNil(script.match(/users/g)) && script.match(/users/g).length > 1;
    const containRandom = isNil(script.replace(/Math\.random|_\.random/g, '').match(/random/g));
    const containOnline = isNil(script.match(/online/g));

    let users: User[] = [];
    if (containUsers || containRandom) {
      users = await getRepository(User).find();
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
      viewer: sample(map(users, 'username')),
      follower: sample(map(filter(users, (o) => get(o, 'is.follower', false)), 'username')),
      subscriber: sample(map(filter(users, (o) => get(o, 'is.subscriber', false)), 'username')),
    };

    // get custom variables
    const customVariablesDb = await global.db.engine.find('custom.variables');
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
        uptime: getTime(global.api.isStreamOnline ? global.api.streamStatusChangeSince : null, false),
        currentViewers: global.api.stats.currentViewers,
        currentSubscribers: global.api.stats.currentSubscribers,
        currentBits: global.api.stats.currentBits,
        currentTips: global.api.stats.currentTips,
        currency: global.currency.symbol(global.currency.mainCurrency),
        chatMessages: (global.api.isStreamOnline) ? global.linesParsed - global.api.chatMessagesAtStart : 0,
        currentFollowers: global.api.stats.currentFollowers,
        currentViews: global.api.stats.currentViews,
        maxViewers: global.api.stats.maxViewers,
        newChatters: global.api.stats.newChatters,
        game: global.api.stats.currentGame,
        status: global.api.stats.currentTitle,
        currentHosts: global.api.stats.currentHosts,
        currentWatched: global.api.stats.currentWatchedTime,
      },
      sender,
      param: param,
      _current: opts._current,
      user: async (username) => {
        const _user = await getRepository(User).findOne({ username });
        const userObj = {
          username,
          id: await global.users.getIdByName(username),
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
    let oldValue = null;

    opts.sender = isNil(opts.sender) ? null : opts.sender;
    opts.readOnlyBypass = isNil(opts.readOnlyBypass) ? false : opts.readOnlyBypass;
    // add simple text variable, if not existing
    if (!item) {
      item = new Variable();
      item.variableName = variableName;
      item.currentValue = currentValue;
      item.responseType = 0;
      item.type = 'text';
      item.permission = permission.MODERATORS;
      await getRepository(Variable).save(item);
    } else {
      // set item permission to owner if missing
      item.permission = typeof item.permission === 'undefined' ? permission.CASTERS : item.permission;
      if (typeof opts.sender === 'string') {
        opts.sender = {
          username: opts.sender,
          userId: await global.users.getIdByName(opts.sender),
        };
      }
      const permissionsAreValid = isNil(opts.sender) || (await global.permissions.check(opts.sender.userId, item.permission)).access;
      if ((item.readOnly && !opts.readOnlyBypass) || !permissionsAreValid) {
        isOk = false;
      } else {
        oldValue = item.currentValue;
        if (item.type === 'number') {
          if (['+', '-'].includes(currentValue)) {
            currentValue = mathjs.evaluate(`${item.currentValue} ${currentValue} 1`);
          } else {
            const isNumber = isFinite(Number(currentValue));
            isOk = isNumber;
            currentValue = isNumber ? Number(currentValue) : item.currentValue;
          }
        } else if (item.type === 'options') {
          // check if is in usableOptions
          const isUsableOption = item.usableOptions.map((o) => o.trim()).includes(currentValue);
          isOk = isUsableOption;
          currentValue = isUsableOption ? currentValue : item.currentValue;
        } else if (item.type === 'eval') {
          opts.param = currentValue;
          item.currentValue = await this.getValueOf(variableName, opts);
          isEval = true;
        }
        // do update only on non-eval variables
        if (item.type !== 'eval' && isOk) {
          item = await getRepository(Variable).save(item);
        };
      }
    }

    if (isOk) {
      this.updateWidgetAndTitle(variableName);
      if (!isEval) {
        this.addChangeToHistory({ sender: get(opts, 'sender.username', null), item, oldValue });
        item.currentValue = ''; // be silent if parsed correctly
      }
    }
    return { updated: item, isOk, isEval };
  }

  async addChangeToHistory(opts) {
    await global.db.engine.insert('custom.variables.history', { cvarId: opts.item.id, sender: opts.sender, oldValue: opts.oldValue, currentValue: opts.item.currentValue, timestamp: String(new Date())});
  }

  async checkIfCacheOrRefresh () {
    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await global.db.engine.find('custom.variables', { type: 'eval' });

    for (const item of items) {
      try {
        item.runAt = isNil(item.runAt) ? 0 : item.runAt;
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery;
        if (shouldRun) {
          const newValue = await this.runScript(item.evalValue, { _current: item.currentValue });
          await global.db.engine.update('custom.variables', { id: item.id }, { runAt: Date.now(), currentValue: newValue });
          await this.updateWidgetAndTitle(item.variableName);
        }
      } catch (e) {} // silence errors
    }
    this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`] = setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
  }

  async updateWidgetAndTitle (variable = null) {
    if (global.widgets?.custom_variables.socket) {
      global.widgets?.custom_variables.socket.emit('refresh');
    }; // send update to widget

    if (isNil(variable)) {
      const regexp = new RegExp(`\\${variable}`, 'ig');

      if (global.api.rawStatus.match(regexp)) {
        global.api.setTitleAndGame(null, null);
      }
    }
  }
}

export default CustomVariables;
export { CustomVariables };
