import { variables } from '~/watchers';

export function getBot() {
  const botUsername = variables.get('services.twitch.botUsername') as string;
  try {
    return botUsername.toLowerCase().trim();
  } catch (e: any) {
    return '';
  }
}