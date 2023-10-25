import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import twitch from '~/services/twitch.js';

export default function addModerator(userId: string) {
  return twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.moderation.addModerator(getBroadcasterId(), userId));
}