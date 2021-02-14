import { cloneDeep, set } from 'lodash';
import DeepProxy from 'proxy-deep';
import { getManager, getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { IsLoadingInProgress, toggleLoadingInProgress } from '../../decorators';
import { isDbConnected } from '../database';
import { debug } from '../log';

function persistent<T>({ value, name, namespace, onChange }: { value: T, name: string, namespace: string, onChange?: (cur: T, old: T) => void }) {
  const sym = Symbol(name);

  const proxy = new DeepProxy({ __loaded__: false, value }, {
    get(target, prop, receiver) {
      if (['toJSON', 'constructor'].includes(String(prop))) {
        return JSON.stringify(target.value);
      }

      if (prop === '__loaded__'
        || typeof prop === 'symbol'
        || typeof (target as any)[prop] === 'function') {
        return Reflect.get(target, prop, receiver);
      }

      try {
        debug('persistent.get', JSON.stringify({
          name, namespace, target: JSON.stringify((target as any)[prop]),
        }, null, 2));
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'object' && val !== null) {
          return this.nest(val);
        } else {
          return val;
        }
      } catch (e) {
        console.log(e);
        return undefined;
      }
    },
    set(target, prop, receiver) {
      debug('persistent.set', JSON.stringify({
        name, namespace, target: JSON.stringify((target as any)[prop]),
      }, null, 2));
      if (IsLoadingInProgress(sym) || prop === '__loaded__') {
        return Reflect.set(target, prop, receiver);
      }

      const oldObject = proxy.value;
      let newObject;
      if (typeof proxy.value === 'string' || typeof proxy.value === 'number' || proxy.value === null) {
        newObject = receiver;
      } else if (this.path.length === 0) {
        newObject = cloneDeep({ ...proxy.value, ...receiver });
      } else {
        // remove first key (which is value)
        const [, ...path] = [...this.path, prop];
        newObject = set<T>(cloneDeep(proxy.value as any), path.join('.'), receiver);
      }
      if (onChange) {
        onChange(newObject, oldObject);
      }
      debug('persistent.set', `Updating ${namespace}/${name}`);
      debug('persistent.set', newObject);
      getRepository(Settings).update({ namespace, name }, { value: JSON.stringify(newObject) }).then(() => {
        debug('persistent.set', `Update done on ${namespace}/${name}`);
      });

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
      debug('persistent.load', `Loading ${namespace}/${name}`);
      proxy.value = JSON.parse(
        (await getRepository(Settings).findOneOrFail({ namespace, name })).value,
      );
    } catch (e) {
      debug('persistent.load', `Data not found, creating ${namespace}/${name}`);
      await getManager().transaction(async transactionalEntityManager => {
        await transactionalEntityManager.delete(Settings, { name, namespace });
        await transactionalEntityManager.insert(Settings, {
          name, namespace, value: JSON.stringify(value),
        });
      });
    } finally {
      toggleLoadingInProgress(sym);
      proxy.__loaded__ = true;
      debug('persistent.load', `Load done ${namespace}/${name}`);
      debug('persistent.load', JSON.stringify(proxy.value, null, 2));
    }
  }
  load();

  return proxy;
}

export { persistent };