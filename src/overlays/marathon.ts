import { getRepository } from 'typeorm';

import {
  OverlayMapper, OverlayMapperGroup, OverlayMapperMarathon,
} from '../database/entity/overlay.js';
import { onStartup } from '../decorators/on.js';
import { eventEmitter } from '../helpers/events/emitter.js';
import { error } from '../helpers/log.js';
import { addUIError } from '../helpers/panel/alerts.js';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

const cachedOverlays = new Map<string, Required<OverlayMapperGroup['opts']['items'][number] | OverlayMapperMarathon>>();

class Marathon extends Overlay {
  @onStartup()
  events() {
    eventEmitter.on('subscription', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (!value.opts) {
          continue;
        }
        const opts = typeof value.opts === 'string'
          ? JSON.parse<NonNullable<OverlayMapperMarathon['opts']>>(value.opts as any)
          : value.opts;
        if (opts.endTime < Date.now()
          && !opts.disableWhenReachedZero
          && (!opts.maxEndTime || Date.now() < opts.maxEndTime)) {
          opts.endTime = Date.now(); // reset endTime
        } else if (opts.endTime < Date.now()) {
          return;
        }

        let tier = Number(data.tier);
        if (isNaN(tier)) {
          tier = 1;
        }
        const timeToAdd = opts.values.sub[`tier${tier}` as keyof NonNullable<OverlayMapperMarathon['opts']>['values']['sub']] * 1000;
        if (opts.maxEndTime !== null) {
          opts.endTime = Math.min(opts.endTime + timeToAdd, opts.maxEndTime);
        } else {
          opts.endTime += timeToAdd;
        }
        value.opts = typeof value.opts === 'string' ? JSON.stringify(opts) : value.opts;
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
        const opts = typeof value.opts === 'string'
          ? JSON.parse<NonNullable<OverlayMapperMarathon['opts']>>(value.opts as any)
          : value.opts;
        if (opts.endTime < Date.now()
          && !opts.disableWhenReachedZero
          && (!opts.maxEndTime || Date.now() < opts.maxEndTime)) {
          opts.endTime = Date.now(); // reset endTime
        } else if (opts.endTime < Date.now()) {
          return;
        }

        let tier = Number(data.tier);
        if (isNaN(tier)) {
          tier = 1;
        }
        const timeToAdd = opts.values.resub[`tier${tier}` as keyof NonNullable<OverlayMapperMarathon['opts']>['values']['resub']] * 1000;

        if (opts.maxEndTime !== null) {
          opts.endTime = Math.min(opts.endTime + timeToAdd, opts.maxEndTime);
        } else {
          opts.endTime += timeToAdd;
        }
        value.opts = typeof value.opts === 'string' ? JSON.stringify(opts) : value.opts;
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
        const opts = typeof value.opts === 'string'
          ? JSON.parse<NonNullable<OverlayMapperMarathon['opts']>>(value.opts as any)
          : value.opts;
        if (opts.endTime < Date.now()
          && !opts.disableWhenReachedZero
          && (!opts.maxEndTime || Date.now() < opts.maxEndTime)) {
          opts.endTime = Date.now(); // reset endTime
        } else if (opts.endTime < Date.now()) {
          return;
        }

        // how much time to add
        let multiplier = data.bits / opts.values.bits.bits;
        if (!opts.values.bits.addFraction) {
          multiplier = Math.floor(multiplier);
        }
        const timeToAdd = opts.values.bits.time * multiplier * 1000;

        if (opts.maxEndTime !== null) {
          opts.endTime = Math.min(opts.endTime + timeToAdd, opts.maxEndTime);
        } else {
          opts.endTime += timeToAdd;
        }
        value.opts = typeof value.opts === 'string' ? JSON.stringify(opts) : value.opts;
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
        const opts = typeof value.opts === 'string'
          ? JSON.parse<NonNullable<OverlayMapperMarathon['opts']>>(value.opts as any)
          : value.opts;
        if (opts.endTime < Date.now()
          && !opts.disableWhenReachedZero
          && (!opts.maxEndTime || Date.now() < opts.maxEndTime)) {
          opts.endTime = Date.now(); // reset endTime
        } else if (opts.endTime < Date.now()) {
          return;
        }

        // how much time to add
        let multiplier = Number(data.amountInBotCurrency) / opts.values.tips.tips;
        if (!opts.values.tips.addFraction) {
          multiplier = Math.floor(multiplier);
        }
        const timeToAdd = opts.values.tips.time * multiplier * 1000;

        if (opts.maxEndTime !== null) {
          opts.endTime = Math.min(opts.endTime + timeToAdd, opts.maxEndTime);
        } else {
          opts.endTime += timeToAdd;
        }
        value.opts = typeof value.opts === 'string' ? JSON.stringify(opts) : value.opts;
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

    for (const overlay of (await getRepository(OverlayMapper).find({ value: 'group' }) as OverlayMapperGroup[])) {
      for(const item of overlay.opts.items.filter(o => o.type === 'marathon')) {
        if (!cachedOverlays.has(`${overlay.id}|${item.id}`)) {
          cachedOverlays.set(`${overlay.id}|${item.id}`, item);
        }
        ids.push(`${overlay.id}|${item.id}`);
      }
    }

    // cleanup ids which are not longer valid
    for (const id of cachedOverlays.keys()) {
      if (!ids.includes(id)) {
        cachedOverlays.delete(id);
      }
    }
  }

  async flushCache() {
    for (const [id, value] of cachedOverlays.entries()) {
      if (id.includes('|')) {
        // part of group
        const [groupId, itemId] = id.split('|');
        const group = await getRepository(OverlayMapper).findOne({ id: groupId }) as OverlayMapperGroup;
        if (group) {
          const idx = group.opts.items.findIndex(o => o.id === itemId);
          if (idx !== -1) {
            group.opts.items[idx] = value as Required<OverlayMapperGroup['opts']['items'][number]>;
            await getRepository(OverlayMapper).save(group);
          }
        }
      } else {
        // single overlay
        await getRepository(OverlayMapper).save(value as OverlayMapperMarathon);
      }
    }
  }

  sockets () {
    publicEndpoint(this.nsp, 'marathon::public', async (marathonId: string, cb) => {
      // no updateCache
      const key = Array.from(cachedOverlays.keys()).find(id => id.includes(marathonId));
      cb(null, cachedOverlays.get(key ?? ''));
    });
    adminEndpoint(this.nsp, 'marathon::check', async (marathonId: string, cb) => {
      await this.updateCache();
      const key = Array.from(cachedOverlays.keys()).find(id => id.includes(marathonId));
      cb(null, cachedOverlays.get(key ?? ''));
    });
    adminEndpoint(this.nsp, 'marathon::update::set', async (data: { time: number, id: string }) => {
      await this.updateCache();
      const key = Array.from(cachedOverlays.keys()).find(id => id.includes(data.id));
      const item = cachedOverlays.get(key ?? '');
      if (item) {
        const opts = typeof item.opts === 'string' ? JSON.parse(item.opts) : item.opts;
        if (isNaN(opts.endTime) || opts.endTime < Date.now()) {
          opts.endTime = Date.now();
        }
        opts.endTime += data.time;
        if (opts.maxEndTime !== null && opts.endTime) {
          error('MARATHON: cannot set end time bigger than maximum end time');
          addUIError({ name: 'MARATHON', message: 'Cannot set end time bigger than maximum end time.' });
          opts.endTime = opts.maxEndTime;
        }
        cachedOverlays.set(key ?? '', item);
      }
    });
  }
}

const marathon = new Marathon();
export { cachedOverlays, marathon };
export default marathon;
