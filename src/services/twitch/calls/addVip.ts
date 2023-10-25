import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import twitch from '~/services/twitch.js';

export default function addVip(userId: string) {
  return twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.channels.addVip(getBroadcasterId(), userId));
}