import { ApiClient } from '@twurple/api';
import { rawDataSymbol } from '@twurple/common';
import { EventSubWsListener } from '@twurple/eventsub-ws';

import { isAlreadyProcessed } from './eventsub/events';

import * as channelPoll from '~/helpers/api/channelPoll';
import * as channelPrediction from '~/helpers/api/channelPrediction';
import * as hypeTrain from '~/helpers/api/hypeTrain';
import { eventEmitter } from '~/helpers/events';
import { cheer } from '~/helpers/events/cheer';
import { follow } from '~/helpers/events/follow';
import { raid } from '~/helpers/events/raid';
import { ban, debug, error, info, isDebugEnabled, redeem, timeout, unban } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel';
import * as changelog from '~/helpers/user/changelog.js';
import eventlist from '~/overlays/eventlist';
import alerts from '~/registries/alerts';
import { variables } from '~/watchers';

const rewardsRedeemed: string[] = [];

let keepAliveCount: null | number = null;

setInterval(() => {
  if (keepAliveCount) {
    keepAliveCount--;
  }
}, 1000);

class EventSubWebsocket {
  listener: EventSubWsListener;
  listenerBroadcasterId?: string;
  reconnection = false;

  constructor(apiClient: ApiClient) {
    debug('twitch.eventsub', 'EventSub: constructor()');

    this.listener = new EventSubWsListener({
      apiClient,
      logger: {
        minLevel: isDebugEnabled('twitch.eventsub') ? 'trace' : 'warning',
        custom:   (level, message) => {
          if (message.includes('"message_type":"session_keepalive"')) {
            if (!keepAliveCount) {
              keepAliveCount = 0;
            }
            keepAliveCount++;
          } else {
            info(`EVENTSUB-WS[${level}]: ${message}`);
          }
        },
      },
    });

    setInterval(() => {
      // check if we have keepAliveCount around 0
      if (!keepAliveCount) {
        return;
      }
      if (keepAliveCount < -5) {
        // we didn't get keepAlive for 5 seconds -> reconnecting
        keepAliveCount = null;
        // set as reconnection
        this.reconnection = true;
        this.listener.stop();
        this.listener.start();
      }
    }, 10000);

    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    this.listener.onSubscriptionDeleteSuccess((ev) => {
      info(`EVENTSUB-WS: Subscription ${ev.id} removed.`);
    });
    this.listener.onSubscriptionCreateSuccess((ev) => {
      if (!this.reconnection || isDebugEnabled('twitch.eventsub')) {
        info(`EVENTSUB-WS: Subscription ${ev.id} added.`);
      }
    });
    this.listener.onSubscriptionCreateFailure((ev, err) => {
      error(`EVENTSUB-WS: Subscription create failure: ${err}`);
    });
    this.listener.onSubscriptionDeleteFailure((ev, err) => {
      error(`EVENTSUB-WS: Subscription delete failure: ${err}`);
    });
    this.listener.onUserSocketConnect(() => {
      if (this.reconnection) {
        info(`EVENTSUB-WS: Reconnected to service for ${broadcasterUsername}#${broadcasterId}`);
      } else {
        info(`EVENTSUB-WS: Service initialized for ${broadcasterUsername}#${broadcasterId}`);
      }
      keepAliveCount = 0; // reset keepAliveCount
    });
    this.listener.onUserSocketDisconnect(async (_, err) => {
      if (err) {
        error(`EVENTSUB-WS: ${err}`);
      }
    });

    try {
      // FOLLOW
      this.listener.onChannelFollow(broadcasterId, broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        follow(event.userId, event.userName, new Date(event.followDate).toISOString());
      });

      // CHEER
      this.listener.onChannelCheer(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        cheer(event[rawDataSymbol]);
      });

      // RAID
      this.listener.onChannelRaidTo(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        raid(event[rawDataSymbol]);
      });

      // HYPE TRAIN
      this.listener.onChannelHypeTrainBegin(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        hypeTrain.setIsStarted(true);
        hypeTrain.setCurrentLevel(1);
        eventEmitter.emit('hypetrain-started');
      });
      this.listener.onChannelHypeTrainProgress(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
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
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
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
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPoll.setData(event[rawDataSymbol]);
        channelPoll.triggerPollStart();
      });
      this.listener.onChannelPollProgress(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPoll.setData(event[rawDataSymbol]);
      });
      this.listener.onChannelPollEnd(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPoll.setData(event[rawDataSymbol]);
        channelPoll.triggerPollEnd();
      });

      // PREDICTION
      this.listener.onChannelPredictionBegin(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPrediction.start(event[rawDataSymbol]);
      });
      this.listener.onChannelPredictionProgress(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPrediction.progress(event[rawDataSymbol]);
      });
      this.listener.onChannelPredictionLock(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPrediction.lock(event[rawDataSymbol]);
      });
      this.listener.onChannelPredictionEnd(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        channelPrediction.end(event[rawDataSymbol]);
      });

      // MOD
      this.listener.onChannelBan(broadcasterId, (event) => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
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
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        unban(`${ event.userName }#${ event.userId } by ${ event.moderatorName }`);
      });

      // REDEMPTION
      this.listener.onChannelRedemptionAdd(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
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
      if (e instanceof Error) {
        error('EVENTSUB-WS: ' + e.message);
      }
      error('EVENTSUB-WS: Unknown error durring initialization. ' + e);
    }

    if (process.env.ENV === 'production' || process.env.NODE_ENV === 'production') {
      this.listener.stop();
      setTimeout(() => {
        this.listener.start();
      }, 5000);
    } else {
      info('EVENTSUB-WS: Eventsub events disabled on dev-mode.');
    }
  }
}

export default EventSubWebsocket;