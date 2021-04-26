import {
  cloneDeep, get, isEqual, set,
} from 'lodash';
import { getRepository } from 'typeorm';

import { SECOND } from './constants';
import { Settings } from './database/entity/settings';
import { getFunctionList } from './decorators/on';
import { isDbConnected } from './helpers/database';
import { debug, error } from './helpers/log';
import { logAvgTime } from './helpers/profiler';
import { find } from './helpers/register';

const variables: {
  [x: string]: any;
} = {};
const readonly: {
  [x: string]: any;
} = {};
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
    } catch (e) {
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
  setInterval(check, 10 * SECOND);
};

export const VariableWatcher = {
  add(key: string, value: any, isReadOnly: boolean) {
    if (isReadOnly) {
      readonly[key] = cloneDeep(value);
    } else {
      variables[key] = cloneDeep(value);
    }
  },
  async check() {
    for (const k of Object.keys(variables)) {
      const [ type, name, ...variableArr ] = k.split('.');
      let variable = variableArr.join('.');
      const checkedModule = find(type, name);
      if (!checkedModule) {
        throw new Error(`${type}.${name} not found in list`);
      }
      const value = cloneDeep(get(checkedModule, variable, undefined));
      if (typeof value === 'undefined') {
        throw new Error('Value not found, check your code!!! ' + JSON.stringify({
          k, variable, value,
        }));
      }
      if (!isEqual(value, variables[k])) {
        const oldValue = variables[k];
        variables[k] = value;
        const savedSetting = await getRepository(Settings).findOne({
          where: {
            name:      variable,
            namespace: checkedModule.nsp,
          },
        });
        await getRepository(Settings).save({
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
          if (typeof (checkedModule as any)[event.fName] === 'function') {
            (checkedModule as any)[event.fName](variable, cloneDeep(value));
          } else {
            error(`${event.fName}() is not function in ${checkedModule._name}/${checkedModule.__moduleName__.toLowerCase()}`);
          }
        }
      }
    }
    for (const k of Object.keys(readonly)) {
      const [ type, name, ...variableArr ] = k.split('.');
      const variable = variableArr.join('.');
      const checkedModule = find(type, name);
      if (!checkedModule) {
        throw new Error(`${type}.${name} not found in list`);
      }
      const value = cloneDeep(get(checkedModule, variable, undefined));

      if (!isEqual(value, readonly[k])) {
        error(`Cannot change read-only variable, forcing initial value for ${type}.${name}.${variable}`);
        set(checkedModule, variable, readonly[k]);
      }
    }
  },
};