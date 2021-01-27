import type OBSWebSocket from 'obs-websocket-js';

import { handleOBSError } from './handlerOBSError';

const listScenes = (obs: OBSWebSocket) => {
  try {
    return obs.send('ListSceneCollections');
  } catch (e) {
    handleOBSError(e);
  }
};

export { listScenes };