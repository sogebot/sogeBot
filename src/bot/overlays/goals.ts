'use strict';

import Overlay from '../overlays/_interface';

import { onBit, onFollow, onSub, onTip } from '../decorators/on';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { Goal, GoalGroup } from '../database/entity/goal';
import { getRepository, IsNull } from 'typeorm';
import api from '../api';
import currency from '../currency';

class Goals extends Overlay {
  showInUI = false;

  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'goals', id: 'registry/goals/list', this: null });
  }

  public async sockets() {
    adminEndpoint(this.nsp, 'goals::remove', async (item, cb) => {
      try {
        await getRepository(GoalGroup).remove(item);
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'goals::save', async (item, cb) => {
      try {
        item = await getRepository(GoalGroup).save(item);
        // we need to delete id NULL as typeorm is not deleting but flagging as NULL
        getRepository(Goal).delete({ groupId: IsNull() });
        cb(null, item);
      } catch (e) {
        cb(e.stack, item);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const items = await getRepository(GoalGroup).find({
          relations: ['goals'],
        });
        cb(null, items);
      } catch (e) {
        cb(e.stack, []);
      }
    });

    publicEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        const item = await getRepository(GoalGroup).findOne({
          relations: ['goals'],
          where: { id },
        });
        cb(null, item);
      } catch (e) {
        cb(e.stack, null);
      }
    });
    publicEndpoint(this.nsp, 'goals::current', async (cb) => {
      cb(null, {
        subscribers: api.stats.currentSubscribers,
        followers: api.stats.currentFollowers,
      });
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
        const amount = Number(currency.exchange(bit.amount / 100, 'USD', currency.mainCurrency));
        await getRepository(Goal).increment({ id: goal.id }, 'currentAmount', amount);
      }
    }
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const goals = await getRepository(Goal).find({ type: 'tips' });
    for (const goal of goals) {
      const amount = Number(currency.exchange(tip.amount, tip.currency, currency.mainCurrency));
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
