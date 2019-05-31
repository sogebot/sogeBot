import chalk from 'chalk';
import _ from 'lodash';
import { setTimeout } from 'timers'; // tslint workaround
import util from 'util';
import { isMainThread } from 'worker_threads';

import { debug } from './debug';
import { permission } from './permissions';

class Module {
  public name: string = 'core';
  public collection: { [x: string]: string };
  public timeouts: { [x: string]: NodeJS.Timeout } = {};
  public settingsList: Array<{ category: string, key: string }> = [];

  get enabled(): boolean {
    return _.get(this, '_enabled', true);
  }

  set enabled(v: boolean) {
    if (!_.isEqual(_.get(this, '_enabled', true), v)) {
      _.set(this, '_enabled', v);
      // update variable in all workers (only RAM)
      const proc = {
        type: 'interface',
        system: this.name,
        class: this.constructor.name.toLowerCase(),
        path: '_enabled',
        value: v,
      };
      global.workers.sendToAll(proc);
    }
  }

  protected _name: string;
  protected _ui: InterfaceSettings.UI;
  protected _commands: Command[];
  protected _parsers: Parser[];
  protected _rollback: Array<{ name: string }>;
  protected _enabled: boolean = true;
  protected on: InterfaceSettings.On;
  protected dependsOn: string[];
  protected socket: SocketIO.Socket | null;

  constructor(name: string = 'core') {
    this.on = {
      change: {
        enabled: [],
      },
      load: {},
    };

    // TODO: dependsOn
    this.dependsOn = [];
    this.socket = null;

    this._commands = [];
    this._parsers = [];
    this._rollback = [];
    this._ui = {};
    this._name = name;

    this.collection = new Proxy({}, {
      get: (t, n, r) => {
        if (_.isSymbol(n)) { return undefined; }
        let collection = '';
        if (n === 'data') {
          collection = `${this._name}.${this.constructor.name.toLowerCase()}`;
        } else if (n === 'settings') {
          collection = `${this._name}.settings`;
        } else {
          collection = `${this._name}.${this.constructor.name.toLowerCase()}.${String(n)}`;
        }
        return collection;
      },
    });

    // prepare proxies for variables
    this._sockets();
    this._indexDbs();
    this._status();
  }

  public sockets() {
    return;
  }

  public _status() {
    this.status({ state: this.enabled, quiet: !isMainThread }); // force status change and quiet on workers
  }

  public emit(event: string, ...args: any[]) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  public async loadVariableValue(key) {
    const variable = await global.db.engine.findOne(this.collection.settings, { system: this.constructor.name.toLowerCase(), key });

    if (typeof this.on !== 'undefined' && typeof this.on.load !== 'undefined') {
      if (this.on.load[key]) {
        for (const fnc of this.on.load[key]) {
          if (typeof this[fnc] === 'function') { this[fnc](key, _.get(this, key)); } else { global.log.error(`${fnc}() is not function in ${this._name}/${this.constructor.name.toLowerCase()}`); }
        }
      }
    }

    return variable.value;
  }

  public updateSettings(key, value) {
    debug('interface.update', `Updating ${key} = ${util.inspect(value)}, ${isMainThread}`);
    if (Array.isArray(value)) {
      value = [...value]; // we need to retype otherwise we have worker clone error
    }
    const proc = {
      type: 'interface',
      system: this._name,
      class: this.constructor.name,
      path: `_data.${key}`,
      value,
    };

    if (isMainThread) {
      global.db.engine.update(this.collection.settings, { system: this.constructor.name.toLowerCase(), key }, { value });
      // send to all threads
      global.workers.sendToAllWorkers(proc);

      if (typeof this.on !== 'undefined'
          && typeof this.on.change !== 'undefined'
          && this.on.change[key]) {
        // run on.change functions only on master
        for (const fnc of this.on.change[key]) {
          if (typeof this[fnc] === 'function') {
            this[fnc](key, value);
          } else {
            global.log.error(`${fnc}() is not function in ${this._name}/${this.constructor.name.toLowerCase()}`);
          }
        }
      }
    } else {
      // send to master to update
      global.workers.sendToMaster(proc);
    }

    // manually update commands as they are not part of settings anymore
    if (proc.path.startsWith('settings.commands.')) {
      const c = this._commands.find((o) => o.name === key.replace('commands.', ''));
      if (c) {
        c.command = value;
        if (c.command === c.name && isMainThread) { // remove if default value
          global.db.engine.remove(this.collection.settings, { system: this.constructor.name.toLowerCase(), key });
        }
      }
    }
  }

  public prepareCommand(opts: string | Command) {
    let key = opts;
    let pUuid = permission.VIEWERS;
    let fnc;
    let isHelper = false;

    if (typeof key === 'object') {
      pUuid = key.permission || permission.VIEWERS;
      fnc = key.fnc || fnc;
      isHelper = key.isHelper || false;
    }
    key = typeof key === 'object' ? key.name : key;
    return {
      name: key,
      permission: pUuid,
      fnc,
      isHelper,
    };
  }

  public async _indexDbs() {
    if (isMainThread) {
      clearTimeout(this.timeouts[`${this.constructor.name}._indexDbs`]);
      if (!global.db.engine.connected) {
        this.timeouts[`${this.constructor.name}._indexDbs`] = setTimeout(() => this._indexDbs(), 1000);
      } else {
        // add indexing to settings
        global.db.engine.index(this.collection.settings, [{ index: 'key' }]);
      }
    }
  }

  public _sockets() {
    if (!isMainThread) { return; }

    clearTimeout(this.timeouts[`${this.constructor.name}.sockets`]);
    if (_.isNil(global.panel)) {
      this.timeouts[`${this.constructor.name}._sockets`] = setTimeout(() => this._sockets(), 1000);
    } else {
      this.socket = global.panel.io.of('/' + this._name + '/' + this.constructor.name.toLowerCase());
      this.sockets();
      this.sockets = function() {
        global.log.error('/' + this._name + '/' + this.constructor.name.toLowerCase() + ': Cannot initialize sockets second time');
      };

      if (this.socket) {
        // default socket listeners
        this.socket.on('connection', (socket) => {
          socket.on('settings', async (cb) => {
            cb(null, await this.getAllSettings(), await this.getUI());
          });
          socket.on('set.value', async (variable, value, cb) => {
            this[variable] = value;
            if (typeof cb === 'function') { cb(null, {variable, value}); }
          });
          socket.on('get.value', async (variable, cb) => {
            cb(null, await this[variable]);
          });
          socket.on('settings.update', async (data: { [x: string]: { [y: string]: any } }, cb) => {
            /*
            try {
              for (const [key, value] of Object.entries(data)) {
                if (key === 'enabled' && ['core', 'overlays', 'widgets'].includes(this._name)) {
                  continue;
                } else if (key === '_permissions') {
                  for (const [command, currentValue] of Object.entries(value)) {
                    const c = this._commands.find((o) => o.name === command);
                    if (c) {
                      if (currentValue === c.permission) {
                        await global.db.engine.remove(global.permissions.collection.commands, { key: c.name });
                      } else {
                        await global.db.engine.update(global.permissions.collection.commands, { key: c.name }, { permission: currentValue });
                      }
                    }
                  }
                } else if (key === 'enabled') {
                  this.status({ state: value });
                } else if (key === 'commands') {
                  /* TODO: commands
                  for (const [defaultValue, currentValue] of Object.entries(value)) {
                    if (this.settings.commands) {
                      this.settings.commands[defaultValue] = currentValue;
                    }
                  }
                   *
                } else {
                  if (_.isObjectLike(value)) {
                    for (const [defaultValue, currentValue] of Object.entries(value)) {
                      if (typeof this[key] !== 'undefined' && typeof this[key][defaultValue] !== 'undefined') {
                        // save only defined values
                        this[key][defaultValue] = currentValue;
                      }
                    }
                  } else { this[key] = value; }
                }
              }
            } catch (e) {
              global.log.error(e.stack);
              if (typeof cb === 'function') {
                setTimeout(() => cb(e.stack), 1000);
              }
            }

            if (typeof cb === 'function') {
              setTimeout(() => cb(null), 1000);
            }
            */
          });
          // difference between set and update is that set will set exact 1:1 values of opts.items
          // so it will also DELETE additional data
          socket.on('set', async (opts, cb) => {
            opts.collection = opts.collection || 'data';
            opts.items = opts.items || [];
            if (opts.collection.startsWith('_')) {
              opts.collection = opts.collection.replace('_', '');
            } else {
              if (opts.collection === 'settings') {
                opts.collection = this.collection.settings;
                opts.where = {
                  system: this.constructor.name.toLowerCase(),
                  ...opts.where,
                };
              } else {
                opts.collection = this.collection[opts.collection];
              }
            }

            // get all items by where
            if (opts.where === null || typeof opts.where === 'undefined') {
              return cb(new Error('Where cannot be empty!'));
            }

            // remove all data
            await global.db.engine.remove(opts.collection, opts.where);
            for (const item of opts.items) {
              delete item._id;
              await global.db.engine.insert(opts.collection, item);
            }
            cb(null, true);
          });
          socket.on('update', async (opts, cb) => {
            opts.collection = opts.collection || 'data';
            if (opts.collection.startsWith('_')) {
              opts.collection = opts.collection.replace('_', '');
            } else {
              if (opts.collection === 'settings') {
                opts.collection = this.collection.settings;
                opts.where = {
                  system: this.constructor.name.toLowerCase(),
                  ...opts.where,
                };
              } else {
                opts.collection = this.collection[opts.collection];
              }
            }

            if (opts.items) {
              for (const item of opts.items) {
                let itemFromDb = Object.assign({}, item);
                const _id = item._id; delete item._id;
                if (_.isNil(_id) && _.isNil(opts.key)) { itemFromDb = await global.db.engine.insert(opts.collection, item); } else if (_id) { await global.db.engine.update(opts.collection, { _id }, item); } else { await global.db.engine.update(opts.collection, { [opts.key]: item[opts.key] }, item); }
                if (_.isFunction(cb)) { cb(null, Object.assign({ _id }, itemFromDb)); }
              }
            } else {
              if (_.isFunction(cb)) { cb(null, []); }
            }
          });
          socket.on('insert', async (opts, cb) => {
            opts.collection = opts.collection || 'data';
            if (opts.collection.startsWith('_')) {
              opts.collection = opts.collection.replace('_', '');
            } else {
              if (opts.collection === 'settings') {
                throw Error('You cannot use insert socket with settings collection');
              } else {
                opts.collection = this.collection[opts.collection];
              }
            }

            if (opts.items) {
              const created: any[] = [];
              for (const item of opts.items) {
                created.push(await global.db.engine.insert(opts.collection, item));
              }
              if (_.isFunction(cb)) { cb(null, created); }
            } else {
              if (_.isFunction(cb)) { cb(null, []); }
            }
          });
          socket.on('delete', async (opts, cb) => {
            opts.collection = opts.collection || 'data';
            if (opts.collection.startsWith('_')) {
              opts.collection = opts.collection.replace('_', '');
            } else {
              if (opts.collection === 'settings') {
                opts.collection = this.collection.settings;
                opts.where = {
                  system: this.constructor.name.toLowerCase(),
                  ...opts.where,
                };
              } else {
                opts.collection = this.collection[opts.collection];
              }
            }

            if (opts._id) {
              await global.db.engine.remove(opts.collection, { _id: opts._id });
            } else if (opts.where) {
              await global.db.engine.remove(opts.collection, opts.where);
            }

            if (_.isFunction(cb)) { cb(null); }
          });
          socket.on('find', async (opts, cb) => {
            opts.collection = opts.collection || 'data';
            opts.omit = opts.omit || [];
            if (opts.collection.startsWith('_')) {
              opts.collection = opts.collection.replace('_', '');
            } else {
              if (opts.collection === 'settings') {
                opts.collection = this.collection.settings;
                opts.where = {
                  system: this.constructor.name.toLowerCase(),
                  ...opts.where,
                };
              } else {
                opts.collection = this.collection[opts.collection];
              }
            }

            opts.where = opts.where || {};
            if (_.isFunction(cb)) {
              let items = await global.db.engine.find(opts.collection, opts.where);
              if (opts.omit.length > 0) {
                items = items.map((o) => {
                  for (const omit of opts.omit) { delete o[omit]; }
                  return o;
                });
              }
              cb(null, items);
            }
          });
          socket.on('findOne', async (opts, cb) => {
            opts.collection = opts.collection || 'data';
            opts.omit = opts.omit || [];
            if (opts.collection.startsWith('_')) {
              opts.collection = opts.collection.replace('_', '');
            } else {
              if (opts.collection === 'settings') {
                opts.collection = this.collection.settings;
                opts.where = {
                  system: this.constructor.name.toLowerCase(),
                  ...opts.where,
                };
              } else {
                opts.collection = this.collection[opts.collection];
              }
            }

            opts.where = opts.where || {};
            if (_.isFunction(cb)) {
              let items = await global.db.engine.findOne(opts.collection, opts.where);
              if (opts.omit.length > 0) {
                items = items.map((o) => {
                  for (const omit of opts.omit) { delete o[omit]; }
                  return o;
                });
              }
              cb(null, items);
            }
          });
        });
      }
    }
  }

  public async _dependenciesEnabled() {
    return new Promise((resolve) => {
      const check = async (retry) => {
        const status: any[] = [];
        for (const dependency of this.dependsOn) {
          const dependencyPointer = _.get(global, dependency, null);
          if (!dependencyPointer || !_.isFunction(dependencyPointer.status)) {
            if (retry > 0) { setTimeout(() => check(--retry), 10); } else { throw new Error(`[${this.constructor.name}] Dependency error - possibly wrong path`); }
            return;
          } else {
            status.push(await dependencyPointer.status({ quiet: true }));
          }
        }
        resolve(status.length === 0 || _.every(status));
      };
      check(1000);
    });
  }

  public async status(opts) {
    opts = opts || {};
    if (['core', 'overlays', 'widgets'].includes(this._name)) { return true; }

    const areDependenciesEnabled = await this._dependenciesEnabled();
    const isMasterAndStatusOnly = isMainThread && _.isNil(opts.state);
    const isStatusChanged = !_.isNil(opts.state);
    const isDisabledByEnv = !_.isNil(process.env.DISABLE) &&
      (process.env.DISABLE.toLowerCase().split(',').includes(this.constructor.name.toLowerCase()) || process.env.DISABLE === '*');

    if (isStatusChanged) { this.enabled = opts.state; } else { opts.state = this.enabled; }

    if (!areDependenciesEnabled || isDisabledByEnv) { opts.state = false; } // force disable if dependencies are disabled or disabled by env

    // on.change handler on enabled
    if (isMainThread && isStatusChanged) {
      if (this.on && this.on.change && this.on.change.enabled) {
        // run on.change functions only on master
        for (const fnc of this.on.change.enabled) {
          if (typeof this[fnc] === 'function') { this[fnc]('enabled', opts.state); } else { global.log.error(`${fnc}() is not function in ${this._name}/${this.constructor.name.toLowerCase()}`); }
        }
      }
    }

    if ((isMasterAndStatusOnly || isStatusChanged) && !opts.quiet) {
      if (isDisabledByEnv) { global.log.info(`${chalk.red('DISABLED BY ENV')}: ${this.constructor.name} (${this._name})`); } else if (areDependenciesEnabled) { global.log.info(`${opts.state ? chalk.green('ENABLED') : chalk.red('DISABLED')}: ${this.constructor.name} (${this._name})`); } else { global.log.info(`${chalk.red('DISABLED BY DEP')}: ${this.constructor.name} (${this._name})`); }
    }

    return opts.state;
  }

  public addMenu(opts) {
    if (isMainThread) {
      clearTimeout(this.timeouts[`${this.constructor.name}.${opts.id}.addMenu`]);

      if (_.isNil(global.panel)) {
        this.timeouts[`${this.constructor.name}.${opts.id}.addMenu`] = setTimeout(() => this.addMenu(opts), 1000);
      } else {
        global.panel.addMenu(opts);
      }
    }
  }

  public addWidget(...opts) {
    if (isMainThread) {
      clearTimeout(this.timeouts[`${this.constructor.name}.${opts[0]}.addWidget`]);

      if (_.isNil(global.panel)) {
        this.timeouts[`${this.constructor.name}.${opts[0]}.addWidget`] = setTimeout(() => this.addWidget(opts), 1000);
      } else {
        global.panel.addWidget(opts[0], opts[1], opts[2]);
      }
    }
  }

  public async getAllSettings() {
    const promisedSettings: {
      [x: string]: any;
    } = {};

    // go through expected settings
    for (const { category, key } of this.settingsList) {
      if (category) {
        promisedSettings[category] = {};

        if (category === 'commands') {
          _.set(promisedSettings, `${category}.${key}`, this.getCommand(key));
        } else {
          _.set(promisedSettings, `${category}.${key}`, this[key]);
        }
      } else {
        _.set(promisedSettings, key, this[key]);
      }
    }

    // add command permissions
    if (this._commands.length > 0) {
      promisedSettings._permissions = {};
      for (const command of this._commands) {
        const key = typeof command === 'string' ? command : command.name;
        const pItem = await global.db.engine.findOne(global.permissions.collection.commands, { key });
        if (!_.isEmpty(pItem)) {
          promisedSettings._permissions[key] = pItem.permission;
        } else {
          promisedSettings._permissions[key] = command.permission;
        }
      }
    }

    return promisedSettings;
  }

  public async parsers() {
    if (!(await this.isEnabled())) { return []; }

    const parsers: {
      this: any;
      name: string;
      fnc: (opts: ParserOptions) => any;
      permission: string;
      priority: number;
      fireAndForget: boolean;
    }[] = [];
    for (const parser of this._parsers) {
      parser.permission = typeof parser.permission !== 'undefined' ? parser.permission : permission.VIEWERS;
      parser.priority = typeof parser.priority !== 'undefined' ? parser.priority : 3 /* constants.LOW */;

      if (_.isNil(parser.name)) { throw Error('Parsers name must be defined'); }

      if (parser.dependsOn) {
        if (_.isString(parser.dependsOn)) { parser.dependsOn = parser.dependsOn.split(','); }
        for (const dependency of parser.dependsOn) {
          const dependencyPointer = _.get(global, dependency, null);
          // skip parser if dependency is not enabled
          if (!dependencyPointer || !_.isFunction(dependencyPointer.status) || !(await dependencyPointer.status())) { continue; }
        }
      }

      parsers.push({
        this: this,
        name: `${this.constructor.name}.${parser.name}`,
        fnc: this[parser.name],
        permission: parser.permission,
        priority: parser.priority,
        fireAndForget: parser.fireAndForget ? parser.fireAndForget : false,
      });
    }
    return parsers;
  }

  public async rollbacks() {
    if (!(await this.isEnabled())) { return []; }

    const rollbacks: {
      this: any;
      name: string;
      fnc: (opts: ParserOptions) => any;
    }[] = [];
    for (const rollback of this._rollback) {
      if (_.isNil(rollback.name)) { throw Error('Rollback name must be defined'); }

      rollbacks.push({
        this: this,
        name: `${this.constructor.name}.${rollback.name}`,
        fnc: this[rollback.name],
      });
    }
    return rollbacks;
  }

  public async commands() {
    if (await this.isEnabled()) {
      const commands: {
        this: any;
        id: string;
        command: string;
        fnc: (opts: CommandOptions) => void;
        _fncName: string;
        permission: string;
        isHelper: boolean;
      }[] = [];
      for (const command of this._commands) {
        if (_.isNil(command.name)) { throw Error('Command name must be defined'); }

        // if fnc is not set
        if (_.isNil(command.fnc)) {
          command.fnc = 'main';
          if (command.name.split(' ').length > 1) {
            command.fnc = '';
            const _fnc = command.name.split(' ')[1].split('-');
            for (const part of _fnc) {
              if (command.fnc.length === 0) { command.fnc = part; } else {
                command.fnc = command.fnc + part.charAt(0).toUpperCase() + part.slice(1);
              }
            }
          }
        }

        if (command.dependsOn) {
          if (_.isString(command.dependsOn)) { command.dependsOn = command.dependsOn.split(','); }
          for (const dependency of command.dependsOn) {
            const dependencyPointer = _.get(global, dependency, null);
            // skip command if dependency is not enabled
            if (!dependencyPointer || !_.isFunction(dependencyPointer.status) || !(await dependencyPointer.status())) { continue; }
          }
        }

        command.permission = _.isNil(command.permission) ? permission.VIEWERS : command.permission;
        command.command = _.isNil(command.command) ? command.name : command.command;
        commands.push({
          this: this,
          id: command.name,
          command: command.command,
          fnc: this[command.fnc],
          _fncName: command.fnc,
          permission: command.permission,
          isHelper: command.isHelper ? command.isHelper : false,
        });
      }

      return commands;
    } else { return []; }
  }

  public async isEnabled() {
    return this.status({ quiet: true });
  }

  public async getUI() {
    // we need to go through all ui and trigger functions and delete attr if false
    const ui = _.cloneDeep(this._ui);
    for (const [k, v] of Object.entries(ui)) {
      if (typeof v !== 'undefined' && typeof v !== 'boolean') {
        if (typeof v.type !== 'undefined') {
          // final object
          if (typeof v.if === 'function') {
            if (!v.if()) {
              delete ui[k];
            }
          }
        } else {
          for (const [k2, v2] of Object.entries(v)) {
            if (typeof v2 !== 'undefined') {
              if (typeof v2.if === 'function') {
                if (!v2.if()) {
                  delete ui[k][k2];
                }
              }
            }
          }
        }
      }
    }
    return ui;
  }

  /*
   * Returns updated value of command if changed by user
   * @param command - default command to serach
  */
  protected getCommand(command: string): string {
    const c = this._commands.find((o) => o.name === command);
    if (c && c.command) {
      return c.command;
    } else {
      return command;
    }
  }
}

export default Module;
