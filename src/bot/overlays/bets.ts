import { isMainThread } from 'worker_threads';

import { ui } from '../decorators';
import Overlay from './_interface';
import { error } from '../helpers/log';
import { publicEndpoint } from '../helpers/socket';

class Bets extends Overlay {
  public modifiedAt: number;
  public currentBet: any;
  public bets: any[];

  @ui({
    type: 'link',
    href: '/overlays/bets',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/bets',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  constructor() {
    super();

    this.modifiedAt = 0;
    this.currentBet = {};
    this.bets = [];

    if (isMainThread) {
      this.interval();
    }
  }

  public sockets() {
    publicEndpoint(this.nsp, 'data', async (callback) => {
      callback(this.currentBet, this.bets);
    });
  }

  protected async interval() {
    clearTimeout(this.timeouts.betsInterval);

    try {
      const _modifiedAt = await global.db.engine.findOne(global.systems.bets.collection.data, { key: 'betsModifiedTime' });
      if (this.modifiedAt !== _modifiedAt) {
        this.modifiedAt = _modifiedAt;
        this.currentBet = await global.db.engine.findOne(global.systems.bets.collection.data, { key: 'bets' });
        this.bets = await global.db.engine.find(global.systems.bets.collection.users);
      }
    } catch (e) {
      error(e.stack);
    } finally {
      this.timeouts.betsInterval = global.setTimeout(() => this.interval(), 1000);
    }
  }
}

export default Bets;
export { Bets };
