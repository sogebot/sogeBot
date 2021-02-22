import { translate } from '../../translate';
import { showWithAt } from '../tmi/showWithAt';

/**
 * Prepares strings with replacement attributes
 * @param translate Translation key
 * @param attr Attributes to replace { 'replaceKey': 'value' }
 * @param isTranslation consider if translation key to be translate key or pure message
 */
export function prepare(toTranslate: string, attr?: {[x: string]: any }, isTranslation = true): string {
  attr = attr || {};
  let msg = (() => {
    if (isTranslation) {
      return translate(toTranslate);
    } else {
      return toTranslate;
    }
  })();
  for (const key of Object.keys(attr).sort((a, b) => b.length - a.length)) {
    let value = attr[key];
    if (['username', 'who', 'winner', 'sender', 'loser'].includes(key)) {
      if (typeof value.username !== 'undefined') {
        value = showWithAt.value ? `@${value.username}` : value.username;
      } else {
        value = showWithAt.value ? `@${value}` : value;
      }
    }
    msg = msg.replace(new RegExp('[$]' + key, 'g'), value);
  }
  return msg;
}