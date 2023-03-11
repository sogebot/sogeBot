import getBotId from '~/helpers/user/getBotId';
import twitch from '~/services/twitch';

export default function sendWhisper(userId: string, message: string) {
  return twitch.apiClient?.asIntent(['bot'], ctx => ctx.whispers.sendWhisper(getBotId(), userId, message));
}