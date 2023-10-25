import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import twitch from '~/services/twitch.js';

export default function deleteChatMessages(messageId: string) {
  return twitch.apiClient?.asIntent(['bot'], ctx => ctx.moderation.deleteChatMessages(getBroadcasterId(), messageId));
}