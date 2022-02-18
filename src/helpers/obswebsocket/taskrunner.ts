import { createHash } from 'crypto';

import { Events } from '@entity/event';
import { OBSWebsocketInterface } from '@entity/obswebsocket';
import type ObsWebSocket from 'obs-websocket-js';
import safeEval from 'safe-eval';

import { setImmediateAwait } from '../setImmediateAwait';
import { availableActions } from './actions';

const runningTasks: string[] = [];

const taskRunner = async (obs: ObsWebSocket, opts: { tasks: OBSWebsocketInterface['simpleModeTasks'] | string, hash?: string, attributes?: Events.Attributes }): Promise<void> => {
  const hash = opts.hash ?? createHash('sha256').update(JSON.stringify(opts.tasks)).digest('base64');
  const tasks = opts.tasks;
  if (runningTasks.includes(hash)) {
    // we need to have running only one
    await setImmediateAwait();
    return taskRunner(obs, opts);
  }

  runningTasks.push(hash);

  try {
    if (typeof tasks === 'string') {
      // advanced mode
      const toEval = `(async function evaluation () { ${tasks} })()`;
      await safeEval(toEval, {
        event:  opts.attributes,
        obs,
        waitMs: (ms: number) => {
          return new Promise((resolve) => setTimeout(resolve, ms, null));
        },
        // we are using error on code so it will be seen in OBS Log Viewer
        log: (process.env.BUILD === 'web') ? console.error : require('../log').info,
      });
    } else {
      for (const task of tasks) {
        switch(task.event) {
          case 'Log':
            await availableActions[task.event](obs, task.args.logMessage);
            break;
          case 'WaitMs':
            await availableActions[task.event](obs, task.args.miliseconds);
            break;
          case 'SetCurrentScene':
            await availableActions[task.event](obs, task.args.sceneName);
            break;
          case 'SetMute':
            await availableActions[task.event](obs, task.args.source, task.args.mute);
            break;
          case 'SetVolume':
            await availableActions[task.event](obs, task.args.source, task.args.volume);
            break;
          default:
            await availableActions[task.event](obs);
        }
      }
    }
  } catch (e: any) {
    if (process.env.BUILD === 'web') {
      console.error(e);
    } else {
      require('../log').error(e);
    }
    throw e;
  } finally {
    runningTasks.splice(runningTasks.indexOf(hash), 1);
  }
};

export { taskRunner };