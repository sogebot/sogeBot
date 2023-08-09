import { MINUTE } from '@sogebot/ui-helpers/constants';
import { v4 } from 'uuid';

import { logEmitter as log } from './log/emitter';

import { variables } from '~/watchers';

const execCommands = {
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
