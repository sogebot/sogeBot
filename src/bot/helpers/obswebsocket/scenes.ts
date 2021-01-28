import type OBSWebSocket from 'obs-websocket-js';

import { handleOBSError } from './handlerOBSError';

const listScenes = (obs: OBSWebSocket) => {
  return new Promise((resolve: (scenes: OBSWebSocket.Scene[]) => void) => {
    obs.send('GetSceneList').then(value => {
      resolve(value.scenes);
    }).catch((e) => {
      handleOBSError(e);
      resolve([]);
    });
  });
};

const setCurrentScene = (obs: OBSWebSocket, sceneName: string) => {
  try {
    return obs.send('SetCurrentScene', { 'scene-name': sceneName });
  } catch (e) {
    handleOBSError(e);
  }
};

export { listScenes, setCurrentScene };