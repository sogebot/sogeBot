import { getRepository } from 'typeorm';

import { UserBit } from '../database/entity/user';
import { adminEndpoint } from '../helpers/socket';
import users from '../users';
import Stats from './_interface';

class Bits extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'bits', id: 'stats/bits', this: null,
    });
    this.addMenu({
      category: 'stats', name: 'bannedevents', id: 'stats/bannedevents', this: null,
    });
  }

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const items = await getRepository(UserBit).find();
        cb(null, await Promise.all(items.map(async (item) => {
          return {
            ...item,
            username: await users.getNameById(item.userId),
          };
        })));
      } catch (e: any) {
        cb(e, []);
      }
    });
  }
}

export default new Bits();
