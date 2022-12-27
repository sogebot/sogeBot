import { eventEmitter } from '~/helpers/events';

import { EventSubChannelPredictionBeginEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionBeginEvent';
import { EventSubChannelPredictionEndEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionEndEvent';
import { EventSubChannelPredictionLockEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPredictionLockEvent';

function start(event: EventSubChannelPredictionBeginEvent) {
  eventEmitter.emit('prediction-started', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.lockDate).toISOString(),
  });
}

function lock(event: EventSubChannelPredictionLockEvent) {
  eventEmitter.emit('prediction-locked', {
    outcomes:          event.outcomes.map(o => o.title).join(', '),
    titleOfPrediction: event.title,
    locksAt:           new Date(event.lockDate).toISOString(),
  });
}

async function end(event: EventSubChannelPredictionEndEvent) {
  const points = event.outcomes.reduce((total, item) => {
    return total + (item.channelPoints ?? 0);
  }, 0);

  event.endDate;
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
};
