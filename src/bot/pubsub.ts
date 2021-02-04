import { setInterval } from 'timers';

import WebSocket from 'ws';

import { SECOND } from './constants';
import { eventEmitter } from './helpers/events';
import {
  ban, debug, error, info, redeem, timeout, unban, warning, 
} from './helpers/log';
import { broadcasterId } from './helpers/oauth/broadcasterId';
import { addUIError } from './helpers/panel/alerts';
import oauth from './oauth';
import alerts from './registries/alerts';

const pubsubEndpoint: Readonly<string> = 'wss://pubsub-edge.twitch.tv';
const heartbeatInterval: Readonly<number> = 2 * 60 * SECOND;
const reconnectInterval: Readonly<number> = 3 * SECOND;

let ws: WebSocket | null = null;

let heartbeatHandle: NodeJS.Timeout | undefined;
let connectionHash = '';

let ERR_BADAUTH = false;

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
  } catch (e) {
    warning(e.stack);
  }
}, 1000);

const heartbeat = () => {
  try {
    const message = { type: 'PING' };
    ws?.send(JSON.stringify(message));
    debug('pubsub', 'SENT: ' + JSON.stringify(message));
  } catch (e) {
    warning('PUBSUB: Ping failed, socket is probably reconnecting');
  }
};

const connect = () => {
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
    error('PUBSUB: ' + JSON.stringify(errorArg));
  };

  ws.onmessage = function(event) {
    const message = JSON.parse(event.data.toString());
    debug('pubsub', 'RECV: ' + JSON.stringify(message));
    if (message.type === 'MESSAGE') {
      const dataMessage = JSON.parse(message.data.message);
      if (dataMessage.type === 'reward-redeemed') {
        // trigger reward-redeemed event
        if (dataMessage.data.redemption.user_input) {
          redeem(`${dataMessage.data.redemption.user.login}#${dataMessage.data.redemption.user.id} redeemed ${dataMessage.data.redemption.reward.title}: ${dataMessage.data.redemption.user_input}`);
        } else {
          redeem(`${dataMessage.data.redemption.user.login}#${dataMessage.data.redemption.user.id} redeemed ${dataMessage.data.redemption.reward.title}`);
        }
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
          username:      dataMessage.data.redemption.user.login,
          titleOfReward: dataMessage.data.redemption.reward.title,
          userInput:     dataMessage.data.redemption.user_input,
        });
      } else if (dataMessage.type === 'moderation_action') {
        try {
          const createdBy = dataMessage.data.from_automod ? 'TwitchAutoMod' : `${dataMessage.data.created_by}#${dataMessage.data.created_by_user_id}`;
          const [ username, reason ] = dataMessage.data.args;
          if (dataMessage.data.moderation_action === 'ban') {
            ban(`${username}#${dataMessage.data.target_user_id} by ${createdBy}: ${reason ? reason : '<no reason>'}`);
            eventEmitter.emit('ban', { username, reason: reason ? reason : '<no reason>' });
          } else if (dataMessage.data.moderation_action === 'unban') {
            unban(`${username}#${dataMessage.data.target_user_id} by ${createdBy}`);
          } else if (dataMessage.data.moderation_action === 'timeout') {
            timeout(`${username}#${dataMessage.data.target_user_id} by ${createdBy} for ${reason} seconds`);
            eventEmitter.emit('timeout', { username, duration: reason });
          }
        } catch (e) {
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

const listen = (topic: string) => {
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
