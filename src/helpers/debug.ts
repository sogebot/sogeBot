import fs from 'node:fs';
import { Session } from 'node:inspector';
import { normalize } from 'node:path';
import { gzip } from 'zlib';

import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { v4 } from 'uuid';

import { logEmitter as log } from './log/emitter.js';

import { variables } from '~/watchers.js';

const execCommands = {
  'profiler.5': async () => {
    const session = new Session();
    session.connect();

    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        log.emit('warning', 'Profiler start at ' + new Date().toLocaleString() + ' | Expected end at ' + new Date(Date.now() + (5 * MINUTE)).toLocaleString());
        setTimeout(() => {
          // some time later...
          session.post('Profiler.stop', (err, { profile }) => {
            session.disconnect();
            // Write profile to disk, upload, etc.
            if (!err) {
              gzip(JSON.stringify(profile), (err2, buf) => {
                if (err2) {
                  log.emit('error', err2.stack ?? '');
                } else {
                  fs.writeFileSync('./logs/profile-' + Date.now() + '.cpuprofile.gz', buf);
                  log.emit('warning', 'Profiler saved at ./logs/profile-' + Date.now() + '.cpuprofile.gz');
                }
              });
            }
          });
        }, 5 * MINUTE);
      });
    });
  },
  'profiler.15': async () => {
    const session = new Session();
    session.connect();

    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        log.emit('warning', 'Profiler start at ' + new Date().toLocaleString() + ' | Expected end at ' + new Date(Date.now() + (15 * MINUTE)).toLocaleString());
        setTimeout(() => {
          // some time later...
          session.post('Profiler.stop', (err, { profile }) => {
            session.disconnect();
            // Write profile to disk, upload, etc.
            if (!err) {
              gzip(JSON.stringify(profile), (err2, buf) => {
                if (err2) {
                  log.emit('error', err2.stack ?? '');
                } else {
                  fs.writeFileSync('./logs/profile-' + Date.now() + '.cpuprofile.gz', buf);
                  log.emit('warning', 'Profiler saved at ./logs/profile-' + Date.now() + '.cpuprofile.gz');
                }
              });
            }
          });
        }, 15 * MINUTE);
      });
    });
  },
  'profiler.30': async () => {
    const session = new Session();
    session.connect();

    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        log.emit('warning', 'Profiler start at ' + new Date().toLocaleString() + ' | Expected end at ' + new Date(Date.now() + (30 * MINUTE)).toLocaleString());
        setTimeout(() => {
          // some time later...
          session.post('Profiler.stop', (err, { profile }) => {
            session.disconnect();
            // Write profile to disk, upload, etc.
            if (!err) {
              gzip(JSON.stringify(profile), (err2, buf) => {
                if (err2) {
                  log.emit('error', err2.stack ?? '');
                } else {
                  fs.writeFileSync('./logs/profile-' + Date.now() + '.cpuprofile.gz', buf);
                  log.emit('warning', 'Profiler saved at ./logs/profile-' + Date.now() + '.cpuprofile.gz');
                }
              });
            }
          });
        }, 30 * MINUTE);
      });
    });
  },
  'profiler.60': async () => {
    const session = new Session();
    session.connect();

    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        log.emit('warning', 'Profiler start at ' + new Date().toLocaleString() + ' | Expected end at ' + new Date(Date.now() + (60 * MINUTE)).toLocaleString());
        setTimeout(() => {
          // some time later...
          session.post('Profiler.stop', (err, { profile }) => {
            session.disconnect();
            // Write profile to disk, upload, etc.
            if (!err) {
              gzip(JSON.stringify(profile), (err2, buf) => {
                if (err2) {
                  log.emit('error', err2.stack ?? '');
                } else {
                  fs.writeFileSync('./logs/profile-' + Date.now() + '.cpuprofile.gz', buf);
                  log.emit('warning', 'Profiler saved at ./logs/profile-' + Date.now() + '.cpuprofile.gz');
                }
              });
            }
          });
        }, 60 * MINUTE);
      });
    });
  },
  'heap': async () => {
    const session = new Session();
    const filename = normalize(`./logs/profile-${Date.now()}.heapsnapshot`);
    const fd = fs.openSync(filename, 'w');
    session.connect();

    session.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
      fs.writeSync(fd, m.params.chunk);
    });

    log.emit('warning', `HeapProfiler.takeHeapSnapshot started`);
    session.post('HeapProfiler.takeHeapSnapshot', undefined, (err: any, r: any) => {
      log.emit('warning', `HeapProfiler.takeHeapSnapshot done: ${err} ${JSON.stringify(r)}`);
      log.emit('warning', `Heap saved at ${filename}`);
      session.disconnect();
      fs.closeSync(fd);
    });
  },
  'twitch/clear/broadcaster/credentials': () => {
    log.emit('warning', 'Clearing up BROADCASTER twitch credentials');
    variables.set('services.twitch.broadcasterTokenValid', false);
    variables.set('services.twitch.broadcasterCurrentScopes', []);
    variables.set('services.twitch.broadcasterId', '');
    variables.set('services.twitch.broadcasterUsername', '');
    variables.set('services.twitch.broadcasterRefreshToken', '');
  },
  'twitch/clear/bot/credentials': () => {
    log.emit('warning', 'Clearing up BOT twitch credentials');
    variables.set('services.twitch.botTokenValid', false);
    variables.set('services.twitch.botCurrentScopes', []);
    variables.set('services.twitch.botId', '');
    variables.set('services.twitch.botUsername', '');
    variables.set('services.twitch.botRefreshToken', '');
    return null;
  },
} as const;

let debugEnv = '';
export function isDebugEnabled(category: string) {
  if (debugEnv.trim().length === 0) {
    return false;
  }
  const categories = category.split('.');
  let bEnabled = false;
  bEnabled = debugEnv.includes(category) || debugEnv.includes(categories[0] + '.*');
  bEnabled = debugEnv === '*' || bEnabled;
  return bEnabled;
}

export const setDEBUG = async (newDebugEnv: string) => {
  newDebugEnv = newDebugEnv.trim();
  if (newDebugEnv.startsWith('debug::exec::')) {
    handleExec(newDebugEnv.replace('debug::exec::', '') as keyof typeof execCommands);
    return;
  }
  if (newDebugEnv.startsWith('debug::confirm::')) {
    handleConfirm(newDebugEnv.replace('debug::confirm::', ''));
    return;
  }
  if (newDebugEnv.trim().length === 0) {
    log.emit('warning', 'DEBUG unset');
  } else {
    log.emit('warning', 'DEBUG set to: ' + newDebugEnv);
  }
  debugEnv = newDebugEnv.trim();
};
export const getDEBUG = () => {
  return debugEnv;
};

const registeredCommands: { [x: string]: keyof typeof execCommands} = {};

export const handleExec = async (command: keyof typeof execCommands) => {
  if (command in execCommands) {
    // we need to create confirm command
    const uuid = v4();
    registeredCommands[uuid] = command;
    log.emit('debug', `Received EXEC ${command}. To confirm, paste into debug input\n\t\ndebug::confirm::${uuid}\n`);
    setTimeout(() => {
      // delete confirm after minute
      delete registeredCommands[uuid];
    }, MINUTE);
  } else {
    log.emit('error', `Received EXEC ${command} not found`);
  }
};

export const handleConfirm = async (uuid: string) => {
  if (uuid in registeredCommands) {
    log.emit('debug', `Received CONFIRM ${uuid}.`);
    execCommands[registeredCommands[uuid]]();
    delete registeredCommands[uuid];
  } else {
    log.emit('error', `Unknown CONFIRM.`);
  }
};
