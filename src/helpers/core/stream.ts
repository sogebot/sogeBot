import { HelixStream } from '@twurple/api/lib';

import { getFunctionList } from '../../decorators/on.js';
import { chatMessagesAtStart, streamType } from '../api/index.js';
import { isStreamOnline } from '../api/isStreamOnline.js';
import { stats } from '../api/stats.js';
import { streamId } from '../api/streamId.js';
import { streamStatusChangeSince } from '../api/streamStatusChangeSince.js';
import { eventEmitter } from '../events/emitter.js';
import {
  error, start as startLog, stop,
} from '../log.js';
import { linesParsed } from '../parser.js';
import { find } from '../register.js';

import { getGameNameFromId } from '~/services/twitch/calls/getGameNameFromId.js';
import { variables } from '~/watchers.js';

async function start(data: HelixStream) {
  const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
  startLog(
    `id: ${data.id} | startedAt: ${data.startDate.toISOString()} | title: ${data.title} | game: ${await getGameNameFromId(Number(data.gameId))} | type: ${data.type} | channel ID: ${broadcasterId}`,
  );

  // reset quick stats on stream start
  stats.value.currentWatchedTime = 0;
  stats.value.maxViewers = 0;
  stats.value.newChatters = 0;
  stats.value.currentViewers = 0;
  stats.value.currentBits = 0;
  stats.value.currentTips = 0;
  chatMessagesAtStart.value = linesParsed;

  streamStatusChangeSince.value = new Date(data.startDate).getTime();
  streamId.value = data.id;
  streamType.value = data.type;
  isStreamOnline.value = true;

  eventEmitter.emit('stream-started');
  eventEmitter.emit('command-send-x-times', { reset: true });
  eventEmitter.emit('keyword-send-x-times', { reset: true });
  eventEmitter.emit('every-x-minutes-of-stream', { reset: true });

  for (const event of getFunctionList('streamStart')) {
    const type = !event.path.includes('.') ? 'core' : event.path.split('.')[0];
    const module = !event.path.includes('.') ? event.path.split('.')[0] : event.path.split('.')[1];
    const self = find(type as any, module);
    if (self) {
      (self as any)[event.fName]();
    } else {
      error(`streamStart: ${event.path} not found`);
    }
  }
}

function end() {
  // reset quick stats on stream end
  stats.value.currentWatchedTime = 0;
  stats.value.maxViewers = 0;
  stats.value.newChatters = 0;
  stats.value.currentViewers = 0;
  stats.value.currentBits = 0;
  stats.value.currentTips = 0;

  // stream is really offline
  if (isStreamOnline.value) {
    // online -> offline transition
    stop('');
    streamStatusChangeSince.value = Date.now();
    isStreamOnline.value = false;
    eventEmitter.emit('stream-stopped');
    eventEmitter.emit('stream-is-running-x-minutes', { reset: true });
    eventEmitter.emit('number-of-viewers-is-at-least-x', { reset: true });

    for (const event of getFunctionList('streamEnd')) {
      const type = !event.path.includes('.') ? 'core' : event.path.split('.')[0];
      const module = !event.path.includes('.') ? event.path.split('.')[0] : event.path.split('.')[1];
      const self = find(type as any, module);
      if (self) {
        (self as any)[event.fName]();
      } else {
        error(`streamEnd: ${event.path} not found`);
      }
    }

    streamId.value = null;
  }

}

export { end, start };