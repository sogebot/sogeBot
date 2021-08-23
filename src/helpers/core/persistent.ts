import DeepProxy from 'proxy-deep';
import { EntityNotFoundError } from 'typeorm';
import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { IsLoadingInProgress, toggleLoadingInProgress } from '../../decorators';
import { isDbConnected } from '../database';
import { debug } from '../log';
import { setImmediateAwait } from '../setImmediateAwait';

function persistent<T>({ value, name, namespace, onChange }: { value: T, name: string, namespace: string, onChange?: (cur: T) => void }) {
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
      if (IsLoadingInProgress(sym) || prop === '__loaded__') {
        return Reflect.set(target, prop, receiver);
      }
      setImmediate(() => save());
      return Reflect.set(target, prop, receiver);
    },
  });

  toggleLoadingInProgress(sym);

  async function save() {
    if (onChange) {
      onChange(proxy.value);
    }
    debug('persistent.set', `Updating ${namespace}/${name}`);
    debug('persistent.set', proxy.value);
    getRepository(Settings).update({ namespace, name }, { value: JSON.stringify(proxy.value) }).then(() => {
      debug('persistent.set', `Update done on ${namespace}/${name}`);
    });
  }

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
      if (!(e instanceof EntityNotFoundError)) {
        await setImmediateAwait();
        await getRepository(Settings).delete({ name, namespace });
      }
      await setImmediateAwait();
      await getRepository(Settings).insert({
        name, namespace, value: JSON.stringify(value),
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