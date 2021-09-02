import { botUsername } from '../oauth/botUsername';

export function getBot() {
  try {
    return botUsername.value.toLowerCase().trim();
  } catch (e: any) {
    return '';
  }
}