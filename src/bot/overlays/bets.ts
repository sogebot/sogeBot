import { getRepository } from 'typeorm';

import { Bets as BetsEntity } from '../database/entity/bets';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

class Bets extends Overlay {
  showInUI = false;
  
  public sockets() {
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentBet = await getRepository(BetsEntity).findOne({
        relations: ['participations'],
        order:     { createdAt: 'DESC' },
        cache:     10000,
      });
      callback(currentBet);
    });
  }
}

export default new Bets();
