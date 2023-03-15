import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

export default function addVip(userId: string) {
  return twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.channels.addVip(getBroadcasterId(), userId));
}