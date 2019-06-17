import _ from 'lodash';

export interface Global {
  translations: any;
}

declare var global: Global;

export default function(key) {
  /* TODO: metrics
  if (!metrics.translations.includes(key)) {
    // we need only first usage on page load to not unnecessary overload socket
    metrics.translations.push(key)
    socket.emit('metrics.translations', key)
  }
  */
  // return translation of a key
  return _.isNil(_.at(global.translations, key)[0]) ? `{${key}}` : _.at(global.translations, key)[0];
}
