import * as _ from 'lodash';
import { parse, sep as separator } from 'path';
import { VariableWatcher } from './watchers';
import { debug, error } from './helpers/log';
import { isMainThread } from './cluster';
import { getManager } from 'typeorm';
import { Settings } from './database/entity/settings';
import { isDbConnected } from './helpers/database';

export let loadingInProgress: string[] = [];
export const permissions: { [command: string]: string | null } = {};

let lastLoadingInProgressCount = 1000;

const interval = setInterval(() => {
  if(loadingInProgress.length === lastLoadingInProgressCount) {
    if (loadingInProgress.length > 0) {
      error('decorators: Loading FAIL (thread: ' + !isMainThread + `)\n${loadingInProgress.join(', ')}`);
    } else {
      debug('decorators', 'Loading OK (thread: ' + !isMainThread + ')');
    }
    clearInterval(interval);
  } else {
    lastLoadingInProgressCount = loadingInProgress.length;
  }
}, 10000);

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

export function ui(opts, category?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    let path = category ? `${category}.${key}` : key;

    const register = async (retries = 0) => {
      if (!isDbConnected) {
        return setTimeout(() => register(0), 1000);
      }
      try {
        let self;
        if (type === 'core') {
          self = (require('./' + name)).default;
        } else {
          self = (require('./' + type + '/' + name)).default;
        }
        // get category from settingsList
        if (!category) {
          const s = self.settingsList.find(o => o.key === path);
          if (s) {
            path = s.category? s.category + '.' + path : path;
          } else {
            if (retries < 500) { // try to wait to settings to be registered
              return setTimeout(() => register(retries++), 10);
            }
          }
        }
        _.set(self, '_ui.' + path, opts);
      } catch (e) {
        console.log(e);
      }
    };
    register();
  };
}

export function settings(category?: string, isReadOnly = false) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    if (!isReadOnly) {
      loadingInProgress.push(`${type}.${name}.${key}`);
    }

    const registerSettings = async () => {
      let self;
      if (type === 'core') {
        self = (require('./' + name)).default;
      } else {
        self = (require('./' + type + '/' + name)).default;
      }
      if (!isDbConnected) {
        return setTimeout(() => registerSettings(), 1000);
      }
      try {
        if (category === key) {
          throw Error(`Category and variable name cannot be same - ${type}.${name}.${key} in category ${category}`);
        }

        VariableWatcher.add(`${type}.${name}.${key}`, self[key], isReadOnly);

        if (!isReadOnly) {
          // load variable from db
          const loadVariableValue = () => {
            if (!isDbConnected) {
              return setTimeout(() => loadVariableValue(), 1000);
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
        self.settingsList.push({ category, key });
      } catch (e) {
        console.log(e);
      }
    };
    registerSettings();
  };
}


export function permission_settings(category?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    loadingInProgress.push(`${type}.${name}.${key}`);

    const register = async () => {
      if (!isDbConnected) {
        return setTimeout(() => register(), 1000);
      }
      try {
        let self;
        if (type === 'core') {
          self = (require('./' + name)).default;
        } else {
          self = (require('./' + type + '/' + name)).default;
        }
        if (category === key) {
          throw Error(`Category and variable name cannot be same - ${type}.${name}.${key} in category ${category}`);
        }

        _.set(self, '__permission_based__' + key, {}); // set init value
        VariableWatcher.add(`${type}.${name}.__permission_based__${key}`, {}, false);

        // load variable from db
        const loadVariableValue = () => {
          if (!isDbConnected) {
            return setTimeout(() => loadVariableValue(), 1000);
          }
          self.loadVariableValue('__permission_based__' + key).then((value: { [permissionId: string]: string }) => {
            if (typeof value !== 'undefined') {
              VariableWatcher.add(`${type}.${name}.__permission_based__${key}`, value, false);
              _.set(self, '__permission_based__' + key, value);
            }
            loadingInProgress = loadingInProgress.filter(o => o !== `${type}.${name}.${key}`);
          });
        };
        setTimeout(() => loadVariableValue(), 5000);

        // add variable to settingsPermList
        self.settingsPermList.push({ category, key });
      } catch (e) {
        console.log(e);
      }
    };
    register();
  };
}

export function shared(db = false) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    if (db) {
      loadingInProgress.push(`${type}.${name}.${key}`);
    }
    const register = async () => {
      if (!isDbConnected) {
        return setTimeout(() => register(), 1000);
      }
      try {
        let self;
        if (type === 'core') {
          self = (require('./' + name)).default;
        } else {
          self = (require('./' + type + '/' + name)).default;
        }
        const defaultValue = self[key];
        VariableWatcher.add(`${type}.${name}.${key}`, defaultValue, false);
        if (db) {
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
        }
      } catch (e) {
        console.log(e);
      }
    };
    register();
  };
}

export function parser(opts?: {
  fireAndForget?: boolean;
  permission?: string;
  priority?: number;
  dependsOn?: import('./_interface').Module[];
}) {
  opts = opts || {};
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    registerParser(opts, { type, name, fnc: key });
    return descriptor;
  };
}

export function command(opts: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    registerCommand(opts, { type, name, fnc: key });
    return descriptor;
  };
}

export function default_permission(uuid: string | null) {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    permissions[`${type}.${name.toLowerCase()}.${String(key).toLowerCase()}`] = uuid;
    return descriptor;
  };
}

export function helper() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    registerHelper({ type, name, fnc: key });
    return descriptor;
  };
}

export function rollback() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    registerRollback({ type, name, fnc: key });
    return descriptor;
  };
}

async function registerCommand(opts: string | Command, m) {
  if (!isDbConnected) {
    return setTimeout(() => registerCommand(opts, m), 1000);
  }
  try {
    let self;
    if (m.type === 'core') {
      self = (require('./' + m.name)).default;
    } else {
      self = (require('./' + m.type + '/' + m.name)).default;
    }
    if (typeof opts === 'string') {
      opts = {
        name: opts,
      };
    }
    opts.fnc = m.fnc; // force function to decorated function
    const c = self.prepareCommand(opts);

    if (typeof self._commands === 'undefined') {
      self._commands = [];
    }

    self.settingsList.push({ category: 'commands', key: c.name });

    // load command from db
    const dbc = await getManager()
      .createQueryBuilder()
      .select('settings')
      .from(Settings, 'settings')
      .where('namespace = :namespace', { namespace: self.nsp })
      .andWhere('name = :name', { name: 'commands.' + c.name })
      .getOne();
    if (dbc) {
      dbc.value = JSON.parse(dbc.value);
      if (c.name === dbc.value) {
        // remove if default value
        await getManager()
          .createQueryBuilder()
          .delete()
          .from(Settings)
          .where('namespace = :namespace', { namespace: self.nsp })
          .andWhere('name = :name', { name: 'commands.' + c.name })
          .execute();
      }
      c.command = dbc.value;
    }
    self._commands.push(c);
  } catch (e) {
    error(e);
  }
}

function registerHelper(m, retry = 0) {
  try {
    let self;
    if (m.type === 'core') {
      self = (require('./' + m.name)).default;
    } else {
      self = (require('./' + m.type + '/' + m.name)).default;
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
}

function registerRollback(m) {
  try {
    let self;
    if (m.type === 'core') {
      self = (require('./' + m.name)).default;
    } else {
      self = (require('./' + m.type + '/' + m.name)).default;
    }    self._rollback.push({
      name: m.fnc,
    });
  } catch (e) {
    error(e.stack);
  }
}

function registerParser(opts, m) {
  try {
    let self;
    if (m.type === 'core') {
      self = (require('./' + m.name)).default;
    } else {
      self = (require('./' + m.type + '/' + m.name)).default;
    }    self._parsers.push({
      name: m.fnc,
      permission: opts.permission,
      priority: opts.priority,
      dependsOn: opts.dependsOn,
      fireAndForget: opts.fireAndForget,
    });
  } catch (e) {
    error(e.stack);
  }
}
