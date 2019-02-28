'use strict';

import Overlay from './_interface';

import * as _ from 'lodash';
const {
  isMainThread,
  // tslint:disable-next-line:no-var-requires
} = require('worker_threads');

class Goals extends Overlay {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      ui: {
        _hidden: true,
      },
      on: {
        bit: (e) => { this.onBit(e); },
        tip: (e) => { this.onTip(e); },
        follow: (e) => { this.onFollow(); },
        sub: (e) => { this.onSub(); },
      },
    };
    super(options);
    this.addMenu({ category: 'registry', name: 'goals', id: '/registry/goals/list' });

    if (isMainThread) {
      global.db.engine.index({ table: this.collection.groups, index: 'uid', unique: true });
      global.db.engine.index({ table: this.collection.goals, index: 'uid', unique: true });
    }
  }

  public async sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('current', async (cb) => {
        cb(null, {
          subscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
          followers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
        });
      });
    });
  }

  private async onBit(bit: onEventBit) {
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
        const amount = parseFloat(global.currency.exchange(bit.amount / 100, 'USD', global.currency.settings.currency.mainCurrency));
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: amount });
      }
    }
  }

  private async onTip(tip: onEventTip) {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'tips' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      const currentAmount = Number(global.currency.exchange(tip.amount, tip.currency, global.currency.settings.currency.mainCurrency));
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount });
      }
    }
  }

  private async onFollow() {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'followers' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: 1 });
      }
    }
  }

  private async onSub() {
    const goals: Goals.Goal[] = await global.db.engine.find(this.collection.goals, { type: 'subscribers' });
    for (const goal of goals) {
      const uid = String(goal.uid);
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await global.db.engine.incrementOne(this.collection.goals, { uid }, { currentAmount: 1 });
      }
    }
  }
}

module.exports = new Goals();
