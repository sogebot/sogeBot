import oauth from '../oauth';

export function getBroadcaster() {
  try {
    return oauth.broadcasterUsername.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}