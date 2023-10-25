import { HelixPrediction, HelixPredictionOutcomeColor } from '@twurple/api/lib';
import { EventSubChannelPredictionOutcomeData } from '@twurple/eventsub-base/lib/events/common/EventSubChannelPredictionOutcome.external';
import { EventSubChannelPredictionBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionBeginEvent.external';
import { EventSubChannelPredictionEndEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionEndEvent';
import { EventSubChannelPredictionEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionEndEvent.external';
import { EventSubChannelPredictionLockEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionLockEvent.external';
import { EventSubChannelPredictionProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionProgressEvent.external';

import { eventEmitter } from '~/helpers/events/index.js';

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
  winningOutcome: null | EventSubChannelPredictionOutcomeData | HelixPrediction['winningOutcome'];
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
function progress(event: EventSubChannelPredictionProgressEventData) {
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
      totalChannelPoints: outcome.channel_points,
    })),
    winningOutcome:   null,
    winningOutcomeId: null,
    lockDate:         null,
  };
  eventEmitter.emit('prediction-started', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.locks_at).toISOString(),
  });
}
function start(event: EventSubChannelPredictionBeginEventData) {
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
    locksAt:           new Date(event.locks_at).toISOString(),
  });
}

function lock(event: EventSubChannelPredictionLockEventData) {
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
      totalChannelPoints: outcome.channel_points,
    })),
    winningOutcome:   null,
    winningOutcomeId: null,
    lockDate:         new Date(event.locked_at).toISOString(),
  };
  eventEmitter.emit('prediction-locked', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.locked_at).toISOString(),
  });
}

async function end(event: EventSubChannelPredictionEndEventData) {
  const winningOutcome = event.outcomes.find(o => o.id === event.winning_outcome_id) ?? null;
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
      totalChannelPoints: outcome.channel_points,
    })),
    winningOutcome:   winningOutcome,
    winningOutcomeId: event.winning_outcome_id,
    lockDate:         data?.lockDate ?? null,
  };
  const points = event.outcomes.reduce((total, item) => {
    return total + (item.channel_points ?? 0);
  }, 0);
  eventEmitter.emit('prediction-ended', {
    outcomes:                  event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction:         event.title,
    locksAt:                   new Date(event.ended_at).toISOString(),
    winningOutcomeTitle:       winningOutcome?.title || '',
    winningOutcomeTotalPoints: winningOutcome?.channel_points || 0,
    winningOutcomePercentage:  points > 0 ? (winningOutcome?.channel_points || 0) / points : 100,
  });
}

export {
  start,
  end,
  lock,
  status,
  progress,
};
