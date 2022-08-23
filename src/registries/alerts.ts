import {
  Alert, AlertCheer, AlertCommandRedeem, AlertFollow, AlertHost, AlertInterface, AlertRaid, AlertResub, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertTip, EmitData,
} from '@entity/alert';
import { MINUTE } from '@sogebot/ui-helpers/constants';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import { getRepository, IsNull } from 'typeorm';
import { v4 } from 'uuid';

import { persistent } from '../decorators';
import Registry from './_interface';

import { User, UserInterface } from '~/database/entity/user';
import { error, debug } from '~/helpers/log';
import { ioServer } from '~/helpers/panel';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import * as changelog from '~/helpers/user/changelog.js';
import client from '~/services/twitch/api/client';
import { translate } from '~/translate';
import { variables } from '~/watchers';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

const fetchUserForAlert = (opts: EmitData, type: 'recipient' | 'name'): Promise<Readonly<Required<UserInterface>> | null> => {
  return new Promise<Readonly<Required<UserInterface>> | null>((resolve) => {
    if ((opts.event === 'rewardredeems' || opts.event === 'cmdredeems') && type === 'name') {
      return resolve(null); // we don't have user on reward redeems
    }

    const value = opts[type];
    if (value && value.length > 0) {
      client('bot').then(clientBot => {
        Promise.all([
          getRepository(User).findOne({ userName: value }),
          clientBot.users.getUserByName(value),
        ]).then(([user_db, response]) => {
          if (response) {
            changelog.update(response.id, {
              userId:          response.id,
              userName:        response.name,
              displayname:     response.displayName,
              profileImageUrl: response.profilePictureUrl,
            });
          }
          const id = user_db?.userId || response?.id;
          if (id) {
            resolve(changelog.get(id));
          } else {
            resolve(null);
          }
        }).catch((e) => {
          if (e instanceof Error) {
            error(e.stack || e.message);
          }
          resolve(null);
        });
      }).catch((e) => {
        if (e instanceof Error) {
          error(e.stack || e.message);
        }
        resolve(null);
      });
    } else {
      resolve(null);
    }
  });
};

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
    publicEndpoint('/registries/alerts', 'speak', async (opts, cb) => {
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
    publicEndpoint('/registries/alerts', 'isAlertUpdated', async ({ updatedAt, id }, cb) => {
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
    adminEndpoint('/registries/alerts', 'alerts::settings', async (data, cb) => {
      if (data) {
        this.areAlertsMuted = data.areAlertsMuted;
        this.isSoundMuted = data.isSoundMuted;
        this.isTTSMuted = data.isTTSMuted;
      }

      cb({
        areAlertsMuted: this.areAlertsMuted,
        isSoundMuted:   this.isSoundMuted,
        isTTSMuted:     this.isTTSMuted,
      });
    });
    adminEndpoint('/registries/alerts', 'alerts::save', async (item, cb) => {
      try {
        cb(
          null,
          await getRepository(Alert).save(item),
        );
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
    adminEndpoint('/registries/alerts', 'alerts::delete', async (item: Required<AlertInterface>, cb) => {
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
    adminEndpoint('/registries/alerts', 'test', async (data: EmitData) => {
      this.trigger({
        ...data,
        monthsName: getLocalizedName(data.amount, translate('core.months')),
      }, true);
    });

    publicEndpoint('/registries/alerts', 'speak', async (opts, cb) => {
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

  async trigger(opts: EmitData, isTest = false) {
    debug('alerts.trigger', JSON.stringify(opts, null, 2));
    const { default: tts, services } = await import ('../tts');
    if (!this.areAlertsMuted || isTest) {
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

      const [ user, recipient ] = await Promise.all([
        fetchUserForAlert(opts, 'name'),
        fetchUserForAlert(opts, 'recipient'),
      ]);

      // search for user triggering alert
      const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
      const caster = await getRepository(User).findOne({ userId: broadcasterId }) ?? null;

      const data = {
        ...opts, isTTSMuted: !tts.ready || this.isTTSMuted, isSoundMuted: this.isSoundMuted, TTSService: tts.service, TTSKey: key, user, caster, recipientUser: recipient,
      };

      debug('alerts.send', JSON.stringify(data, null, 2));
      ioServer?.of('/registries/alerts').emit('alert', data);
    }
  }

  skip() {
    ioServer?.of('/registries/alerts').emit('skip');
  }
}

export default new Alerts();
