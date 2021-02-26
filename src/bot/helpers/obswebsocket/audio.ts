import type OBSWebSocket from 'obs-websocket-js';

import { handleOBSError } from './handlerOBSError';

const setMute = (obs: OBSWebSocket, source: string, mute: boolean) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('SetMute', { source, mute }).then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

const setVolume = (obs: OBSWebSocket, source: string, volume: number) => {
  return new Promise((resolve: (value: boolean) => void) => {
    obs.send('SetVolume', {
      source, volume, useDecibel: true,
    }).then(() => {
      resolve(true);
    }).catch((e) => {
      handleOBSError(e);
      resolve(false);
    });
  });
};

export { setMute, setVolume };