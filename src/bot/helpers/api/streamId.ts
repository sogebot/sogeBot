import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let _value: null | string = null;

const streamId = {
  set value(value: typeof _value) {
    _value = value;
    getRepository(Settings).findOne({
      namespace: '/core/api', name: 'streamStatusChangeSince',
    }).then(row => {
      getRepository(Settings).save({
        ...row, namespace: '/core/api', name: 'streamStatusChangeSince', value: JSON.stringify(value),
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
    streamId.value = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'streamStatusChangeSince',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { streamId };