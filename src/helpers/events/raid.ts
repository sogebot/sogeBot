import type { EventSubChannelRaidEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelRaidEvent';

import { eventEmitter } from './emitter';

import {
  raid as raidLog,
} from '~/helpers/log';
import eventlist from '~/overlays/eventlist';
import alerts from '~/registries/alerts';
import users from '~/users';

export async function raid(event: EventSubChannelRaidEvent) {
  const userName = event.raidingBroadcasterName;
  const hostViewers = event.viewers;

  raidLog(`${userName}, viewers: ${hostViewers}`);

  const data = {
    userName:  userName,
    hostViewers,
    event:     'raid',
    timestamp: Date.now(),
  };

  eventlist.add({
    userId:    String(await users.getIdByName(userName) ?? '0'),
    viewers:   hostViewers,
    event:     'raid',
    timestamp: Date.now(),
  });
  eventEmitter.emit('raid', data);
  alerts.trigger({
    event:      'raid',
    name:       userName,
    amount:     hostViewers,
    tier:       null,
    currency:   '',
    monthsName: '',
    message:    '',
  });
}