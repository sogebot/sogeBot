import { translate } from '../../translate.js';
import { showWithAt } from '../tmi/showWithAt.js';

/**
 * Prepares strings with replacement attributes
 * @param translate Translation key
 * @param attr Attributes to replace { 'replaceKey': 'value' }
 * @param isTranslationKey consider if translation key to be translate key or pure message
 */
export function prepare(toTranslate: string, attr?: {[x: string]: any }, isTranslationKey = true): string {
  attr = attr || {};
  let msg = (() => {
    if (isTranslationKey) {
      return translate(toTranslate);
    } else {
      return toTranslate;
    }
  })();
  for (const key of Object.keys(attr).sort((a, b) => b.length - a.length)) {
    let value = attr[key];
    if (['username', 'who', 'winner', 'sender', 'loser'].includes(key.toLowerCase())) {
      if (typeof value.username !== 'undefined' || typeof value.userName !== 'undefined') {
        value = showWithAt.value ? `@${value.username || value.userName}` : value.username || value.userName;
      } else {
        value = showWithAt.value ? `@${value}` : value;
      }
    }
    msg = msg.replace(new RegExp('[$]' + key, 'gi'), value);
  }
  return msg;
}