export const isMainThread = typeof process.env.CLUSTER === 'undefined';

import 'module-alias/register';
import io from 'socket.io';
import ioClient from 'socket.io-client';
import http from 'http';

import { isDebugEnabled as debugIsEnabled, warning } from './helpers/log';
import config from '@config';
import { chatIn, chatOut, info, whisperIn, whisperOut } from './helpers/log';
import oauth from './oauth';
import api from './api';
import panel from './panel';
import tmi from './tmi';
import { avgResponse } from './helpers/parser';

const availableSockets: {
  [socketId: string]: {
    timestamp: number;
    isAlive: boolean;
  };
} = {};

let lastSocketIdx = 0;

let socketIO, clientIO;

export const init = async () => {
  if (process.env.CLUSTER && config.cluster.enabled === 'false') {
    warning('You are trying to run in cluster-mode without proper settings.');
    process.exit(1);
  }

  if (config.cluster.enabled === 'true') {
    if (typeof panel === 'undefined' && isMainThread) {
      setTimeout(() => {
        init();
      }, 1000);
      return;
    }
    if (isMainThread) {
      const server = http.createServer();

      socketIO = io(server);
      server.listen(config.cluster.port);

      socketIO.use(function (socket, next) {
        if (config.cluster.id.trim() === socket.request._query.id) {
          next();
        }
        return false;
      });

      socketIO.on('connection', (socket) => {
        socket.on('clusteredClientChat', (type, username, messageToSend) => clusteredClientChat(type, username, messageToSend));
        socket.on('clusteredClientTimeout', (username, timeMs, reason) => clusteredClientTimeout(username, timeMs, reason));
        socket.on('clusteredClientDelete', (senderId) => clusteredClientDelete(senderId));
        socket.on('clusteredWhisperIn', (message) => clusteredWhisperIn(message));
        socket.on('clusteredChatIn', (message) => clusteredChatIn(message));
        socket.on('clusteredWhisperOut', (message) => clusteredWhisperOut(message));
        socket.on('clusteredChatOut', (message) => clusteredChatOut(message));
        socket.on('clusteredFetchAccountAge', (username, userId) => clusteredFetchAccountAge(username, userId));

        socket.on('received:message', (cb) => {
          // cb is average time
          avgResponse({ value: cb.value, message: cb.message });
        });

        socket.on('disconnect', () => {
          delete availableSockets[socket.id];
        });

        availableSockets[socket.id] = {
          timestamp: Date.now(),
          isAlive: true,
        };
      });
    } else {
      info('Clustered mode: you will see only messages handled by this node');
      clientIO = ioClient.connect(config.cluster.mainThreadUrl + ':' + config.cluster.port, {
        query: {
          id: config.cluster.id,
        },
      });

      clientIO.on('send:message', async (data) => {
        clientIO.emit('received:message', await tmi.message(data, true));
      });
    }
  };
};

export const manageMessage = async (data) => {
  // randomly select from available sockets + master
  const sockets = [ 'main', ...Object.keys(availableSockets).filter(socketId => availableSockets[socketId].isAlive ) ];
  lastSocketIdx++;
  if (typeof sockets[lastSocketIdx] === 'undefined') {
    lastSocketIdx = sockets.length > 1 ? 1 : 0; // skip main if there are sockets
  }
  const selectedSocket = sockets[lastSocketIdx];

  if (selectedSocket === 'main') {
    tmi.message(data, true);
  } else {
    socketIO.to(selectedSocket).emit('send:message', data);
  }
};

export const clusteredClientChat = (type, username, messageToSend) => {
  if (isMainThread) {
    if (debugIsEnabled('tmi')) {
      return;
    }
    tmi.client.bot?.chat[type](username, messageToSend);
  } else {
    clientIO.emit('clusteredClientChat', type, username, messageToSend);
  }
};

export const clusteredClientDelete = (senderId) => {
  if (isMainThread) {
    if (debugIsEnabled('tmi')) {
      return;
    }
    tmi.delete('bot', senderId);
  } else {
    clientIO.emit('clusteredClientDelete', senderId);
  }
};

export const clusteredClientTimeout = (username, timeMs, reason) => {
  if (isMainThread) {
    tmi.client.bot?.chat.timeout(oauth.generalChannel, username, timeMs, reason);
  } else {
    clientIO.emit('clusteredClientTimeout', username, timeMs, reason);
  }
};

export const clusteredWhisperIn = (message) => {
  whisperIn(message);
  if (!isMainThread) {
    clientIO.emit('clusteredWhisperIn', message);
  }
};

export const clusteredChatIn = (message) => {
  chatIn(message);
  if (!isMainThread) {
    clientIO.emit('clusteredChatIn', message);
  }
};

export const clusteredWhisperOut = (message) => {
  whisperOut(message);
  if (!isMainThread) {
    clientIO.emit('clusteredWhisperOut', message);
  }
};

export const clusteredChatOut = (message) => {
  chatOut(message);
  if (!isMainThread) {
    clientIO.emit('clusteredChatOut', message);
  }
};

export const clusteredFetchAccountAge = (username, userId) => {
  if (isMainThread) {
    api.fetchAccountAge(username, userId);
  } else {
    clientIO.emit('clusteredFetchAccountAge', username, userId);
  }
};