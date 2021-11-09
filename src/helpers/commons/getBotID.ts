import { variables } from '~/watchers';

export function getBotID() {
  const botId = variables.get('services.twitch.botId') as string;
  try {
    return botId;
  } catch (e: any) {
    return '0';
  }
}