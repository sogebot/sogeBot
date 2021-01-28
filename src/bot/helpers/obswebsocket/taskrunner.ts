import type ObsWebSocket from 'obs-websocket-js';

import { OBSWebsocketInterface, simpleModeTaskWaitMS } from '../../database/entity/obswebsocket';
import { availableActions } from './actions';

const taskRunner = async (obs: ObsWebSocket, tasks: OBSWebsocketInterface['simpleModeTasks']) => {
  for (const task of tasks) {
    let args;
    switch(task.event) {
      case 'WaitMs':
        args = task.args as simpleModeTaskWaitMS['args'];
        await availableActions[task.event](obs, args.miliseconds);
        break;
      case 'SetCurrentScene':
        args = task.args as any;
        await availableActions[task.event](obs, args.sceneName);
        break;
    }
  }
};

export { taskRunner };