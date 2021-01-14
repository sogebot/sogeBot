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
  },
};

async function load() {
  if (!isDbConnected) {
    setImmediate(() => load());
    return;
  }

  try {
    _value = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'isStreamOnline',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { isStreamOnline };