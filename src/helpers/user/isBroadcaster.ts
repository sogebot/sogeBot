import { broadcasterId } from '../oauth/broadcasterId';
import { broadcasterUsername } from '../oauth/broadcasterUsername';

export function isBroadcaster(user: string | CommandOptions['sender'] | { username: string | null; userId?: number | string } | UserStateTags) {
  try {
    return broadcasterUsername.value.toLowerCase().trim() === (typeof user === 'string' ? user : user.username?.toLowerCase().trim());
  } catch (e) {
    return false;
  }
}

export function isBroadcasterId(userId: string) {
  try {
    return broadcasterId.value === userId;
  } catch (e) {
    return false;
  }
}