import {
  cloneDeep, get, isEqual, set,
} from 'lodash-es';

import { Settings } from '~/database/entity/settings.js';
import { AppDataSource } from '~/database.js';
import { getFunctionList } from '~/decorators/on.js';
import { isDbConnected } from '~/helpers/database.js';
import emitter from '~/helpers/interfaceEmitter.js';
import { debug, error } from '~/helpers/log.js';
import { logAvgTime } from '~/helpers/profiler.js';
import { find } from '~/helpers/register.js';

export const variables = new Map<string, any>();
export const readonly = new Map<string, any>();
let checkInProgress = false;

export const check = async (forceCheck = false) => {
  debug('watcher', `watcher::start ${forceCheck ? '(forced)': ''}`);
  if (checkInProgress) {
    await new Promise((resolve) => {
      const awaiter = () => {
        if (!checkInProgress) {
          resolve(true);
        } else {
          setImmediate(() => {
            awaiter();
          });
        }
      };
      awaiter();
    });
  }
  if (isDbConnected && !checkInProgress) {
    try {
      checkInProgress = true;
      debug('watcher', 'watcher::check');
      const time = process.hrtime();
      await VariableWatcher.check();
      logAvgTime('VariableWatcher.check()', process.hrtime(time));
      debug('watcher', `watcher::check Finished after ${process.hrtime(time)[0]}s ${process.hrtime(time)[1] / 1000000}ms`);
    } catch (e: any) {
      error(e.stack);
    } finally {
      checkInProgress = false;
    }
  } else {
    debug('watcher', `watcher::skipped ${JSON.stringify({ isDbConnected, checkInProgress })}`);
  }
};

export const startWatcher = () => {
  check();
  setInterval(check, 100);
};

export const VariableWatcher = {
  add(key: string, value: any, isReadOnly: boolean) {
    if (isReadOnly) {
      readonly.set(key, cloneDeep(value));
    } else {
      variables.set(key, cloneDeep(value));
    }
  },
  async check() {
    for (const k of variables.keys()) {
      const [ type, name, ...variableArr ] = k.split('.');
      let variable = variableArr.join('.');
      const checkedModule = find(type as any, name);
      if (!checkedModule) {
        throw new Error(`${type}.${name} not found in list`);
      }
      const value = cloneDeep(get(checkedModule, variable, undefined));
      if (typeof value === 'undefined') {
        throw new Error('Value not found, check your code!!! ' + JSON.stringify({
          k, variable, value,
        }));
      }
      if (!isEqual(value, variables.get(k))) {
        const oldValue = variables.get(k);
        variables.set(k, value);
        const savedSetting = await AppDataSource.getRepository(Settings).findOneBy({
          name:      variable,
          namespace: checkedModule.nsp,
        });
        await AppDataSource.getRepository(Settings).save({
          ...savedSetting,
          name:      variable,
          namespace: checkedModule.nsp,
          value:     JSON.stringify(value),
        });

        if (variable.includes('__permission_based__')) {
          variable = variable.replace('__permission_based__', '');
        }
        debug('watcher', `watcher::change *** ${type}.${name}.${variable} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)}`);
        const events = getFunctionList('change', type === 'core' ? `${name}.${variable}` : `${type}.${name}.${variable}`);
        for (const event of events) {
          emitter.emit('change', `${type}.${name}.${variable}`, cloneDeep(value));
          if (typeof (checkedModule as any)[event.fName] === 'function') {
            (checkedModule as any)[event.fName](variable, cloneDeep(value));
          } else {
            error(`${event.fName}() is not function in ${checkedModule._name}/${checkedModule.__moduleName__.toLowerCase()}`);
          }
        }
      }
    }
    for (const k of readonly.keys()) {
      const [ type, name, ...variableArr ] = k.split('.');
      const variable = variableArr.join('.');
      const checkedModule = find(type as any, name);
      if (!checkedModule) {
        throw new Error(`${type}.${name} not found in list`);
      }
      const value = cloneDeep(get(checkedModule, variable, undefined));

      if (!isEqual(value, readonly.get(k))) {
        error(`Cannot change read-only variable, forcing initial value for ${type}.${name}.${variable}`);
        set(checkedModule, variable, readonly.get(k));
      }
    }
  },
};