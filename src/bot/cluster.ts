export const isMainThread = (process.env.CLUSTER_TYPE ?? 'main') === 'main';

import io from 'socket.io';
import ioClient from 'socket.io-client';
import http from 'http';

import { chatIn, chatOut, isDebugEnabled as debugIsEnabled, error, info, whisperIn, whisperOut } from './helpers/log.js';
import oauth from './oauth.js';
import api from './api.js';
import tmi from './tmi.js';
import { avgResponse } from './helpers/parser.js';

const availableSockets: {
  [socketId: string]: {
    timestamp: number;
    isAlive: boolean;
  };
} = {};

let lastSocketIdx = 0;

let socketIO: io.Server;
let clientIO: SocketIOClient.Socket;

const isClusterEnabled = /^true$/i.test(process.env.CLUSTER ?? 'false');
const clusterId = process.env.CLUSTER_ID ?? 'e77f8113-5be4-474e-a603-b435d839ab00';
const clusterMainThreadUrl = process.env.CLUSTER_MAIN_THREAD_URL ?? 'http://localhost';
const clusterPort = process.env.CLUSTER_PORT ?? '20003';

export const init = async () => {
  if (isClusterEnabled) {
    if (isMainThread) {
      const server = http.createServer();

      socketIO = io(server);
      server.listen(clusterPort);

      socketIO.use(function (socket, next) {
        if (clusterId.trim() === socket.request._query.id) {
          next();
        }
        return false;
      });

      socketIO.on('connection', (socket) => {
        socket.on('clusteredClientChat', (type, username, messageToSend) => clusteredClientChat(type, username, messageToSend));
        socket.on('clusteredClientTimeout', (username, timeMs, reason, isMod) => clusteredClientTimeout(username, timeMs, reason, isMod));
        socket.on('clusteredClientDelete', (senderId) => clusteredClientDelete(senderId));
        socket.on('clusteredWhisperIn', (message) => clusteredWhisperIn(message));
        socket.on('clusteredChatIn', (message) => clusteredChatIn(message));
        socket.on('clusteredWhisperOut', (message) => clusteredWhisperOut(message));
        socket.on('clusteredChatOut', (message) => clusteredChatOut(message));
        socket.on('clusteredAPI', (fName: string, args: any[]) => {
          (api as any)[fName].apply(api, args);
        });
        socket.on('clusteredFetchAccountAge', async (userId, cb) => {
          await clusteredFetchAccountAge(userId);
          if (cb) {
            cb(null);
          } // return when done
        });

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
      clientIO = ioClient.connect(clusterMainThreadUrl + ':' + clusterPort, {
        query: {
          id: clusterId,
        },
      });

      clientIO.on('send:message', async (data: any) => {
        clientIO.emit('received:message', await tmi.message(data, true));
      });
    }
  }
};

export const manageMessage = async (data: any) => {
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

export const clusteredClientChat = (type: 'say' | 'whisper' | 'me', username: string, messageToSend: string) => {
  if (isMainThread) {
    if (debugIsEnabled('tmi')) {
      return;
    }
    if (type === 'me') {
      tmi.client.bot?.chat.say(username, `/me ${messageToSend}`);
    } else {
      tmi.client.bot?.chat[type](username, messageToSend);
    }
  } else {
    clientIO.emit('clusteredClientChat', type, username, messageToSend);
  }
};

export const clusteredClientDelete = (senderId: string) => {
  if (isMainThread) {
    if (debugIsEnabled('tmi')) {
      return;
    }
    tmi.delete('bot', senderId);
  } else {
    clientIO.emit('clusteredClientDelete', senderId);
  }
};

export const clusteredClientTimeout = (username: string, timeMs: number, reason: string, isMod: boolean) => {
  if (isMainThread) {
    if (isMod) {
      if (tmi.client.broadcaster) {
        tmi.client.broadcaster.chat.timeout(oauth.generalChannel, username, timeMs, reason);
      } else {
        error('Cannot timeout mod user, as you don\'t have set broadcaster in chat');
      }
    } else {
      tmi.client.bot?.chat.timeout(oauth.generalChannel, username, timeMs, reason);
    }
  } else {
    clientIO.emit('clusteredClientTimeout', username, timeMs, reason);
  }
};

export const clusteredAPI = (fName: string, args: any[]) => {
  if (!isMainThread) {
    clientIO.emit('clusteredAPI', fName, args);
  }
};

export const clusteredWhisperIn = (message: string) => {
  whisperIn(message);
  if (!isMainThread) {
    clientIO.emit('clusteredWhisperIn', message);
  }
};

export const clusteredChatIn = (message: string) => {
  chatIn(message);
  if (!isMainThread) {
    clientIO.emit('clusteredChatIn', message);
  }
};

export const clusteredWhisperOut = (message: string) => {
  whisperOut(message);
  if (!isMainThread) {
    clientIO.emit('clusteredWhisperOut', message);
  }
};

export const clusteredChatOut = (message: string) => {
  chatOut(message);
  if (!isMainThread) {
    clientIO.emit('clusteredChatOut', message);
  }
};

export const clusteredFetchAccountAge = async (userId: number) => {
  if (isMainThread) {
    await api.fetchAccountAge(userId);
  } else {
    await new Promise(resolve => {
      clientIO.emit('clusteredFetchAccountAge', userId, () => {
        resolve();
      });
    });
  }
};