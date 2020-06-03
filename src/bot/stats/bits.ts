import Stats from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { UserBit } from '../database/entity/user';

class Bits extends Stats {
  constructor() {
    super();
    this.addMenu({ category: 'stats', name: 'bits', id: 'stats/bits', this: null });
  }

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(UserBit).find({
          relations: ['user'],
        }));
      } catch (e) {
        cb(e, []);
      }
    });
  }
}

export default new Bits();
