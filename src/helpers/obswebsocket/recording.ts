import type OBSWebSocket from 'obs-websocket-js';

import { handleOBSError } from './handlerOBSError';

const startRecording = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('StartRecording').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

const stopRecording = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('StopRecording').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

const pauseRecording = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('PauseRecording').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

const resumeRecording = (obs: OBSWebSocket) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('ResumeRecording').then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

export {
  startRecording, stopRecording, pauseRecording, resumeRecording,
};