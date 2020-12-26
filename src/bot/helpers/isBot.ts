import type { UserInterface } from '../database/entity/user';
import oauth from '../oauth';

export function isBot(user: string | CommandOptions['sender'] | UserInterface | UserStateTags) {
  try {
    if (oauth.botUsername) {
      return oauth.botUsername.toLowerCase().trim() === (typeof user === 'string' ? user : user.username.toLowerCase().trim());
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
