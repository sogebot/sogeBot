import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

export default function banUser(userId: string, reason?: string, duration?: number, type: 'bot' | 'broadcaster' = 'bot') {
  twitch.apiClient?.asIntent([type], ctx => ctx.moderation.banUser(getBroadcasterId(), {
    user: {
      id: userId,
    },
    duration,
    reason: reason ?? '',
  })).catch((e) => {
    if (type === 'bot') {
      // try again with broadcaster
      banUser(userId, reason, duration, 'broadcaster');
    } else {
      throw e; // rethrow on second try
    }
  });
}