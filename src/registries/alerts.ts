import { randomUUID } from 'crypto';

import { AlertQueue, EmitData } from '@entity/overlay.js';
import { Mutex } from 'async-mutex';
import { Request } from 'express';
import { z } from 'zod';

import Registry from './_interface.js';
import { command, default_permission, example, persistent, settings } from '../decorators.js';
import * as changelog from '../helpers/user/changelog.js';
import twitch from '../services/twitch.js';

import { parserReply } from '~/commons.js';
import { User, UserInterface } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { Delete, ErrorNotFound, Get, Patch, Post } from '~/decorators/endpoint.js';
import { onStartup } from '~/decorators/on.js';
import { Expects } from  '~/expects.js';
import { isStreamOnline } from '~/helpers/api/isStreamOnline.js';
import { prepare } from '~/helpers/commons/index.js';
import { eventEmitter } from '~/helpers/events/emitter.js';
import { getLocalizedName } from '~/helpers/getLocalizedName.js';
import { debug, info, error } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { itemsToEvalPart } from '~/helpers/queryFilter.js';
import { Types } from '~/plugins/ListenTo.js';
import { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

const filterMutex = new Mutex();
const continousPlayMutex: {
  [queueId: string]: number;
} = {};
setInterval(() => {
  for (const [ queueId, validUntil ] of Object.entries(continousPlayMutex)) {
    if (validUntil < Date.now()) {
      delete continousPlayMutex[queueId];
    }
  }
}, 1000);

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

  @Get('/queue')
  async queue() {
    const release = await filterMutex.acquire();
    const cmd = await AlertQueue.find();
    release();
    return cmd;
  }

  @Patch('/queue/:id')
  async queuePatch(req: Request) {
    const release = await filterMutex.acquire();
    const queue = await AlertQueue.findOneBy({ id: req.params.id });
    if (queue) {
      for (const key of Object.keys(queue)) {
        if (key in req.body && key in queue) {
          (queue as any)[key] = req.body[key];
        }
      }
      await queue.save();
    }
    release();
  }

  @Post('/queue/:id/extend')
  async queueExtend(req: Request) {
    const id = req.params.id;

    if (continousPlayMutex[id]) {
      // increase validity if alert is still in overlay queue prepared to play
      continousPlayMutex[id] = Date.now() + 5000;
    }
  }

  @Post('/queue/:id/release')
  async queueRelease(req: Request) {
    const id = req.params.id;

    if (continousPlayMutex[id]) {
      // release mutex
      delete continousPlayMutex[id];
    }
  }

  @Post('/queue/:id/reset')
  async queueReset(req: Request) {
    const release = await filterMutex.acquire();
    const queue = await AlertQueue.findOneBy({ id: req.params.id });
    release();
    if (queue) {
      queue.emitData = [];
      queue.save();
    } else {
      throw new ErrorNotFound();
    }
  }

  @Post('/queue/:id/trigger')
  async queueTrigger(req: Request) {
    const release = await filterMutex.acquire();
    const queue = await AlertQueue.findOneBy({ id: req.params.id });
    release();
    if (queue) {
      const data = queue.emitData.shift();
      if (data) {
        queue.save();
        // setting eventId null to skip queue
        this.trigger({ ...data, eventId: null });
      }
    } else {
      throw new ErrorNotFound();
    }
  }

  @Post('/queue')
  async save(req: Request) {
    const release = await filterMutex.acquire();
    const { count, ...data } = req.body;
    setTimeout(() => release(), 100);
    return AlertQueue.create(data).save();
  }

  @Delete('/queue/:id')
  async delete(req: Request) {
    const release = await filterMutex.acquire();
    const queue = await AlertQueue.findOneBy({ id: req.params.id });
    if (queue) {
      await queue.remove();
    }
    release();
  }

  @Post('/settings', {
    zodValidator: z.object({
      areAlertsMuted: z.boolean(),
      isSoundMuted:   z.boolean(),
      isTTSMuted:     z.boolean(),
    }),
  })
  async postSettings(req: Request) {
    const { areAlertsMuted, isSoundMuted, isTTSMuted } = req.body;

    if (req.body) {
      this.areAlertsMuted = areAlertsMuted;
      this.isSoundMuted = isSoundMuted;
      this.isTTSMuted = isTTSMuted;
    }

    return {
      areAlertsMuted: this.areAlertsMuted,
      isSoundMuted:   this.isSoundMuted,
      isTTSMuted:     this.isTTSMuted,
    };
  }
  @Get('/settings')
  async getSettings() {
    return {
      areAlertsMuted: this.areAlertsMuted,
      isSoundMuted:   this.isSoundMuted,
      isTTSMuted:     this.isTTSMuted,
    };
  }

  @Post('/', { action: 'test' })
  async test(req: Request) {
    this.trigger({
      ...req.body,
      monthsName: getLocalizedName(req.body.amount, translate('core.months')),
    }, true);
  }

  sockets () {
    eventEmitter.on(Types.onChannelShoutoutCreate, (opts) => {
      this.trigger({
        eventId:    randomUUID(), // randomizing eventId, we are not saving it to eventlist but we want it to be queued
        event:      'promo',
        message:    '',
        name:       opts.shoutedOutBroadcasterDisplayName,
        tier:       '1',
        amount:     opts.viewerCount,
        currency:   '',
        monthsName: '',
      });
    });
  }

  @onStartup()
  async processQueue() {
    setInterval(async () => {
      if (!isStreamOnline.value) {
        return;
      }
      const queues = await AlertQueue.find();
      for (const queue of queues) {
        if (queue.play && !(queue.id in continousPlayMutex)) {
          if (queue.emitData.length > 0) {
            const data = queue.emitData.shift();
            if (data) {
              queue.save();
              continousPlayMutex[queue.id] = Date.now() + 5000;
              this.trigger({ ...data, queueId: queue.id }, false);
            }
          }
        }
      }
    }, 1000);
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
        ...opts,
        isTTSMuted:    this.isTTSMuted,
        isSoundMuted:  this.isSoundMuted,
        TTSKey:        key,
        user,
        game:          user?.game,
        caster,
        recipientUser: recipient,
        id:            key,
      };

      // if we have queueId, we want to send alert directly to overlay
      const queue = data.queueId ? null : await this.getValidQueue(data);
      if (queue && !queue.passthrough && data.eventId) {
        info(`Alert is in queue#${queue.id}: ${JSON.stringify(data)}`);
        queue.emitData.push(data);
        await queue.save();
      } else {
        info(`Triggering alert send: ${JSON.stringify(data)}`);
        ioServer?.of('/registries/alerts').emit('alert', data);
      }
    }
  }

  async getValidQueue(data: EmitData) {
    const queues = await AlertQueue.find();
    for (const queue of queues) {
      const filter = queue.filter[data.event];
      if (filter === null) {
        // if filter is null, it means that we want to queue alert on every event
        return queue;
      }
      if (filter && filter.items) {
        // if filter is not null, we want to check if alert matches filter
        const script = itemsToEvalPart(filter.items, filter.operator);
        const tierAsNumber = data.tier === 'Prime' ? 0 : Number(data.tier);

        {
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
          const rewardId =  data.rewardId;
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
        eventId:    randomUUID(), // randomizing eventId, we are not saving it to eventlist but we want it to be queued
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
