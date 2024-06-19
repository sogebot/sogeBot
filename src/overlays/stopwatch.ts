import { Overlay as OverlayEntity } from '@entity/overlay.js';
import { Request } from 'express';
import { z } from 'zod';

import Overlay from './_interface.js';

import { AppDataSource } from '~/database.js';
import { ErrorNotFound, Get, Post } from '~/decorators/endpoint.js';
import { MINUTE, SECOND } from '~/helpers/constants.js';

const checks = new Map<string, { timestamp: number; isEnabled: boolean; time: number; }>();
const statusUpdate = new Map<string, { timestamp: number; isEnabled: boolean | null; time: number | null; }>();

setInterval(() => {
  // remove all checks and statusUpdate if last data were 10 minutes long
  for (const key of checks.keys()) {
    if (Date.now() - (checks.get(key)?.timestamp ?? 0) > 10 * MINUTE) {
      checks.delete(key);
    }
  }
  for (const key of statusUpdate.keys()) {
    if (Date.now() - (statusUpdate.get(key)?.timestamp ?? 0) > 10 * MINUTE) {
      statusUpdate.delete(key);
    }
  }
}, 30 * SECOND);

class Stopwatch extends Overlay {
  @Post('/api/overlays/stopwatch/:id/:operation')
  async updateOperation(req: Request) {
    const check = checks.get(req.params.id);
    const operationEnableList = {
      stop:         false,
      start:        true,
      toggle:       !check?.isEnabled,
      resetAndStop: false,
    };

    statusUpdate.set(req.params.id, {
      isEnabled: operationEnableList[req.params.operation as keyof typeof operationEnableList] ?? null,
      time:      req.params.operation.includes('reset') ? 0 : check?.time ?? 0,
      timestamp: Date.now(),
    });
  }

  @Get('/api/overlays/stopwatch/:id')
  async check(req: Request) {
    const update = checks.get(req.params.id);
    if (!update) {
      throw new ErrorNotFound();
    }
    const update2 = statusUpdate.get(req.params.id);
    if (update2) {
      if (update2.isEnabled !== null) {
        update.isEnabled = update2.isEnabled;
      }
      if (update2.time !== null) {
        update.time = update2.time;
      }
    }
    return update;
  }

  @Post('/:id', { zodValidator: z.object({ isEnabled: z.boolean().optional(), time: z.number().optional() }) })
  async update(req: Request) {
    statusUpdate.set(req.params.id, {
      isEnabled: req.body.isEnabled,
      time:      req.body.time,
      timestamp: Date.now(),
    });
  }

  @Post('/tick/:groupId/:id', { scope: 'public', zodValidator: z.object({ isEnabled: z.boolean(), time: z.number() }) })
  async tick(req: Request) {
    const update = {
      timestamp: Date.now(),
      isEnabled: req.body.isEnabled,
      time:      req.body.time,
    };

    const update2 = statusUpdate.get(req.params.id);
    if (update2) {
      if (update2.isEnabled !== null) {
        update.isEnabled = update2.isEnabled;
      }
      if (update2.time !== null) {
        update.time = update2.time;
      }
    }

    checks.set(req.params.id, update);
    const data = statusUpdate.get(req.params.id);

    statusUpdate.delete(req.params.id);

    // we need to check if persistent
    const overlay = await AppDataSource.getRepository(OverlayEntity).findOneBy({ id: req.params.groupId });
    if (overlay) {
      const item = overlay.items.find(o => o.id === req.params.id);
      if (item && item.opts.typeId === 'stopwatch') {
        if (item.opts && item.opts.isPersistent) {
          item.opts.currentTime = req.body.time;
          await overlay.save();
        }
      }
    }
    return data;
  }
}

export default new Stopwatch();
