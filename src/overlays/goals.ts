'use strict';

import { getRepository } from 'typeorm';

import currency from '../currency';
import { Goal } from '../database/entity/goal';
import {
  onBit, onFollow, onStartup, onSub, onTip,
} from '../decorators/on';
import { mainCurrency } from '../helpers/currency';
import Overlay from '../overlays/_interface';

class Goals extends Overlay {
  showInUI = false;

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'goals', id: 'registry/goals', this: null,
    });
  }

  @onBit()
  public async onBit(bit: onEventBit) {
    const goals = await getRepository(Goal).find({ type: 'bits' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', bit.amount);
      }
    }

    // tips with tracking bits
    const tipsGoals = await getRepository(Goal).find({ type: 'tips', countBitsAsTips: true });
    for (const goal of tipsGoals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        const amount = Number(currency.exchange(bit.amount / 100, 'USD', mainCurrency.value));
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const goals = await getRepository(Goal).find({ type: 'tips' });
    for (const goal of goals) {
      const amount = Number(currency.exchange(tip.amount, tip.currency, mainCurrency.value));
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
  }

  @onFollow()
  public async onFollow() {
    const goals = await getRepository(Goal).find({ type: 'followers' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', 1);
      }
    }
  }

  @onSub()
  public async onSub() {
    const goals = await getRepository(Goal).find({ type: 'subscribers' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', 1);
      }
    }
  }
}

export default new Goals();
