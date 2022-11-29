import { Bets as BetsEntity } from '@entity/bets';
import { getRepository } from 'typeorm';

import Overlay from './_interface';

import { publicEndpoint } from '~/helpers/socket';

class Bets extends Overlay {
  showInUI = false;

  public sockets() {
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentBet = await getRepository(BetsEntity).findOneBy({
        relations: ['participations'],
        order:     { createdAt: 'DESC' },
        cache:     10000,
      });
      callback(currentBet);
    });
  }
}

export default new Bets();
