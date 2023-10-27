import {
  Alert, EmitData,
} from '@entity/alert.js';
import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import { v4 } from 'uuid';

import Registry from './_interface.js';
import { command, default_permission, example, persistent, settings } from '../decorators.js';

import { parserReply } from '~/commons.js';
import { User, UserInterface } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { Expects } from  '~/expects.js';
import { prepare } from '~/helpers/commons/index.js';
import { eventEmitter } from '~/helpers/events/emitter.js';
import { error, debug, info } from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';
import * as changelog from '~/helpers/user/changelog.js';
import { Types } from '~/plugins/ListenTo.js';
import twitch from '~/services/twitch.js';
import { adminMiddleware } from '~/socket.js';
import { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

/* secureKeys are used to authenticate use of public overlay endpoint */
const secureKeys = new Set<string>();

const fetchUserForAlert = (opts: EmitData, type: 'recipient' | 'name'): Promise<Readonly<Required<UserInterface>> & { game?: string } | null> => {
  return new Promise<Readonly<Required<UserInterface>> & { game?: string } | null>((resolve) => {
    if ((opts.event === 'rewardredeem' || opts.event === 'custom') && type === 'name') {
      return resolve(null); // we don't have user on reward redeems
    }

    const value = opts[type];
    if (value && value.length > 0) {
      Promise.all([
        AppDataSource.getRepository(User).findOneBy({ userName: value }),
        twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(value)),
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
            const channel = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.channels.getChannelInfoById(id));
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
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    eventEmitter.on(Types.onChannelShoutoutCreate, (opts) => {
      this.trigger({
        event:      'promo',
        message:    '',
        name:       opts.shoutedOutBroadcasterDisplayName,
        tier:       '1',
        amount:     opts.viewerCount,
        currency:   '',
        monthsName: '',
      });
    });

    app.get('/api/registries/alerts', adminMiddleware, async (req, res) => {
      res.send(await Alert.find());
    });

    app.get('/api/registries/alerts/:id', async (req, res) => {
      try {
        res.send(await Alert.findOneByOrFail({ id: req.params.id }));
      } catch {
        res.status(404).send();
      }
    });

    app.delete('/api/registries/alerts/:id', adminMiddleware, async (req, res) => {
      await Alert.delete({ id: req.params.id });
      res.status(404).send();
    });

    app.post('/api/registries/alerts', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = Alert.create(req.body);
        await itemToSave.validateAndSave();
        res.send(itemToSave);
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });

    publicEndpoint('/registries/alerts', 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        const { default: tts, services } = await import ('../tts.js');
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
        const alert = await Alert.findOneBy({ id });
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
    adminEndpoint('/registries/alerts', 'test', async (data: EmitData) => {
      this.trigger({
        ...data,
        monthsName: getLocalizedName(data.amount, translate('core.months')),
      }, true);
    });

    publicEndpoint('/registries/alerts', 'speak', async (opts, cb) => {
      if (secureKeys.has(opts.key)) {
        secureKeys.delete(opts.key);

        const { default: tts, services } = await import ('../tts.js');
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
    const { default: tts, services } = await import ('../tts.js');
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
      const caster = await AppDataSource.getRepository(User).findOneBy({ userId: broadcasterId }) ?? null;

      const data = {
        ...opts, isTTSMuted: !tts.ready || this.isTTSMuted, isSoundMuted: this.isSoundMuted, TTSService: tts.service, TTSKey: key, user, game: user?.game, caster, recipientUser: recipient, id: v4(),
      };

      info(`Triggering alert send: ${JSON.stringify(data)}`);
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
