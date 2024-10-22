import { existsSync } from 'fs';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'timers';

import chalk from 'chalk';
import _ from 'lodash-es';
import type { Namespace } from 'socket.io/dist/namespace';

import { ClientToServerEventsWithNamespace } from '../d.ts/src/helpers/socket.js';

import { PermissionCommands, Permissions as PermissionsEntity } from '~/database/entity/permissions.js';
import { Settings } from '~/database/entity/settings.js';
import { AppDataSource } from '~/database.js';
import { getFunctionList } from '~/decorators/on.js';
import {
  commandsToRegister, loadingInProgress, permissions as permissionsList,
} from '~/decorators.js';
import { isBotStarted } from '~/helpers/database.js';
import { flatten, unflatten } from '~/helpers/flatten.js';
import { enabled } from '~/helpers/interface/enabled.js';
import emitter from '~/helpers/interfaceEmitter.js';
import {
  error, info, warning,
} from '~/helpers/log.js';
import {
  addMenu, addMenuPublic, app, ioServer, menu, menuPublic,
} from '~/helpers/panel.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { register } from '~/helpers/register.js';
import { addScope, withScope } from '~/helpers/socket.js';
import * as watchers from '~/watchers.js';

let socket: import('~/socket').Socket | any = null;

const modules = new Map<string, Module>();

class Module {
  public dependsOn: string[] = [];
  public showInUI = true;
  public timeouts: { [x: string]: NodeJS.Timeout } = {};
  public settingsList: { category?: string; key: string; defaultValue: any, secret: boolean }[] = [];
  public settingsPermList: { category?: string; key: string; defaultValue: any }[] = [];
  public on: InterfaceSettings.On;
  public socket: Namespace | null = null;
  public uuid = randomUUID();
  private firstStatusSent = false;

  onStartupTriggered = false;

  __moduleName__ = '';

  get isDisabledByEnv(): boolean {
    const isDisableIgnored = typeof process.env.ENABLE !== 'undefined' && process.env.ENABLE.toLowerCase().split(',').includes(this.__moduleName__.toLowerCase());
    return typeof process.env.DISABLE !== 'undefined'
      && (process.env.DISABLE.toLowerCase().split(',').includes(this.__moduleName__.toLowerCase()) || process.env.DISABLE === '*')
      && !isDisableIgnored;
  }

  areDependenciesEnabled = false;
  get _areDependenciesEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      const check = async (retry: number) => {
        const status: any[] = [];
        for (const dependency of this.dependsOn) {
          const module = modules.get(dependency);
          if (!module || !_.isFunction(module.status)) {
            if (retry > 0) {
              setTimeout(() => check(--retry), 10);
            } else {
              throw new Error(`[${this.__moduleName__}] Dependency error - possibly wrong path`);
            }
            return;
          } else {
            status.push(await module.status({ quiet: true }));
          }
        }
        resolve(status.length === 0 || _.every(status));
      };
      check(10000);
    });
  }

  get nsp() {
    return '/' + this._name + '/' + this.__moduleName__.toLowerCase() as keyof ClientToServerEventsWithNamespace;
  }

  get enabled(): boolean {
    if (this.areDependenciesEnabled && !this.isDisabledByEnv) {
      const isEnabled = _.get(this, '_enabled', true);
      isEnabled ? enabled.enable(this.nsp) : enabled.disable(this.nsp);
      return isEnabled;
    } else {
      enabled.disable(this.nsp);
      return false;
    }
  }

  set enabled(value: boolean) {
    if (!_.isEqual(_.get(this, '_enabled', true), value)) {
      _.set(this, '_enabled', value);
      value ? enabled.enable(this.nsp) : enabled.disable(this.nsp);
      AppDataSource.getRepository(Settings).findOneBy({
        name:      'enabled',
        namespace: this.nsp,
      }).then(data => {
        AppDataSource.getRepository(Settings).save({
          ...data,
          name:      'enabled',
          value:     JSON.stringify(value),
          namespace: this.nsp,
        });
      });
    }
  }

  public _name: string;
  private _scope: string;
  protected _ui: InterfaceSettings.UI;
  public _commands: Command[];
  public _parsers: Parser[];
  public _rollback: { name: string }[];
  protected _enabled: boolean | null = true;

  constructor(name = 'core', enabledArg = true) {
    this.__moduleName__ = this.constructor.name;

    this.on = {
      change: { enabled: [] },
      load:   {},
    };

    this.socket = null;

    this._commands = [];
    this._parsers = [];
    this._rollback = [];
    this._ui = {};
    this._name = name;
    this._enabled = enabledArg;
    this._scope = this.__moduleName__.toLowerCase(); // use just name of module as scope
    enabledArg ? enabled.enable(this.nsp) : enabled.disable(this.nsp);

    register(this._name as any, this);

    // add default scopes for higher level
    addScope(`${this._name}:read`);
    addScope(`${this._name}:manage`);

    // prepare proxies for variables
    this._sockets();

    emitter.on('set', (nsp, variableName, value, cb) => {
      if (nsp === this.nsp) {
        (this as any)[variableName] = value;
        emitter.emit('change', `${this._name.toLowerCase()}.${this.__moduleName__.toLowerCase()}.${variableName}`, value);
      }
      if (cb) {
        cb();
      }
    });

    const load = async () => {
      if (isBotStarted) {
        this.areDependenciesEnabled = await this._areDependenciesEnabled;
        setInterval(async () => {
          this.areDependenciesEnabled = await this._areDependenciesEnabled;
        }, 1000);

        const state = this._name === 'core' ? true : await this.loadVariableValue('enabled');
        const onStartup = async () => {
          if (loadingInProgress.length > 0) {
            // wait until all settings are loaded
            setTimeout(() => onStartup(), 100);
            return;
          }
          if (this._enabled !== null) {
            // change only if we can enable/disable
            this._enabled = typeof state === 'undefined' ? this._enabled : state;
          }
          this.status({ state: this._enabled });
          const path = this._name === 'core' ? this.__moduleName__.toLowerCase() : `${this._name}.${this.__moduleName__.toLowerCase()}`;

          for (const event of getFunctionList('startup', path)) {
            (this as any)[event.fName]('enabled', state);
          }
          this.onStartupTriggered = true;

          // require panel/socket
          socket = (await import('~/socket.js')).default;

          this.registerCommands();
        };
        onStartup();
      } else {
        setImmediate(() => load());
      }
    };
    load();
  }

  public scope (type?: 'read' | 'manage', customScope?: string) {
    // add scope if used
    if (type) {
      addScope((customScope || this._scope) + ':' + type);
    }
    return customScope || this._scope + (type ? ':' + type : '');
  }

  public sockets() {
    return;
  }

  public emit(event: string, ...args: any[]) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  public async loadVariableValue(key: string) {
    const variable = await AppDataSource.getRepository(Settings)
      .createQueryBuilder('settings')
      .select('settings')
      .where('namespace=:namespace', { namespace: this.nsp })
      .andWhere('name=:name', { name: key })
      .getOne();

    const path = this._name === 'core' ? this.__moduleName__.toLowerCase() : `${this._name}.${this.__moduleName__.toLowerCase()}`;

    setTimeout(() => {
      for (const event of getFunctionList('load', `${path}.${key}` )) {
        (this as any)[event.fName](key, JSON.parse(variable?.value ?? '""'));
      }
    }, 1000);

    try {
      if (variable) {
        // check if object and if all keys are same
        // e.g. default { 'a': '', 'b': '' }, but loaded have only 'a' key, should not remove 'b' key
        const value = JSON.parse(variable.value);
        const defaultObject = (this as any)[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(defaultObject).length > 0) {
          return Object.keys(defaultObject).reduce((a, b) => {
            return { ...a, [b]: value[b] ?? defaultObject[b] };
          }, {});
        }
        return value;
      } else {
        return undefined;
      }
    } catch (e: any) {
      error({ key, variable });
      error(e);
      return undefined;
    }
  }

  public prepareCommand(opts:  Command) {
    const defaultPermission = permissionsList[`${this._name}.${this.__moduleName__.toLowerCase()}.${(opts.fnc || '').toLowerCase()}`];
    if (typeof defaultPermission === 'undefined') {
      opts.permission = opts.permission || defaultPermissions.VIEWERS;
    } else {
      opts.permission = defaultPermission;
    }
    opts.isHelper = opts.isHelper || false;
    return opts;
  }

  public async registerCommands() {
    try {
      for (const { opts: options, m } of commandsToRegister.filter(command => {
        return command.m.type === this._name
          && command.m.name === this.__moduleName__.toLowerCase();
      })) {
        const opts = typeof options === 'string' ? { name: options, id: randomUUID() } : { ...options, id: randomUUID() };
        opts.fnc = m.fnc; // force function to decorated function
        const c = this.prepareCommand(opts);

        if (typeof this._commands === 'undefined') {
          this._commands = [];
        }

        this.settingsList.push({
          category: 'commands', key: c.name, defaultValue: c.name, secret: false,
        });

        // load command from db
        const dbc = await AppDataSource.getRepository(Settings)
          .createQueryBuilder('settings')
          .select('settings')
          .where('namespace = :namespace', { namespace: this.nsp })
          .andWhere('name = :name', { name: 'commands.' + c.name })
          .getOne();
        if (dbc) {
          dbc.value = JSON.parse(dbc.value);
          if (c.name === dbc.value) {
            // remove if default value
            await AppDataSource.getRepository(Settings)
              .createQueryBuilder('settings')
              .delete()
              .where('namespace = :namespace', { namespace: this.nsp })
              .andWhere('name = :name', { name: 'commands.' + c.name })
              .execute();
          }
          c.command = dbc.value;
        }
        this._commands.push(c);
      }
    } catch (e: any) {
      error(e);
    }
  }

  public _sockets() {
    if (socket === null || ioServer === null || !app) {
      setTimeout(() => this._sockets(), 100);
    } else {
      this.socket = ioServer.of(this.nsp).use(socket.authorize);
      this.sockets();
      this.sockets = function() {
        error(this.nsp + ': Cannot initialize sockets second time');
      };

      app.get(`/api/settings${this.nsp}`, withScope([`${this._name}:read`, `${this._name}:manage`]), async (req, res) => {
        try {
          res.json({
            status: 'success',
            data:   {
              settings: await this.getAllSettings(
                undefined, req.headers?.scopes?.includes(`${this.nsp.split('/').map(o => o.trim()).filter(String).join(':')}:sensitive`),
              ),
              ui: await this.getUI(),
            },
          });
        } catch (e: any) {
          res.status(500).json({ error: e.stack, status: 'error' });
        }
      });

      app.get(`/api/settings${this.nsp}/:variable`, withScope([`${this._name}:read`, `${this._name}:manage`]), async (req, res) => {
        try {
          res.json({
            status: 'success',
            data:   await (this as any)[req.params.variable],
          });
        } catch (e: any) {
          res.status(500).json({ error: e.stack, status: 'error' });
        }
      });

      app.post(`/api/settings${this.nsp}/:variable`, withScope([`${this._name}:manage`]), async (req, res) => {
        try {
          (this as any)[req.params.variable] = req.body.value;
          res.json({
            status: 'success',
          });
        } catch (e: any) {
          res.status(500).json({ error: e.stack, status: 'error' });
        }
      });

      app.post(`/api/settings${this.nsp}`, withScope([`${this._name}:manage`]), async (req, res) => {
        const data = flatten(req.body);
        const remap: ({ key: string; actual: string; toRemove: string[] } | { key: null; actual: null; toRemove: null })[] = Object.keys(flatten(data)).map(o => {
          // skip commands, enabled and permissions
          if (o.startsWith('commands') || o.startsWith('enabled') || o.startsWith('_permissions')) {
            return {
              key:      o,
              actual:   o,
              toRemove: [],
            };
          }

          const toRemove: string[] = [];
          for (const possibleVariable of o.split('.')) {
            const isVariableFound = this.settingsList.find(o2 => possibleVariable === o2.key);
            if (isVariableFound) {
              return {
                key:    o,
                actual: isVariableFound.key,
                toRemove,
              };
            } else {
              toRemove.push(possibleVariable);
            }
          }
          return {
            key:      null,
            actual:   null,
            toRemove: null,
          };
        });

        for (const { key, actual, toRemove } of remap) {
          if (key === null || toRemove === null || actual === null) {
            continue;
          }

          const joinedToRemove = toRemove.join('.');
          for (const key2 of Object.keys(data)) {
            if (joinedToRemove.length > 0) {
              const value = data[key2];
              data[key2.replace(joinedToRemove + '.', '')] = value;

              if (key2.replace(joinedToRemove + '.', '') !== key2) {
                delete data[key2];
              }
            }
          }
        }
        for (const [key, value] of Object.entries(unflatten(data))) {
          if (key === 'enabled' && this._enabled === null) {
            // ignore enabled if we don't want to enable/disable at will
            continue;
          } else if (key === 'enabled') {
            this.status({ state: value });
          } else if (key === '__permission_based__') {
            for (const vKey of Object.keys(value as any)) {
              (this as any)['__permission_based__' + vKey] = (value as any)[vKey];
            }
          } else {
            (this as any)[key] = value;
          }
        }

        await watchers.check(true); // force watcher to refresh

        // trigger onSettingsSave
        for (const event of getFunctionList('settingsSave', this.__moduleName__.toLowerCase())) {
          if (typeof (this as any)[event.fName] === 'function') {
            (this as any)[event.fName]();
          } else {
            error(`${event.fName}() is not function in ${this._name}/${this.__moduleName__.toLowerCase()}`);
          }
        }
        res.json({ status: 'success' });
      });
    }
  }

  public async status(opts: any = {}) {
    if (['core', 'overlays', 'widgets', 'stats', 'registries', 'services'].includes(this._name) || (opts.state === null && typeof opts.state !== 'undefined')) {
      return true;
    }

    const isMasterAndStatusOnly = _.isNil(opts.state);
    const isStatusChanged = !_.isNil(opts.state) && this.enabled !== opts.state;

    if (existsSync('~/restart.pid') // force quiet if we have restart.pid
      || (this.enabled === opts.state && this.firstStatusSent) // force quiet if we actually don't change anything
    ) {
      opts.quiet = true;
    }

    if (isStatusChanged) {
      this.enabled = opts.state;
    } else {
      opts.state = this.enabled;
    }

    if (!this.areDependenciesEnabled || this.isDisabledByEnv) {
      opts.state = false;
    } // force disable if dependencies are disabled or disabled by env

    // on.change handler on enabled
    if (isStatusChanged && this.onStartupTriggered) {
      const path = this._name === 'core' ? this.__moduleName__.toLowerCase() : `${this._name}.${this.__moduleName__.toLowerCase()}`;
      for (const event of getFunctionList('change', path + '.enabled')) {
        if (typeof (this as any)[event.fName] === 'function') {
          (this as any)[event.fName]('enabled', opts.state);
        } else {
          error(`${event.fName}() is not function in ${this._name}/${this.__moduleName__.toLowerCase()}`);
        }
      }
    }

    if (!this.firstStatusSent || ((isMasterAndStatusOnly || isStatusChanged) && !opts.quiet)) {
      if (this.isDisabledByEnv) {
        info(`${chalk.red('DISABLED BY ENV')}: ${this.__moduleName__} (${this._name})`);
      } else if (this.areDependenciesEnabled) {
        info(`${opts.state ? chalk.green('ENABLED') : chalk.red('DISABLED')}: ${this.__moduleName__} (${this._name})`);
      } else {
        info(`${chalk.red('DISABLED BY DEP')}: ${this.__moduleName__} (${this._name})`);
      }
    }

    this.firstStatusSent = true;
    modules.set(`${this._name.toLowerCase()}.${this.__moduleName__.toLowerCase()}`, this);

    return opts.state;
  }

  public addMenu(opts: typeof menu[number]) {
    addMenu(opts);
  }

  public addMenuPublic(opts: typeof menuPublic[number]) {
    addMenuPublic(opts);
  }

  public async getAllSettings(withoutDefaults = false, sensitive = false) {
    const promisedSettings: {
      [x: string]: any;
    } = {};

    // go through expected settings
    for (const { category, key, defaultValue, secret } of this.settingsList) {
      // skip secret settings if not sensitive scope
      if (secret && !sensitive) {
        continue;
      }
      if (category) {
        if (typeof promisedSettings[category] === 'undefined') {
          promisedSettings[category] = {};
        }

        if (category === 'commands') {
          _.set(promisedSettings, `${category}.${key}`, withoutDefaults ? this.getCommand(key) : [this.getCommand(key), defaultValue]);
        } else {
          _.set(promisedSettings, `${category}.${key}`, withoutDefaults ? (this as any)[key] : [(this as any)[key], defaultValue]);
        }
      } else {
        _.set(promisedSettings, key, withoutDefaults ? (this as any)[key] : [(this as any)[key], defaultValue]);
      }
    }

    // go through expected permission based settings
    for (const { category, key, defaultValue } of this.settingsPermList) {
      if (typeof promisedSettings.__permission_based__ === 'undefined') {
        promisedSettings.__permission_based__ = {};
      }

      if (category) {
        if (typeof promisedSettings.__permission_based__[category] === 'undefined') {
          promisedSettings.__permission_based__[category] = {};
        }

        _.set(promisedSettings, `__permission_based__.${category}.${key}`, withoutDefaults ? await this.getPermissionBasedSettingsValue(key, false) : [await this.getPermissionBasedSettingsValue(key, false), defaultValue]);
      } else {
        _.set(promisedSettings, `__permission_based__.${key}`, withoutDefaults ? await this.getPermissionBasedSettingsValue(key, false) : [await this.getPermissionBasedSettingsValue(key, false), defaultValue]);
      }
    }

    // add command permissions
    if (this._commands.length > 0) {
      promisedSettings._permissions = {};
      for (const command of this._commands) {
        const name = typeof command === 'string' ? command : command.name;
        const pItem = await PermissionCommands.findOneBy({ name });
        if (pItem) {
          promisedSettings._permissions[name] = pItem.permission;
        } else {
          promisedSettings._permissions[name] = command.permission;
        }
      }
    }

    // add status info
    promisedSettings.enabled = this._enabled;

    // check ui ifs
    const ui: InterfaceSettings.UI = _.cloneDeep(this._ui);
    for (const categoryKey of Object.keys(promisedSettings)) {
      if (ui[categoryKey]) {
        for (const key of Object.keys(ui[categoryKey])) {
          if (typeof (ui as any)[categoryKey][key].if === 'function' && !(ui as any)[categoryKey][key].if()) {
            delete promisedSettings[categoryKey][key];
          }
        }
      }
    }

    return promisedSettings;
  }

  public async parsers() {
    if (!this.enabled) {
      return [];
    }

    const parsers: {
      this: any;
      name: string;
      fnc: (opts: ParserOptions) => any;
      permission: string;
      priority: number;
      fireAndForget: boolean;
      skippable: boolean;
    }[] = [];
    for (const parser of this._parsers) {
      parser.permission = typeof parser.permission !== 'undefined' ? parser.permission : defaultPermissions.VIEWERS;
      parser.priority = typeof parser.priority !== 'undefined' ? parser.priority : 3 /* constants.LOW */;

      if (_.isNil(parser.name)) {
        throw Error('Parsers name must be defined');
      }

      if (typeof parser.dependsOn !== 'undefined') {
        for (const dependency of parser.dependsOn) {
          // skip parser if dependency is not enabled
          if (!_.isFunction(dependency.status) || !(await dependency.status())) {
            continue;
          }
        }
      }

      parsers.push({
        this:          this,
        name:          `${this.__moduleName__}.${parser.name}`,
        fnc:           (this as any)[parser.name],
        permission:    parser.permission,
        priority:      parser.priority,
        skippable:     parser.skippable ? parser.skippable : false,
        fireAndForget: parser.fireAndForget ? parser.fireAndForget : false,
      });
    }
    return parsers;
  }

  public async rollbacks() {
    if (!this.enabled) {
      return [];
    }

    const rollbacks: {
      this: any;
      name: string;
      fnc: (opts: ParserOptions) => any;
    }[] = [];
    for (const rollback of this._rollback) {
      if (_.isNil(rollback.name)) {
        throw Error('Rollback name must be defined');
      }

      rollbacks.push({
        this: this,
        name: `${this.__moduleName__}.${rollback.name}`,
        fnc:  (this as any)[rollback.name],
      });
    }
    return rollbacks;
  }

  public async commands() {
    if (this.enabled) {
      const commands: {
        this: any;
        id: string;
        command: string;
        fnc: (opts: CommandOptions) => void;
        _fncName: string;
        permission: string | null;
        isHelper: boolean;
      }[] = [];
      for (const command of this._commands) {
        if (_.isNil(command.name)) {
          throw Error('Command name must be defined');
        }

        // if fnc is not set
        if (typeof command.fnc === 'undefined') {
          command.fnc = 'main';
          if (command.name.split(' ').length > 1) {
            command.fnc = '';
            const _fnc = command.name.split(' ')[1].split('-');
            for (const part of _fnc) {
              if (command.fnc.length === 0) {
                command.fnc = part;
              } else {
                command.fnc = command.fnc + part.charAt(0).toUpperCase() + part.slice(1);
              }
            }
          }
        }

        if (command.dependsOn) {
          for (const dependency of command.dependsOn) {
            // skip command if dependency is not enabled
            if (!_.isFunction(dependency.status) || !(await dependency.status())) {
              continue;
            }
          }
        }

        command.permission = typeof command.permission === 'undefined' ? defaultPermissions.VIEWERS : command.permission;
        command.command = typeof command.command === 'undefined' ? command.name : command.command;
        commands.push({
          this:       this,
          id:         command.name,
          command:    command.command,
          fnc:        (this as any)[command.fnc],
          _fncName:   command.fnc,
          permission: command.permission,
          isHelper:   command.isHelper ? command.isHelper : false,
        });
      }

      return commands;
    } else {
      return [];
    }
  }

  public async getUI() {
    // we need to go through all ui and trigger functions and delete attr if false
    const ui: InterfaceSettings.UI = _.cloneDeep(this._ui);
    for (const [k, v] of Object.entries(ui)) {
      if (typeof v !== 'undefined' && typeof v !== 'boolean') {
        if (typeof v.type !== 'undefined') {
          // final object
          if (typeof v.if === 'function') {
            if (!v.if()) {
              delete ui[k];
            }
          }

          if (v.type === 'selector') {
            if (typeof v.values === 'function') {
              v.values = v.values();
            }
          }
        } else {
          for (const [k2, v2] of Object.entries(v)) {
            if (typeof v2 !== 'undefined') {
              if (typeof (v2 as any).if === 'function') {
                if (!(v2 as any).if()) {
                  delete (ui as any)[k][k2];
                }
              }
              if (typeof (v2 as any).values === 'function') {
                (v2 as any).values = (v2 as any).values();
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
  public getCommand(command: string): string {
    const c = this._commands.find((o) => o.name === command);
    if (c && c.command) {
      return c.command;
    } else {
      return command;
    }
  }

  protected async loadCommand(command: string): Promise<void> {
    const cmd = await AppDataSource.getRepository(Settings)
      .createQueryBuilder('settings')
      .select('settings')
      .where('namespace = :namespace', { namespace: this.nsp })
      .andWhere('name = :name', { name: 'commands.' + command })
      .getOne();

    if (cmd) {
      const c = this._commands.find((o) => o.name === command);
      if (c) {
        c.command = JSON.parse(cmd.value);
      }
    } else {
      const c = this._commands.find((o) => o.name === command);
      if (c) {
        c.command = c.name;
      }
    }
  }

  /**
   *
   */
  async setCommand(command: string, updated: string): Promise<void> {
    const c = this._commands.find((o) => o.name === command);
    if (c) {
      if (c.name === updated) {
        // default value
        await AppDataSource.getRepository(Settings).delete({
          namespace: this.nsp,
          name:      'commands.' + command,
        });
        delete c.command;
      } else {
        c.command = updated;
        const savedCommand = await AppDataSource.getRepository(Settings).findOneBy({
          namespace: this.nsp,
          name:      'commands.' + command,
        });
        await AppDataSource.getRepository(Settings).save({
          ...savedCommand,
          namespace: this.nsp,
          name:      'commands.' + command,
          value:     JSON.stringify(updated),
        });
      }
    } else {
      warning(`Command ${command} cannot be updated to ${updated}`);
    }
  }

  protected async getPermissionBasedSettingsValue(key: string, set_default_values = true): Promise<{[permissionId: string]: any}> {
    // current permission settings by user
    let permId: string = defaultPermissions.VIEWERS;

    // get current full list of permissions
    const permissions = await PermissionsEntity.find({
      cache: true,
      order: { order: 'DESC' },
    });
    return permissions.reduce((prev, p) => {
      // set proper value for permId or default value
      if (set_default_values || p.id === defaultPermissions.VIEWERS) {
        if (p.id === defaultPermissions.VIEWERS) {
          // set default value if viewers
          permId = p.id;
          return { ...prev, [p.id]: _.get(this, `__permission_based__${key}.${p.id}`, (this as any)[key]) };
        } else {
          // set value of permission before if anything else (to have proper waterfall inheriting)
          // we should have correct values as we are desc ordering
          const value = _.get(this, `__permission_based__${key}.${p.id}`, null);
          if (value === null) {
            const prevId = permId;
            permId = p.id;
            return { ...prev, [p.id]: _.get(prev, prevId, _.get(this, `__permission_based__${key}.${p.id}`, (this as any)[key])) };
          } else {
            permId = p.id;
            return { ...prev, [p.id]: _.get(this, `__permission_based__${key}.${p.id}`, value) };
          }
        }
      } else {
        return { ...prev, [p.id]: _.get(this, `__permission_based__${key}.${p.id}`, null) };
      }
    }, {});
  }
}

export default Module;
export { Module };
