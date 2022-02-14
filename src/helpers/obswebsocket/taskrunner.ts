import { createHash } from 'crypto';

import { Events } from '@entity/event.js';
import { OBSWebsocketInterface } from '@entity/obswebsocket';
import type ObsWebSocket from 'obs-websocket-js';

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
      if (process.env.BUILD === 'web') {
        // we need to use safe-eval on browser until vm2 will be available on browser
        const safeEval = require('safe-eval');
        const toEval = `(async function evaluation () { ${tasks} })()`;
        await safeEval(toEval, {
          event:  opts.attributes,
          obs,
          waitMs: (ms: number) => {
            return new Promise((resolve) => setTimeout(resolve, ms, null));
          },
          // we are using error on code so it will be seen in OBS Log Viewer
          log: console.error,
        });
      } else {
        const { VM } = require('vm2');
        // advanced mode
        const toEval = `(async function () { ${tasks} })`;
        const sandbox = {
          event:  opts.attributes,
          obs,
          waitMs: (ms: number) => {
            return new Promise((resolve) => setTimeout(resolve, ms, null));
          },
          // we are using error on code so it will be seen in OBS Log Viewer
          log: require('../log').info,
        };
        const vm = new VM({ sandbox });
        await vm.run(toEval)();
      }
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