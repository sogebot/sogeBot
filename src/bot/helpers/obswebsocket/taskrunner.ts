import { createHash } from 'crypto';

import type ObsWebSocket from 'obs-websocket-js';

import { OBSWebsocketInterface, simpleModeTaskWaitMS } from '../../database/entity/obswebsocket';
import { setImmediateAwait } from '../setImmediateAwait';
import { availableActions } from './actions';

const runningTasks: string[] = [];

const taskRunner = async (obs: ObsWebSocket, tasks: OBSWebsocketInterface['simpleModeTasks'], hash?: string): Promise<void> => {
  hash = hash ?? createHash('sha256').update(JSON.stringify(tasks)).digest('base64');
  if (runningTasks.includes(hash)) {
    // we need to have running only one
    await setImmediateAwait();
    return taskRunner(obs, tasks, hash);
  }

  runningTasks.push(hash);
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
  runningTasks.splice(runningTasks.indexOf(hash), 1);
};

export { taskRunner };