import { eventEmitter } from '~/helpers/events';

import { EventSubChannelPollBeginEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPollBeginEvent';
import { EventSubChannelPollEndEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPollEndEvent';
import { EventSubChannelPollProgressEvent } from '@twurple/eventsub-base/lib/events/EventSubChannelPollProgressEvent';

let event: null | EventSubChannelPollBeginEvent | EventSubChannelPollProgressEvent | EventSubChannelPollEndEvent = null;

function setData(event_data: EventSubChannelPollBeginEvent | EventSubChannelPollProgressEvent | EventSubChannelPollEndEvent) {
  event = event_data;
}
function winnerChoice(choices: EventSubChannelPollEndEvent['choices']) {
  let winner = '';
  let votes = 0;
  for (const choice of choices) {
    if (votes < (choice.totalVotes ?? 0)) {
      votes = choice.totalVotes ?? 0;
      winner = choice.title;
    }
  }
  return winner;
}

function winnerVotes(choices: EventSubChannelPollEndEvent['choices']) {
  let votes = 0;
  for (const choice of choices) {
    if (votes < (choice.totalVotes ?? 0)) {
      votes = choice.totalVotes ?? 0;
    }
  }
  return votes;
}

function winnerPercentage(choices: EventSubChannelPollEndEvent['choices']) {
  let votes = 0;
  let totalVotes = 0;
  for (const choice of choices) {
    if (votes < (choice.totalVotes ?? 0)) {
      votes = choice.totalVotes ?? 0;
    }
    totalVotes += choice.totalVotes ?? 0;
  }
  return Math.floor((votes / totalVotes) * 100);
}

async function triggerPollStart() {
  if (event) {
    eventEmitter.emit('poll-started', {
      choices:                    event.choices.map(o => o.title).join(', '),
      titleOfPoll:                event.title,
      bitAmountPerVote:           event.bitsPerVote,
      bitVotingEnabled:           event.isBitsVotingEnabled,
      channelPointsAmountPerVote: event.channelPointsPerVote,
      channelPointsVotingEnabled: event.isChannelPointsVotingEnabled,
    });
  }
}

async function triggerPollEnd() {
  if (event) {
    const votes = (event as EventSubChannelPollEndEvent).choices.reduce((total, item) => {
      return total + (item.totalVotes ?? 0);
    }, 0);

    eventEmitter.emit('poll-ended', {
      choices:          event.choices.map(o => o.title).join(', '),
      titleOfPoll:      event.title,
      votes,
      winnerChoice:     winnerChoice((event as EventSubChannelPollEndEvent).choices),
      winnerPercentage: winnerPercentage((event as EventSubChannelPollEndEvent).choices),
      winnerVotes:      winnerVotes((event as EventSubChannelPollEndEvent).choices),

    });
  }
}

export {
  setData,
  triggerPollStart,
  triggerPollEnd,
};
