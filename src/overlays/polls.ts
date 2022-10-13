import { Poll } from '@entity/poll';

import Overlay from './_interface';

import { publicEndpoint } from '~/helpers/socket';

class Polls extends Overlay {
  public sockets() {
    publicEndpoint(this.nsp, 'getVoteCommand', async (cb) => {
      cb(this.getCommand('!vote'));
    });
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentVote = await Poll.findOpened();
      callback(currentVote, currentVote?.votes);
    });
  }
}

export default new Polls();
