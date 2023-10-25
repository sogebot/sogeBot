import { isEqual } from 'lodash-es';

import { debug } from '~/helpers/log.js';

const events: Record<string, any>[] = [];
export function isAlreadyProcessed(event: Record<string, any>) {
  for (const processed of events) {
    if (isEqual(event, processed)) {
      debug('twitch.eventsub', `Event ${JSON.stringify(event)} was already processed.`);
      return true;
    }
  }
  events.push(event);
  if (events.length > 20) {
    events.shift();
  }
  return false;
}