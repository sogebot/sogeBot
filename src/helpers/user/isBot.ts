import type { UserInterface } from '@entity/user.js';

import { variables } from '~/watchers.js';

export function isBot(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    const botUsername = variables.get('services.twitch.botUsername') as string;
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
    const botId = variables.get('services.twitch.botId') as string;
    if (botId.length > 0) {
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
