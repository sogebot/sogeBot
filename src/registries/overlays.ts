import { SECOND } from '@sogebot/ui-helpers/constants.js';

import Registry from './_interface.js';
import { Message } from  '../message.js';

import { Goal, Overlay } from '~/database/entity/overlay.js';
import { AppDataSource } from '~/database.js';
import { stats } from '~/helpers/api/index.js';
import { executeVariablesInText } from '~/helpers/customvariables/executeVariablesInText.js';
import { isBotStarted } from '~/helpers/database.js';
import defaultValues from '~/helpers/overlaysDefaultValues.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';

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

const updateGoalValues = (output: Overlay) => {
  // we need to set up current values for goals current
  for (const item_ of output.items) {
    if (item_.opts.typeId === 'goal') {
      for (const campaign of (item_.opts as Goal).campaigns) {
        if (campaign.type === 'currentFollowers') {
          campaign.currentAmount = stats.value.currentFollowers;
        }
        if (campaign.type === 'currentSubscribers') {
          campaign.currentAmount = stats.value.currentSubscribers;
        }
      }
    }
  }
  return output.items;
};

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
      const data = await AppDataSource.getRepository(Overlay).save(opts);
      cb(null, data);
    });

    publicEndpoint('/registries/overlays', 'parse', async (text, cb) => {
      try {
        cb(null, await new Message(await executeVariablesInText(text, null)).parse());
      } catch (e) {
        cb(e, '');
      }
    });
    publicEndpoint('/registries/overlays', 'generic::getAll', async (cb) => {
      const items = await AppDataSource.getRepository(Overlay).find();
      cb(null, items.map(defaultValues) as Overlay[]);
    });
    publicEndpoint('/registries/overlays', 'generic::getOne', async (id, cb) => {
      const item = await AppDataSource.getRepository(Overlay).findOneBy({ id });
      if (item) {
        const output = defaultValues(item);
        output.items = updateGoalValues(output);
        cb(null, output);
      } else {
        // try to find if id is part of group
        const items = await Overlay.find();
        for (const it of items) {
          if (it.items.map(o => o.id).includes(id)) {
            const output = defaultValues(it);
            output.items = updateGoalValues(output);
            return cb(null, output);
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
