import { ApiClient } from '@twurple/api';
import { rawDataSymbol } from '@twurple/common';
import { EventSubWsListener } from '@twurple/eventsub-ws';

import { isAlreadyProcessed } from './eventsub/events.js';

import * as channelPoll from '~/helpers/api/channelPoll.js';
import * as channelPrediction from '~/helpers/api/channelPrediction.js';
import * as hypeTrain from '~/helpers/api/hypeTrain.js';
import { dayjs } from '~/helpers/dayjsHelper.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { cheer } from '~/helpers/events/cheer.js';
import { follow } from '~/helpers/events/follow.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { raid } from '~/helpers/events/raid.js';
import { ban, error, info, redeem, timeout, unban, warning } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel.js';
import * as changelog from '~/helpers/user/changelog.js';
import eventlist from '~/overlays/eventlist.js';
import { Types } from '~/plugins/ListenTo.js';
import alerts from '~/registries/alerts.js';
import { variables } from '~/watchers.js';

let keepAliveCount: null | number = null;

setInterval(() => {
  if (keepAliveCount !== null) {
    keepAliveCount--;
  }
}, 10000);

export const broadcasterMissingScopes: string[] = [];
const CHANNEL_READ_CHARITY = 'channel:read:charity' as const;
const CHANNEL_READ_GOALS = 'channel:read:goals' as const;
const MODERATOR_READ_SHIELD_MODE = 'moderator:read:shield_mode' as const;
const MODERATOR_READ_SHOUTOUTS = 'moderator:read:shoutouts' as const;

const runIfScopeIsApproved = (scopes: string[], scope: string, callback: () => void) => {
  if (scopes.includes(scope)) {
    if (broadcasterMissingScopes.includes(scope)) {
      broadcasterMissingScopes.splice(broadcasterMissingScopes.findIndex(o => o === scope), 1);
    }
    callback();
  } else {
    if (!broadcasterMissingScopes.includes(scope)) {
      broadcasterMissingScopes.push(scope);
    }
  }
};

class EventSubWebsocket {
  listener: EventSubWsListener;
  listenerBroadcasterId?: string;
  reconnection = false;

  constructor(apiClient: ApiClient) {
    this.listener = new EventSubWsListener({
      apiClient,
      logger: {
        minLevel: 'trace',
        custom:   (level, message) => {
          if (message.includes('"message_type":"session_keepalive"')) {
            keepAliveCount = 0;
          } else {
            if (isDebugEnabled('twitch.eventsub')) {
              info(`EVENTSUB-WS[${level}]: ${message}`);
            }
          }
        },
      },
    });

    setInterval(() => {
      // check if we have keepAliveCount around 0
      if (!keepAliveCount) {
        return;
      }
      if (keepAliveCount < -2) {
        // we didn't get keepAlive for 20 seconds -> reconnecting
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
      if (!this.reconnection) {
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
      const broadcasterScopes = variables.get('services.twitch.broadcasterCurrentScopes') as string[];

      runIfScopeIsApproved(broadcasterScopes, CHANNEL_READ_CHARITY, () => {
        this.listener.onChannelCharityCampaignProgress(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelCharityCampaignProgress, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            charityDescription:     event.charityDescription,
            charityLogo:            event.charityLogo,
            charityName:            event.charityName,
            charityWebsite:         event.charityWebsite,
            currentAmount:          event.currentAmount.localizedValue,
            currentAmountCurrency:  event.currentAmount.currency,
            targetAmount:           event.targetAmount.localizedValue,
            targetAmountCurrency:   event.targetAmount.currency,
          });
        });
        this.listener.onChannelCharityCampaignStart(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelCharityCampaignStart, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            charityDescription:     event.charityDescription,
            charityLogo:            event.charityLogo,
            charityName:            event.charityName,
            charityWebsite:         event.charityWebsite,
            currentAmount:          event.currentAmount.localizedValue,
            currentAmountCurrency:  event.currentAmount.currency,
            targetAmount:           event.targetAmount.localizedValue,
            targetAmountCurrency:   event.targetAmount.currency,
            startDate:              event.startDate.toISOString(),
          });
        });
        this.listener.onChannelCharityCampaignStop(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelCharityCampaignStop, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            charityDescription:     event.charityDescription,
            charityLogo:            event.charityLogo,
            charityName:            event.charityName,
            charityWebsite:         event.charityWebsite,
            currentAmount:          event.currentAmount.localizedValue,
            currentAmountCurrency:  event.currentAmount.currency,
            targetAmount:           event.targetAmount.localizedValue,
            targetAmountCurrency:   event.targetAmount.currency,
            endDate:                event.endDate.toISOString(),
          });
        });
        this.listener.onChannelCharityDonation(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelCharityDonation, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            charityDescription:     event.charityDescription,
            charityLogo:            event.charityLogo,
            charityName:            event.charityName,
            charityWebsite:         event.charityWebsite,
            campaignId:             event.campaignId,
            donorDisplayName:       event.donorDisplayName,
            donorId:                event.donorId,
            donorName:              event.donorName,
            amount:                 event.amount.localizedValue,
            amountCurrency:         event.amount.currency,
          });
        });
      });

      // GOAL
      runIfScopeIsApproved(broadcasterScopes, CHANNEL_READ_GOALS, () => {
        this.listener.onChannelGoalBegin(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelGoalBegin, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            currentAmount:          event.currentAmount,
            description:            event.description,
            startDate:              event.startDate.toISOString(),
            targetAmount:           event.targetAmount,
            type:                   event.type,
          });
        });
        this.listener.onChannelGoalEnd(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelGoalEnd, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            currentAmount:          event.currentAmount,
            description:            event.description,
            startDate:              event.startDate.toISOString(),
            endDate:                event.endDate.toISOString(),
            targetAmount:           event.targetAmount,
            type:                   event.type,
            isAchieved:             event.isAchieved,
          });
        });
        this.listener.onChannelGoalProgress(broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelGoalProgress, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            currentAmount:          event.currentAmount,
            description:            event.description,
            startDate:              event.startDate.toISOString(),
            targetAmount:           event.targetAmount,
            type:                   event.type,
          });
        });
      });

      // MODERATOR
      this.listener.onChannelModeratorAdd(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelModeratorAdd, {
          broadcasterDisplayName: event.broadcasterDisplayName,
          broadcasterId:          event.broadcasterId,
          broadcasterName:        event.broadcasterName,
          userDisplayName:        event.userDisplayName,
          userId:                 event.userId,
          userName:               event.userName,
        });
      });
      this.listener.onChannelModeratorRemove(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelModeratorRemove, {
          broadcasterDisplayName: event.broadcasterDisplayName,
          broadcasterId:          event.broadcasterId,
          broadcasterName:        event.broadcasterName,
          userDisplayName:        event.userDisplayName,
          userId:                 event.userId,
          userName:               event.userName,
        });
      });

      // REWARD
      this.listener.onChannelRewardAdd(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelRewardAdd, {
          broadcasterDisplayName:         event.broadcasterDisplayName,
          broadcasterId:                  event.broadcasterId,
          broadcasterName:                event.broadcasterName,
          autoApproved:                   event.autoApproved,
          backgroundColor:                event.backgroundColor,
          cooldownExpiryDate:             event.cooldownExpiryDate?.toISOString() ?? null,
          cost:                           event.cost,
          globalCooldown:                 event.globalCooldown,
          id:                             event.id,
          isEnabled:                      event.isEnabled,
          isInStock:                      event.isInStock,
          isPaused:                       event.isPaused,
          maxRedemptionsPerStream:        event.maxRedemptionsPerStream,
          maxRedemptionsPerUserPerStream: event.maxRedemptionsPerUserPerStream,
          prompt:                         event.prompt,
          redemptionsThisStream:          event.redemptionsThisStream,
          title:                          event.title,
          userInputRequired:              event.userInputRequired,
        });
      });
      this.listener.onChannelRewardRemove(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelRewardRemove, {
          broadcasterDisplayName:         event.broadcasterDisplayName,
          broadcasterId:                  event.broadcasterId,
          broadcasterName:                event.broadcasterName,
          autoApproved:                   event.autoApproved,
          backgroundColor:                event.backgroundColor,
          cooldownExpiryDate:             event.cooldownExpiryDate?.toISOString() ?? null,
          cost:                           event.cost,
          globalCooldown:                 event.globalCooldown,
          id:                             event.id,
          isEnabled:                      event.isEnabled,
          isInStock:                      event.isInStock,
          isPaused:                       event.isPaused,
          maxRedemptionsPerStream:        event.maxRedemptionsPerStream,
          maxRedemptionsPerUserPerStream: event.maxRedemptionsPerUserPerStream,
          prompt:                         event.prompt,
          redemptionsThisStream:          event.redemptionsThisStream,
          title:                          event.title,
          userInputRequired:              event.userInputRequired,
        });
      });
      this.listener.onChannelRewardUpdate(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelRewardUpdate, {
          broadcasterDisplayName:         event.broadcasterDisplayName,
          broadcasterId:                  event.broadcasterId,
          broadcasterName:                event.broadcasterName,
          autoApproved:                   event.autoApproved,
          backgroundColor:                event.backgroundColor,
          cooldownExpiryDate:             event.cooldownExpiryDate?.toISOString() ?? null,
          cost:                           event.cost,
          globalCooldown:                 event.globalCooldown,
          id:                             event.id,
          isEnabled:                      event.isEnabled,
          isInStock:                      event.isInStock,
          isPaused:                       event.isPaused,
          maxRedemptionsPerStream:        event.maxRedemptionsPerStream,
          maxRedemptionsPerUserPerStream: event.maxRedemptionsPerUserPerStream,
          prompt:                         event.prompt,
          redemptionsThisStream:          event.redemptionsThisStream,
          title:                          event.title,
          userInputRequired:              event.userInputRequired,
        });
      });

      // SHIELD
      runIfScopeIsApproved(broadcasterScopes, MODERATOR_READ_SHIELD_MODE, () => {
        this.listener.onChannelShieldModeBegin(broadcasterId, broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelShieldModeBegin, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            moderatorDisplayName:   event.moderatorDisplayName,
            moderatorId:            event.moderatorId,
            moderatorName:          event.moderatorName,
          });
        });
        this.listener.onChannelShieldModeEnd(broadcasterId, broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelShieldModeEnd, {
            broadcasterDisplayName: event.broadcasterDisplayName,
            broadcasterId:          event.broadcasterId,
            broadcasterName:        event.broadcasterName,
            moderatorDisplayName:   event.moderatorDisplayName,
            moderatorId:            event.moderatorId,
            moderatorName:          event.moderatorName,
            endDate:                event.endDate.toISOString(),
          });
        });
      });

      // SHOUTOUT
      runIfScopeIsApproved(broadcasterScopes, MODERATOR_READ_SHOUTOUTS, () => {
        this.listener.onChannelShoutoutCreate(broadcasterId, broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelShoutoutCreate, {
            broadcasterDisplayName:           event.broadcasterDisplayName,
            broadcasterId:                    event.broadcasterId,
            broadcasterName:                  event.broadcasterName,
            moderatorDisplayName:             event.moderatorDisplayName,
            moderatorId:                      event.moderatorId,
            moderatorName:                    event.moderatorName,
            cooldownEndDate:                  event.cooldownEndDate.toISOString(),
            shoutedOutBroadcasterDisplayName: event.shoutedOutBroadcasterDisplayName,
            shoutedOutBroadcasterId:          event.shoutedOutBroadcasterId,
            shoutedOutBroadcasterName:        event.shoutedOutBroadcasterName,
            startDate:                        event.startDate.toISOString(),
            viewerCount:                      event.viewerCount,
          });
        });
        this.listener.onChannelShoutoutReceive(broadcasterId, broadcasterId, event => {
          if (isAlreadyProcessed(event[rawDataSymbol])) {
            return;
          }
          eventEmitter.emit(Types.onChannelShoutoutReceive, {
            broadcasterDisplayName:            event.broadcasterDisplayName,
            broadcasterId:                     event.broadcasterId,
            broadcasterName:                   event.broadcasterName,
            startDate:                         event.startDate.toISOString(),
            viewerCount:                       event.viewerCount,
            shoutingOutBroadcasterDisplayName: event.shoutingOutBroadcasterDisplayName,
            shoutingOutBroadcasterId:          event.shoutingOutBroadcasterId,
            shoutingOutBroadcasterName:        event.shoutingOutBroadcasterName,
          });
        });
      });

      // SUBSCRIPTION
      // We are currently not using this event, because it is missing if subscription is with Prime or not
      // revise after https://twitch.uservoice.com/forums/310213-developers/suggestions/42012043-add-is-prime-to-subscription-events
      // this.listener.onChannelSubscription(broadcasterId, async (event) => {});
      // this.listener.onChannelSubscriptionEnd(broadcasterId, event => {});
      // this.listener.onChannelSubscriptionGift(broadcasterId, event => {});
      // this.listener.onChannelSubscriptionMessage(broadcasterId, event => {});

      // CHANNEL UPDATE
      this.listener.onChannelUpdate(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelUpdate, {
          broadcasterDisplayName: event.broadcasterDisplayName,
          broadcasterId:          event.broadcasterId,
          broadcasterName:        event.broadcasterName,
          categoryId:             event.categoryId,
          categoryName:           event.categoryName,
          isMature:               event.isMature,
          streamLanguage:         event.streamLanguage,
          streamTitle:            event.streamTitle,
        });
      });

      // STREAM
      // We are currently not using this event, because we have own API polling logic at getCurrentStream
      // Will need to be revised eventually
      // this.listener.onStreamOnline(broadcasterId, event => {});
      // this.listener.onStreamOffline(broadcasterId, event => {});

      // USER UPDATE
      this.listener.onUserUpdate(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onUserUpdate, {
          userDescription:     event.userDescription,
          userDisplayName:     event.userDisplayName,
          userId:              event.userId,
          userEmail:           event.userEmail,
          userEmailIsVerified: event.userEmailIsVerified,
          userName:            event.userName,
        });
      });

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
      this.listener.onChannelRaidFrom(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }
        eventEmitter.emit(Types.onChannelRaidFrom, {
          raidedBroadcasterDisplayName:  event.raidedBroadcasterDisplayName,
          raidedBroadcasterName:         event.raidedBroadcasterName,
          raidedBroadcasterId:           event.raidedBroadcasterId,
          raidingBroadcasterDisplayName: event.raidingBroadcasterDisplayName,
          raidingBroadcasterName:        event.raidingBroadcasterName,
          raidingBroadcasterId:          event.raidingBroadcasterId,
          viewers:                       event.viewers,
        });
      });
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
        const createdById = event.moderatorId;
        const reason = event.reason;
        const ends_at = dayjs(event.endDate);
        if (ends_at) {
          const duration = dayjs.duration(ends_at.diff(dayjs(event.startDate)));
          timeout(`${ userName }#${ userId } by ${ createdBy }#${ createdById } for ${ duration.asSeconds() } seconds`);
          eventEmitter.emit('timeout', { userName, duration: duration.asSeconds() });
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
      this.listener.onChannelRedemptionUpdate(broadcasterId, event => {
        if (isAlreadyProcessed(event[rawDataSymbol])) {
          return;
        }

        eventEmitter.emit(Types.onChannelRedemptionUpdate, {
          broadcasterDisplayName: event.broadcasterDisplayName,
          broadcasterId:          event.broadcasterId,
          broadcasterName:        event.broadcasterName,
          id:                     event.id,
          input:                  event.input,
          redemptionDate:         event.redemptionDate.toISOString(),
          rewardCost:             event.rewardCost,
          rewardId:               event.rewardId,
          rewardPrompt:           event.rewardPrompt,
          rewardTitle:            event.rewardTitle,
          status:                 event.status,
          userDisplayName:        event.userDisplayName,
          userId:                 event.userId,
          userName:               event.userName,
        });
      });

      this.listenerBroadcasterId = broadcasterId;
    } catch (e) {
      if (e instanceof Error) {
        error('EVENTSUB-WS: ' + e.message);
      }
      error('EVENTSUB-WS: Unknown error durring initialization. ' + e);
    } finally {
      if (broadcasterMissingScopes.length > 0) {
        warning('TWITCH: Broadcaster token is missing the following scopes: ' + broadcasterMissingScopes.join(', ') + '. Please re-authenticate your account.');
      }
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