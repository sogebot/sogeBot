import Stats from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { UserTip } from '../database/entity/user';

class Tips extends Stats {
  constructor() {
    super();
    this.addMenu({ category: 'stats', name: 'tips', id: 'stats/tips', this: null });
  }

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(UserTip).find({
          relations: ['user'],
        }));
      } catch (e) {
        cb(e.stack, []);
      }
    });
  }
}

export default new Tips();
