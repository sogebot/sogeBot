import { Overlay as OverlayEntity } from '@entity/overlay.js';
import { Request } from 'express';
import { z } from 'zod';

import Overlay from './_interface.js';

import { AppDataSource } from '~/database.js';
import { Post } from '~/decorators/endpoint.js';
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

class Countdown extends Overlay {
  @Post('/:id/start')
  async start(req: Request) {
    statusUpdate.set(req.params.id, {
      isEnabled: true,
      time:      checks.get(req.params.id)?.time ?? 0,
      timestamp: Date.now(),
    });
  }
  @Post('/:id/stop')
  async stop(req: Request) {
    statusUpdate.set(req.params.id, {
      isEnabled: false,
      time:      checks.get(req.params.id)?.time ?? 0,
      timestamp: Date.now(),
    });
  }
  @Post('/:id/toggle')
  async toggle(req: Request) {
    const check = checks.get(req.params.id);
    statusUpdate.set(req.params.id, {
      isEnabled: !check?.isEnabled,
      time:      check?.time ?? 0,
      timestamp: Date.now(),
    });
  }

  @Post('/:id/set', { zodValidator: z.object({ time: z.number() }) })
  async set(req: Request) {
    const time = req.body.time as number;
    const overlays = await AppDataSource.getRepository(OverlayEntity).find();
    for (const overlay of overlays) {
      const item = overlay.items.find(o => o.id === req.params.id);
      if (item && item.opts.typeId === 'countdown') {
        item.opts.time = time;
        item.opts.currentTime = time;
        await overlay.save();
      }
    }

    statusUpdate.set(req.params.id, {
      isEnabled: null,
      time:      time,
      timestamp: Date.now(),
    });
  }
  @Post('/:id/update', { scope: 'public', zodValidator: z.object({ time: z.number(), isEnabled: z.boolean() }) })
  async update(req: Request) {
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
    statusUpdate.delete(req.params.id);

    // we need to check if persistent
    const overlays = await AppDataSource.getRepository(OverlayEntity).find();
    for (const overlay of overlays) {
      const item = overlay.items.find(o => o.id === req.params.id);
      if (item && item.opts.typeId === 'countdown' && item.opts.isPersistent) {
        item.opts.currentTime = req.body.time;
        await overlay.save();
      }
      return statusUpdate.get(req.params.id);
    }
  }
  @Post('/:id/check')
  async check(req: Request) {
    const update = checks.get(req.params.id);
    if (update) {
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
    } else {
      return undefined;
    }
  }
  @Post('/:id', { zodValidator: z.object({ isEnabled: z.boolean(), time: z.number() }) })
  async save(req: Request) {
    checks.set(req.params.id, {
      timestamp: Date.now(),
      isEnabled: req.body.isEnabled,
      time:      req.body.time,
    });
  }
}

export default new Countdown();
