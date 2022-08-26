import {
  Alert, AlertCheer, AlertCommandRedeem, AlertFollow, AlertHost, AlertInterface, AlertRaid, AlertResub, AlertSub, AlertSubcommunitygift, AlertSubgift, AlertTip, EmitData,
} from '@entity/alert';
import { MINUTE } from '@sogebot/ui-helpers/constants';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import { getRepository, IsNull } from 'typeorm';
import { v4 } from 'uuid';

import { command, default_permission, example, persistent, settings } from '../decorators';
import Registry from './_interface';

import { parserReply } from '~/commons';
import { User, UserInterface } from '~/database/entity/user';
import Expects from '~/expects';
import { prepare } from '~/helpers/commons';
import { error, debug } from '~/helpers/log';
import { ioServer } from '~/helpers/panel';
import { defaultPermissions } from '~/helpers/permissions';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import * as changelog from '~/helpers/user/changelog.js';
import client from '~/services/twitch/api/client';
import { translate } from '~/translate';
import { variables } from '~/watchers';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

const fetchUserForAlert = (opts: EmitData, type: 'recipient' | 'name'): Promise<Readonly<Required<UserInterface>> & { game?: string } | null> => {
  return new Promise<Readonly<Required<UserInterface>> & { game?: string } | null>((resolve) => {
    if ((opts.event === 'rewardredeems' || opts.event === 'cmdredeems') && type === 'name') {
      return resolve(null); // we don't have user on reward redeems
    }

    const value = opts[type];
    if (value && value.length > 0) {
      client('bot').then(clientBot => {
        Promise.all([
          getRepository(User).findOne({ userName: value }),
          clientBot.users.getUserByName(value),
        ]).then(async ([user_db, response]) => {
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
            if (opts.event === 'promo') {
              const user = await changelog.get(id);
              const channel = await clientBot.channels.getChannelInfoById(id);
              if (user && channel) {
                resolve({
                  ...user,
                  game: channel.gameName,
                });
              } else {
                resolve(null);
              }
            } else {
              resolve(changelog.get(id));
            }
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
        ...opts, isTTSMuted: !tts.ready || this.isTTSMuted, isSoundMuted: this.isSoundMuted, TTSService: tts.service, TTSKey: key, user, game: user?.game, caster, recipientUser: recipient,
      };

      debug('alerts.send', JSON.stringify(data, null, 2));
      ioServer?.of('/registries/alerts').emit('alert', data);
    }
  }

  skip() {
    ioServer?.of('/registries/alerts').emit('skip');
  }
  @settings()
  ['!promo-shoutoutMessage'] = 'Shoutout to $userName! Lastly seen playing (stream|$userName|game). $customMessage';
  @settings()
  ['!promo-enableShoutoutMessage'] = true;
  @command('!promo')
  @example([
    [
      '?!promo <username> <optionalMessage>',
    ],
    [
      '+!promo soge',
      { if: 'enableShoutoutMessage', message: '-{shoutoutMessage}', replace: { $userName: 'soge', $customMessage: '' } },
    ],
    [
      '+!promo soge Hey! Give him a follow!',
      { if: 'enableShoutoutMessage', message: '-{shoutoutMessage}', replace: { $userName: 'soge', $customMessage: 'Hey! Give him a follow!' } },
    ],
  ])
  @default_permission(defaultPermissions.MODERATORS)
  async promo(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [ userName, customMessage ] = new Expects(opts.parameters)
        .username()
        .everything({ optional: true })
        .toArray();

      const message = await prepare(this['!promo-shoutoutMessage'], {
        userName, customMessage: customMessage ?? '',
      }, false);
      this['!promo-enableShoutoutMessage'] && parserReply(message, { sender: opts.sender, discord: opts.discord, attr: opts.attr, id: '', forbidReply: true });
      this.trigger({
        event:      'promo',
        message:    customMessage,
        name:       userName,
        tier:       '1',
        amount:     0,
        currency:   '',
        monthsName: '',
      });
    } catch (err) {
      console.log({ err });
    }
    return [];
  }
}

export default new Alerts();
