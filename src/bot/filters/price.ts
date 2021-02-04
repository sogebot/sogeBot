import { getRepository } from 'typeorm';

import { Price } from '../database/entity/price';
import { getPointsName } from '../helpers/points';

import type { ResponseFilter } from '.';

const price: ResponseFilter = {
  '(price)': async function (_variable, attr) {
    const cmd = await getRepository(Price).findOne({ command: attr.cmd, enabled: true });
    return [price, getPointsName(cmd?.price ?? 0)].join(' ');
  },
};

export { price };