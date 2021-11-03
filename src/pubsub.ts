import { setInterval } from 'timers';

import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants';
import WebSocket from 'ws';

import { isStreamOnline } from '~/helpers/api';
import { eventEmitter } from '~/helpers/events';
import {
  ban, debug, error, info, redeem, timeout, unban, warning,
} from '~/helpers/log';
import { broadcasterId } from '~/helpers/oauth/broadcasterId';
import { addUIError } from '~/helpers/panel/alerts';
import eventlist from '~/overlays/eventlist';
import alerts from '~/registries/alerts';

const pubsubEndpoint: Readonly<string> = 'wss://pubsub-edge.twitch.tv';
const heartbeatInterval: Readonly<number> = 2 * 60 * SECOND;
const reconnectInterval: Readonly<number> = 3 * SECOND;

let ws: WebSocket | null = null;

let heartbeatHandle: NodeJS.Timeout | undefined;
let connectionHash = '';

let ERR_BADAUTH = false;

const rewardsRedeemed = new Set();

setInterval(() => {
  if (!isStreamOnline.value) {
    rewardsRedeemed.clear();
  }
}, 10 * MINUTE);

setInterval(() => {
  try {
    if (oauth.broadcasterAccessToken.length === 0) {
      connectionHash = '';
    }

    if (oauth.broadcasterAccessToken.length > 0 && oauth.broadcasterClientId.length > 0 && broadcasterId.value.length > 0) {
      const newConnectionHash = oauth.broadcasterClientId.concat(broadcasterId.value);
      if (connectionHash !== newConnectionHash) {
        debug('pubsub', `${connectionHash} != ${newConnectionHash}`);
        ws?.close();
        ws = null;
        ERR_BADAUTH = false;
      }
      if (!ws && !ERR_BADAUTH) {
        connectionHash = newConnectionHash;
        connect();
      }
    }
  } catch (e: any) {
    warning(e.stack);
  }
}, 1000);

const heartbeat = () => {
  try {
    const message = { type: 'PING' };
    ws?.send(JSON.stringify(message));
    debug('pubsub', 'SENT: ' + JSON.stringify(message));
  } catch (e: any) {
    warning('PUBSUB: Ping failed, socket is probably reconnecting');
  }
};

const connect = () => {
  ws = new WebSocket(pubsubEndpoint);
  ws.onopen = function() {
    info('PUBSUB: Socket Opened');
    heartbeat();

    // listen to points redemption
    listen('channel-points-channel-v1.' + broadcasterId.value);
    listen('chat_moderator_actions.' + broadcasterId.value);
    heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
  };

  ws.onerror = function(errorArg) {
    error('PUBSUB: ' + errorArg.message);
  };

  ws.onmessage = function(event) {
    const message = JSON.parse(event.data.toString());
    debug('pubsub', 'RECV: ' + JSON.stringify(message));
    if (message.type === 'MESSAGE') {
      const dataMessage: any = JSON.parse(message.data.message);
      if (dataMessage.type === 'reward-redeemed') {
        if (rewardsRedeemed.has(dataMessage.data.redemption.id)) {
          return;
        } else {
          rewardsRedeemed.add(dataMessage.data.redemption.id);
        }
        // trigger reward-redeemed event
        if (dataMessage.data.redemption.user_input) {
          redeem(`${dataMessage.data.redemption.user.login}#${dataMessage.data.redemption.user.id} redeemed ${dataMessage.data.redemption.reward.title}: ${dataMessage.data.redemption.user_input}`);
        } else {
          redeem(`${dataMessage.data.redemption.user.login}#${dataMessage.data.redemption.user.id} redeemed ${dataMessage.data.redemption.reward.title}`);
        }

        eventlist.add({
          event:         'rewardredeem',
          userId:        String(dataMessage.data.redemption.user.id),
          message:       dataMessage.data.redemption.user_input,
          timestamp:     Date.now(),
          titleOfReward: dataMessage.data.redemption.reward.title,
        });
        alerts.trigger({
          event:      'rewardredeems',
          name:       dataMessage.data.redemption.reward.title,
          amount:     0,
          tier:       null,
          currency:   '',
          monthsName: '',
          message:    dataMessage.data.redemption.user_input,
          recipient:  dataMessage.data.redemption.user.login,
        });
        eventEmitter.emit('reward-redeemed', {
          userId:        dataMessage.data.redemption.user.id,
          userName:      dataMessage.data.redemption.user.login,
          titleOfReward: dataMessage.data.redemption.reward.title,
          userInput:     dataMessage.data.redemption.user_input,
        });
      } else if (dataMessage.type === 'moderation_action') {
        try {
          const createdBy = dataMessage.data.from_automod ? 'TwitchAutoMod' : `${dataMessage.data.created_by}#${dataMessage.data.created_by_user_id}`;
          if (dataMessage.data.moderation_action === 'ban') {
            const [ userName, reason ] = dataMessage.data.args;
            ban(`${userName}#${dataMessage.data.target_user_id} by ${createdBy}: ${reason ? reason : '<no reason>'}`);
            eventEmitter.emit('ban', { userName, reason: reason ? reason : '<no reason>' });
          } else if (dataMessage.data.moderation_action === 'unban') {
            const [ userName ] = dataMessage.data.args;
            unban(`${userName}#${dataMessage.data.target_user_id} by ${createdBy}`);
          } else if (dataMessage.data.moderation_action === 'timeout') {
            const [ userName, reason ] = dataMessage.data.args;
            timeout(`${userName}#${dataMessage.data.target_user_id} by ${createdBy} for ${reason} seconds`);
            eventEmitter.emit('timeout', { userName, duration: reason });
          } else if (dataMessage.data.moderation_action === 'followersoff') {
            info(`${createdBy} disabled followers-only mode.`);
          } else if (dataMessage.data.moderation_action === 'followers') {
            if (dataMessage.data.args !== null && Number(dataMessage.data.args[0]) !== 0) {
              info(`${createdBy} enabled followers-only mode for follows at least ${dataMessage.data.args[0]} minutes old.`);
            } else {
              info(`${createdBy} enabled followers-only mode (any follower).`);
            }
          } else if (dataMessage.data.moderation_action === 'slow') {
            if (dataMessage.data.args === null) {
              dataMessage.data.args = [30]; // default;
            }
            info(`${createdBy} enabled slow mode with ${dataMessage.data.args[0]}s wait time.`);
          } else if (dataMessage.data.moderation_action === 'slowoff') {
            info(`${createdBy} disabled slow mode.`);
          } else if (dataMessage.data.moderation_action === 'subscribersoff') {
            info(`${createdBy} disabled subscribers-only mode.`);
          } else if (dataMessage.data.moderation_action === 'subscribers') {
            info(`${createdBy} enabled subscribers-only mode.`);
          } else if (dataMessage.data.moderation_action === 'emoteonlyoff') {
            info(`${createdBy} disabled emote-only mode.`);
          } else if (dataMessage.data.moderation_action === 'emoteonly') {
            info(`${createdBy} enabled emote-only mode.`);
          }
        } catch (e: any) {
          warning(`PUBSUB: Unknown moderation_action ${dataMessage.data.moderation_action}`);
          warning(`${JSON.stringify(dataMessage.data, null, 2)}`);
        }
      }
    } else if (message.type === 'RECONNECT') {
      info('PUBSUB: Socket Reconnecting');
      setTimeout(connect, reconnectInterval);
    } else if (message.type === 'RESPONSE') {
      if (message.error === 'ERR_BADAUTH') {
        warning('PUBSUB: Invalid auth or missing scope. Please re-do your broadcaster auth credentials.');
        addUIError({ name: 'PUBSUB', message: 'Invalid auth or missing scope. Please re-do your broadcaster auth credentials.' });
        ERR_BADAUTH = true;
        ws?.close();
        ws = null;
      }
    }
  };

  ws.onclose = function() {
    info('PUBSUB: Socket Closed');
    if (heartbeatHandle) {
      clearInterval(heartbeatHandle);
    }
    if (!ERR_BADAUTH) {
      info('PUBSUB: Socket Reconnecting');
      setTimeout(connect, reconnectInterval);
    }
  };
};

const listen = (topic: string) => {
  const message = {
    type:  'LISTEN',
    nonce: nonce(15),
    data:  {
      topics:     [topic],
      auth_token: oauth.broadcasterAccessToken,
    },
  };
  debug('pubsub', 'SENT: ' + JSON.stringify(message));
  info(`PUBSUB: Listening to ${topic}`);
  ws?.send(JSON.stringify(message));
};

const nonce = (length: number) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
