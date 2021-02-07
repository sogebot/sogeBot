import { cloneDeep, set } from 'lodash';
import DeepProxy from 'proxy-deep';
import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { IsLoadingInProgress, toggleLoadingInProgress } from '../../decorators';
import { isDbConnected } from '../database';

function persistent<T>({ value, name, namespace, onChange }: { value: T, name: string, namespace: string, onChange?: (cur: T, old: T) => void }) {
  const sym = Symbol(name);

  const proxy = new DeepProxy({ value }, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'object' && val !== null) {
        return this.nest(val);
      } else {
        return val;
      }
    },
    set(target, prop, receiver) {
      if (IsLoadingInProgress(sym)) {
        return Reflect.set(target, prop, receiver);
      }
      if (typeof onChange !== 'undefined' && typeof prop === 'string') {
        const oldObject = proxy.value;
        let newObject;
        if (typeof proxy.value === 'string' || typeof proxy.value === 'number' || proxy.value === null) {
          newObject = receiver;
        } else if (this.path.length === 0) {
          newObject = { ...proxy.value, ...receiver };
        } else {
          // remove first key (which is value)
          const [, ...path] = [...this.path, prop];
          newObject = set<T>(cloneDeep(proxy.value as any), path.join('.'), receiver);
        }
        onChange(newObject, oldObject);
      }
      setTimeout(() => {
        // saving updated object
        getRepository(Settings).findOne({ namespace, name }).then(row => {
          getRepository(Settings).save({
            ...row, namespace, name, value: JSON.stringify(proxy.value),
          });
        });
      }, 1000);
      return Reflect.set(target, prop, receiver);
    },
  });

  toggleLoadingInProgress(sym);

  async function load() {
    if (!isDbConnected) {
      setImmediate(() => load());
      return;
    }

    try {
      proxy.value = JSON.parse(
        (await getRepository(Settings).findOneOrFail({ namespace, name })).value,
      );
    } catch (e) {
      // ignore if nothing was found
    } finally {
      toggleLoadingInProgress(sym);
    }
  }
  load();

  return proxy;
}

export { persistent };