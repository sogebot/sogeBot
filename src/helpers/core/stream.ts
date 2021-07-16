import type { StreamEndpoint } from '../../api';
import { getFunctionList } from '../../decorators/on';
import { getGameNameFromId } from '../../microservices/getGameNameFromId';
import { chatMessagesAtStart, streamType } from '../api';
import { isStreamOnline } from '../api/isStreamOnline';
import { setCurrentRetries } from '../api/retries';
import { stats } from '../api/stats';
import { streamId } from '../api/streamId';
import { streamStatusChangeSince } from '../api/streamStatusChangeSince';
import { eventEmitter } from '../events/emitter';
import {
  error, start as startLog, stop,
} from '../log';
import { channelId } from '../oauth';
import { linesParsed } from '../parser';
import { find } from '../register';

async function start(data: StreamEndpoint['data'][number]) {
  startLog(
    `id: ${data.id} | startedAt: ${data.started_at} | title: ${data.title} | game: ${await getGameNameFromId(Number(data.game_id))} | type: ${data.type} | channel ID: ${channelId.value}`,
  );

  // reset quick stats on stream start
  stats.value.currentWatchedTime = 0;
  stats.value.maxViewers = 0;
  stats.value.newChatters = 0;
  stats.value.currentViewers = 0;
  stats.value.currentBits = 0;
  stats.value.currentTips = 0;
  chatMessagesAtStart.value = linesParsed;

  streamStatusChangeSince.value = new Date(data.started_at).getTime();
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
    const self = find(type, module);
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
    setCurrentRetries(0);
    eventEmitter.emit('stream-stopped');
    eventEmitter.emit('stream-is-running-x-minutes', { reset: true });
    eventEmitter.emit('number-of-viewers-is-at-least-x', { reset: true });

    for (const event of getFunctionList('streamEnd')) {
      const type = !event.path.includes('.') ? 'core' : event.path.split('.')[0];
      const module = !event.path.includes('.') ? event.path.split('.')[0] : event.path.split('.')[1];
      const self = find(type, module);
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