import type OBSWebSocket from 'obs-websocket-js';

import { handleOBSError } from './handlerOBSError';

const startReplayBuffer = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('StartReplayBuffer').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

const stopReplayBuffer = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('StopReplayBuffer').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

const saveReplayBuffer = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('SaveReplayBuffer').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

export {
  startReplayBuffer, stopReplayBuffer, saveReplayBuffer, 
};