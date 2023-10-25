import { UserBit } from '@entity/user.js';

import Stats from './_interface.js';

import { AppDataSource } from '~/database.js';
import { error } from '~/helpers/log.js';
import { adminEndpoint } from '~/helpers/socket.js';
import getNameById from '~/helpers/user/getNameById.js';

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
        cb(e, []);
      }
    });
  }
}

export default new Bits();
