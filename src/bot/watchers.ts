import { cloneDeep, get, isEqual, set } from 'lodash';
import { isMainThread } from './cluster';
import { error } from './helpers/log';
import { change } from './changelog';

const variables: {
  [x: string]: any;
} = {};
const readonly: {
  [x: string]: any;
} = {};

setInterval(() => {
  VariableWatcher.check();
}, 1000);

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
      const value = get(global, k.replace('core.', ''), null);
      if (!isEqual(value, variables[k])) {
        const [type, name, variable] = k.split('.');

        variables[k] = value;
        let self: null | any = null;
        if (type === 'core') {
          self = Object.values(global).find((o) => {
            return typeof o !== 'undefined' && o.constructor.name.toLowerCase() === name.toLowerCase();
          });
        } else {
          self = Object.values(global[type]).find((o: any) => {
            return typeof o !== 'undefined' && o.constructor.name.toLowerCase() === name.toLowerCase();
          }) as any;
        }

        if (isMainThread && self) {
          await global.db.engine.update(self.collection.settings, { system: name.toLowerCase(), key: variable }, { value: variable.startsWith('__permission_based') ? JSON.stringify(value) : value });
          change(`${type}.${name}.${variable}`);
          if (typeof self.on !== 'undefined'
            && typeof self.on.change !== 'undefined'
            && self.on.change[variable]) {
            // run on.change functions only on master
            for (const fnc of self.on.change[variable]) {
              if (typeof self[fnc] === 'function') {
                self[fnc](variable, value);
              } else {
                error(`${fnc}() is not function in ${self._name}/${self.constructor.name.toLowerCase()}`);
              }
            }
          }
        }
      }
    }
    for (const k of Object.keys(readonly)) {
      const value = get(global, k.replace('core.', ''), null);
      if (!isEqual(value, readonly[k])) {
        const [type, name, variable] = k.split('.');
        error(`Cannot change read-only variable, forcing initial value for ${type}.${name}.${variable}`);
        set(global, k.replace('core.', ''), readonly[k]);
      }
    }
  },
};
