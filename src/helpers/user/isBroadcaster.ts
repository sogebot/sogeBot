import { variables } from '~/watchers.js';

export function isBroadcaster(user: string | CommandOptions['sender'] | { username: string | null; userId?: number | string } | UserStateTags) {
  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  try {
    return broadcasterUsername.toLowerCase().trim() === (typeof user === 'string' ? user : user.userName?.toLowerCase().trim());
  } catch (e: any) {
    return false;
  }
}

export function isBroadcasterId(userId: string) {
  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    return broadcasterId === userId;
  } catch (e: any) {
    return false;
  }
}