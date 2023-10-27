import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { EventSubChannelBanEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelBanEvent.external';
import { EventSubChannelCharityCampaignProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCharityCampaignProgressEvent.external.js';
import { EventSubChannelCharityCampaignStartEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCharityCampaignStartEvent.external.js';
import { EventSubChannelCharityCampaignStopEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCharityCampaignStopEvent.external.js';
import { EventSubChannelCharityDonationEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCharityDonationEvent.external.js';
import { EventSubChannelCheerEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCheerEvent.external';
import { EventSubChannelFollowEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelFollowEvent.external';
import { EventSubChannelGoalBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelGoalBeginEvent.external.js';
import { EventSubChannelGoalEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelGoalEndEvent.external.js';
import { EventSubChannelGoalProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelGoalProgressEvent.external.js';
import { EventSubChannelHypeTrainBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelHypeTrainBeginEvent.external';
import { EventSubChannelHypeTrainEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelHypeTrainEndEvent.external';
import { EventSubChannelHypeTrainProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelHypeTrainProgressEvent.external';
import { EventSubChannelModeratorEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelModeratorEvent.external';
import { EventSubChannelPollBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollBeginEvent.external';
import { EventSubChannelPollEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollEndEvent.external';
import { EventSubChannelPollProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollProgressEvent.external';
import { EventSubChannelPredictionBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionBeginEvent.external';
import { EventSubChannelPredictionEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionEndEvent.external';
import { EventSubChannelPredictionLockEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionLockEvent.external';
import { EventSubChannelPredictionProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionProgressEvent.external';
import { EventSubChannelRaidEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRaidEvent.external';
import { EventSubChannelRedemptionAddEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRedemptionAddEvent.external';
import { EventSubChannelRedemptionUpdateEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRedemptionUpdateEvent.external.js';
import { EventSubChannelRewardEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRewardEvent.external.js';
import { EventSubChannelShieldModeBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelShieldModeBeginEvent.external.js';
import { EventSubChannelShoutoutCreateEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelShoutoutCreateEvent.external.js';
import { EventSubChannelUnbanEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelUnbanEvent.external';
import { EventSubChannelUpdateEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelUpdateEvent.external.js';
import { EventSubUserUpdateEventData } from '@twurple/eventsub-base/lib/events/EventSubUserUpdateEvent.external.js';
import { Mutex } from 'async-mutex';
import axios from 'axios';

import { isAlreadyProcessed } from './eventsub/events.js';

import * as channelPoll from '~/helpers/api/channelPoll.js';
import * as channelPrediction from '~/helpers/api/channelPrediction.js';
import * as hypeTrain from '~/helpers/api/hypeTrain.js';
import { dayjs } from '~/helpers/dayjsHelper.js';
import { cheer } from '~/helpers/events/cheer.js';
import { follow } from '~/helpers/events/follow.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { raid } from '~/helpers/events/raid.js';
import { ban, error, info, redeem, timeout, unban, warning } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel.js';
import * as changelog from '~/helpers/user/changelog.js';
import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import eventlist from '~/overlays/eventlist.js';
import { Types } from '~/plugins/ListenTo.js';
import alerts from '~/registries/alerts.js';
import { variables } from '~/watchers.js';

const mutex = new Mutex();

let lastMessage = '';
class EventSubLongPolling {
  constructor() {
    info('EVENTSUB: Long-polling initiated.');
    warning('--------------------------------------------------------------------------------------------- !');
    warning('EVENTSUB: If you updated a bot, you need to login into https://dash.sogebot.xyz at least once !');
    warning('          to have eventsub long-polling working correctly!                                    !');
    warning('--------------------------------------------------------------------------------------------- !');

    setInterval(async () => {
      //  polling
      const tokenValid = variables.get(`services.twitch.broadcasterTokenValid`);
      if (!mutex.isLocked() && tokenValid) {
        const release = await mutex.acquire();
        try {
          const response = await axios.get('https://eventsub.sogebot.xyz/user', {
            timeout: 2 * MINUTE,
            headers: {
              'sogebot-event-userid': getBroadcasterId(),
            },
          });

          if (response.status === 200) {
            if (isAlreadyProcessed(response.data.event)) {
              release();
              return;
            }

            info(`EVENTSUB: Received event ${response.data.subscription.type}.`);
            const availableEvents = {
              'channel.channel_points_custom_reward_redemption.add':    this.onChannelRedemptionAdd,
              'channel.channel_points_custom_reward_redemption.update': this.onChannelRedemptionUpdate,
              'channel.follow':                                         this.onChannelFollow,
              'channel.cheer':                                          this.onChannelCheer,
              'channel.raid':                                           this.onChannelRaid,
              'channel.ban':                                            this.onChannelBan,
              'channel.unban':                                          this.onChannelUnban,
              'channel.prediction.begin':                               this.onChannelPredictionBegin,
              'channel.prediction.progress':                            this.onChannelPredictionProgress,
              'channel.prediction.lock':                                this.onChannelPredictionLock,
              'channel.prediction.end':                                 this.onChannelPredictionEnd,
              'channel.poll.begin':                                     this.onChannelPollBegin,
              'channel.poll.progress':                                  this.onChannelPollProgress,
              'channel.poll.end':                                       this.onChannelPollEnd,
              'channel.hype_train.begin':                               this.onChannelHypeTrainBegin,
              'channel.hype_train.progress':                            this.onChannelHypeTrainProgress,
              'channel.hype_train.end':                                 this.onChannelHypeTrainEnd,
              'channel.charity_campaign.donate':                        this.onChannelCharityCampaignDonate,
              'channel.charity_campaign.start':                         this.onChannelCharityCampaignStart,
              'channel.charity_campaign.progress':                      this.onChannelCharityCampaignProgress,
              'channel.charity_campaign.stop':                          this.onChannelCharityCampaignStop,
              'channel.goal.begin':                                     this.onChannelGoalBegin,
              'channel.goal.progress':                                  this.onChannelGoalProgress,
              'channel.goal.end':                                       this.onChannelGoalEnd,
              'channel.moderator.add':                                  this.onChannelModeratorAdd,
              'channel.moderator.remove':                               this.onChannelModeratorRemove,
              'channel.channel_points_custom_reward.add':               this.onChannelRewardAdd,
              'channel.channel_points_custom_reward.update':            this.onChannelRewardUpdate,
              'channel.channel_points_custom_reward.remove':            this.onChannelRewardRemove,
              'channel.shield_mode.begin':                              this.onChannelShieldModeBegin,
              'channel.shield_mode.end':                                this.onChannelShieldModeEnd,
              'channel.shoutout.create':                                this.onChannelShoutoutCreate,
              'channel.shoutout.receive':                               this.onChannelShoutoutReceive,
              'channel.update':                                         this.onChannelUpdate,
              'user.update':                                            this.onUserUpdate,
            } as const;
            if (availableEvents[response.data.subscription.type as keyof typeof availableEvents]) {
              availableEvents[response.data.subscription.type as keyof typeof availableEvents](response.data.event);
            }
          } else if (response.status === 204) {
            if (process.env.NODE_ENV === 'development') {
              info(`EVENTSUB: No event received during long-polling.`);
            }
          } else {
            throw new Error('Unexpected status received: ' + response.status);
          }
          lastMessage = '';
        } catch (e) {
          if (e instanceof Error) {
            if (e.message !== lastMessage) {
              error(`EVENTSUB: ${e}`);
              lastMessage = e.message;
            }
          }
        }
        release();
      }
    }, 200);
  }

  onChannelRedemptionAdd(event: EventSubChannelRedemptionAddEventData) {
    // trigger reward-redeemed event
    if (event.user_input.length > 0) {
      redeem(`${ event.user_login }#${ event.user_id } redeemed ${ event.reward.title }: ${ event.user_input }`);
    } else {
      redeem(`${ event.user_login }#${ event.user_id } redeemed ${ event.reward.title }`);
    }

    changelog.update(event.user_id, {
      userId: event.user_id, userName: event.user_login, displayname: event.user_name,
    });

    eventlist.add({
      event:         'rewardredeem',
      userId:        String(event.user_id),
      message:       event.user_input,
      timestamp:     Date.now(),
      titleOfReward: event.reward.title,
      rewardId:      event.reward.id,
    });
    alerts.trigger({
      event:      'rewardredeem',
      name:       event.reward.title,
      rewardId:   event.reward.id,
      amount:     0,
      tier:       null,
      currency:   '',
      monthsName: '',
      message:    event.user_input,
      recipient:  event.user_name,
    });
    eventEmitter.emit('reward-redeemed', {
      userId:    event.user_id,
      userName:  event.user_name,
      rewardId:  event.reward.id,
      userInput: event.user_input,
    });
  }

  onChannelFollow(event: EventSubChannelFollowEventData) {
    follow(event.user_id, event.user_login, new Date(event.followed_at).toISOString());
  }

  onChannelCheer(event: EventSubChannelCheerEventData) {
    cheer(event);
  }

  onChannelRaid(event: EventSubChannelRaidEventData) {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

    if (event.from_broadcaster_user_id === broadcasterId) {
      // raiding
      eventEmitter.emit(Types.onChannelRaidFrom, {
        raidedBroadcasterDisplayName:  event.to_broadcaster_user_name,
        raidedBroadcasterName:         event.to_broadcaster_user_login,
        raidedBroadcasterId:           event.to_broadcaster_user_id,
        raidingBroadcasterDisplayName: event.from_broadcaster_user_name,
        raidingBroadcasterName:        event.from_broadcaster_user_name,
        raidingBroadcasterId:          event.from_broadcaster_user_id,
        viewers:                       event.viewers,
      });
    } else {
      // getting raided
      raid(event);
    }
  }

  onChannelBan(event: EventSubChannelBanEventData) {
    const userName = event.user_login;
    const userId = event.user_id;
    const createdBy = event.moderator_user_login;
    const createdById = event.moderator_user_id;
    const reason = event.reason;
    const ends_at = event.ends_at ? dayjs(event.ends_at) : null;
    if (ends_at) {
      const duration = dayjs.duration(ends_at.diff(dayjs(event.banned_at)));
      timeout(`${ userName }#${ userId } by ${ createdBy }#${ createdById } for ${ duration.asSeconds() } seconds`);
      eventEmitter.emit('timeout', { userName, duration: duration.asSeconds() });
    } else {
      ban(`${ userName }#${ userId } by ${ createdBy }: ${ reason ? reason : '<no reason>' }`);
      eventEmitter.emit('ban', { userName, reason: reason ? reason : '<no reason>' });
    }
  }

  onChannelUnban(event: EventSubChannelUnbanEventData) {
    unban(`${ event.user_login }#${ event.user_id } by ${ event.moderator_user_login }#${ event.moderator_user_id }`);
  }

  onChannelPredictionBegin(event: EventSubChannelPredictionBeginEventData) {
    channelPrediction.start(event);
  }

  onChannelPredictionProgress(event: EventSubChannelPredictionProgressEventData) {
    channelPrediction.progress(event);
  }

  onChannelPredictionLock(event: EventSubChannelPredictionLockEventData) {
    channelPrediction.lock(event);
  }

  onChannelPredictionEnd(event: EventSubChannelPredictionEndEventData) {
    channelPrediction.end(event);
  }

  onChannelPollBegin(event: EventSubChannelPollBeginEventData) {
    channelPoll.setData(event);
    channelPoll.triggerPollStart();
  }

  onChannelPollProgress(event: EventSubChannelPollProgressEventData) {
    channelPoll.setData(event);
  }

  onChannelPollEnd(event: EventSubChannelPollEndEventData) {
    channelPoll.setData(event);
    channelPoll.triggerPollEnd();
  }

  onChannelHypeTrainBegin(event: EventSubChannelHypeTrainBeginEventData) {
    hypeTrain.setIsStarted(true);
    hypeTrain.setCurrentLevel(1);
    eventEmitter.emit('hypetrain-started');
  }

  onChannelHypeTrainProgress(event: EventSubChannelHypeTrainProgressEventData) {
    hypeTrain.setIsStarted(true);
    hypeTrain.setTotal(event.total);
    hypeTrain.setGoal(event.goal);
    for (const top of (event.top_contributions ?? [])) {
      if (top.type === 'other') {
        continue;
      }
      hypeTrain.setTopContributions(top.type, top.total, top.user_id, top.user_login);
    }

    if (event.last_contribution.type !== 'other') {
      hypeTrain.setLastContribution(event.last_contribution.total, event.last_contribution.type, event.last_contribution.user_id, event.last_contribution.user_login);
    }
    hypeTrain.setCurrentLevel(event.level);

    // update overlay
    ioServer?.of('/services/twitch').emit('hypetrain-update', {
      id: event.id, total: event.total, goal: event.goal, level: event.level, subs: Object.fromEntries(hypeTrain.subs),
    });
  }

  onChannelHypeTrainEnd(event: EventSubChannelHypeTrainEndEventData) {
    hypeTrain.triggerHypetrainEnd().then(() => {
      hypeTrain.setTotal(0);
      hypeTrain.setGoal(0);
      hypeTrain.setLastContribution(0, 'bits', null, null);
      hypeTrain.setTopContributions('bits', 0, null, null);
      hypeTrain.setTopContributions('subscription', 0, null, null);
      hypeTrain.setCurrentLevel(1);
      ioServer?.of('/services/twitch').emit('hypetrain-end');
    });
  }

  onChannelCharityCampaignDonate(event: EventSubChannelCharityDonationEventData) {
    eventEmitter.emit(Types.onChannelCharityDonation, {
      broadcasterDisplayName: event.broadcaster_name,
      broadcasterId:          event.broadcaster_id,
      broadcasterName:        event.broadcaster_login,
      charityDescription:     event.charity_description,
      charityLogo:            event.charity_logo,
      charityName:            event.charity_name,
      charityWebsite:         event.charity_website,
      campaignId:             event.campaign_id,
      donorDisplayName:       event.user_name,
      donorId:                event.user_id,
      donorName:              event.user_login,
      amount:                 event.amount.value * event.amount.decimal_places,
      amountCurrency:         event.amount.currency,
    });
  }

  onChannelCharityCampaignStart(event: EventSubChannelCharityCampaignStartEventData) {
    eventEmitter.emit(Types.onChannelCharityCampaignStart, {
      broadcasterDisplayName: event.broadcaster_name,
      broadcasterId:          event.broadcaster_id,
      broadcasterName:        event.broadcaster_login,
      charityDescription:     event.charity_description,
      charityLogo:            event.charity_logo,
      charityName:            event.charity_name,
      charityWebsite:         event.charity_website,
      currentAmount:          event.current_amount.value * event.current_amount.decimal_places,
      currentAmountCurrency:  event.current_amount.currency,
      targetAmount:           event.target_amount.value * event.target_amount.decimal_places,
      targetAmountCurrency:   event.target_amount.currency,
      startDate:              new Date(event.started_at).toISOString(),
    });
  }

  onChannelCharityCampaignProgress(event: EventSubChannelCharityCampaignProgressEventData) {
    eventEmitter.emit(Types.onChannelCharityCampaignProgress, {
      broadcasterDisplayName: event.broadcaster_name,
      broadcasterId:          event.broadcaster_id,
      broadcasterName:        event.broadcaster_login,
      charityDescription:     event.charity_description,
      charityLogo:            event.charity_logo,
      charityName:            event.charity_name,
      charityWebsite:         event.charity_website,
      currentAmount:          event.current_amount.value * event.current_amount.decimal_places,
      currentAmountCurrency:  event.current_amount.currency,
      targetAmount:           event.target_amount.value * event.target_amount.decimal_places,
      targetAmountCurrency:   event.target_amount.currency,
    });
  }

  onChannelCharityCampaignStop(event: EventSubChannelCharityCampaignStopEventData) {
    eventEmitter.emit(Types.onChannelCharityCampaignStop, {
      broadcasterDisplayName: event.broadcaster_name,
      broadcasterId:          event.broadcaster_id,
      broadcasterName:        event.broadcaster_login,
      charityDescription:     event.charity_description,
      charityLogo:            event.charity_logo,
      charityName:            event.charity_name,
      charityWebsite:         event.charity_website,
      currentAmount:          event.current_amount.value * event.current_amount.decimal_places,
      currentAmountCurrency:  event.current_amount.currency,
      targetAmount:           event.target_amount.value * event.target_amount.decimal_places,
      targetAmountCurrency:   event.target_amount.currency,
      endDate:                new Date(event.stopped_at).toISOString(),
    });
  }

  onChannelGoalBegin(event: EventSubChannelGoalBeginEventData) {
    eventEmitter.emit(Types.onChannelGoalBegin, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      currentAmount:          event.current_amount,
      description:            event.description,
      startDate:              new Date(event.started_at).toISOString(),
      targetAmount:           event.target_amount,
      type:                   event.type,
    });
  }

  onChannelGoalProgress(event: EventSubChannelGoalProgressEventData) {
    eventEmitter.emit(Types.onChannelGoalProgress, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      currentAmount:          event.current_amount,
      description:            event.description,
      startDate:              new Date(event.started_at).toISOString(),
      targetAmount:           event.target_amount,
      type:                   event.type,
    });
  }

  onChannelGoalEnd(event: EventSubChannelGoalEndEventData) {
    eventEmitter.emit(Types.onChannelGoalEnd, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      currentAmount:          event.current_amount,
      description:            event.description,
      startDate:              new Date(event.started_at).toISOString(),
      endDate:                new Date(event.ended_at).toISOString(),
      targetAmount:           event.target_amount,
      type:                   event.type,
      isAchieved:             event.is_achieved,
    });
  }

  onChannelModeratorAdd(event: EventSubChannelModeratorEventData) {
    eventEmitter.emit(Types.onChannelModeratorAdd, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      userDisplayName:        event.user_name,
      userId:                 event.user_id,
      userName:               event.user_login,
    });
  }

  onChannelModeratorRemove(event: EventSubChannelModeratorEventData) {
    eventEmitter.emit(Types.onChannelModeratorRemove, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      userDisplayName:        event.user_name,
      userId:                 event.user_id,
      userName:               event.user_login,
    });
  }

  onChannelRewardAdd(event: EventSubChannelRewardEventData) {
    eventEmitter.emit(Types.onChannelRewardAdd, {
      broadcasterDisplayName:         event.broadcaster_user_name,
      broadcasterId:                  event.broadcaster_user_id,
      broadcasterName:                event.broadcaster_user_login,
      autoApproved:                   event.should_redemptions_skip_request_queue,
      backgroundColor:                event.background_color,
      cooldownExpiryDate:             event.cooldown_expires_at ? new Date(event.cooldown_expires_at).toISOString() : null,
      cost:                           event.cost,
      globalCooldown:                 event.global_cooldown.is_enabled ? event.global_cooldown.seconds : null,
      id:                             event.id,
      isEnabled:                      event.is_enabled,
      isInStock:                      event.is_in_stock,
      isPaused:                       event.is_paused,
      maxRedemptionsPerStream:        event.max_per_stream.is_enabled ? event.max_per_stream.value : null,
      maxRedemptionsPerUserPerStream: event.max_per_user_per_stream.is_enabled ? event.max_per_user_per_stream.value : null,
      prompt:                         event.prompt,
      redemptionsThisStream:          event.redemptions_redeemed_current_stream,
      title:                          event.title,
      userInputRequired:              event.is_user_input_required,
    });
  }

  onChannelRewardUpdate(event: EventSubChannelRewardEventData) {
    eventEmitter.emit(Types.onChannelRewardUpdate, {
      broadcasterDisplayName:         event.broadcaster_user_name,
      broadcasterId:                  event.broadcaster_user_id,
      broadcasterName:                event.broadcaster_user_login,
      autoApproved:                   event.should_redemptions_skip_request_queue,
      backgroundColor:                event.background_color,
      cooldownExpiryDate:             event.cooldown_expires_at ? new Date(event.cooldown_expires_at).toISOString() : null,
      cost:                           event.cost,
      globalCooldown:                 event.global_cooldown.is_enabled ? event.global_cooldown.seconds : null,
      id:                             event.id,
      isEnabled:                      event.is_enabled,
      isInStock:                      event.is_in_stock,
      isPaused:                       event.is_paused,
      maxRedemptionsPerStream:        event.max_per_stream.is_enabled ? event.max_per_stream.value : null,
      maxRedemptionsPerUserPerStream: event.max_per_user_per_stream.is_enabled ? event.max_per_user_per_stream.value : null,
      prompt:                         event.prompt,
      redemptionsThisStream:          event.redemptions_redeemed_current_stream,
      title:                          event.title,
      userInputRequired:              event.is_user_input_required,
    });
  }

  onChannelRewardRemove(event: EventSubChannelRewardEventData) {
    eventEmitter.emit(Types.onChannelRewardRemove, {
      broadcasterDisplayName:         event.broadcaster_user_name,
      broadcasterId:                  event.broadcaster_user_id,
      broadcasterName:                event.broadcaster_user_login,
      autoApproved:                   event.should_redemptions_skip_request_queue,
      backgroundColor:                event.background_color,
      cooldownExpiryDate:             event.cooldown_expires_at ? new Date(event.cooldown_expires_at).toISOString() : null,
      cost:                           event.cost,
      globalCooldown:                 event.global_cooldown.is_enabled ? event.global_cooldown.seconds : null,
      id:                             event.id,
      isEnabled:                      event.is_enabled,
      isInStock:                      event.is_in_stock,
      isPaused:                       event.is_paused,
      maxRedemptionsPerStream:        event.max_per_stream.is_enabled ? event.max_per_stream.value : null,
      maxRedemptionsPerUserPerStream: event.max_per_user_per_stream.is_enabled ? event.max_per_user_per_stream.value : null,
      prompt:                         event.prompt,
      redemptionsThisStream:          event.redemptions_redeemed_current_stream,
      title:                          event.title,
      userInputRequired:              event.is_user_input_required,
    });
  }

  onChannelShieldModeBegin(event: EventSubChannelShieldModeBeginEventData) {
    eventEmitter.emit(Types.onChannelShieldModeBegin, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      moderatorDisplayName:   event.moderator_user_name,
      moderatorId:            event.moderator_user_id,
      moderatorName:          event.moderator_user_login,
    });
  }

  onChannelShieldModeEnd(event: EventSubChannelShieldModeBeginEventData) {
    eventEmitter.emit(Types.onChannelShieldModeEnd, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      moderatorDisplayName:   event.moderator_user_name,
      moderatorId:            event.moderator_user_id,
      moderatorName:          event.moderator_user_login,
      endDate:                new Date(event.started_at).toISOString(),
    });
  }

  onChannelShoutoutCreate(event: EventSubChannelShoutoutCreateEventData) {
    eventEmitter.emit(Types.onChannelShoutoutCreate, {
      broadcasterDisplayName:           event.broadcaster_user_name,
      broadcasterId:                    event.broadcaster_user_id,
      broadcasterName:                  event.broadcaster_user_login,
      moderatorDisplayName:             event.moderator_user_name,
      moderatorId:                      event.moderator_user_id,
      moderatorName:                    event.moderator_user_login,
      cooldownEndDate:                  new Date(event.cooldown_ends_at).toISOString(),
      startDate:                        new Date(event.started_at).toISOString(),
      viewerCount:                      event.viewer_count,
      shoutedOutBroadcasterDisplayName: event.to_broadcaster_user_name,
      shoutedOutBroadcasterId:          event.to_broadcaster_user_id,
      shoutedOutBroadcasterName:        event.to_broadcaster_user_login,
    });
  }

  onChannelShoutoutReceive(event: EventSubChannelShoutoutCreateEventData) {
    eventEmitter.emit(Types.onChannelShoutoutReceive, {
      broadcasterDisplayName:            event.broadcaster_user_name,
      broadcasterId:                     event.broadcaster_user_id,
      broadcasterName:                   event.broadcaster_user_login,
      startDate:                         new Date(event.started_at).toISOString(),
      viewerCount:                       event.viewer_count,
      shoutingOutBroadcasterDisplayName: event.to_broadcaster_user_name,
      shoutingOutBroadcasterId:          event.to_broadcaster_user_id,
      shoutingOutBroadcasterName:        event.to_broadcaster_user_login,
    });
  }

  onChannelUpdate(event: EventSubChannelUpdateEventData) {
    eventEmitter.emit(Types.onChannelUpdate, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      categoryId:             event.category_id,
      categoryName:           event.category_name,
      isMature:               event.is_mature,
      streamLanguage:         event.language,
      streamTitle:            event.title,
    });
  }

  onUserUpdate(event: EventSubUserUpdateEventData) {
    eventEmitter.emit(Types.onUserUpdate, {
      userDescription:     event.description,
      userDisplayName:     event.user_name,
      userId:              event.user_id,
      userEmail:           event.email ?? null,
      userName:            event.user_login,
      userEmailIsVerified: event.email_verified,
    });
  }

  onChannelRedemptionUpdate(event: EventSubChannelRedemptionUpdateEventData) {
    eventEmitter.emit(Types.onChannelRedemptionUpdate, {
      broadcasterDisplayName: event.broadcaster_user_name,
      broadcasterId:          event.broadcaster_user_id,
      broadcasterName:        event.broadcaster_user_login,
      id:                     event.id,
      input:                  event.user_input,
      redemptionDate:         new Date(event.redeemed_at).toISOString(),
      rewardCost:             event.reward.cost,
      rewardId:               event.reward.id,
      rewardPrompt:           event.reward.prompt,
      rewardTitle:            event.reward.title,
      status:                 event.status,
      userDisplayName:        event.user_name,
      userId:                 event.user_id,
      userName:               event.user_login,

    });
  }
}

export default EventSubLongPolling;