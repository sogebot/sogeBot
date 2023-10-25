import { Overlay as OverlayEntity } from '@entity/overlay.js';
import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants.js';

import Overlay from './_interface.js';

import { AppDataSource } from '~/database.js';
import { app } from '~/helpers/panel.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';
import { adminMiddleware } from '~/socket.js';

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
  sockets () {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.post('/api/overlays/countdown/:id/:operation', adminMiddleware, async (req, res) => {
      const check = checks.get(req.params.id);
      const operationEnableList = {
        stop:   false,
        start:  true,
        toggle: !check?.isEnabled,
      };

      let time: null | number = null;

      if (req.params.operation === 'set') {
        time = !isNaN(Number(req.body.time)) ? Number(req.body.time) : null;
        if (!time) {
          res.status(400).send(`Invalid time value, expected number, got ${typeof req.body.time}.`);
          return;
        }
        const overlays = await AppDataSource.getRepository(OverlayEntity).find();
        for (const overlay of overlays) {
          const item = overlay.items.find(o => o.id === req.params.id);
          if (item && item.opts.typeId === 'countdown') {
            item.opts.time = time;
            item.opts.currentTime = time;
            await overlay.save();
          }
        }
      }

      statusUpdate.set(req.params.id, {
        isEnabled: operationEnableList[req.params.operation as keyof typeof operationEnableList] ?? null,
        time:      req.params.operation === 'set' && time ? time: check?.time ?? 0,
        timestamp: Date.now(),
      });

      res.status(204).send();
    });

    publicEndpoint('/overlays/countdown', 'countdown::update', async (data: { id: string, isEnabled: boolean, time: number }, cb) => {
      const update = {
        timestamp: Date.now(),
        isEnabled: data.isEnabled,
        time:      data.time,
      };

      const update2 = statusUpdate.get(data.id);
      if (update2) {
        if (update2.isEnabled !== null) {
          update.isEnabled = update2.isEnabled;
        }
        if (update2.time !== null) {
          update.time = update2.time;
        }
      }

      checks.set(data.id, update);
      cb(null, statusUpdate.get(data.id));
      statusUpdate.delete(data.id);

      // we need to check if persistent
      const overlays = await AppDataSource.getRepository(OverlayEntity).find();
      for (const overlay of overlays) {
        const item = overlay.items.find(o => o.id === data.id);
        if (item && item.opts.typeId === 'countdown' && item.opts.isPersistent) {
          item.opts.currentTime = data.time;
          await overlay.save();
        }
      }
    });
    adminEndpoint('/overlays/countdown', 'countdown::check', async (countdownId: string, cb) => {
      const update = checks.get(countdownId);
      if (update) {
        const update2 = statusUpdate.get(countdownId);
        if (update2) {
          if (update2.isEnabled !== null) {
            update.isEnabled = update2.isEnabled;
          }
          if (update2.time !== null) {
            update.time = update2.time;
          }
        }
        cb(null, update);
      } else {
        cb(null, undefined);
      }
    });
    adminEndpoint('/overlays/countdown', 'countdown::update::set', async (data: { id: string, isEnabled: boolean | null, time: number | null }) => {
      statusUpdate.set(data.id, {
        isEnabled: data.isEnabled,
        time:      data.time,
        timestamp: Date.now(),
      });
    });
  }
}

export default new Countdown();
