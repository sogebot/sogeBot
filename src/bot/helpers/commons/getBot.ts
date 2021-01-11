import oauth from '../../oauth';

export function getBot() {
  try {
    return oauth.botUsername.toLowerCase().trim();
  } catch (e) {
    return '';
  }
}