import oauth from './oauth';
import WebSocket from 'ws';
import { debug, error, info, warning } from './helpers/log';
import { SECOND } from './constants';
import events from './events';
import { addUIError } from './panel';

const pubsubEndpoint: Readonly<string> = 'wss://pubsub-edge.twitch.tv';
const heartbeatInterval: Readonly<number> = 60 * SECOND;
const reconnectInterval: Readonly<number> = 3 * SECOND;

let ws: WebSocket | null = null;

let heartbeatHandle: NodeJS.Timeout | undefined;
let connectionHash = '';

let ERR_BADAUTH = false;

setInterval(() => {
  try {
    if (oauth.broadcasterAccessToken.length > 0 && oauth.broadcasterClientId.length > 0 && oauth.broadcasterId.length > 0) {
      if (connectionHash !== oauth.broadcasterClientId.concat(oauth.broadcasterAccessToken, oauth.broadcasterId)) {
        ws?.close();
        ws = null;
        ERR_BADAUTH = false;
      }
      if (!ws && !ERR_BADAUTH) {
        connectionHash = oauth.broadcasterClientId.concat(oauth.broadcasterAccessToken, oauth.broadcasterId);
        connect();
      }
    }
  } catch (e) {
    warning(e.stack);
  }
}, 1000);

const heartbeat = () => {
  ws?.send(JSON.stringify({
    type: 'PING',
  }));
};

const connect = () => {
  ws = new WebSocket(pubsubEndpoint);
  ws.onopen = function() {
    info('PUBSUB: Socket Opened');
    heartbeat();

    // listen to points redemption
    listen('channel-points-channel-v1.' + oauth.broadcasterId);
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
        events.fire('reward-redeemed', {
          username: dataMessage.data.redemption.user.login,
          titleOfReward: dataMessage.data.redemption.reward.title,
        });
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
    type: 'LISTEN',
    nonce: nonce(15),
    data: {
      topics: [topic],
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
