import {
  UserBit, UserInterface, UserTip,
} from '@entity/user.js';

import type { default as currencyType } from '../../currency.js';
import type { default as levelType } from '../../systems/levels.js';
import type { default as ranksType } from '../../systems/ranks.js';
import { mainCurrency } from '../currency/index.js';

import { Permissions } from '~/database/entity/permissions.js';
import { AppDataSource } from '~/database.js';
import exchange from '~/helpers/currency/exchange.js';

let levels: typeof levelType;
let ranks: typeof ranksType;
let currency: typeof currencyType;

async function _filters(
  user: Required<UserInterface>,
  filters: Permissions['filters'] = [],
): Promise<boolean> {
  for (const f of filters) {
    let amount = 0;
    switch (f.type) {
      case 'ranks': {
        if (!ranks) {
          ranks = (await import('../../systems/ranks.js')).default;
        }
        const rank = await ranks.get(user);
        // we can return immediately
        return rank.current === f.value;
      }
      case 'level':
        if (!levels) {
          levels = (await import('../../systems/levels.js')).default;
        }
        amount = levels.getLevelOf(user);
        break;
      case 'bits': {
        const bits = await AppDataSource.getRepository(UserBit).find({ where: { userId: user.userId } });
        amount = bits.reduce((a, b) => (a + b.amount), 0);
        break;
      }
      case 'messages':
        amount = user.messages;
        break;
      case 'points':
        amount = user.points;
        break;
      case 'subcumulativemonths':
        amount = user.subscribeCumulativeMonths;
        break;
      case 'substreakmonths':
        amount = user.subscribeStreak;
        break;
      case 'subtier':
        amount = user.subscribeTier === 'Prime' ? 0 : Number(user.subscribeTier);
        break;
      case 'tips': {
        const tips = await AppDataSource.getRepository(UserTip).find({ where: { userId: user.userId } });
        if (!currency) {
          currency = (await import('../../currency.js')).default;
        }
        amount = tips.reduce((a, b) => (a + exchange(b.amount, b.currency, mainCurrency.value)), 0);
        break;
      }
      case 'watched':
        amount = user.watchedTime / (60 * 60 * 1000 /*hours*/);
    }

    switch (f.comparator) {
      case '<':
        if (!(amount < Number(f.value))) {
          return false;
        }
        break;
      case '<=':
        if (!(amount <= Number(f.value))) {
          return false;
        }
        break;
      case '==':
        if (Number(amount) !== Number(f.value)) {
          return false;
        }
        break;
      case '>':
        if (!(amount > Number(f.value))) {
          return false;
        }
        break;
      case '>=':
        if (!(amount >= Number(f.value))) {
          return false;
        }
        break;
    }
  }
  return true;
}

export { _filters as filters };