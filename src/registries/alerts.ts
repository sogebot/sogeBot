import {
  Alert, AlertCheer, AlertCommandRedeem, AlertFollow, AlertHost, AlertInterface, AlertRaid, AlertResub, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertTip, EmitData,
} from '@entity/alert';
import { MINUTE } from '@sogebot/ui-helpers/constants';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import { getRepository, IsNull } from 'typeorm';
import { v4 } from 'uuid';

import { persistent } from '../decorators';
import Registry from './_interface';

import { User } from '~/database/entity/user';
import { ioServer } from '~/helpers/panel';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import client from '~/services/twitch/api/client';
import { translate } from '~/translate';
import { variables } from '~/watchers';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

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
    publicEndpoint(this.nsp, 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        const { default: tts, services } = await import ('../tts');
        if (!tts.ready) {
          cb(new Error('TTS is not properly set and ready.'));
          return;
        }

        if (tts.service === services.GOOGLE) {
          try {
            const audioContent = await tts.googleSpeak(opts);
            cb(null, audioContent);
          } catch (e) {
            cb(e);
          }
        }
      } else {
        cb(new Error('Invalid auth.'));
      }
    });
    publicEndpoint(this.nsp, 'isAlertUpdated', async ({ updatedAt, id }: { updatedAt: number; id: string }, cb: (err: Error | null, isUpdated: boolean, updatedAt: number) => void) => {
      try {
        const alert = await getRepository(Alert).findOne({ id });
        if (alert) {
          cb(null, updatedAt < (alert.updatedAt || 0), alert.updatedAt || 0);
        } else {
          cb(null, false, 0);
        }
      } catch (e: any) {
        cb(e.stack, false, 0);
      }
    });
    adminEndpoint(this.nsp, 'alerts::save', async (item, cb) => {
      try {
        cb(
          null,
          await getRepository(Alert).save(item),
        );
      } catch (e: any) {
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
      } catch (e: any) {
        cb(e.stack);
      }
    });
    publicEndpoint(this.nsp, 'test', async (data: EmitData) => {
      this.trigger({
        ...data,
        monthsName: getLocalizedName(data.amount, translate('core.months')),
      });
    });

    publicEndpoint(this.nsp, 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        const { default: tts, services } = await import ('../tts');
        if (!tts.ready) {
          cb(new Error('TTS is not properly set and ready.'));
          return;
        }

        if (tts.service === services.GOOGLE) {
          try {
            const audioContent = await tts.googleSpeak(opts);
            cb(null, audioContent);
          } catch (e) {
            cb(e);
          }
        }
      } else {
        cb(new Error('Invalid auth.'));
      }
    });
  }

  async trigger(opts: EmitData) {
    const { default: tts, services } = await import ('../tts');
    if (!this.areAlertsMuted) {
      let key = v4();
      if (tts.service === services.RESPONSIVEVOICE) {
        key = tts.responsiveVoiceKey;
      }
      if (tts.service === services.GOOGLE) {
        // add secureKey
        secureKeys.add(key);
        setTimeout(() => {
          secureKeys.delete(key);
        }, 10 * MINUTE);
      }

      secureKeys.add(key);

      // search for user triggering alert
      const user = await getRepository(User).findOne({ userName: opts.name });

      let recipient = null;
      if (opts.recipient) {
        // search for user triggering alert
        recipient = await getRepository(User).findOne({ userName: opts.recipient }) ?? null;
      }

      // search for user triggering alert
      const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
      const caster = await getRepository(User).findOne({ userId: broadcasterId }) ?? null;

      const data = {
        ...opts, isTTSMuted: !tts.ready || this.isTTSMuted, isSoundMuted: this.isSoundMuted, TTSService: tts.service, TTSKey: key, user: null, caster, recipientUser: recipient,
      };

      if (user || (!user && opts.event !== 'tips')) {
        const clientBot = await client('bot');
        const response = await clientBot.users.getUserByName(opts.name);
        if (response) {
          const responseUser = await getRepository(User).save({
            userId:          response.id,
            userName:        response.name,
            displayname:     response.displayName,
            profileImageUrl: response.profilePictureUrl,
          });

          ioServer?.of('/registries/alerts').emit('alert', {
            ...data, user: { ...user, ...responseUser },
          });
        } else {
          ioServer?.of('/registries/alerts').emit('alert', {
            ...data, user,
          });
        }
      } else {
        ioServer?.of('/registries/alerts').emit('alert', data);
      }
    }
  }

  skip() {
    ioServer?.of('/registries/alerts').emit('skip');
  }
}

export default new Alerts();
