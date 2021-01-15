import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let _value = 'live';

const streamType = {
  set value(value: typeof _value) {
    _value = value;
    getRepository(Settings).findOne({
      namespace: '/core/api', name: 'streamType',
    }).then(row => {
      getRepository(Settings).save({
        ...row, namespace: '/core/api', name: 'streamType', value: JSON.stringify(value),
      });
    });
  },
  get value() {
    return _value;
  },
};

async function load() {
  if (!isDbConnected) {
    setImmediate(() => load());
    return;
  }

  try {
    streamType.value = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'streamType',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { streamType };