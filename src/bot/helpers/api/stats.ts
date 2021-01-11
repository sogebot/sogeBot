import { cloneDeep } from 'lodash';
import { getRepository } from 'typeorm';

import { Settings } from '../../database/entity/settings';
import { isDbConnected } from '../database';

let stats: {
  language: string;
  currentWatchedTime: number;
  currentViewers: number;
  maxViewers: number;
  currentSubscribers: number;
  currentBits: number;
  currentTips: number;
  currentFollowers: number;
  currentViews: number;
  currentGame: string | null;
  currentTitle: string | null;
  currentHosts: number;
  newChatters: number;
} = {
  language: 'en',
  currentWatchedTime: 0,
  currentViewers: 0,
  maxViewers: 0,
  currentSubscribers: 0,
  currentBits: 0,
  currentTips: 0,
  currentFollowers: 0,
  currentViews: 0,
  currentGame: null,
  currentTitle: null,
  currentHosts: 0,
  newChatters: 0,
};

function setStats(value: typeof stats) {
  stats = cloneDeep(value);
  getRepository(Settings).findOne({
    namespace: '/core/api', name: 'stats',
  }).then(row => {
    getRepository(Settings).save({
      ...row, namespace: '/core/api', name: 'stats', value: JSON.stringify(stats),
    });
  });
}

async function load() {
  if (!isDbConnected) {
    setTimeout(() => load(), 1000);
    return;
  }

  try {
    stats = JSON.parse(
      (await getRepository(Settings).findOneOrFail({
        namespace: '/core/api', name: 'stats',
      })).value
    );
  } catch (e) {
    // ignore if nothing was found
  }
}

load();

export { stats, setStats };