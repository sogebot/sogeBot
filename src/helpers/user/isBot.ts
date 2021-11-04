import type { UserInterface } from '@entity/user';

import emitter from '../interfaceEmitter';

let botId = '';
let botUsername = '';

emitter.on('change', (path, value) => {
  if (path === 'services.twitch.botId') {
    botId = value;
  } else if (path === 'services.twitch.botUsername') {
    botUsername = value;
  }
});

emitter.on('load', (path, value) => {
  if (path === 'services.twitch.botId') {
    botId = value;
  } else if (path === 'services.twitch.botUsername') {
    botUsername = value;
  }
});

export function isBot(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (botUsername) {
      return botUsername.toLowerCase().trim() === (typeof user === 'string' ? user : user.userName).toLowerCase().trim();
    } else {
      return false;
    }
  } catch (e: any) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function isBotId(userId: string | undefined) {
  try {
    if (botUsername.length > 0) {
      return botId === userId;
    } else {
      return false;
    }
  } catch (e: any) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

let _isBotSubscriber = false;
function isBotSubscriber (value: boolean): boolean;
function isBotSubscriber (): boolean;
function isBotSubscriber(value?: boolean) {
  if (typeof value !== 'undefined') {
    _isBotSubscriber = value;
  }
  return _isBotSubscriber;
}

export { isBotSubscriber };
