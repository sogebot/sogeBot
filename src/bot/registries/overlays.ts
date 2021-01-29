import { getRepository } from 'typeorm';

import { OverlayMapper } from '../database/entity/overlay';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import Registry from './_interface';

class Overlays extends Registry {
  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'overlays', id: 'registry/overlays/list', this: null });
  }

  sockets () {
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      await getRepository(OverlayMapper).delete({ id: String(id) });
      cb(null);
    });
    adminEndpoint(this.nsp, 'generic::setById', async (opts, cb) => {
      try {
        const item = await getRepository(OverlayMapper).save({ ...(await getRepository(OverlayMapper).findOne({ id: String(opts.id) })), ...opts.item });
        cb(null, item);
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(
          null,
          await getRepository(OverlayMapper).find()
        );
      } catch (e) {
        cb (e, null);
      }
    });
    publicEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        cb(
          null,
          await getRepository(OverlayMapper).findOneOrFail({ where: { id } })
        );
      } catch (e) {
        cb (e, null);
      }
    });
  }
}

export default new Overlays();
