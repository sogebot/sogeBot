import { HelixPrediction, HelixPredictionOutcome } from '@twurple/api/lib';
import { EventSubChannelPredictionBeginEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionBeginEvent';
import { EventSubChannelPredictionEndEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionEndEvent';
import { EventSubChannelPredictionLockEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionLockEvent';
import { EventSubChannelPredictionProgressEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionProgressEvent';

import { eventEmitter } from '~/helpers/events';

let data: null | {
  id: string,
  title: string,
  autoLockAfter: null | string,
  creationDate: null | string,
  lockDate: null | string;
  outcomes: HelixPrediction['outcomes'] | EventSubChannelPredictionProgressEvent['outcomes'] | EventSubChannelPredictionBeginEvent['outcomes'],
  winningOutcomeId: EventSubChannelPredictionEndEvent['winningOutcomeId'];
  winningOutcome: null | EventSubChannelPredictionEndEvent['winningOutcome'] | HelixPrediction['winningOutcome'];
} = null;

function status(event?: HelixPrediction) {
  if (event) {
    data = {
      id:               event.id,
      title:            event.title,
      autoLockAfter:    data?.autoLockAfter ?? null,
      creationDate:     data?.creationDate ?? null,
      outcomes:         event.outcomes,
      winningOutcome:   event.winningOutcome,
      winningOutcomeId: event.winningOutcomeId,
      lockDate:         event.lockDate ? new Date(event.lockDate).toISOString() : null,
    };
  }
  return data;
}
function progress(event: EventSubChannelPredictionProgressEvent) {
  data = {
    id:               event.id,
    title:            event.title,
    autoLockAfter:    data?.autoLockAfter ?? null,
    creationDate:     data?.creationDate ?? null,
    outcomes:         event.outcomes,
    winningOutcome:   null,
    winningOutcomeId: null,
    lockDate:         null,
  };
  eventEmitter.emit('prediction-started', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.lockDate).toISOString(),
  });
}
function start(event: EventSubChannelPredictionBeginEvent) {
  data = {
    id:               event.id,
    title:            event.title,
    autoLockAfter:    data?.autoLockAfter ?? null,
    creationDate:     data?.creationDate ?? null,
    outcomes:         event.outcomes,
    winningOutcome:   null,
    winningOutcomeId: null,
    lockDate:         null,
  };
  eventEmitter.emit('prediction-started', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.lockDate).toISOString(),
  });
}

function lock(event: EventSubChannelPredictionLockEvent) {
  data = {
    id:               event.id,
    title:            event.title,
    autoLockAfter:    data?.autoLockAfter ?? null,
    creationDate:     data?.creationDate ?? null,
    outcomes:         event.outcomes,
    winningOutcome:   null,
    winningOutcomeId: null,
    lockDate:         new Date(event.lockDate).toISOString(),
  };
  eventEmitter.emit('prediction-locked', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.lockDate).toISOString(),
  });
}

async function end(event: EventSubChannelPredictionEndEvent) {
  data = {
    id:               event.id,
    title:            event.title,
    autoLockAfter:    data?.autoLockAfter ?? null,
    creationDate:     data?.creationDate ?? null,
    outcomes:         event.outcomes,
    winningOutcome:   event.winningOutcome,
    winningOutcomeId: event.winningOutcomeId,
    lockDate:         data?.lockDate ?? null,
  };
  const points = event.outcomes.reduce((total, item) => {
    return total + (item.channelPoints ?? 0);
  }, 0);
  eventEmitter.emit('prediction-ended', {
    outcomes:                  event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction:         event.title,
    locksAt:                   new Date(event.endDate).toISOString(),
    winningOutcomeTitle:       event.winningOutcome?.title || '',
    winningOutcomeTotalPoints: event.winningOutcome?.channelPoints || 0,
    winningOutcomePercentage:  points > 0 ? (event.winningOutcome?.channelPoints || 0) / points : 100,
  });
}

export {
  start,
  end,
  lock,
  status,
  progress,
};
