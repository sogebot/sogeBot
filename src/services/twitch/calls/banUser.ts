import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

export default function banUser(userId: string, reason: string, duration?: number) {
  return twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.moderation.banUser(getBroadcasterId(), getBroadcasterId(), {
    user: {
      id: userId,
    },
    duration,
    reason,
  }));
}