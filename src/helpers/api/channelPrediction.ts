import { HelixPrediction, HelixPredictionOutcomeColor } from '@twurple/api/lib';
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
  outcomes: {
    id: string,
    color: HelixPredictionOutcomeColor,
    title: string,
    users: number,
    totalChannelPoints: number,
  }[],
  winningOutcomeId: EventSubChannelPredictionEndEvent['winningOutcomeId'];
  winningOutcome: null | EventSubChannelPredictionEndEvent['winningOutcome'] | HelixPrediction['winningOutcome'];
} = null;

function status(event?: HelixPrediction) {
  if (event) {
    data = {
      id:            event.id,
      title:         event.title,
      autoLockAfter: data?.autoLockAfter ?? null,
      creationDate:  data?.creationDate ?? null,
      outcomes:      event.outcomes.map(outcome => ({
        id:                 outcome.id,
        color:              outcome.color,
        title:              outcome.title,
        users:              outcome.users,
        totalChannelPoints: outcome.totalChannelPoints,
      })),
      winningOutcome:   event.winningOutcome,
      winningOutcomeId: event.winningOutcomeId,
      lockDate:         event.lockDate ? new Date(event.lockDate).toISOString() : null,
    };
  }
  return data;
}
function progress(event: EventSubChannelPredictionProgressEvent) {
  data = {
    id:            event.id,
    title:         event.title,
    autoLockAfter: data?.autoLockAfter ?? null,
    creationDate:  data?.creationDate ?? null,
    outcomes:      event.outcomes.map(outcome => ({
      id:                 outcome.id,
      color:              outcome.color as any,
      title:              outcome.title,
      users:              outcome.users,
      totalChannelPoints: outcome.channelPoints,
    })),
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
    id:            event.id,
    title:         event.title,
    autoLockAfter: data?.autoLockAfter ?? null,
    creationDate:  data?.creationDate ?? null,
    outcomes:      event.outcomes.map(outcome => ({
      id:                 outcome.id,
      color:              outcome.color as any,
      title:              outcome.title,
      users:              0,
      totalChannelPoints: 0,
    })),
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
    id:            event.id,
    title:         event.title,
    autoLockAfter: data?.autoLockAfter ?? null,
    creationDate:  data?.creationDate ?? null,
    outcomes:      event.outcomes.map(outcome => ({
      id:                 outcome.id,
      color:              outcome.color as any,
      title:              outcome.title,
      users:              outcome.users,
      totalChannelPoints: outcome.channelPoints,
    })),
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
    id:            event.id,
    title:         event.title,
    autoLockAfter: data?.autoLockAfter ?? null,
    creationDate:  data?.creationDate ?? null,
    outcomes:      event.outcomes.map(outcome => ({
      id:                 outcome.id,
      color:              outcome.color as any,
      title:              outcome.title,
      users:              outcome.users,
      totalChannelPoints: outcome.channelPoints,
    })),
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
