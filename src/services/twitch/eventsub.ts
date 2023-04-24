import { MINUTE } from '@sogebot/ui-helpers/constants';
import { EventSubChannelBanEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelBanEvent.external';
import { EventSubChannelCheerEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCheerEvent.external';
import { EventSubChannelFollowEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelFollowEvent.external';
import { EventSubChannelRaidEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRaidEvent.external';
import { EventSubChannelRedemptionAddEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRedemptionAddEvent.external';
import { EventSubChannelUnbanEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelUnbanEvent.external';
import { Mutex } from 'async-mutex';
import axios from 'axios';

import { eventEmitter } from '~/helpers/events';
import { cheer } from '~/helpers/events/cheer';
import { follow } from '~/helpers/events/follow';
import { raid } from '~/helpers/events/raid';
import { ban, error, info, redeem, timeout, unban, warning } from '~/helpers/log.js';
import * as changelog from '~/helpers/user/changelog.js';
import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import eventlist from '~/overlays/eventlist';
import alerts from '~/registries/alerts';
import { variables } from '~/watchers';

const mutex = new Mutex();
const events: string[] = [];

let lastMessage = '';
class EventSub {
  constructor() {
    info('EVENTSUB: Long-polling initiated.');
    warning('EVENTSUB: You need to login into https://dash.sogebot.xyz at least once to have eventsub polling working!');
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
            // check if event is new or already used
            if (events.includes(response.data.event.id)) {
              return;
            }
            events.push(response.data.event.id);
            if (events.length > 10) {
              events.shift();
            }

            // we have unique data
            info(`EVENTSUB: Received event ${response.data.subscription.type}.`);
            const availableEvents = {
              'channel.channel_points_custom_reward_redemption.add': this.onChannelRedemptionAdd,
              'channel.follow':                                      this.onChannelFollow,
              'channel.cheer':                                       this.onChannelCheer,
              'channel.raid':                                        this.onChannelRaid,
              'channel.ban':                                         this.onChannelBan,
              'channel.unban':                                       this.onChannelUnban,
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
      timeout(`${ userName }#${ userId } by ${ createdBy }#${ createdById } for ${ reason } seconds`);
      eventEmitter.emit('timeout', { userName, duration: duration.getTime() - Date.now() / 1000 });
    } else {
      ban(`${ userName }#${ userId } by ${ createdBy }: ${ reason ? reason : '<no reason>' }`);
      eventEmitter.emit('ban', { userName, reason: reason ? reason : '<no reason>' });
    }
  }

  onChannelUnban(event: EventSubChannelUnbanEventData) {
    unban(`${ event.user_login }#${ event.user_id } by ${ event.moderator_user_login }#${ event.moderator_user_id }`);
  }
}

export default EventSub;