import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let _rawStatus = '';
let _gameCache = '';

const gameCache = {
  set value(value: string) {
    _gameCache = value;
    getRepository(Settings).findOne({
      namespace: '/core/api', name: 'gameCache',
    }).then(row => {
      getRepository(Settings).save({
        ...row, namespace: '/core/api', name: 'gameCache', value: JSON.stringify(value),
      });
    });
  },
  get value() {
    return _gameCache;
  },
};

const rawStatus = {
  set value(value: string) {
    _rawStatus = value;
    getRepository(Settings).save({
      namespace: '/core/api', name: 'rawStatus', value: JSON.stringify(value),
    });
  },
  get value() {
    return _rawStatus;
  },
};

async function load() {
  if (!isDbConnected) {
    setTimeout(() => load(), 1000);
    return;
  }

  try {
    _rawStatus = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'rawStatus',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }

  try {
    _gameCache = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'gameCache',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { rawStatus, gameCache };