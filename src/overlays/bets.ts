import { Bets as BetsEntity } from '@entity/bets';
import { AppDataSource } from '~/database';

import Overlay from './_interface';

import { publicEndpoint } from '~/helpers/socket';

class Bets extends Overlay {
  showInUI = false;

  public sockets() {
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentBet = await AppDataSource.getRepository(BetsEntity).findOne({
        relations: ['participations'],
        order:     { createdAt: 'DESC' },
        cache:     10000,
      });
      callback(currentBet);
    });
  }
}

export default new Bets();
