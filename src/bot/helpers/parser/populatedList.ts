import events from 'events';

import currency from '../../currency';
import general from '../../general';
import permissions from '../../permissions';
import tmi from '../../tmi';
import twitch from '../../twitch';
import users from '../../users';
import { list } from '../register';

const populatedList: any = [
  currency,
  events,
  users,
  permissions,
  twitch,
  general,
  tmi,
];
for (const dir of ['systems', 'games', 'overlays', 'integrations', 'registries']) {
  for (const system of list(dir)) {
    populatedList.push(system);
  }
}

export { populatedList };