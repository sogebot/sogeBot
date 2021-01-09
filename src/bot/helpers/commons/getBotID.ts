import oauth from '../../oauth';

export function getBotID() {
  try {
    return oauth.botId;
  } catch (e) {
    return '0';
  }
}