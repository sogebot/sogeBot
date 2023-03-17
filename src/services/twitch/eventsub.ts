import { DAY, MINUTE } from '@sogebot/ui-helpers/constants';
import { ApiClient } from '@twurple/api/lib';
import { EventSubWsListener } from '@twurple/eventsub-ws';

import * as channelPoll from '~/helpers/api/channelPoll';
import * as channelPrediction from '~/helpers/api/channelPrediction';
import * as hypeTrain from '~/helpers/api/hypeTrain';
import { eventEmitter } from '~/helpers/events';
import { cheer } from '~/helpers/events/cheer';
import { follow } from '~/helpers/events/follow';
import { raid } from '~/helpers/events/raid';
import { ban, error, info, isDebugEnabled, redeem, timeout, unban } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel';
import * as changelog from '~/helpers/user/changelog.js';
import eventlist from '~/overlays/eventlist';
import alerts from '~/registries/alerts';
import { variables } from '~/watchers';

const rewardsRedeemed: string[] = [];
let initialTimeout = 500;
let lastConnectionAt = new Date();

setInterval(() => {
  // reset initialTimeout if connection lasts for five minutes
  if (lastConnectionAt.getTime() > 5 * MINUTE && initialTimeout !== 500) {
    console.debug('eventsub', 'EventSub: resetting initialTimeout');
    initialTimeout = 500;
  }
}, 1000);

class EventSub {
  listener: EventSubWsListener;
  listenerBroadcasterId?: string;

  constructor(apiClient: ApiClient) {
    console.debug('eventsub', 'EventSub: constructor()');

    this.listener = new EventSubWsListener({
      apiClient,
      logger: {
        minLevel: isDebugEnabled('eventsub') ? 'trace' : undefined,
        custom:   (level, message) => {
          info(`EVENTSUB-WS[${level}]: ${message}`);
        },
      },
    });

    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    this.listener.onSubscriptionDeleteSuccess((ev) => {
      info(`EVENTSUB-WS: Subscription ${ev.id} removed.`);
    });
    this.listener.onSubscriptionCreateSuccess((ev) => {
      info(`EVENTSUB-WS: Subscription ${ev.id} added.`);
    });
    this.listener.onSubscriptionCreateFailure((ev, err) => {
      error(`EVENTSUB-WS: Subscription create failure: ${err}`);
    });
    this.listener.onSubscriptionDeleteFailure((ev, err) => {
      error(`EVENTSUB-WS: Subscription delete failure: ${err}`);
    });
    this.listener.onUserSocketConnect(() => {
      info(`EVENTSUB-WS: Service initialized for ${broadcasterUsername}#${broadcasterId}`);
      lastConnectionAt = new Date();
    });
    this.listener.onUserSocketDisconnect((_, err) => {
      error(`EVENTSUB-WS: ${err ?? 'Unknown error'}`);
      this.listener?.stop();
      const maxTimeout = 2 / DAY;
      const nextTimeout = initialTimeout * 2;
      initialTimeout = nextTimeout;
      info(`EVENTSUB-WS: Reconnecting in ${nextTimeout / 1000}s...`);
      setTimeout(() => {
        this.listener?.start(); // try to reconnect
      }, Math.min(nextTimeout, maxTimeout));
    });

    if (process.env.ENV === 'production') {
      this.listener.stop();
      this.listener.start();
    } else {
      info('EVENTSUB-WS: Eventsub events disabled on dev-mode.');
    }

    try {
      // FOLLOW
      this.listener.onChannelFollow(broadcasterId, broadcasterId, event => follow(event.userId, event.userName, new Date(event.followDate).toISOString()));

      // CHEER
      this.listener.onChannelCheer(broadcasterId, cheer);

      // RAID
      this.listener.onChannelRaidFrom(broadcasterId, raid);

      // HYPE TRAIN
      this.listener.onChannelHypeTrainBegin(broadcasterId, () => {
        hypeTrain.setIsStarted(true);
        hypeTrain.setCurrentLevel(1);
        eventEmitter.emit('hypetrain-started');
      });
      this.listener.onChannelHypeTrainProgress(broadcasterId, event => {
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
      this.listener.onChannelHypeTrainEnd(broadcasterId, event => {
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
      this.listener.onChannelPollBegin(broadcasterId, event => {
        channelPoll.setData(event);
        channelPoll.triggerPollStart();
      });
      this.listener.onChannelPollProgress(broadcasterId, event => {
        channelPoll.setData(event);
      });
      this.listener.onChannelPollEnd(broadcasterId, event => {
        channelPoll.setData(event);
        channelPoll.triggerPollEnd();
      });

      // PREDICTION
      this.listener.onChannelPredictionBegin(broadcasterId, event => {
        channelPrediction.start(event);
      });
      this.listener.onChannelPredictionLock(broadcasterId, event => {
        channelPrediction.lock(event);
      });
      this.listener.onChannelPredictionEnd(broadcasterId, event => {
        channelPrediction.end(event);
      });

      // MOD
      this.listener.onChannelBan(broadcasterId, (event) => {
        const userName = event.userName;
        const userId = event.userId;
        const createdBy = event.moderatorName;
        const reason = event.reason;
        const duration = event.endDate;
        if (duration) {
          timeout(`${ userName }#${ userId } by ${ createdBy } for ${ reason } seconds`);
          eventEmitter.emit('timeout', { userName, duration: duration.getTime() - Date.now() / 1000 });
        } else {
          ban(`${ userName }#${ userId } by ${ createdBy }: ${ reason ? reason : '<no reason>' }`);
          eventEmitter.emit('ban', { userName, reason: reason ? reason : '<no reason>' });
        }
      });
      this.listener.onChannelUnban(broadcasterId, (event) => {
        unban(`${ event.userName }#${ event.userId } by ${ event.moderatorName }`);
      });

      // REDEMPTION
      this.listener.onChannelRedemptionAdd(broadcasterId, event => {
        if (rewardsRedeemed.includes(event.redemptionDate.toISOString())) {
          return;
        }
        rewardsRedeemed.push(event.redemptionDate.toISOString());
        if (rewardsRedeemed.length > 10) {
          rewardsRedeemed.shift();
        }

        // trigger reward-redeemed event
        if (event.input.length > 0) {
          redeem(`${ event.userName }#${ event.userId } redeemed ${ event.rewardTitle }: ${ event.input }`);
        } else {
          redeem(`${ event.userName }#${ event.userId } redeemed ${ event.rewardTitle }`);
        }

        changelog.update(event.userId, {
          userId: event.userId, userName: event.userName, displayname: event.userDisplayName,
        });

        eventlist.add({
          event:         'rewardredeem',
          userId:        String(event.userId),
          message:       event.input,
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
          message:    event.input,
          recipient:  event.userName,
        });
        eventEmitter.emit('reward-redeemed', {
          userId:    event.userId,
          userName:  event.userName,
          rewardId:  event.rewardId,
          userInput: event.input,
        });
      });

      this.listenerBroadcasterId = broadcasterId;
    } catch (e) {
      this.listener.stop();
      if (e instanceof Error) {
        error('EVENTSUB-WS: ' + e.message);
      }
      error('EVENTSUB-WS: Unknown error durring initialization. ' + e);
    }
  }
}

export default EventSub;