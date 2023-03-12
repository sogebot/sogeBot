import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

export default function addModerator(userId: string) {
  return twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.moderation.addModerator(getBroadcasterId(), userId));
}