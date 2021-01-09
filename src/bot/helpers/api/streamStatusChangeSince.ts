import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let streamStatusChangeSince = Date.now();

function setStreamStatusChangeSince(value: typeof streamStatusChangeSince) {
  streamStatusChangeSince = value;
}

async function load() {
  if (!isDbConnected) {
    setTimeout(() => load(), 1000);
    return;
  }

  try {
    streamStatusChangeSince = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'streamStatusChangeSince',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { streamStatusChangeSince, setStreamStatusChangeSince };