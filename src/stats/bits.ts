import { UserBit } from '@entity/user.js';

import Stats from './_interface.js';

import { AppDataSource } from '~/database.js';
import { Get } from '~/decorators/endpoint.js';
import { error } from '~/helpers/log.js';
import getNameById from '~/helpers/user/getNameById.js';

class Bits extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'bits', id: 'stats/bits', this: null, scopeParent: this.scope(),
    });
  }

  @Get('/')
  async getAll() {
    const items = await AppDataSource.getRepository(UserBit).find();
    return await Promise.all(items.map(async (item) => {
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
    }));
  }
}

export default new Bits();
