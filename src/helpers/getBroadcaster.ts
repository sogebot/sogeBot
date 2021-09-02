import { broadcasterUsername } from './oauth/broadcasterUsername';

export function getBroadcaster() {
  try {
    return broadcasterUsername.value.toLowerCase().trim();
  } catch (e: any) {
    return '';
  }
}