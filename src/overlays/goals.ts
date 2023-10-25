import { Goal, Overlay as OverlayEntity } from '@entity/overlay.js';

import {
  onBit, onFollow, onSub, onTip,
} from '../decorators/on.js';
import Overlay from '../overlays/_interface.js';

import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { recountIntervals } from '~/helpers/goals/recountIntervals.js';

class Goals extends Overlay {
  @onBit()
  public async onBit(bit: onEventBit) {
    const overlays = await OverlayEntity.find();
    for (const overlay of overlays) {
      let isChanged = false;
      {
        const goals = overlay.items.filter(o => o.opts.typeId === 'goal');
        for (const goal of goals) {
          goal.opts = goal.opts as Goal;
          for (const campaign of goal.opts.campaigns.filter(o => o.type === 'bits')) {
            if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
              campaign.currentAmount = (campaign.currentAmount ?? 0) + bit.amount;
              isChanged = true;
            }
          }
        }
      }

      {
      // tips with tracking bits
        const goals = overlay.items.filter(o => o.opts.typeId === 'goal');
        for (const goal of goals) {
          goal.opts = goal.opts as Goal;
          for (const campaign of goal.opts.campaigns.filter(o => o.type === 'tips' && o.countBitsAsTips)) {
            if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
              const amount = Number(exchange(bit.amount / 100, 'USD', mainCurrency.value));
              campaign.currentAmount = (campaign.currentAmount ?? 0) + amount;
              isChanged = true;
            }
          }
        }
      }
      isChanged && await overlay.save();
    }
    recountIntervals();
  }

  @onTip()
  public async onTip(tip: onEventTip) {
    const overlays = await OverlayEntity.find();
    for (const overlay of overlays) {
      let isChanged = false;
      const goals = overlay.items.filter(o => o.opts.typeId === 'goal');
      for (const goal of goals) {
        goal.opts = goal.opts as Goal;
        for (const campaign of goal.opts.campaigns.filter(o => o.type === 'tips')) {
          if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
            const amount = Number(exchange(tip.amount, tip.currency, mainCurrency.value));
            campaign.currentAmount = (campaign.currentAmount ?? 0) + amount;
            isChanged = true;
          }
        }
      }
      isChanged && await overlay.save();
    }
    recountIntervals();
  }

  @onFollow()
  public async onFollow() {
    const overlays = await OverlayEntity.find();
    for (const overlay of overlays) {
      let isChanged = false;
      const goals = overlay.items.filter(o => o.opts.typeId === 'goal');
      for (const goal of goals) {
        goal.opts = goal.opts as Goal;
        for (const campaign of goal.opts.campaigns.filter(o => o.type === 'followers')) {
          if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
            campaign.currentAmount = (campaign.currentAmount ?? 0) + 1;
            isChanged = true;
          }
        }
        isChanged && await overlay.save();
      }
    }
    recountIntervals();
  }

  @onSub()
  public async onSub() {
    const overlays = await OverlayEntity.find();
    for (const overlay of overlays) {
      let isChanged = false;
      const goals = overlay.items.filter(o => o.opts.typeId === 'goal');
      for (const goal of goals) {
        goal.opts = goal.opts as Goal;
        for (const campaign of goal.opts.campaigns.filter(o => o.type === 'subscribers')) {
          if (new Date(campaign.endAfter).getTime() >= new Date().getTime() || campaign.endAfterIgnore) {
            campaign.currentAmount = (campaign.currentAmount ?? 0) + 1;
            isChanged = true;
          }
        }
        isChanged && await overlay.save();
      }
    }
    recountIntervals();
  }
}

export default new Goals();
