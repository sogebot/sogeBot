import { cloneDeep, get, isEqual, set } from 'lodash';
import { isMainThread } from './cluster';
import { debug, error } from './helpers/log';
import { change } from './changelog';
import { getRepository } from 'typeorm';
import { Settings } from './database/entity/settings';
import { getFunctionList } from './decorators/on';
import { isDbConnected } from './helpers/database';
import { find } from './helpers/register';

const variables: {
  [x: string]: any;
} = {};
const readonly: {
  [x: string]: any;
} = {};

export const startWatcher = () => {
  debug('watcher', 'watcher::start');
  setInterval(() => {
    if (isDbConnected) {
      VariableWatcher.check();
    }
  }, 1000);
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
      const variable = variableArr.join('.');
      const checkedModule = find(type, name);
      if (!checkedModule) {
        throw new Error(`${type}.${name} not found in list`);
      }
      const value = cloneDeep(get(checkedModule, variable, undefined));
      if (typeof value === 'undefined') {
        throw new Error('Value not found, check your code!!! ' + JSON.stringify({k, variable, value}));
      }
      if (!isEqual(value, variables[k])) {
        variables[k] = value;
        if (isMainThread) {
          const savedSetting = await getRepository(Settings).findOne({
            where: {
              name: variable,
              namespace: checkedModule.nsp,
            },
          });
          await getRepository(Settings).save({
            ...savedSetting,
            name: variable,
            namespace: checkedModule.nsp,
            value: JSON.stringify(value),
          });

          change(`${type}.${name}.${variable}`);
          for (const event of getFunctionList('change', type === 'core' ? `${name}.${variable}` : `${type}.${name}.${variable}`)) {
            if (typeof (checkedModule as any)[event.fName] === 'function') {
              (checkedModule as any)[event.fName](variable, cloneDeep(value));
            } else {
              error(`${event.fName}() is not function in ${checkedModule._name}/${checkedModule.__moduleName__.toLowerCase()}`);
            }
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