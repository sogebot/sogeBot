import { eventEmitter } from '~/helpers/events';

let event: null | {
  id: string,
  broadcaster_user_id: string,
  broadcaster_user_login: string,
  broadcaster_user_name: string,
  title: string,
  choices: {
    id: string,
    title: string,
    bits_votes?: number;
    channel_points_votes?: number;
    votes?: number;
  }[],
  bits_voting: {
    is_enabled: boolean,
    amount_per_vote: number,
  },
  channel_points_voting: {
    is_enabled: boolean,
    amount_per_vote: number,
  },
  started_at: string,
  ends_at: string,
} = null;

function setData(event_data: typeof event) {
  event = event_data;
}

function winnerChoice(choices: NonNullable<typeof event>['choices']) {
  let winner = '';
  let votes = 0;
  for (const choice of choices) {
    if (votes < (choice.votes ?? 0)) {
      votes = choice.votes ?? 0;
      winner = choice.title;
    }
  }
  return winner;
}

function winnerVotes(choices: NonNullable<typeof event>['choices']) {
  let votes = 0;
  for (const choice of choices) {
    if (votes < (choice.votes ?? 0)) {
      votes = choice.votes ?? 0;
    }
  }
  return votes;
}

function winnerPercentage(choices: NonNullable<typeof event>['choices']) {
  let votes = 0;
  let totalVotes = 0;
  for (const choice of choices) {
    if (votes < (choice.votes ?? 0)) {
      votes = choice.votes ?? 0;
    }
    totalVotes += choice.votes ?? 0;
  }
  return Math.floor((votes / totalVotes) * 100);
}

async function triggerPollStart() {
  if (event) {
    eventEmitter.emit('poll-started', {
      choices:                    event.choices.map(o => o.title).join(', '),
      titleOfPoll:                event.title,
      bitAmountPerVote:           event.bits_voting.amount_per_vote,
      bitVotingEnabled:           event.bits_voting.is_enabled,
      channelPointsAmountPerVote: event.channel_points_voting.amount_per_vote,
      channelPointsVotingEnabled: event.channel_points_voting.is_enabled,
    });
  }
}

async function triggerPollEnd() {
  if (event) {
    const votes = event.choices.reduce((total, item) => {
      return total + (item.votes ?? 0);
    }, 0);

    eventEmitter.emit('poll-ended', {
      choices:          event.choices.map(o => o.title).join(', '),
      titleOfPoll:      event.title,
      votes,
      winnerChoice:     winnerChoice(event.choices),
      winnerPercentage: winnerPercentage(event.choices),
      winnerVotes:      winnerVotes(event.choices),

    });
  }
}

export {
  setData,
  triggerPollStart,
  triggerPollEnd,
};
