'use strict';

import { Goal } from '@entity/goal';
import { AppDataSource } from '~/database';

import {
  onBit, onFollow, onStartup, onSub, onTip,
} from '../decorators/on';
import Overlay from '../overlays/_interface';

import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';
import { recountIntervals } from '~/helpers/goals/recountIntervals';

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
    const goals = await AppDataSource.getRepository(Goal).findBy({ type: 'bits' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await AppDataSource.getRepository(Goal).increment({ id: goal.id }, 'currentAmount', bit.amount);
      }
    }

    // tips with tracking bits
    const tipsGoals = await AppDataSource.getRepository(Goal).findBy({ type: 'tips', countBitsAsTips: true });
    for (const goal of tipsGoals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        const amount = Number(exchange(bit.amount / 100, 'USD', mainCurrency.value));
        await AppDataSource.getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
    recountIntervals('bits');
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const goals = await AppDataSource.getRepository(Goal).findBy({ type: 'tips' });
    for (const goal of goals) {
      const amount = Number(exchange(tip.amount, tip.currency, mainCurrency.value));
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await AppDataSource.getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
    recountIntervals('tips');
  }

  @onFollow()
  public async onFollow() {
    const goals = await AppDataSource.getRepository(Goal).findBy({ type: 'followers' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await AppDataSource.getRepository(Goal).increment({ id: goal.id }, 'currentAmount', 1);
      }
    }
    recountIntervals('followers');
  }

  @onSub()
  public async onSub() {
    const goals = await AppDataSource.getRepository(Goal).findBy({ type: 'subscribers' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await AppDataSource.getRepository(Goal).increment({ id: goal.id }, 'currentAmount', 1);
      }
    }
    recountIntervals('subscribers');
  }
}

export default new Goals();
