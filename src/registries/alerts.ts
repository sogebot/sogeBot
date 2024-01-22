import { AlertQueue, EmitData } from '@entity/overlay.js';
import { itemsToEvalPart } from '@sogebot/commons/queryFilter.js';

import Registry from './_interface.js';
import { command, default_permission, example, persistent, settings } from '../decorators.js';
import * as changelog from '../helpers/user/changelog.js';
import twitch from '../services/twitch.js';

import { parserReply } from '~/commons.js';
import { User, UserInterface } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { Expects } from  '~/expects.js';
import { prepare } from '~/helpers/commons/index.js';
import { eventEmitter } from '~/helpers/events/emitter.js';
import { getLocalizedName } from '~/helpers/getLocalizedName.js';
import { debug, info, error } from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { adminEndpoint } from '~/helpers/socket.js';
import { Types } from '~/plugins/ListenTo.js';
import { adminMiddleware } from '~/socket.js';
import { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

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

  sockets () {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/registries/alerts/queue/', async (req, res) => {
      const cmd = await AlertQueue.find({
        select: [ 'id' ],
      });
      res.send({
        data: cmd,
      });
    });

    app.post('/api/registries/alerts/queue/:id/trigger', adminMiddleware, async (req, res) => {
      const queue = await AlertQueue.findOneBy({ id: req.params.id });
      if (queue && queue.play) {
        const data = queue.emitData.shift();
        if (data) {
          queue.save();
          this.trigger(data);
        }
      }
      res.send().status(200);
    });

    app.get('/api/registries/alerts/queue/:id', async (req, res) => {
      const cmd = await AlertQueue.findOneBy({ id: req.params.id });
      res.send({
        data: cmd,
      });
    });

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
  }

  async trigger(opts: EmitData, isTest = false) {
    debug('alerts.trigger', JSON.stringify(opts, null, 2));
    const { generateAndAddSecureKey } = await import ('../tts.js');
    const key = generateAndAddSecureKey();

    if (!this.areAlertsMuted || isTest) {
      const [ user, recipient ] = await Promise.all([
        fetchUserForAlert(opts, 'name'),
        fetchUserForAlert(opts, 'recipient'),
      ]);

      // search for user triggering alert
      const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
      const caster = await AppDataSource.getRepository(User).findOneBy({ userId: broadcasterId }) ?? null;

      const data = {
        ...opts, isTTSMuted: this.isTTSMuted, isSoundMuted: this.isSoundMuted, TTSKey: key, user, game: user?.game, caster, recipientUser: recipient, id: key,
      };

      // todo: check if alert is in queue
      const queue = await this.getValidQueue(data);
      if (queue && !queue.passthrough) {
        info(`Alert is in queue: ${queue.id}`);
        queue.emitData.push(data);
        await queue.save();
        await AlertQueue.create({ emitData: data }).save();
      } else {
        info(`Triggering alert send: ${JSON.stringify(data)}`);
        ioServer?.of('/registries/alerts').emit('alert', data);
      }
    }
  }

  async getValidQueue(data: EmitData) {
    const queues = await AlertQueue.find();
    for (const queue of queues) {
      if (queue.filter && queue.filter.items) {
        const script = itemsToEvalPart(queue.filter.items, queue.filter.operator);
        const tierAsNumber = data.tier === 'Prime' ? 0 : Number(data.tier);

        {
          // @ts-expect-error: TS6133
          const event =     data.event;
          // @ts-expect-error: TS6133
          const username =  data.name;
          // @ts-expect-error: TS6133
          const name =      data.name;
          // @ts-expect-error: TS6133
          const game =      data.game || '';
          // @ts-expect-error: TS6133
          const amount =    data.amount;
          // @ts-expect-error: TS6133
          const service =   data.service;
          // @ts-expect-error: TS6133
          const message =   data.message;
          // @ts-expect-error: TS6133
          const tier =      tierAsNumber;
          // @ts-expect-error: TS6133
          const recipient = data.recipient;
          if (eval(script)) {
            return queue;
          }
        }
      }
    }
    return null;
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
