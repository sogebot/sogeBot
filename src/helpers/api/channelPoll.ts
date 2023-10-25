import { HelixPollData } from '@twurple/api/lib/interfaces/endpoints/poll.external';
import { EventSubChannelPollBeginEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollBeginEvent.external';
import { EventSubChannelPollEndEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollEndEvent.external';
import { EventSubChannelPollProgressEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelPollProgressEvent.external';

import { eventEmitter } from '~/helpers/events/index.js';

let event: null | EventSubChannelPollBeginEventData | EventSubChannelPollProgressEventData | EventSubChannelPollEndEventData | HelixPollData = null;

function setData(event_data: EventSubChannelPollBeginEventData | EventSubChannelPollProgressEventData | EventSubChannelPollEndEventData | HelixPollData) {
  event = event_data;
}
function winnerChoice(choices: EventSubChannelPollEndEventData['choices']) {
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

function winnerVotes(choices: EventSubChannelPollEndEventData['choices']) {
  let votes = 0;
  for (const choice of choices) {
    if (votes < (choice.votes ?? 0)) {
      votes = choice.votes ?? 0;
    }
  }
  return votes;
}

function winnerPercentage(choices: EventSubChannelPollEndEventData['choices']) {
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
  event = event as EventSubChannelPollBeginEventData;
  if (event) {
    eventEmitter.emit('poll-started', {
      choices:                    event.choices.map(o => o.title).join(', '),
      titleOfPoll:                event.title,
      channelPointsAmountPerVote: event.channel_points_voting.amount_per_vote,
      channelPointsVotingEnabled: event.channel_points_voting.is_enabled,
    });
  }
}

async function triggerPollEnd() {
  if (event) {
    const votes = (event as EventSubChannelPollEndEventData).choices.reduce((total, item) => {
      return total + (item.votes ?? 0);
    }, 0);

    eventEmitter.emit('poll-ended', {
      choices:          event.choices.map(o => o.title).join(', '),
      titleOfPoll:      event.title,
      votes,
      winnerChoice:     winnerChoice((event as EventSubChannelPollEndEventData).choices),
      winnerPercentage: winnerPercentage((event as EventSubChannelPollEndEventData).choices),
      winnerVotes:      winnerVotes((event as EventSubChannelPollEndEventData).choices),

    });
  }
}

export {
  setData,
  triggerPollStart,
  triggerPollEnd,
  event,
};
