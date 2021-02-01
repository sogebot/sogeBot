import { createHash } from 'crypto';
import safeEval from 'safe-eval';

import type ObsWebSocket from 'obs-websocket-js';

import { OBSWebsocketInterface, simpleModeTaskWaitMS } from '../../database/entity/obswebsocket';
import { setImmediateAwait } from '../setImmediateAwait';
import { availableActions } from './actions';
import { info } from '../log';

const runningTasks: string[] = [];

const taskRunner = async (obs: ObsWebSocket, tasks: OBSWebsocketInterface['simpleModeTasks'] | string, hash?: string): Promise<void> => {
  hash = hash ?? createHash('sha256').update(JSON.stringify(tasks)).digest('base64');
  if (runningTasks.includes(hash)) {
    // we need to have running only one
    await setImmediateAwait();
    return taskRunner(obs, tasks, hash);
  }

  runningTasks.push(hash);

  try {
    if (typeof tasks === 'string') {
      // advanced mode
      const toEval = `(async function evaluation () { ${tasks} })()`;
      await safeEval(toEval, {
        obs,
        waitMs: (ms: number) => {
          return new Promise((resolve) => setTimeout(resolve, ms))
        },
        log: info,
      });
    } else {
      for (const task of tasks) {
        let args;
        const event = task.event as keyof typeof availableActions;
        switch(event) {
          case 'WaitMs':
            args = task.args as simpleModeTaskWaitMS['args'];
            await availableActions[event](obs, args.miliseconds);
            break;
          case 'SetCurrentScene':
            args = task.args as any;
            await availableActions[event](obs, args.sceneName);
            break;
          default:
            await availableActions[event](obs);
        }
      }
    }
  } catch (e) {
    throw e;
  } finally {
    runningTasks.splice(runningTasks.indexOf(hash), 1);
  }
};

export { taskRunner };