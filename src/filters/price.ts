import { Price } from '@entity/price.js';
import { format } from '@sogebot/ui-helpers/number.js';

import type { ResponseFilter } from './index.js';

import { AppDataSource } from '~/database.js';
import { getPointsName } from '~/helpers/points/index.js';

const price: ResponseFilter = {
  '(price)': async function (_variable, attr) {
    const cmd = await AppDataSource.getRepository(Price).findOneBy({ command: attr.cmd, enabled: true });
    const general = (await import('../general.js')).default;
    return [format(general.numberFormat, 0)(cmd?.price ?? 0), getPointsName(cmd?.price ?? 0)].join(' ');
  },
};

export { price };