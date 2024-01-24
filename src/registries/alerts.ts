import { randomUUID } from 'crypto';

import { AlertQueue, EmitData } from '@entity/overlay.js';
import { Mutex } from 'async-mutex';

import Registry from './_interface.js';
import { command, default_permission, example, persistent, settings } from '../decorators.js';
import * as changelog from '../helpers/user/changelog.js';
import twitch from '../services/twitch.js';

import { parserReply } from '~/commons.js';
import { User, UserInterface } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { onStartup } from '~/decorators/on.js';
import { Expects } from  '~/expects.js';
import { isStreamOnline } from '~/helpers/api/isStreamOnline.js';
import { prepare } from '~/helpers/commons/index.js';
import { eventEmitter } from '~/helpers/events/emitter.js';
import { getLocalizedName } from '~/helpers/getLocalizedName.js';
import { debug, info, error } from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { itemsToEvalPart } from '~/helpers/queryFilter.js';
import { adminEndpoint } from '~/helpers/socket.js';
// import eventlist from '~/overlays/eventlist.js';
import { Types } from '~/plugins/ListenTo.js';
import { adminMiddleware } from '~/socket.js';
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

  sockets () {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/registries/alerts/queue/', async (req, res) => {
      const release = await filterMutex.acquire();
      const cmd = await AlertQueue.find();
      res.send({
        data: cmd,
      });
      release();
    });

    app.patch('/api/registries/alerts/queue/:id', adminMiddleware, async (req, res) => {
      const release = await filterMutex.acquire();
      const queue = await AlertQueue.findOneBy({ id: req.params.id });
      if (queue) {
        for (const key of Object.keys(queue)) {
          if (key in req.body && key in queue) {
            (queue as any)[key] = req.body[key];
          }
        }
        await queue.save();
        res.status(200).send();
      } else {
        res.status(404).send();
      }
      release();
    });

    app.post('/api/registries/alerts/queue/:id/extend', async (req, res) => {
      console.log('extend', req.params.id);
      const id = req.params.id;

      if (continousPlayMutex[id]) {
        // increase validity if alert is still in overlay queue prepared to play
        continousPlayMutex[id] = Date.now() + 5000;
      }
      res.status(200).send();
    });

    app.post('/api/registries/alerts/queue/:id/release', async (req, res) => {
      console.log('release', req.params.id);
      const id = req.params.id;

      if (continousPlayMutex[id]) {
        // release mutex
        delete continousPlayMutex[id];
      }
      res.status(200).send();
    });

    app.post('/api/registries/alerts/queue/:id/reset', adminMiddleware, async (req, res) => {
      const release = await filterMutex.acquire();
      const queue = await AlertQueue.findOneBy({ id: req.params.id });
      if (queue) {
        queue.emitData = [];
        queue.save();
        res.status(200).send();
      } else {
        res.status(404).send();
      }
      release();
    });

    app.post('/api/registries/alerts/queue/:id/trigger', adminMiddleware, async (req, res) => {
      const release = await filterMutex.acquire();
      const queue = await AlertQueue.findOneBy({ id: req.params.id });
      if (queue) {
        const data = queue.emitData.shift();
        if (data) {
          queue.save();
          // setting eventId null to skip queue
          this.trigger({ ...data, eventId: null });
        }
        res.status(200).send();
      } else {
        res.status(404).send();
      }
      release();
    });

    app.post('/api/registries/alerts/queue', adminMiddleware, async (req, res) => {
      const release = await filterMutex.acquire();
      try {
        const { count, ...data } = req.body;
        const saved = await AlertQueue.create(data).save();
        res.send({ data: saved });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
      release();
    });

    app.delete('/api/registries/alerts/queue/:id', adminMiddleware, async (req, res) => {
      const release = await filterMutex.acquire();
      const group = await AlertQueue.findOneBy({ id: req.params.id });
      if (group) {
        await group.remove();
        res.status(204).send();
      } else {
        res.status(404).send();
      }
      release();
    });

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

  @onStartup()
  async processQueue() {
    setInterval(async () => {
      // const alert = { 'eventId': null,'event': 'rewardredeem','name': 'TTS','rewardId': '657b57bf-d738-4afb-bcaa-0044089e741f','amount': 0,'tier': null,'currency': '','monthsName': '','message': 'This is test message for testing purposes','recipient': 'soge','isTTSMuted': false,'isSoundMuted': false,'TTSKey': '61e0c62e-6659-4bf4-957b-a6a2028758aa','user': null,'caster': { 'userId': '96965261','userName': 'soge','displayname': 'soge','profileImageUrl': 'https://static-cdn.jtvnw.net/jtv_user_pictures/b963858f-f04d-4da9-ac10-56aa7308cec3-profile_image-300x300.png','isOnline': true,'isVIP': false,'isModerator': false,'isSubscriber': true,'haveSubscriberLock': false,'haveSubscribedAtLock': false,'rank': '','haveCustomRank': false,'subscribedAt': null,'seenAt': '2024-01-17T14:12:58.199Z','createdAt': '2015-07-23T13:14:02.919Z','watchedTime': 19188100748,'chatTimeOnline': 10692060000,'chatTimeOffline': 104930970000,'points': 1494,'pointsOnlineGivenAt': 10692600000,'pointsOfflineGivenAt': 104931900000,'pointsByMessageGivenAt': 5163,'subscribeTier': '3','subscribeCumulativeMonths': 47,'subscribeStreak': 0,'giftedSubscribes': 0,'messages': 5184,'extra': { 'levels': { 'xp': '{"dataType":"BigInt","value":"65352"}','xpOfflineGivenAt': 10692060000,'xpOfflineMessages': 0,'xpOnlineGivenAt': 10691610000,'xpOnlineMessages': 0 },'theme': 'dark' } },'recipientUser': { 'userId': '96965261','userName': 'soge','watchedTime': 19188100748,'points': 1494,'messages': 5184,'subscribeTier': '3','subscribeStreak': 0,'pointsByMessageGivenAt': 5163,'pointsOfflineGivenAt': 104931900000,'pointsOnlineGivenAt': 10692600000,'profileImageUrl': 'https://static-cdn.jtvnw.net/jtv_user_pictures/b963858f-f04d-4da9-ac10-56aa7308cec3-profile_image-300x300.png','rank': '','subscribeCumulativeMonths': 47,'seenAt': '2024-01-17T14:12:58.199Z','subscribedAt': null,'createdAt': '2015-07-23T13:14:02.919Z','giftedSubscribes': 0,'haveCustomRank': false,'haveSubscribedAtLock': false,'haveSubscriberLock': false,'isModerator': false,'isOnline': true,'isSubscriber': true,'isVIP': false,'chatTimeOffline': 104930970000,'chatTimeOnline': 10692060000,'displayname': 'soge','extra': { 'levels': { 'xp': '{"dataType":"BigInt","value":"65352"}','xpOfflineGivenAt': 10692060000,'xpOfflineMessages': 0,'xpOnlineGivenAt': 10691610000,'xpOnlineMessages': 0 },'theme': 'dark' } },'id': '61e0c62e-6659-4bf4-957b-a6a2028758aa' };
      // const eventData = await eventlist.add({
      //   event:         'rewardredeem',
      //   userId:        '12345',
      //   message:       alert.message,
      //   timestamp:     Date.now(),
      //   titleOfReward: 'TTS',
      //   rewardId:      alert.rewardId,
      // });
      // this.trigger({
      //   eventId:    eventData?.id ?? null,
      //   event:      'rewardredeem',
      //   name:       'TTS',
      //   rewardId:   alert.rewardId,
      //   amount:     0,
      //   tier:       null,
      //   currency:   '',
      //   monthsName: '',
      //   message:    alert.message,
      //   recipient:  'test',
      // });

      if (!isStreamOnline.value) {
        // return
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
