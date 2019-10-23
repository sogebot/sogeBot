'use strict';

import Overlay from '../overlays/_interface';

import { isMainThread } from 'worker_threads';
import { onBit, onFollow, onSub, onTip } from '../decorators/on';
import { publicEndpoint } from '../helpers/socket';

class Goals extends Overlay {
  showInUI = false;

  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'goals', id: 'registry/goals/list' });

    if (isMainThread) {
      global.db.engine.index(this.collection.groups, { index: 'uid', unique: true });
      global.db.engine.index(this.collection.goals, { index: 'uid', unique: true });
    }
  }

  public async sockets() {
    publicEndpoint(this.nsp, 'current', async (cb) => {
      cb(null, {
        subscribers: global.api.stats.currentSubscribers,
        followers: global.api.stats.currentFollowers,
      });
    });
  }

  @onBit()
  public async onBit(bit: onEventBit) {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'bits' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: bit.amount });
      }
    }

    // tips with tracking bits
    const tipsGoals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'tips', countBitsAsTips: true });
    for (const goal of tipsGoals) {
      const uid = String(goal.uid);
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        const amount = parseFloat(global.currency.exchange(bit.amount / 100, 'USD', global.currency.mainCurrency));
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: amount });
      }
    }
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'tips' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      const currentAmount = Number(global.currency.exchange(tip.amount, tip.currency, global.currency.mainCurrency));
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount });
      }
    }
  }

  @onFollow()
  public async onFollow() {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'followers' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: 1 });
      }
    }
  }

  @onSub()
  public async onSub() {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'subscribers' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: 1 });
      }
    }
  }
}

export default Goals;
export { Goals };
