import { botId } from '../oauth/botId';

export function getBotID() {
  try {
    return botId.value;
  } catch (e: any) {
    return '0';
  }
}