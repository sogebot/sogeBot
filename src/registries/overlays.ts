import { SECOND } from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import Registry from './_interface';

import { OverlayMapper, OverlayMappers } from '~/database/entity/overlay';
import { isBotStarted } from '~/helpers/database';
import defaultValues from '~/helpers/overlaysDefaultValues';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';

const ticks: string[] = [];

setInterval(async () => {
  if (!isBotStarted) {
    return;
  }

  while(ticks.length > 0) {
    let id = ticks.shift() as string;
    let time: number | string = 1000;
    if (id.includes('|')) {
      [id, time] = id.split('|');
    }
    // check if it is without group
    const item = await getRepository(OverlayMapper).findOne({ id });
    if (item) {
      if (item.value === 'countdown' && item.opts) {
        await getRepository(OverlayMapper).update(id, {
          opts: {
            ...item.opts,
            currentTime: Number(time),
          },
        });
      } else if (item.value === 'stopwatch' && item.opts) {
        await getRepository(OverlayMapper).update(id, {
          opts: {
            ...item.opts,
            currentTime: Number(time),
          },
        });
      }
    }
  }
}, SECOND * 1);

class Overlays extends Registry {
  constructor() {
    super();
    this.addMenu({
      category: 'registry', name: 'overlays', id: 'registry/overlays', this: null,
    });
  }

  sockets() {
    adminEndpoint('/registries/overlays', 'generic::deleteById', async (id, cb) => {
      await getRepository(OverlayMapper).delete(id);
      cb(null);
    });
    adminEndpoint('/registries/overlays', 'generic::save', async (opts, cb) => {
      await getRepository(OverlayMapper).save(opts);
      cb(null);
    });

    publicEndpoint('/registries/overlays', 'generic::getAll', async (cb) => {
      const items = await getRepository(OverlayMapper).find();
      cb(null, items.map(defaultValues) as OverlayMappers[]);
    });
    publicEndpoint('/registries/overlays', 'generic::getOne', async (id, cb) => {
      const item = await getRepository(OverlayMapper).findOne({ id });
      if (item) {
        cb(null, defaultValues(item));
      } else {
        cb(null, undefined);
      }
    });
    publicEndpoint('/registry/overlays', 'overlays::tick', (opts) => {
      ticks.push(`${opts.id}|${opts.millis}`);
    });
  }
}

export default new Overlays();
