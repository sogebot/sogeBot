import { dayjs } from '@sogebot/ui-helpers/dayjsHelper';

import { refresh } from '../token/refresh.js';

import { isStreamOnline, setCurrentRetries, streamId, streamStatusChangeSince, streamType } from '~/helpers/api';
import {
  stats as apiStats, chatMessagesAtStart,
} from '~/helpers/api';
import * as stream from '~/helpers/core/stream';
import { eventEmitter } from '~/helpers/events';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { debug, error, isDebugEnabled, warning } from '~/helpers/log';
import { linesParsed } from '~/helpers/parser';
import client from '~/services/twitch/api/client';
import stats from '~/stats';
import { variables } from '~/watchers';

let curRetries = 0;
const maxRetries = 3;

export async function getCurrentStream (opts: any) {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  const cid = variables.get('services.twitch.broadcasterId') as string;

  try {
    const clientBot = await client('bot');
    const getStreamByUserId = await clientBot.streams.getStreamByUserId(cid);
    debug('api.stream', 'API: ' + JSON.stringify({ getStreamByUserId }));

    if (getStreamByUserId) {
      if (isStreamOnline.value) {
        eventEmitter.emit('every-x-minutes-of-stream', { reset: false } );
      }

      if (dayjs(getStreamByUserId.startDate).valueOf() >=  dayjs(streamStatusChangeSince.value).valueOf()) {
        streamStatusChangeSince.value = (new Date(getStreamByUserId.startDate)).getTime();
      }
      if (!isStreamOnline.value || streamType.value !== getStreamByUserId.type) {
        if (Number(streamId.value) !== Number(getStreamByUserId.id)) {
          stream.end();
          stream.start(getStreamByUserId);
        }
      }

      setCurrentRetries(0);

      apiStats.value.currentViewers = getStreamByUserId.viewers;

      if (apiStats.value.maxViewers < getStreamByUserId.viewers) {
        apiStats.value.maxViewers = getStreamByUserId.viewers;
      }

      stats.save({
        timestamp:          new Date().getTime(),
        whenOnline:         isStreamOnline.value ? streamStatusChangeSince.value : Date.now(),
        currentViewers:     apiStats.value.currentViewers,
        currentSubscribers: apiStats.value.currentSubscribers,
        currentFollowers:   apiStats.value.currentFollowers,
        currentBits:        apiStats.value.currentBits,
        currentTips:        apiStats.value.currentTips,
        chatMessages:       linesParsed - chatMessagesAtStart.value,
        maxViewers:         apiStats.value.maxViewers,
        newChatters:        apiStats.value.newChatters,
        currentWatched:     apiStats.value.currentWatchedTime,
      });
    } else {
      if (isStreamOnline.value && curRetries < maxRetries) {
        // retry if it is not just some network / twitch issue
        curRetries++;
      } else {
        stream.end();
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('bot');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
    return { state: false, opts };
  }
  return { state: true, opts };
}