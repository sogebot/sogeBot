'use strict';

import Overlay from '../overlays/_interface';

import { onBit, onFollow, onSub, onTip } from '../decorators/on';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { Goal, GoalGroup } from '../entity/goal';
import { getRepository, IsNull } from 'typeorm';

class Goals extends Overlay {
  showInUI = false;

  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'goals', id: 'registry/goals/list' });
  }

  public async sockets() {
    adminEndpoint(this.nsp, 'goals::remove', async (item: GoalGroup, cb) => {
      try {
        await getRepository(GoalGroup).remove(item);
        cb(null);
      } catch (e) {
        cb(e);
      }
    });
    adminEndpoint(this.nsp, 'goals::save', async (item: GoalGroup, cb) => {
      try {
        item = await getRepository(GoalGroup).save(item);
        // we need to delete id NULL as typeorm is not deleting but flagging as NULL
        getRepository(Goal).delete({ groupId: IsNull() });
        cb(null, item);
      } catch (e) {
        cb(e, item);
      }
    });
    adminEndpoint(this.nsp, 'goals::getAll', async (cb) => {
      try {
        const items = await getRepository(GoalGroup).find({
          relations: ['goals'],
        });
        cb(null, items);
      } catch (e) {
        cb(e, []);
      }
    });

    publicEndpoint(this.nsp, 'goals::getOne', async (id, cb) => {
      try {
        const item = await getRepository(GoalGroup).findOne({
          relations: ['goals'],
          where: { id },
        });
        cb(null, item);
      } catch (e) {
        cb(e, null);
      }
    });
    publicEndpoint(this.nsp, 'goals::current', async (cb) => {
      cb(null, {
        subscribers: global.api.stats.currentSubscribers,
        followers: global.api.stats.currentFollowers,
      });
    });
  }

  @onBit()
  public async onBit(bit: onEventBit) {
    const goals: Goal[] = await getRepository(Goal).find({ type: 'bits' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', bit.amount);
      }
    }

    // tips with tracking bits
    const tipsGoals: Goal[] = await getRepository(Goal).find({ type: 'tips', countBitsAsTips: true });
    for (const goal of tipsGoals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        const amount = parseFloat(global.currency.exchange(bit.amount / 100, 'USD', global.currency.mainCurrency));
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const goals: Goal[] = await getRepository(Goal).find({ type: 'tips' });
    for (const goal of goals) {
      const amount = Number(global.currency.exchange(tip.amount, tip.currency, global.currency.mainCurrency));
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
  }

  @onFollow()
  public async onFollow() {
    const goals: Goal[] = await getRepository(Goal).find({ type: 'followers' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', 1);
      }
    }
  }

  @onSub()
  public async onSub() {
    const goals: Goal[] = await getRepository(Goal).find({ type: 'subscribers' });
    for (const goal of goals) {
      if (new Date(goal.endAfter).getTime() >= new Date().getTime() || goal.endAfterIgnore) {
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', 1);
      }
    }
  }
}

export default Goals;
export { Goals };
