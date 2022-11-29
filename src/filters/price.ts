import { Price } from '@entity/price';
import { format } from '@sogebot/ui-helpers/number';
import { getRepository } from 'typeorm';

import type { ResponseFilter } from '.';

import { getPointsName } from '~/helpers/points';

const price: ResponseFilter = {
  '(price)': async function (_variable, attr) {
    const cmd = await getRepository(Price).findOneBy({ command: attr.cmd, enabled: true });
    const general = require('../general.js').default;
    return [format(general.numberFormat, 0)(cmd?.price ?? 0), getPointsName(cmd?.price ?? 0)].join(' ');
  },
};

export { price };