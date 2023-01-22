import { SECOND } from '@sogebot/ui-helpers/constants';

import * as channelPoll from '~/helpers/api/channelPoll';

import { EventSubWsListener } from '@twurple/eventsub-ws';

import * as channelPrediction from '~/helpers/api/channelPrediction';

import { Mutex } from 'async-mutex';

import * as hypeTrain from '~/helpers/api/hypeTrain';
import { eventEmitter } from '~/helpers/events';
import { follow } from '~/helpers/events/follow';
import { error, info } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel';
import { variables } from '~/watchers';

import client from './api/client';

const mutex = new Mutex();

class EventSub {
  listener: EventSubWsListener | null = null;
  listenerBroadcasterId?: string;

  constructor() {
    setInterval(() => this.onStartup(), SECOND * 10);
  }

  async onStartup(): Promise<void> {
    const release = await mutex.acquire();

    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    if (broadcasterId.length === 0 || broadcasterId === this.listenerBroadcasterId) {
      release();
      return;
    }

    const apiClient = await client('broadcaster');

    this.listener = new EventSubWsListener({ apiClient });

    if (process.env.ENV === 'production') {
      await this.listener.start();
    } else {
      info('EVENTSUB-WS: Eventsub events disabled on dev-mode.');
    }

    try {
      // FOLLOW
      await this.listener.subscribeToChannelFollowEvents(broadcasterId, event => follow(event.userId, event.userName, new Date(event.followDate).toISOString()));

      // HYPE TRAIN
      await this.listener.subscribeToChannelHypeTrainBeginEvents(broadcasterId, _event => {
        hypeTrain.setIsStarted(true);
        hypeTrain.setCurrentLevel(1);
        eventEmitter.emit('hypetrain-started');
      });
      await this.listener.subscribeToChannelHypeTrainProgressEvents(broadcasterId, event => {
        hypeTrain.setIsStarted(true);
        hypeTrain.setTotal(event.total);
        hypeTrain.setGoal(event.goal);
        for (const top of event.topContributors) {
          if (top.type === 'other') {
            continue;
          }
          hypeTrain.setTopContributions(top.type, top.total, top.userId, top.userName);
        }

        if (event.lastContribution.type !== 'other') {
          hypeTrain.setLastContribution(event.lastContribution.total, event.lastContribution.type, event.lastContribution.userId, event.lastContribution.userName);
        }
        hypeTrain.setCurrentLevel(event.level);

        // update overlay
        ioServer?.of('/services/twitch').emit('hypetrain-update', {
          total: event.total, goal: event.goal, level: event.level, subs: Object.fromEntries(hypeTrain.subs),
        });
      });
      await this.listener.subscribeToChannelHypeTrainEndEvents(broadcasterId, event => {
        hypeTrain.triggerHypetrainEnd().then(() => {
          hypeTrain.setTotal(0);
          hypeTrain.setGoal(0);
          hypeTrain.setLastContribution(0, 'bits', null, null);
          hypeTrain.setTopContributions('bits', 0, null, null);
          hypeTrain.setTopContributions('subscription', 0, null, null);
          hypeTrain.setCurrentLevel(1);
          ioServer?.of('/services/twitch').emit('hypetrain-end');
        });
      });

      // POLLS
      await this.listener.subscribeToChannelPollBeginEvents(broadcasterId, event => {
        channelPoll.setData(event);
        channelPoll.triggerPollStart();
      });
      await this.listener.subscribeToChannelPollProgressEvents(broadcasterId, event => {
        channelPoll.setData(event);
      });
      await this.listener.subscribeToChannelPollEndEvents(broadcasterId, event => {
        channelPoll.setData(event);
        channelPoll.triggerPollEnd();
      });

      // PREDICTION
      await this.listener.subscribeToChannelPredictionBeginEvents(broadcasterId, event => {
        channelPrediction.start(event);
      });
      await this.listener.subscribeToChannelPredictionLockEvents(broadcasterId, event => {
        channelPrediction.lock(event);
      });
      await this.listener.subscribeToChannelPredictionEndEvents(broadcasterId, event => {
        channelPrediction.end(event);
      });

      this.listenerBroadcasterId = broadcasterId;
      info(`EVENTSUB-WS: Service initialized for ${broadcasterUsername}#${broadcasterId}`);
    } catch (e) {
      await this.listener.stop();
      this.listener = null;
      if (e instanceof Error) {
        error('EVENTSUB-WS: ' + e.message);
      }
      error('EVENTSUB-WS: Unknown error durring initialization. ' + e);
    }
    release();
  }
}

export default EventSub;