import { at, isNil } from 'lodash-es';

export let translations = {}

export default function(key) {
  /* TODO: metrics
  if (!metrics.translations.includes(key)) {
    // we need only first usage on page load to not unnecessary overload socket
    metrics.translations.push(key)
    socket.emit('metrics.translations', key)
  }
  */
  // return translation of a key
  return isNil(at(translations, key)[0]) ? `{${key}}` : at(translations, key)[0];
}

export const setTranslations = (_translations) => {
  translations = _translations;
}