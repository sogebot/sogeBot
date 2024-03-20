import Overlay from './_interface.js';

import * as channelPoll from '~/helpers/api/channelPoll.js';
import { endpoint } from '~/helpers/socket.js';

class Polls extends Overlay {
  public sockets() {
    endpoint([], this.nsp, 'data' as any, async (callback: any) => {
      const event = channelPoll.event;
      if (event) {
        callback({
          id:      event.id,
          title:   event.title,
          choices: event.choices.map(choice => ({
            id:         choice.id,
            title:      choice.title,
            totalVotes: 'votes' in choice ? choice.votes : 0,
          })),
          startDate: event.started_at,
          endDate:   'ended_at' in event ? event.ended_at : null,
        });
      } else {
        callback(null);
      }
    });
  }
}

export default new Polls();
