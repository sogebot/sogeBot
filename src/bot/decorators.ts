import * as _ from 'lodash';
import { parse, sep as separator } from 'path';
import { VariableWatcher } from './watchers';
import { debug, error } from './helpers/log';
import { isMainThread } from './cluster';
import { isDbConnected } from './helpers/database';
import { find } from './helpers/register';

export let loadingInProgress: string[] = [];
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
    debug('decorators', 'Loading OK (thread: ' + !isMainThread + ')');
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

export function ui(opts, category?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    let path = category ? `${category}.${key}` : key;

    const register = async (retries = 0) => {
      if (!isDbConnected) {
        return setTimeout(() => register(0), 1000);
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
              return setTimeout(() => register(++retries), 10);
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

  return (target: object, key: string) => {
    if (!isReadOnly) {
      loadingInProgress.push(`${type}.${name}.${key}`);
    }

    const registerSettings = async () => {
      const self = find(type, name);
      if (!self) {
        throw new Error(`${type}.${name} not found in list`);
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
        process.stderr.write(JSON.stringify(e) + '\n');
      }
    };
    setTimeout(() => {
      registerSettings();
    }, 10000);
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
        const self = find(type, name);
        if (!self) {
          throw new Error(`${type}.${name} not found in list`);
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
        process.stderr.write(JSON.stringify(e) + '\n');
      }
    };
    setTimeout(() => {
      register();
    }, 10000);
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
        const self = find(type, name);
        if (!self) {
          throw new Error(`${type}.${name} not found in list`);
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
        process.stderr.write(JSON.stringify(e) + '\n');
      }
    };
    setTimeout(() => {
      register();
    }, 10000);
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
    commandsToRegister.push({ opts, m: { type, name, fnc: key } });
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

function registerHelper(m, retry = 0) {
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

function registerRollback(m) {
  setTimeout(() => {
    try {
      const self = find(m.type, m.name);
      if (!self) {
        throw new Error(`${m.type}.${m.name} not found in list`);
      }    self._rollback.push({
        name: m.fnc,
      });
    } catch (e) {
      error(e.stack);
    }
  }, 5000);
}

function registerParser(opts, m) {
  setTimeout(() => {
    try {
      const self = find(m.type, m.name);
      if (!self) {
        throw new Error(`${m.type}.${m.name} not found in list`);
      }
      self._parsers.push({
        name: m.fnc,
        permission: opts.permission,
        priority: opts.priority,
        dependsOn: opts.dependsOn,
        fireAndForget: opts.fireAndForget,
      });
    } catch (e) {
      error(e.stack);
    }
  }, 5000);
}
