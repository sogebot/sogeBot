import { cloneDeep } from 'lodash';
import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { toggleLoadingInProgress } from '../../decorators';
import { isDbConnected } from '../database';

function persistent<T>({ value, name, namespace }: { value: T, name: string, namespace: string }) {
  let _value = cloneDeep(value);
  const sym = Symbol(name);

  toggleLoadingInProgress(sym);

  async function load() {
    if (!isDbConnected) {
      setImmediate(() => load());
      return;
    }

    try {
      _value = JSON.parse(
        (await getRepository(Settings).findOneOrFail({ namespace, name })).value,
      );
    } catch (e) {
      // ignore if nothing was found
    } finally {
      toggleLoadingInProgress(sym);
    }
  }
  load();

  return {
    set value(valueToSet: typeof value) {
      _value = cloneDeep(valueToSet);
      getRepository(Settings).findOne({ namespace, name }).then(row => {
        getRepository(Settings).save({
          ...row, namespace, name, value: JSON.stringify(valueToSet),
        });
      });
    },
    get value() {
      return _value;
    },
  };
}

export { persistent };