import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { EventSubChannelBanEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelBanEvent.external';
import { EventSubChannelCheerEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCheerEvent.external';
import { EventSubChannelFollowEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelFollowEvent.external';
import { EventSubChannelHypeTrainBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelHypeTrainBeginEvent.external';
import { EventSubChannelHypeTrainEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelHypeTrainEndEvent.external';
import { EventSubChannelHypeTrainProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelHypeTrainProgressEvent.external';
import { EventSubChannelPollBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollBeginEvent.external';
import { EventSubChannelPollEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollEndEvent.external';
import { EventSubChannelPollProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollProgressEvent.external';
import { EventSubChannelPredictionBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionBeginEvent.external';
import { EventSubChannelPredictionEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionEndEvent.external';
import { EventSubChannelPredictionLockEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionLockEvent.external';
import { EventSubChannelPredictionProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionProgressEvent.external';
import { EventSubChannelRaidEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRaidEvent.external';
import { EventSubChannelRedemptionAddEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRedemptionAddEvent.external';
import { EventSubChannelUnbanEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelUnbanEvent.external';
import { Mutex } from 'async-mutex';
import axios from 'axios';

import { isAlreadyProcessed } from './eventsub/events.js';

import * as channelPoll from '~/helpers/api/channelPoll.js';
import * as channelPrediction from '~/helpers/api/channelPrediction.js';
import * as hypeTrain from '~/helpers/api/hypeTrain.js';
import { cheer } from '~/helpers/events/cheer.js';
import { follow } from '~/helpers/events/follow.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { raid } from '~/helpers/events/raid.js';
import { ban, error, info, redeem, timeout, unban, warning } from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel.js';
import * as changelog from '~/helpers/user/changelog.js';
import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import eventlist from '~/overlays/eventlist.js';
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
              'channel.channel_points_custom_reward_redemption.add': this.onChannelRedemptionAdd,
              'channel.follow':                                      this.onChannelFollow,
              'channel.cheer':                                       this.onChannelCheer,
              'channel.raid':                                        this.onChannelRaid,
              'channel.ban':                                         this.onChannelBan,
              'channel.unban':                                       this.onChannelUnban,
              'channel.prediction.begin':                            this.onChannelPredictionBegin,
              'channel.prediction.progress':                         this.onChannelPredictionProgress,
              'channel.prediction.lock':                             this.onChannelPredictionLock,
              'channel.prediction.end':                              this.onChannelPredictionEnd,
              'channel.poll.begin':                                  this.onChannelPollBegin,
              'channel.poll.progress':                               this.onChannelPollProgress,
              'channel.poll.end':                                    this.onChannelPollEnd,
              'channel.hype_train.begin':                            this.onChannelHypeTrainBegin,
              'channel.hype_train.progress':                         this.onChannelHypeTrainProgress,
              'channel.hype_train.end':                              this.onChannelHypeTrainEnd,
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
    raid(event);
  }

  onChannelBan(event: EventSubChannelBanEventData) {
    const userName = event.user_login;
    const userId = event.user_id;
    const createdBy = event.moderator_user_login;
    const createdById = event.moderator_user_id;
    const reason = event.reason;
    const duration = event.ends_at ? new Date(event.ends_at) : null;
    if (duration) {
      timeout(`${ userName }#${ userId } by ${ createdBy }#${ createdById } for ${ duration } seconds`);
      eventEmitter.emit('timeout', { userName, duration: duration.getTime() - Date.now() / 1000 });
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
}

export default EventSubLongPolling;