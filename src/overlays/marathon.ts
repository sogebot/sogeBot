import { Marathon as MarathonItem, Overlay as OverlayEntity } from '@entity/overlay.js';
import { Request } from 'express';
import { z } from 'zod';

import Overlay from './_interface.js';
import { onStartup } from '../decorators/on.js';

import { Get, Post } from '~/decorators/endpoint.js';
import { eventEmitter } from '~/helpers/events/emitter.js';
import { error } from '~/helpers/log.js';

const cachedOverlays = new Map<string, MarathonItem>();

class Marathon extends Overlay {
  @onStartup()
  events() {
    eventEmitter.on('subscription', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (value.endTime < Date.now()
          && !value.disableWhenReachedZero
          && (!value.maxEndTime || Date.now() < value.maxEndTime)) {
          value.endTime = Date.now(); // reset endTime
        } else if (value.endTime < Date.now()) {
          return;
        }

        let tier = Number(data.tier);
        if (isNaN(tier)) {
          tier = 1;
        }
        const timeToAdd = value.values.sub[`tier${tier}` as keyof MarathonItem['values']['sub']] * 1000;
        if (value.maxEndTime !== null) {
          value.endTime = Math.min(value.endTime + timeToAdd, value.maxEndTime);
        } else {
          value.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
    eventEmitter.on('resub', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (value.endTime < Date.now()
          && !value.disableWhenReachedZero
          && (!value.maxEndTime || Date.now() < value.maxEndTime)) {
          value.endTime = Date.now(); // reset endTime
        } else if (value.endTime < Date.now()) {
          return;
        }

        let tier = Number(data.tier);
        if (isNaN(tier)) {
          tier = 1;
        }
        const timeToAdd = value.values.resub[`tier${tier}` as keyof MarathonItem['values']['resub']] * 1000;

        if (value.maxEndTime !== null) {
          value.endTime = Math.min(value.endTime + timeToAdd, value.maxEndTime);
        } else {
          value.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
    eventEmitter.on('cheer', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (value.endTime < Date.now()
          && !value.disableWhenReachedZero
          && (!value.maxEndTime || Date.now() < value.maxEndTime)) {
          value.endTime = Date.now(); // reset endTime
        } else if (value.endTime < Date.now()) {
          return;
        }

        // how much time to add
        let multiplier = data.bits / value.values.bits.bits;
        if (!value.values.bits.addFraction) {
          multiplier = Math.floor(multiplier);
        }
        const timeToAdd = value.values.bits.time * multiplier * 1000;

        if (value.maxEndTime !== null) {
          value.endTime = Math.min(value.endTime + timeToAdd, value.maxEndTime);
        } else {
          value.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
    eventEmitter.on('tip', async (data) => {
      await this.updateCache();
      for (const [id, value] of cachedOverlays.entries()) {
        if (value.endTime < Date.now()
          && !value.disableWhenReachedZero
          && (!value.maxEndTime || Date.now() < value.maxEndTime)) {
          value.endTime = Date.now(); // reset endTime
        } else if (value.endTime < Date.now()) {
          return;
        }

        // how much time to add
        let multiplier = Number(data.amountInBotCurrency) / value.values.tips.tips;
        if (!value.values.tips.addFraction) {
          multiplier = Math.floor(multiplier);
        }
        const timeToAdd = value.values.tips.time * multiplier * 1000;

        if (value.maxEndTime !== null) {
          value.endTime = Math.min(value.endTime + timeToAdd, value.maxEndTime);
        } else {
          value.endTime += timeToAdd;
        }
        cachedOverlays.set(id, value);
      }
      await this.flushCache();
    });
  }

  async updateCache() {
    const ids = [];
    const overlays = await OverlayEntity.find();
    for (const overlay of overlays) {
      const groupId = overlay.id;
      const items = overlay.items.filter(o => o.opts.typeId === 'marathon');
      for (const item of items) {
        if (!cachedOverlays.has(`${groupId}|${item.id}`)) {
          cachedOverlays.set(`${groupId}|${item.id}`, item.opts as MarathonItem);
        }
        ids.push(`${groupId}|${item.id}`);
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
    for (const [key, value] of cachedOverlays.entries()) {
      const [groupId, itemId] = key.split('|');
      const overlay = await OverlayEntity.findOneBy({ id: groupId });
      if (overlay) {
        const item = overlay.items.find(o => o.id === itemId);
        if (item) {
          item.opts = value;
        }
        await overlay.save();
      }
    }
  }

  @Get('/:id', { scope: 'public' })
  async checkMarathon(req: Request) {
    if (req.headers.scopes?.includes('overlay:read') || req.headers.scopes?.includes('overlay:manage')) {
      await this.updateCache();
    }
    const key = Array.from(cachedOverlays.keys()).find(id => id.includes(req.params.id));
    return cachedOverlays.get(key ?? '');
  }

  @Post('/:id', { zodValidator: z.object({ time: z.number() }) })
  async addTime(req: Request) {
    await this.updateCache();
    const key = Array.from(cachedOverlays.keys()).find(id => id.includes(req.params.id));
    const item = cachedOverlays.get(key ?? '');
    if (item) {
      if (isNaN(item.endTime) || item.endTime < Date.now()) {
        item.endTime = Date.now();
      }
      item.endTime += req.body.time;
      if (item.maxEndTime !== null && item.endTime) {
        error('MARATHON: cannot set end time bigger than maximum end time');
        item.endTime = item.maxEndTime;
      }
      cachedOverlays.set(key ?? '', item);
    }
    await this.flushCache();
  }
}

const marathon = new Marathon();
export { cachedOverlays, marathon };
export default marathon;
