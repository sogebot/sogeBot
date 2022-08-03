import { createHash } from 'crypto';

import { Events } from '@entity/event.js';
import axios from 'axios';
import type ObsWebSocket from 'obs-websocket-js';
import safeEval from 'safe-eval';

import { setImmediateAwait } from '../setImmediateAwait';

const runningTasks: string[] = [];

const taskRunner = async (obs: ObsWebSocket, opts: { code: string, hash?: string, attributes?: Events.Attributes }): Promise<void> => {
  const hash = opts.hash ?? createHash('sha256').update(opts.code).digest('base64');
  const tasks = opts.code;
  if (runningTasks.includes(hash)) {
    // we need to have running only one
    await setImmediateAwait();
    return taskRunner(obs, opts);
  }

  runningTasks.push(hash);

  try {
    const toEval = `(async function evaluation () { ${tasks} })()`;
    await safeEval(toEval, {
      event:  opts.attributes,
      obs,
      waitMs: (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms, null));
      },
      // we are using error on code so it will be seen in OBS Log Viewer
      log: (logMessage: string) => {
        (process.env.BUILD === 'web') ? console.error(logMessage) : require('../log').info(logMessage);
        try {
          axios.post((process.env.isNuxtDev ? 'http://localhost:20000' : '') + '/integrations/obswebsocket/log', { message: logMessage });
        } catch {
          return;
        }
      },
    });
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