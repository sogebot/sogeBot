import { broadcasterUsername } from './oauth/broadcasterUsername';

export function getBroadcaster() {
  try {
    return broadcasterUsername.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}