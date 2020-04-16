import safeEval from 'safe-eval';
import axios from 'axios';
import _ from 'lodash';
import { setTimeout } from 'timers';
import { filter, get, isNil, map, sample } from 'lodash';
import strip from 'strip-comments';

import Message from './message';
import { permission } from './helpers/permissions';
import { getAllOnlineUsernames } from './helpers/getAllOnlineUsernames';
import { getOwnerAsSender, getTime, isModerator, prepare, sendMessage } from './commons';

import { getRepository } from 'typeorm';
import { User, UserInterface } from './database/entity/user';
import { Variable, VariableInterface, VariableWatch } from './database/entity/variable';
import { addToViewersCache, getFromViewersCache } from './helpers/permissions';
import users from './users';
import api from './api';
import permissions from './permissions';
import custom_variables from './widgets/customvariables';
import currency from './currency';
import { isDbConnected } from './helpers/database';
import { linesParsed } from './helpers/parser';
import { debug, info, warning } from './helpers/log';
import Core from './_interface';
import { adminEndpoint } from './helpers/socket';

class CustomVariables extends Core {
  timeouts: {
    [x: string]: NodeJS.Timeout;
  } = {};

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables/list' });
    this.checkIfCacheOrRefresh();
  }

  async getURL(req, res) {
    try {
      const variable = (await getRepository(Variable).find({
        relations: ['urls'],
      }))
        .find(v => {
          return v.urls.find(url => url.id === req.params.id);
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
        .find(v => {
          return v.urls.find(url => url.id === req.params.id);
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

  sockets () {
    adminEndpoint(this.nsp, 'customvariables::list', async (cb) => {
      const variables = await getRepository(Variable).find();
      cb(null, variables);
    });
    adminEndpoint(this.nsp, 'customvariables::runScript', async (id, cb) => {
      try {
        const item = await getRepository(Variable).findOne({ id });
        if (!item) {
          throw new Error('Variable not found');
        }
        const newCurrentValue = await this.runScript(item.evalValue, { _current: item.currentValue });
        const runAt = Date.now();
        cb(null, await getRepository(Variable).save({
          ...item, currentValue: newCurrentValue, runAt,
        }));
      } catch (e) {
        cb(e.stack, null);
      };
    });
    adminEndpoint(this.nsp, 'customvariables::testScript', async (opts, cb) => {
      let returnedValue;
      try {
        returnedValue = await this.runScript(opts.evalValue, { _current: opts.currentValue, sender: { username: 'testuser', userId: 0 }});
      } catch (e) {
        cb(e.stack, null);
      }
      cb(null, returnedValue);
    });
    adminEndpoint(this.nsp, 'customvariables::isUnique', async ({ variable, id }, cb) => {
      cb(null, (await getRepository(Variable).find({ variableName: String(variable) })).filter(o => o.id !== id).length === 0);
    });
    adminEndpoint(this.nsp, 'delete', async (id, cb) => {
      const item = await getRepository(Variable).findOne({ id });
      if (item) {
        await getRepository(Variable).remove(item);
        await getRepository(VariableWatch).delete({ variableId: id });
        this.updateWidgetAndTitle();
      }
      cb();
    });
    adminEndpoint(this.nsp, 'load', async (id, cb) => {
      cb(await getRepository(Variable).findOne({
        relations: ['history', 'urls'],
        where: { id },
      }));
    });
    adminEndpoint(this.nsp, 'save', async (item: VariableInterface, cb) => {
      try {
        await getRepository(Variable).save(item);
        this.updateWidgetAndTitle(item.variableName);
        cb(null, item.id);
      } catch (e) {
        cb(e.stack, item.id);
      }
    });
  }

  async runScript (script, opts) {
    debug('customvariables.eval', opts);
    let sender = !isNil(opts.sender) ? opts.sender : null;
    const param = !isNil(opts.param) ? opts.param : null;
    if (typeof sender === 'string') {
      sender = {
        username: sender,
        userId: await users.getIdByName(sender),
      };
    }

    const strippedScript = strip(script);
    // we need to check +1 variables, as they are part of commentary
    const containUsers = strippedScript.match(/users/g) !== null;
    const containRandom = strippedScript.replace(/Math\.random|_\.random/g, '').match(/random/g) !== null;
    const containOnline = strippedScript.match(/online/g) !== null;
    debug('customvariables.eval', { strippedScript, containOnline, containRandom, containUsers});

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
          isOnline: true,
        },
      })).map(o => o.username);
      onlineFollowers = (await getRepository(User).find({
        where: {
          isFollower: true,
          isOnline: true,
        },
      })).map(o => o.username);
    }

    const randomVar = {
      online: {
        viewer: sample(onlineViewers),
        follower: sample(onlineFollowers),
        subscriber: sample(onlineSubscribers),
      },
      viewer: sample(map(usersList, 'username')),
      follower: sample(map(filter(usersList, (o) => get(o, 'isFollower', false)), 'username')),
      subscriber: sample(map(filter(usersList, (o) => get(o, 'isSubscriber', false)), 'username')),
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
      url: async (url, urlOpts) => {
        if (typeof urlOpts === 'undefined') {
          urlOpts = {
            url,
            method: 'GET',
            headers: undefined,
            data: undefined,
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
        chatMessages: (api.isStreamOnline) ? linesParsed - api.chatMessagesAtStart : 0,
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
      info: info,
      warning: warning,
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
            mod: isModerator(username),
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

    let currentValue = item.currentValue;
    if (item.type === 'eval' && Number(item.runEvery) === 0) {
      currentValue = await this.runScript(item.evalValue, {
        _current: item.currentValue,
        ...opts,
      });
      await getRepository(Variable).save({
        ...item, currentValue,
      });
    }

    return currentValue;
  }

  /* Sets value of variable with proper checks
   *
   * @return object
   * { updated, isOK }
   */
  async setValueOf (variable: string | Readonly<VariableInterface>, currentValue, opts) {
    const item = typeof variable === 'string'
      ? await getRepository(Variable).findOne({ variableName: variable })
      : { ...variable };
    let isOk = true;
    let isEval = false;
    const itemOldValue = item?.currentValue;
    let itemCurrentValue = item?.currentValue;

    opts.sender = isNil(opts.sender) ? null : opts.sender;
    opts.readOnlyBypass = isNil(opts.readOnlyBypass) ? false : opts.readOnlyBypass;
    // add simple text variable, if not existing
    if (!item) {
      const newItem: VariableInterface = {
        variableName: variable as string,
        currentValue: String(currentValue),
        responseType: 0,
        evalValue: '',
        description: '',
        responseText: '',
        usableOptions: [],
        type: 'text',
        permission: permission.MODERATORS,
      };
      return this.setValueOf(newItem, currentValue, opts);
    } else {
      if (typeof item.permission === 'undefined') {
        // set item permission to owner if missing
        return this.setValueOf({
          permission: permission.CASTERS,
          ...item,
        }, currentValue, opts);
      }

      if (typeof opts.sender === 'string') {
        opts.sender = {
          username: opts.sender,
          userId: await users.getIdByName(opts.sender),
        };
      }

      if (opts.sender) {
        if (typeof getFromViewersCache(opts.sender.userId, item.permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, item.permission, (await permissions.check(opts.sender.userId, item.permission, false)).access);
        }
      }
      const permissionsAreValid = isNil(opts.sender) || getFromViewersCache(opts.sender.userId, item.permission);
      if ((item.readOnly && !opts.readOnlyBypass) || !permissionsAreValid) {
        isOk = false;
      } else {
        if (item.type === 'number') {
          const match = /(?<sign>[+\-])([ ]*)?(?<number>\d*)?/g.exec(currentValue);
          if (match && match.groups) {
            const number = Number((match.groups.number || 1));
            if (match.groups.sign === '+') {
              itemCurrentValue = String(Number(itemCurrentValue) + number);
            } else if (match.groups.sign === '-') {
              itemCurrentValue = String(Number(itemCurrentValue) - number);
            }
          } else {
            const isNumber = isFinite(Number(currentValue));
            isOk = isNumber;
            // we need to retype to get rid of +/-
            itemCurrentValue = isNumber ? String(Number(currentValue)) : String(Number(itemCurrentValue));
          }
        } else if (item.type === 'options') {
          // check if is in usableOptions
          const isUsableOption = item.usableOptions.map((o) => o.trim()).includes(currentValue);
          isOk = isUsableOption;
          itemCurrentValue = isUsableOption ? currentValue : itemCurrentValue;
        } else if (item.type === 'eval') {
          opts.param = currentValue;
          itemCurrentValue = await this.getValueOf(item.variableName, opts);
          isEval = true;
        } else if (item.type === 'text') {
          itemCurrentValue = String(itemCurrentValue);
          isOk = true;
        }
      }
    }

    // do update only on non-eval variables
    if (item.type !== 'eval' && isOk) {
      await getRepository(Variable).save({
        ...item,
        currentValue: itemCurrentValue,
      });
    };

    const setValue = itemCurrentValue;
    if (isOk) {
      this.updateWidgetAndTitle(item.variableName);
      if (!isEval) {
        this.addChangeToHistory({ sender: opts.sender, item, oldValue: itemOldValue });
      }
    }
    return { updated: {
      ...item,
      currentValue: isOk && !isEval ? '' : setValue, // be silent if parsed correctly eval
    }, setValue, isOk, isEval };
  }

  async addChangeToHistory(opts: { sender: any; item: VariableInterface; oldValue: any }) {
    const variable = await getRepository(Variable).findOne({
      relations: ['history'],
      where: { id: opts.item.id },
    });
    if (variable) {
      variable.history.push({
        username: opts.sender?.username ?? 'n/a',
        userId: opts.sender?.userId ?? 0,
        oldValue: opts.oldValue,
        currentValue: opts.item.currentValue,
        changedAt: Date.now(),
      });
      await getRepository(Variable).save(variable);
    }
  }

  async checkIfCacheOrRefresh () {
    if (!isDbConnected) {
      return setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
    }

    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await getRepository(Variable).find({ type: 'eval' });

    for (const item of items as Required<VariableInterface>[]) {
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
