import { variable } from '~/helpers/variables';

export function getBotID() {
  const botId = variable.get('services.twitch.botId') as string;
  try {
    return botId;
  } catch (e: any) {
    return '0';
  }
}