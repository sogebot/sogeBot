import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let isStreamOnline = false;

function setIsStreamOnline(value: typeof isStreamOnline) {
  isStreamOnline = value;
}

async function load() {
  if (!isDbConnected) {
    setTimeout(() => load(), 1000);
    return;
  }

  try {
    isStreamOnline = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'isStreamOnline',
      })).value
    );
    console.log('loaded isStreamOnline from db');
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { isStreamOnline, setIsStreamOnline };