import { UserTip } from '@entity/user';

import Stats from './_interface';

import { AppDataSource } from '~/database';
import { adminEndpoint } from '~/helpers/socket';
import getNameById from '~/helpers/user/getNameById';

class Tips extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'tips', id: 'stats/tips', this: null,
    });
  }

  sockets() {
    adminEndpoint('/stats/tips', 'generic::getAll', async (cb) => {
      try {
        const items = await AppDataSource.getRepository(UserTip).find();
        cb(null, await Promise.all(items.map(async (item) => {
          return {
            ...item,
            username: await getNameById(item.userId),
          };
        })));
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
  }
}

export default new Tips();
