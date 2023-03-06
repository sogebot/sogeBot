import { SECOND } from '@sogebot/ui-helpers/constants';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { Mutex } from 'async-mutex';

import client from './api/client';

import * as channelPoll from '~/helpers/api/channelPoll';
import * as channelPrediction from '~/helpers/api/channelPrediction';
import * as changelog from '~/helpers/user/changelog.js';
import * as hypeTrain from '~/helpers/api/hypeTrain';
import { eventEmitter } from '~/helpers/events';
import { follow } from '~/helpers/events/follow';
import { ban, error, info, redeem, timeout, unban } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel';
import { variables } from '~/watchers';
import alerts from '~/registries/alerts';
import eventlist from '~/overlays/eventlist';

const mutex = new Mutex();
const rewardsRedeemed: string[] = [];

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

    try {
      // FOLLOW
      await this.listener.onChannelFollow(broadcasterId, broadcasterId, event => follow(event.userId, event.userName, new Date(event.followDate).toISOString()));

      // HYPE TRAIN
      await this.listener.onChannelHypeTrainBegin(broadcasterId, () => {
        hypeTrain.setIsStarted(true);
        hypeTrain.setCurrentLevel(1);
        eventEmitter.emit('hypetrain-started');
      });
      await this.listener.onChannelHypeTrainProgress(broadcasterId, event => {
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
          id: event.id, total: event.total, goal: event.goal, level: event.level, subs: Object.fromEntries(hypeTrain.subs),
        });
      });
      await this.listener.onChannelHypeTrainEnd(broadcasterId, event => {
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
      await this.listener.onChannelPollBegin(broadcasterId, event => {
        channelPoll.setData(event);
        channelPoll.triggerPollStart();
      });
      await this.listener.onChannelPollProgress(broadcasterId, event => {
        channelPoll.setData(event);
      });
      await this.listener.onChannelPollEnd(broadcasterId, event => {
        channelPoll.setData(event);
        channelPoll.triggerPollEnd();
      });

      // PREDICTION
      await this.listener.onChannelPredictionBegin(broadcasterId, event => {
        channelPrediction.start(event);
      });
      await this.listener.onChannelPredictionLock(broadcasterId, event => {
        channelPrediction.lock(event);
      });
      await this.listener.onChannelPredictionEnd(broadcasterId, event => {
        channelPrediction.end(event);
      });

      // MOD
      await this.listener.onChannelBan(broadcasterId, (event) => {
        const userName = event.userName;
        const userId = event.userId;
        const createdBy = event.moderatorName;
        const reason = event.reason;
        const duration = event.endDate;
        if (duration) {
          timeout(`${userName}#${userId} by ${createdBy} for ${reason} seconds`);
          eventEmitter.emit('timeout', { userName, duration: duration.getTime() - Date.now() / 1000 });
        } else {
          ban(`${userName}#${userId} by ${createdBy}: ${reason ? reason : '<no reason>'}`);
          eventEmitter.emit('ban', { userName, reason: reason ? reason : '<no reason>' });
        }
      });
      await this.listener.onChannelUnban(broadcasterId, (event) => {
        unban(`${event.userName}#${event.userId} by ${event.moderatorName}`);
      });

      // REDEMPTION
      await this.listener.onChannelRedemptionAdd(broadcasterId, event => {
        if (rewardsRedeemed.includes(event.redemptionDate.toISOString())) {
          return;
        }
        rewardsRedeemed.push(event.redemptionDate.toISOString());
        if (rewardsRedeemed.length > 10) {
          rewardsRedeemed.shift();
        }

        // trigger reward-redeemed event
        if (event.rewardPrompt.length > 0) {
          redeem(`${event.userName}#${event.userId} redeemed ${event.rewardTitle}: ${event.rewardPrompt}`);
        } else {
          redeem(`${event.userName}#${event.userId} redeemed ${event.rewardTitle}`);
        }

        changelog.update(event.userId, {
          userId: event.userId, userName: event.userName, displayname: event.userDisplayName,
        });

        eventlist.add({
          event:         'rewardredeem',
          userId:        String(event.userId),
          message:       event.rewardPrompt,
          timestamp:     Date.now(),
          titleOfReward: event.rewardTitle,
          rewardId:      event.rewardId,
        });
        alerts.trigger({
          event:      'rewardredeem',
          name:       event.rewardTitle,
          rewardId:   event.rewardId,
          amount:     0,
          tier:       null,
          currency:   '',
          monthsName: '',
          message:    event.rewardPrompt,
          recipient:  event.userName,
        });
        eventEmitter.emit('reward-redeemed', {
          userId:    event.userId,
          userName:  event.userName,
          rewardId:  event.rewardId,
          userInput: event.rewardPrompt,
        });
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