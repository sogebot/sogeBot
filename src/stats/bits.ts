import { UserBit } from '@entity/user';

import Stats from './_interface';

import { AppDataSource } from '~/database';
import { adminEndpoint } from '~/helpers/socket';
import getNameById from '~/helpers/user/getNameById';

class Bits extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'bits', id: 'stats/bits', this: null,
    });
  }

  sockets() {
    adminEndpoint('/stats/bits', 'generic::getAll', async (cb) => {
      try {
        const items = await AppDataSource.getRepository(UserBit).find();
        cb(null, await Promise.all(items.map(async (item) => {
          return {
            ...item,
            username: await getNameById(item.userId),
          };
        })));
      } catch (e: any) {
        cb(e, []);
      }
    });
  }
}

export default new Bits();
