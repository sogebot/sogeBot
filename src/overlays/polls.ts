import Overlay from './_interface';

import { onStartup, onStreamStart } from '~/decorators/on';
import * as channelPoll from '~/helpers/api/channelPoll';
import { publicEndpoint } from '~/helpers/socket';
import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';

class Polls extends Overlay {
  @onStartup()
  @onStreamStart()
  async onStreamStart() {
    const polls = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.polls.getPolls(getBroadcasterId()));
    const poll = polls?.data.find(o => o.status === 'ACTIVE');
    if (poll) {
      channelPoll.setData(poll);
    }
  }

  public sockets() {
    publicEndpoint(this.nsp, 'data', async (callback) => {
      callback(channelPoll.event ? {
        id:      channelPoll.event?.id,
        title:   channelPoll.event?.title,
        choices: channelPoll.event?.choices.map(choice => ({
          id:         choice.id,
          title:      choice.title,
          totalVotes: 'totalVotes' in choice ? choice.totalVotes : 0,
        })),
        startDate: channelPoll.event?.startDate,
        endDate:   channelPoll.event?.endDate,
      } : null);
    });
  }
}

export default new Polls();
