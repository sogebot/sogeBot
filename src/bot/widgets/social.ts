import Widget from './_interface';
import { publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { WidgetSocial } from '../database/entity/widget';

class Social extends Widget {
  constructor() {
    super();
    this.addWidget('social', 'widget-title-social', 'fas fa-share-square');
  }

  sockets() {
    publicEndpoint(this.nsp, 'generic::getAll', async (opts: { limit?: number }, cb) => {
      if (cb) {
        cb(
          null,
          await getRepository(WidgetSocial).find({
            take: opts.limit,
            order: {
              timestamp: 'DESC',
            },
          })
        );
      }
    });
  }
}

export default new Social();
