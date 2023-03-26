import Overlay from './_interface';

import * as channelPoll from '~/helpers/api/channelPoll';
import { publicEndpoint } from '~/helpers/socket';

class Polls extends Overlay {
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
