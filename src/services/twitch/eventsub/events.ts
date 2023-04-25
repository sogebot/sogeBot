import { isEqual } from 'lodash';

import { debug } from '~/helpers/log';

const events: Record<string, any>[] = [];
export function isAlreadyProcessed(event: Record<string, any>) {
  console.log(`---------------- Checking event ------------`);
  console.log(JSON.stringify(event));
  console.log(`---------------- Checking event ------------`);
  for (const processed of events) {
    console.log(`---------------- Processed event ------------`);
    console.log(JSON.stringify(processed));
    console.log(`---------------- Processed event ------------`);
    if (isEqual(event, processed)) {
      debug('twitch.eventsub', `Event ${JSON.stringify(event)} was already processed.`);
      console.log(`---------------- FOUND ------------`);
      console.log(`Event ${JSON.stringify(event)} was already processed.`);
      console.log(`---------------- FOUND ------------`);
      return true;
    }
  }
  events.push(event);
  if (events.length > 20) {
    events.shift();
  }
  return false;
}