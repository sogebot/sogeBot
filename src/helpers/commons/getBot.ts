import { variable } from '~/helpers/variables';

export function getBot() {
  const botUsername = variable.get('services.twitch.botUsername') as string;
  try {
    return botUsername.toLowerCase().trim();
  } catch (e: any) {
    return '';
  }
}