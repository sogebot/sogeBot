import { getRepository } from 'typeorm';

import { Poll } from '../database/entity/poll';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

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
