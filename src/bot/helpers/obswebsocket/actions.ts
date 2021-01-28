import type ObsWebSocket from 'obs-websocket-js';

import { setCurrentScene } from './scenes';

const availableActions = {
  'SetCurrentScene': setCurrentScene,
  'WaitMs': (obs: ObsWebSocket, miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds)),
} as const;

export { availableActions };