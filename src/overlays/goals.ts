'use strict';

import { Goal } from '@entity/goal';

import {
  onBit, onFollow, onStartup, onSub, onTip,
} from '../decorators/on';
import Overlay from '../overlays/_interface';

import { AppDataSource } from '~/database';
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
    {
      const goals = await AppDataSource.getRepository(Goal).findBy({ campaigns: { type: 'bits' } });
      for (const goal of goals) {
        let isChanged = false;
        for (const campaign of goal.campaigns.filter(o => o.type === 'bits')) {
          if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
            campaign.currentAmount = (campaign.currentAmount ?? 0) + bit.amount;
            isChanged = true;
          }
        }
        isChanged ? await goal.save() : null;
      }
    }

    {
      // tips with tracking bits
      const goals = await AppDataSource.getRepository(Goal).findBy({ campaigns: { type: 'tips', countBitsAsTips: true } });
      for (const goal of goals) {
        let isChanged = false;
        for (const campaign of goal.campaigns.filter(o => o.type === 'tips' && o.countBitsAsTips)) {
          if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
            const amount = Number(exchange(bit.amount / 100, 'USD', mainCurrency.value));
            campaign.currentAmount = (campaign.currentAmount ?? 0) + amount;
            isChanged = true;
          }
        }
        isChanged ? await goal.save() : null;
      }
    }
    recountIntervals('bits');
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const goals = await AppDataSource.getRepository(Goal).findBy({ campaigns: { type: 'tips' } });
    for (const goal of goals) {
      let isChanged = false;
      for (const campaign of goal.campaigns.filter(o => o.type === 'tips')) {
        if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
          const amount = Number(exchange(tip.amount, tip.currency, mainCurrency.value));
          campaign.currentAmount = (campaign.currentAmount ?? 0) + amount;
          isChanged = true;
        }
      }
      isChanged ? await goal.save() : null;
    }
    recountIntervals('tips');
  }

  @onFollow()
  public async onFollow() {
    const goals = await AppDataSource.getRepository(Goal).findBy({ campaigns: { type: 'followers' } });
    for (const goal of goals) {
      let isChanged = false;
      for (const campaign of goal.campaigns.filter(o => o.type === 'followers')) {
        if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
          campaign.currentAmount = (campaign.currentAmount ?? 0) + 1;
          isChanged = true;
        }
        isChanged ? await goal.save() : null;
      }
    }
    recountIntervals('followers');
  }

  @onSub()
  public async onSub() {
    const goals = await AppDataSource.getRepository(Goal).findBy({ campaigns: { type: 'subscribers' } });
    for (const goal of goals) {
      let isChanged = false;
      for (const campaign of goal.campaigns.filter(o => o.type === 'subscribers')) {
        if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
          campaign.currentAmount = (campaign.currentAmount ?? 0) + 1;
          isChanged = true;
        }
        isChanged ? await goal.save() : null;
      }
    }
    recountIntervals('subscribers');
  }
}

export default new Goals();
