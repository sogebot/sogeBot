import type { UserInterface } from '../../database/entity/user';
import { botId } from '../oauth/botId';
import { botUsername } from '../oauth/botUsername';

export function isBot(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (botUsername.value) {
      return botUsername.value.toLowerCase().trim() === (typeof user === 'string' ? user : user.username).toLowerCase().trim();
    } else {
      return false;
    }
  } catch (e) {
    return true; // we can expect, if user is null -> bot or admin
  }
}

export function isBotId(userId: string) {
  try {
    if (botUsername.value) {
      return botId.value === userId;
    } else {
      return false;
    }
  } catch (e) {
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
