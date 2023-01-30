import { SECOND } from '@sogebot/ui-helpers/constants';

import Registry from './_interface';

import { AppDataSource } from '~/database';
import { Overlay } from '~/database/entity/overlay';
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
    let groupId = '';
    let time: number | string = 1000;
    if (id.includes('|')) {
      [groupId, id, time] = id.split('|');
    }
    // check if it is without group
    const overlay = await AppDataSource.getRepository(Overlay).findOneBy({ id: groupId });
    if (overlay) {
      const item = overlay.items.find(o => o.id === id);
      if (item?.opts.typeId === 'countdown' || item?.opts.typeId === 'stopwatch') {
        item.opts.currentTime = Number(time);
        overlay.save();
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
      await AppDataSource.getRepository(Overlay).delete(id);
      cb(null);
    });
    adminEndpoint('/registries/overlays', 'generic::save', async (opts, cb) => {
      await AppDataSource.getRepository(Overlay).save(opts);
      cb(null);
    });

    publicEndpoint('/registries/overlays', 'generic::getAll', async (cb) => {
      const items = await AppDataSource.getRepository(Overlay).find();
      cb(null, items.map(defaultValues) as Overlay[]);
    });
    publicEndpoint('/registries/overlays', 'generic::getOne', async (id, cb) => {
      const item = await AppDataSource.getRepository(Overlay).findOneBy({ id });
      if (item) {
        cb(null, defaultValues(item));
      } else {
        // try to find if id is part of group
        const items = await Overlay.find();
        for (const it of items) {
          if (it.items.map(o => o.id).includes(id)) {
            return cb(null, defaultValues(it));
          }
        }
        cb(null, undefined);
      }
    });
    publicEndpoint('/registry/overlays', 'overlays::tick', (opts) => {
      ticks.push(`${opts.groupId}|${opts.id}|${opts.millis}`);
    });
  }
}

export default new Overlays();
