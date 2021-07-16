import { getRepository } from 'typeorm';

import { UserTip } from '../database/entity/user';
import { adminEndpoint } from '../helpers/socket';
import users from '../users';
import Stats from './_interface';

class Tips extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'tips', id: 'stats/tips', this: null,
    });
  }

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const items = await getRepository(UserTip).find();
        cb(null, await Promise.all(items.map(async (item) => {
          return {
            ...item,
            username: await users.getNameById(item.userId),
          };
        })));
      } catch (e) {
        cb(e.stack, []);
      }
    });
  }
}

export default new Tips();
