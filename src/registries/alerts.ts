import { getRepository, IsNull } from 'typeorm';

import {
  Alert, AlertCheer, AlertCommandRedeem, AlertFollow, AlertHost, AlertInterface, AlertRaid, AlertResub, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertTip, EmitData,
} from '../database/entity/alert';
import { persistent } from '../decorators';
import { getLocalizedName } from '../helpers/getLocalized';
import { ioServer } from '../helpers/panel';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { translate } from '../translate';
import Registry from './_interface';

class Alerts extends Registry {
  @persistent()
  areAlertsMuted = false;
  @persistent()
  isTTSMuted = false;
  @persistent()
  isSoundMuted = false;

  constructor() {
    super();
    this.addMenu({
      category: 'registry', name: 'alerts', id: 'registry/alerts/', this: null,
    });
  }

  sockets () {
    publicEndpoint(this.nsp, 'isAlertUpdated', async ({ updatedAt, id }: { updatedAt: number; id: string }, cb: (err: Error | null, isUpdated: boolean, updatedAt: number) => void) => {
      try {
        const alert = await getRepository(Alert).findOne({ id });
        if (alert) {
          cb(null, updatedAt < (alert.updatedAt || 0), alert.updatedAt || 0);
        } else {
          cb(null, false, 0);
        }
      } catch (e) {
        cb(e.stack, false, 0);
      }
    });
    adminEndpoint(this.nsp, 'alerts::save', async (item, cb) => {
      try {
        cb(
          null,
          await getRepository(Alert).save(item),
        );
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'alerts::delete', async (item: Required<AlertInterface>, cb) => {
      try {
        await getRepository(Alert).remove(item);
        await getRepository(AlertFollow).delete({ alertId: IsNull() });
        await getRepository(AlertSub).delete({ alertId: IsNull() });
        await getRepository(AlertSubgift).delete({ alertId: IsNull() });
        await getRepository(AlertSubcommunitygift).delete({ alertId: IsNull() });
        await getRepository(AlertHost).delete({ alertId: IsNull() });
        await getRepository(AlertRaid).delete({ alertId: IsNull() });
        await getRepository(AlertTip).delete({ alertId: IsNull() });
        await getRepository(AlertCheer).delete({ alertId: IsNull() });
        await getRepository(AlertResub).delete({ alertId: IsNull() });
        await getRepository(AlertCommandRedeem).delete({ alertId: IsNull() });
        if (cb) {
          cb(null);
        }
      } catch (e) {
        cb(e.stack);
      }
    });
    publicEndpoint(this.nsp, 'test', async (data: EmitData) => {
      this.trigger({
        ...data,
        monthsName: getLocalizedName(data.amount, translate('core.months')),
      });
    });
  }

  trigger(opts: EmitData) {
    if (!this.areAlertsMuted) {
      ioServer?.of('/registries/alerts').emit('alert', {
        ...opts, isTTSMuted: this.isTTSMuted, isSoundMuted: this.isSoundMuted,
      });
    }
  }

  skip() {
    ioServer?.of('/registries/alerts').emit('skip');
  }
}

export default new Alerts();
