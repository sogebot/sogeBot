import getBotId from '~/helpers/user/getBotId';
import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

export default function deleteChatMessages(messageId: string) {
  return twitch.apiClient?.asIntent(['bot'], ctx => ctx.moderation.deleteChatMessages(getBroadcasterId(), getBotId(), messageId));
}