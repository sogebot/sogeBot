import { Poll } from '@entity/poll';
import { getRepository } from 'typeorm';

import Overlay from './_interface';

import { publicEndpoint } from '~/helpers/socket';

class Polls extends Overlay {
  public sockets() {
    publicEndpoint(this.nsp, 'getVoteCommand', async (cb) => {
      cb(this.getCommand('!vote'));
    });
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentVote = await getRepository(Poll).findOne({
        relations: ['votes'],
        where:     { isOpened: true },
      });
      callback(currentVote, currentVote?.votes);
    });
  }
}

export default new Polls();
