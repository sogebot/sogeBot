import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let _value = false;
const isStreamOnline = {
  get value() {
    return _value;
  },
  set value(value: typeof _value) {
    _value = value;
    getRepository(Settings).findOne({
      namespace: '/core/api', name: 'isStreamOnline',
    }).then(row => {
      getRepository(Settings).save({
        ...row, namespace: '/core/api', name: 'isStreamOnline', value: JSON.stringify(value),
      });
    });
  },
};

async function load() {
  if (!isDbConnected) {
    setImmediate(() => load());
    return;
  }

  try {
    isStreamOnline.value = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'streamId',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { isStreamOnline };