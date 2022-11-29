import { AppDataSource } from '~/database';

import { WidgetSocial } from '../database/entity/widget';
import Widget from './_interface';

import { adminEndpoint } from '~/helpers/socket';

class Social extends Widget {
  public sockets() {
    adminEndpoint('/widgets/social', 'generic::getAll', async (cb) => {
      const items = await AppDataSource.getRepository(WidgetSocial).find({
        order: { timestamp: 'DESC' },
        take:  100,
      });
      cb(null, items);
    });
  }
}

export default new Social();
