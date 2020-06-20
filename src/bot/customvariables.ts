import safeEval from 'safe-eval';
import axios from 'axios';
import _ from 'lodash';
import { setTimeout } from 'timers';
import { filter, get, isNil, map, sample } from 'lodash';
import strip from 'strip-comments';
import { js as jsBeautify } from 'js-beautify';

import Message from './message';
import { permission } from './helpers/permissions';
import { getAllOnlineUsernames } from './helpers/getAllOnlineUsernames';
import { announce, getBot, getTime, isModerator, prepare } from './commons';

import { getRepository, IsNull } from 'typeorm';
import { User, UserInterface } from './database/entity/user';
import { Variable, VariableHistory, VariableInterface, VariableURL, VariableWatch } from './database/entity/variable';
import { addToViewersCache, getFromViewersCache } from './helpers/permissions';
import users from './users';
import api from './api';
import permissions from './permissions';
import custom_variables from './widgets/customvariables';
import currency from './currency';
import { isDbConnected } from './helpers/database';
import { linesParsed } from './helpers/parser';
import { debug, error, info, warning } from './helpers/log';
import Core from './_interface';
import { adminEndpoint } from './helpers/socket';

const customVariableRegex = new RegExp('\\$_[a-zA-Z0-9_]+', 'g');

class CustomVariables extends Core {
  timeouts: {
    [x: string]: NodeJS.Timeout;
  } = {};

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables/list', this: null });
    this.checkIfCacheOrRefresh();
  }

  async getAll() {
    return (await getRepository(Variable).find()).reduce((prev: { [x: string]: any }, cur) => {
      return { ...prev, [cur.variableName]: cur.currentValue };
    }, {});
  }

  async executeVariablesInText(text: string, attr: { sender: { userId: number; username: string; source: 'twitch' | 'discord' }} | null): Promise<string> {
    for (const variable of text.match(customVariableRegex) || []) {
      const isVariable = await this.isVariableSet(variable);
      let value = '';
      if (isVariable) {
        value = await this.getValueOf(variable, attr) || '';
      }
      text = text.replace(new RegExp(`\\${variable}`, 'g'), value);
    }
    return text;
  }

  async getURL(req: any, res: any) {
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

  async postURL(req: any, res: any) {
    try {
      const variable = (await getRepository(Variable).find({
        relations: ['urls'],
      }))
        .find(v => {
          return v.urls.find(url => url.id === req.params.id);
        });
      if (variable) {
        if (variable.urls.find(url => url.id === req.params.id)?.POST) {
          const value = await this.setValueOf(variable, req.body.value, { sender: null, readOnlyBypass: true });
          if (value.isOk) {
            if (variable.urls.find(url => url.id === req.params.id)?.showResponse) {
              if (value.updated.responseType === 0) {
                announce(prepare('filters.setVariable', { value: value.updated.currentValue, variable: variable }));
              } else if (value.updated.responseType === 1) {
                if (value.updated.responseText) {
                  announce(value.updated.responseText.replace('$value', value.updated.currentValue));
                }
              }
            }
            return res.status(200).send({ oldValue: variable.currentValue, value: value.setValue });
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
        const item = await getRepository(Variable).findOne({ id: String(id) });
        if (!item) {
          throw new Error('Variable not found');
        }
        const newCurrentValue = await this.runScript(item.evalValue, { sender: null, _current: item.currentValue, isUI: true });
        const runAt = Date.now();
        cb(null, await getRepository(Variable).save({
          ...item, currentValue: newCurrentValue, runAt,
        }));
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'customvariables::testScript', async (opts, cb) => {
      let returnedValue;
      try {
        returnedValue = await this.runScript(opts.evalValue, { isUI: true, _current: opts.currentValue, sender: { username: 'testuser', userId: 0, source: 'twitch' }});
      } catch (e) {
        cb(e.stack, null);
      }
      cb(null, returnedValue);
    });
    adminEndpoint(this.nsp, 'customvariables::isUnique', async ({ variable, id }, cb) => {
      cb(null, (await getRepository(Variable).find({ variableName: String(variable) })).filter(o => o.id !== id).length === 0);
    });
    adminEndpoint(this.nsp, 'customvariables::delete', async (id, cb) => {
      const item = await getRepository(Variable).findOne({ id: String(id) });
      if (item) {
        await getRepository(Variable).remove(item);
        await getRepository(VariableWatch).delete({ variableId: String(id) });
        this.updateWidgetAndTitle();
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      cb(null, await getRepository(Variable).findOne({
        relations: ['history', 'urls'],
        where: { id },
      }));
    });
    adminEndpoint(this.nsp, 'customvariables::save', async (item, cb) => {
      try {
        await getRepository(Variable).save(item);
        // somehow this is not populated by save on sqlite
        if (item.urls) {
          for (const url of item.urls) {
            await getRepository(VariableURL).save({
              ...url,
              variable: item,
            });
          }
        }
        // somehow this is not populated by save on sqlite
        if (item.history) {
          for (const history of item.history) {
            await getRepository(VariableHistory).save({
              ...history,
              variable: item,
            });
          }
        }
        await getRepository(VariableHistory).delete({ variableId: IsNull() });
        await getRepository(VariableURL).delete({ variableId: IsNull() });

        this.updateWidgetAndTitle(item.variableName);
        cb(null, item.id);
      } catch (e) {
        cb(e.stack, item.id);
      }
    });
  }

  async runScript (script: string, opts: { sender: { userId: number; username: string; source: 'twitch' | 'discord' } | string | null, isUI: boolean; param?: string | number, _current: any }) {
    debug('customvariables.eval', opts);
    let sender = !isNil(opts.sender) ? opts.sender : null;
    const isUI = !isNil(opts.isUI) ? opts.isUI : false;
    const param = !isNil(opts.param) ? opts.param : null;
    if (typeof sender === 'string') {
      sender = {
        username: sender,
        userId: await users.getIdByName(sender),
        source: 'twitch',
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
    const customVariables = await this.getAll();

    // update globals and replace theirs values
    script = (await new Message(script).global({ escape: '\'' }));

    const context = {
      url: async (url: string, urlOpts?: { url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', headers: undefined, data: undefined }) => {
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
      user: async (username: string) => {
        const _user = await getRepository(User).findOne({ username });
        if (_user) {
          const userObj = {
            username,
            id: await users.getIdByName(username),
            is: {
              online: _user.isOnline ?? false,
              follower: get(_user, 'is.follower', false),
              vip: get(_user, 'is.vip', false),
              subscriber: get(_user, 'is.subscriber', false),
              mod: isModerator(_user),
            },
          };
          return userObj;
        } else {
          return null;
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

  async isVariableSet (variableName: string) {
    return getRepository(Variable).findOne({ variableName });
  }

  async isVariableSetById (id: string) {
    return getRepository(Variable).findOne({ id });
  }

  async getValueOf (variableName: string, opts?: any) {
    if (!variableName.startsWith('$_')) {
      variableName = `$_${variableName}`;
    }
    const item = await getRepository(Variable).findOne({ variableName });
    if (!item) {
      return '';
    } // return empty if variable doesn't exist

    let currentValue = item.currentValue;
    if (item.type === 'eval' && item.runEveryType === 'isUsed' ) {
      // recheck permission as this may go outside of setValueOf
      if (opts.sender) {
        if (typeof getFromViewersCache(opts.sender.userId, item.permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, item.permission, (await permissions.check(opts.sender.userId, item.permission, false)).access);
        }
      }
      const permissionsAreValid = isNil(opts.sender) || getFromViewersCache(opts.sender.userId, item.permission);
      if (permissionsAreValid) {
        currentValue = await this.runScript(item.evalValue, {
          _current: item.currentValue,
          ...opts,
        });
        await getRepository(Variable).save({
          ...item, currentValue,
        });
      }
    }

    return currentValue;
  }

  async setValueOf (variable: string | Readonly<VariableInterface>, currentValue: any, opts: any): Promise<{ updated: Readonly<VariableInterface>; isOk: boolean; setValue: string; isEval: boolean }> {
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
          itemCurrentValue = String(currentValue);
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
    }

    const setValue = itemCurrentValue ?? '';
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
        variableId: variable.id,
      });
      await getRepository(Variable).save(variable);
    }
  }

  async checkIfCacheOrRefresh () {
    if (!isDbConnected) {
      setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
      return;
    }

    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await getRepository(Variable).find({ type: 'eval' });

    for (const item of items as Required<VariableInterface>[]) {
      try {
        item.runAt = isNil(item.runAt) ? 0 : item.runAt;
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery;
        if (shouldRun) {
          const newValue = await this.runScript(item.evalValue, { _current: item.currentValue, sender: getBot(), isUI: false });
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
    } // send update to widget

    if (isNil(variable)) {
      const regexp = new RegExp(`\\${variable}`, 'ig');

      if (api.rawStatus.match(regexp)) {
        api.setTitleAndGame({});
      }
    }
  }
}

export default new CustomVariables();
