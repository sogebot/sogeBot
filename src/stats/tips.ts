import { UserTip } from '@entity/user';

import Stats from './_interface';

import { AppDataSource } from '~/database';
import { error } from '~/helpers/log';
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
          let username = 'NotExisting';
          try {
            username = await getNameById(item.userId);
          } catch(e) {
            error(`STATS: userId ${item.userId} is not found on Twitch`);
          }
          return {
            ...item,
            username,
          };
        })));
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
  }
}

export default new Tips();
