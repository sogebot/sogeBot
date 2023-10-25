import { EventSubChannelRaidEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelRaidEvent.external';

import { eventEmitter } from './emitter.js';

import {
  raid as raidLog,
} from '~/helpers/log.js';
import eventlist from '~/overlays/eventlist.js';
import alerts from '~/registries/alerts.js';
import users from '~/users.js';

export async function raid(event: EventSubChannelRaidEventData) {
  const userName = event.from_broadcaster_user_login;
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