import {
  OverlayMapper, OverlayMapperMarathon,
} from '@entity/overlay.js';
import { getRepository } from 'typeorm';

import { onStartup } from '../decorators/on.js';
import Overlay from './_interface';

import { eventEmitter } from '~/helpers/events/emitter.js';
import { error } from '~/helpers/log.js';
import { addUIError } from '~/helpers/panel/alerts.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';

const cachedOverlays = new Map<string, Required<OverlayMapperMarathon>>();

class Marathon extends Overlay {
  @onStartup()
  events() {
    eventEmitter.on('subscription', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (!value.opts) {
          continue;
        }
        if (value.opts.endTime < Date.now()
          && !value.opts.disableWhenReachedZero
          && (!value.opts.maxEndTime || Date.now() < value.opts.maxEndTime)) {
          value.opts.endTime = Date.now(); // reset endTime
        } else if (value.opts.endTime < Date.now()) {
          return;
        }

        let tier = Number(data.tier);
        if (isNaN(tier)) {
          tier = 1;
        }
        const timeToAdd = value.opts.values.sub[`tier${tier}` as keyof NonNullable<OverlayMapperMarathon['opts']>['values']['sub']] * 1000;
        if (value.opts.maxEndTime !== null) {
          value.opts.endTime = Math.min(value.opts.endTime + timeToAdd, value.opts.maxEndTime);
        } else {
          value.opts.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
    eventEmitter.on('resub', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (!value.opts) {
          continue;
        }
        if (value.opts.endTime < Date.now()
          && !value.opts.disableWhenReachedZero
          && (!value.opts.maxEndTime || Date.now() < value.opts.maxEndTime)) {
          value.opts.endTime = Date.now(); // reset endTime
        } else if (value.opts.endTime < Date.now()) {
          return;
        }

        let tier = Number(data.tier);
        if (isNaN(tier)) {
          tier = 1;
        }
        const timeToAdd = value.opts.values.resub[`tier${tier}` as keyof NonNullable<OverlayMapperMarathon['opts']>['values']['resub']] * 1000;

        if (value.opts.maxEndTime !== null) {
          value.opts.endTime = Math.min(value.opts.endTime + timeToAdd, value.opts.maxEndTime);
        } else {
          value.opts.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
    eventEmitter.on('cheer', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (!value.opts) {
          continue;
        }
        if (value.opts.endTime < Date.now()
          && !value.opts.disableWhenReachedZero
          && (!value.opts.maxEndTime || Date.now() < value.opts.maxEndTime)) {
          value.opts.endTime = Date.now(); // reset endTime
        } else if (value.opts.endTime < Date.now()) {
          return;
        }

        // how much time to add
        let multiplier = data.bits / value.opts.values.bits.bits;
        if (!value.opts.values.bits.addFraction) {
          multiplier = Math.floor(multiplier);
        }
        const timeToAdd = value.opts.values.bits.time * multiplier * 1000;

        if (value.opts.maxEndTime !== null) {
          value.opts.endTime = Math.min(value.opts.endTime + timeToAdd, value.opts.maxEndTime);
        } else {
          value.opts.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
    eventEmitter.on('tip', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (!value.opts) {
          continue;
        }
        if (value.opts.endTime < Date.now()
          && !value.opts.disableWhenReachedZero
          && (!value.opts.maxEndTime || Date.now() < value.opts.maxEndTime)) {
          value.opts.endTime = Date.now(); // reset endTime
        } else if (value.opts.endTime < Date.now()) {
          return;
        }

        // how much time to add
        let multiplier = Number(data.amountInBotCurrency) / value.opts.values.tips.tips;
        if (!value.opts.values.tips.addFraction) {
          multiplier = Math.floor(multiplier);
        }
        const timeToAdd = value.opts.values.tips.time * multiplier * 1000;

        if (value.opts.maxEndTime !== null) {
          value.opts.endTime = Math.min(value.opts.endTime + timeToAdd, value.opts.maxEndTime);
        } else {
          value.opts.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
  }

  async updateCache() {
    const ids = [];
    for (const overlay of await getRepository(OverlayMapper).find({ value: 'marathon' }) as OverlayMapperMarathon[]) {
      if (!cachedOverlays.has(overlay.id)) {
        cachedOverlays.set(overlay.id, overlay);
      }
      ids.push(overlay.id);
    }

    // cleanup ids which are not longer valid
    for (const id of cachedOverlays.keys()) {
      if (!ids.includes(id)) {
        cachedOverlays.delete(id);
      }
    }
  }

  async flushCache() {
    for (const value of cachedOverlays.values()) {
      // single overlay
      await getRepository(OverlayMapper).save(value as OverlayMapperMarathon);
    }
  }

  sockets () {
    publicEndpoint('/overlays/marathon', 'marathon::public', async (marathonId: string, cb) => {
      // no updateCache
      const key = Array.from(cachedOverlays.keys()).find(id => id.includes(marathonId));
      cb(null, cachedOverlays.get(key ?? ''));
    });
    adminEndpoint('/overlays/marathon', 'marathon::check', async (marathonId: string, cb) => {
      await this.updateCache();
      const key = Array.from(cachedOverlays.keys()).find(id => id.includes(marathonId));
      cb(null, cachedOverlays.get(key ?? ''));
    });
    adminEndpoint('/overlays/marathon', 'marathon::update::set', async (data: { time: number, id: string }) => {
      await this.updateCache();
      const key = Array.from(cachedOverlays.keys()).find(id => id.includes(data.id));
      const item = cachedOverlays.get(key ?? '');
      if (item) {
        if (isNaN(item.opts.endTime) || item.opts.endTime < Date.now()) {
          item.opts.endTime = Date.now();
        }
        item.opts.endTime += data.time;
        if (item.opts.maxEndTime !== null && item.opts.endTime) {
          error('MARATHON: cannot set end time bigger than maximum end time');
          addUIError({ name: 'MARATHON', message: 'Cannot set end time bigger than maximum end time.' });
          item.opts.endTime = item.opts.maxEndTime;
        }
        cachedOverlays.set(key ?? '', item);
      }
    });
  }
}

const marathon = new Marathon();
export { cachedOverlays, marathon };
export default marathon;
