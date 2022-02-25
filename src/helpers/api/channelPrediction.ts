import { eventEmitter } from '~/helpers/events';

let event: null | {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  title: string;
  outcomes: {
    id: string;
    title: string;
    color: string;
    users: number;
    channel_points: number;
    top_predictors: {
      user_id: string;
      user_login: string;
      user_name: string;
      channel_points_won: number;
      channel_points_used: number;
    }[]
  }[];
  started_at: string;
  locks_at: string;
} = null;

function set(event_data: typeof event) {
  event = event_data;
}

function start() {
  if (event) {
    eventEmitter.emit('prediction-started', {
      outcomes:          event.outcomes.map(o => o.title).join(', '),
      titleOfPrediction: event.title,
      locksAt:           event.locks_at,
    });
  }
}

function lock() {
  if (event) {
    event.locks_at = new Date().toISOString();
    eventEmitter.emit('prediction-locked', {
      outcomes:          event.outcomes.map(o => o.title).join(', '),
      titleOfPrediction: event.title,
      locksAt:           event.locks_at,
    });
  }
}

async function end(outcomeId: string) {
  if (event) {
    const points = event.outcomes.reduce((total, item) => {
      return total + (item.channel_points ?? 0);
    }, 0);

    eventEmitter.emit('prediction-ended', {
      outcomes:                  event.outcomes.map(o => o.title).join(', '),
      titleOfPrediction:         event.title,
      locksAt:                   event.locks_at,
      winningOutcomeTitle:       event.outcomes.find(o => o.id === outcomeId)?.title || '',
      winningOutcomeTotalPoints: event.outcomes.find(o => o.id === outcomeId)?.channel_points || 0,
      winningOutcomePercentage:  points > 0 ? (event.outcomes.find(o => o.id === outcomeId)?.channel_points || 0) / points : 100,
    });
  }
}

export {
  set,
  start,
  end,
  lock,
};
