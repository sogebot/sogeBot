import { parse, sep as separator } from 'path';

import * as _ from 'lodash';
import { xor } from 'lodash';

import type { Module } from './_interface';
import * as constants from './constants';
import { isDbConnected } from './helpers/database';
import { debug, error } from './helpers/log';
import { defaultPermissions } from './helpers/permissions/defaultPermissions';
import { find } from './helpers/register';
import { VariableWatcher } from './watchers';

export let loadingInProgress: (string|symbol)[] = [];
export let areDecoratorsLoaded = false;
export const permissions: { [command: string]: string | null } = {};

export const commandsToRegister: {
  opts: string | Command;
  m: { type: string; name: string; fnc: string };
}[] = [];

const checkIfDecoratorsAreLoaded = () => {
  if (!isDbConnected) {
    setTimeout(() => {
      checkIfDecoratorsAreLoaded();
    }, 2000);
    return;
  }
  if (loadingInProgress.length === 0) {
    debug('decorators', 'Loading OK');
    areDecoratorsLoaded = true;
  } else {
    setTimeout(() => {
      checkIfDecoratorsAreLoaded();
    }, 2000);
  }
};
checkIfDecoratorsAreLoaded();

function getNameAndTypeFromStackTrace() {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_s, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[2].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return { name, type };
}

export function ui(opts: any, category?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string) => {
    let path = category ? `${category}.${key}` : key;

    const register = async (retries = 0) => {
      if (!isDbConnected) {
        setTimeout(() => register(0), 1000);
        return;
      }
      try {
        const self = find(type, name);
        if (!self) {
          throw new Error(`${type}.${name} not found in list`);
        }
        // get category from settingsList
        if (!category) {
          const s = self.settingsList.find(o => o.key === path);
          if (s) {
            path = s.category? s.category + '.' + path : path;
          } else {
            if (retries < 500) { // try to wait to settings to be registered
              setTimeout(() => register(++retries), 10);
              return;
            }
          }
        }
        _.set(self, '_ui.' + path, opts);
      } catch (e) {
        error(e);
      }
    };
    setTimeout(() => {
      register();
    }, 10000);
  };
}

export function settings(category?: string, isReadOnly = false) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string) => {
    if (!isReadOnly) {
      loadingInProgress.push(`${type}.${name}.${key}`);
    }

    const registerSettings = async () => {
      const self = find(type, name);
      if (!self) {
        throw new Error(`${type}.${name} not found in list`);
      }
      if (!isDbConnected) {
        setTimeout(() => registerSettings(), 1000);
        return;
      }
      try {
        VariableWatcher.add(`${type}.${name}.${key}`, (self as any)[key], isReadOnly);

        if (!isReadOnly) {
          // load variable from db
          const loadVariableValue = () => {
            if (!isDbConnected) {
              setTimeout(() => loadVariableValue(), 1000);
              return;
            }
            self.loadVariableValue(key).then((value) => {
              if (typeof value !== 'undefined') {
                VariableWatcher.add(`${type}.${name}.${key}`, value, isReadOnly); // rewrite value on var load
                _.set(self, key, value);
              }
              loadingInProgress = loadingInProgress.filter(o => o !== `${type}.${name}.${key}`);
            });
          };
          setTimeout(() => loadVariableValue(), 5000);
        }

        // add variable to settingsList
        self.settingsList.push({
          category, key, defaultValue: (self as any)[key],
        });
      } catch (e) {
        error(e.stack);
      }
    };
    setTimeout(() => {
      registerSettings();
    }, 10000);
  };
}

export function permission_settings(category?: string, exclude: string[] = [], enforcedDefaultValue?: { [permId: string]: any }) {
  if (typeof category === 'undefined') {
    category = 'settings';
  }

  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string) => {
    loadingInProgress.push(`${type}.${name}.${key}`);

    const register = async () => {
      if (!isDbConnected) {
        setTimeout(() => register(), 1000);
        return;
      }
      try {
        const self = find(type, name);
        if (!self) {
          throw new Error(`${type}.${name} not found in list`);
        }

        _.set(self, '__permission_based__' + key, {}); // set init value
        VariableWatcher.add(`${type}.${name}.__permission_based__${key}`, {}, false);

        // load variable from db
        const loadVariableValue = () => {
          if (!isDbConnected) {
            setTimeout(() => loadVariableValue(), 1000);
            return;
          }
          self.loadVariableValue('__permission_based__' + key).then((value?: { [permissionId: string]: string }) => {
            if (typeof value === 'undefined') {
              value = {};
            }

            for (const exKey of exclude) {
              value[exKey] = '%%%%___ignored___%%%%';
            }

            // set forced default value
            if (enforcedDefaultValue) {
              for (const enforcedKey of Object.keys(enforcedDefaultValue)) {
                if (typeof value[enforcedKey] === 'undefined' || value[enforcedKey] === null) {
                  // change only if value is not set manually
                  value[enforcedKey] = enforcedDefaultValue[enforcedKey];
                }
              }
            }

            VariableWatcher.add(`${type}.${name}.__permission_based__${key}`, value, false);
            _.set(self, '__permission_based__' + key, value);
            loadingInProgress = loadingInProgress.filter(o => o !== `${type}.${name}.${key}`);
          });
        };
        setTimeout(() => loadVariableValue(), 5000);

        // add variable to settingsPermList
        self.settingsPermList.push({
          category, key, defaultValue: (self as any)[key],
        });
      } catch (e) {

      }
    };
    setTimeout(() => {
      register();
    }, 10000);
  };
}

export function persistent() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string) => {
    loadingInProgress.push(`${type}.${name}.${key}`);
    const register = async () => {
      if (!isDbConnected) {
        setTimeout(() => register(), 1000);
        return;
      }
      try {
        const self = find(type, name);
        if (!self) {
          throw new Error(`${type}.${name} not found in list`);
        }
        const defaultValue = (self as any)[key];
        VariableWatcher.add(`${type}.${name}.${key}`, defaultValue, false);
        const loadVariableValue = () => {
          self.loadVariableValue(key).then((value) => {
            if (typeof value !== 'undefined') {
              VariableWatcher.add(`${type}.${name}.${key}`, value, false); // rewrite value on var load
              _.set(self, key, value);
            }
            loadingInProgress = loadingInProgress.filter(o => o !== `${type}.${name}.${key}`);
          });
        };
        setTimeout(() => loadVariableValue(), 5000);
      } catch (e) {
        error(e.stack);
      }
    };
    setTimeout(() => {
      register();
    }, 10000);
  };
}

export function parser(
  { skippable = false, fireAndForget = false, permission = defaultPermissions.VIEWERS, priority = constants.MEDIUM, dependsOn = [] }:
  { skippable?: boolean; fireAndForget?: boolean; permission?: string; priority?: number; dependsOn?: import('./_interface').Module[] } = {}) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    registerParser({
      fireAndForget, permission, priority, dependsOn, skippable,
    }, {
      type, name, fnc: key,
    });
    return descriptor;
  };
}

export function command(opts: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    commandsToRegister.push({
      opts, m: {
        type, name, fnc: key,
      },
    });
    return descriptor;
  };
}

export function default_permission(uuid: string | null) {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
    permissions[`${type}.${name.toLowerCase()}.${String(key).toLowerCase()}`] = uuid;
    return descriptor;
  };
}

export function helper() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
    registerHelper({
      type, name, fnc: String(key),
    });
    return descriptor;
  };
}

export function rollback() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    registerRollback({
      type, name, fnc: key,
    });
    return descriptor;
  };
}

function registerHelper(m: { type: string, name: string, fnc: string }, retry = 0) {
  setTimeout(() => {
    try {
      const self = find(m.type, m.name);
      if (!self) {
        throw new Error(`${m.type}.${m.name} not found in list`);
      }
      // find command with function
      const c = self._commands.find((o) => o.fnc === m.fnc);
      if (!c) {
        throw Error();
      } else {
        c.isHelper = true;
      }
    } catch (e) {
      if (retry < 100) {
        return setTimeout(() => registerHelper(m, retry++), 10);
      } else {
        error('Command with function ' + m.fnc + ' not found!');
      }
    }
  }, 5000);
}

function registerRollback(m: { type: string, name: string, fnc: string }) {
  setTimeout(() => {
    try {
      const self = find(m.type, m.name);
      if (!self) {
        throw new Error(`${m.type}.${m.name} not found in list`);
      }    self._rollback.push({ name: m.fnc });
    } catch (e) {
      error(e.stack);
    }
  }, 5000);
}

function registerParser(opts: {
  permission: string; priority: number, dependsOn: Module[]; fireAndForget: boolean; skippable: boolean;
}, m: { type: string, name: string, fnc: string }) {
  setTimeout(() => {
    try {
      const self = find(m.type, m.name);
      if (!self) {
        throw new Error(`${m.type}.${m.name} not found in list`);
      }
      self._parsers.push({
        name:          m.fnc,
        permission:    opts.permission,
        priority:      opts.priority,
        dependsOn:     opts.dependsOn,
        skippable:     opts.skippable,
        fireAndForget: opts.fireAndForget,
      });
    } catch (e) {
      error(e.stack);
    }
  }, 5000);
}

export function IsLoadingInProgress(name: symbol) {
  return loadingInProgress.includes(name);
}

export function toggleLoadingInProgress(name: symbol) {
  loadingInProgress = xor(loadingInProgress, [name]);
}