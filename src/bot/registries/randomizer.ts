import Registry from './_interface';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Randomizer } from '../database/entity/randomizer';

class RandomizerRegistry extends Registry {
  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'randomizer', id: 'registry/randomizer/list' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'randomizer::getAll', async (cb) => {
      cb(
        await getRepository(Randomizer).find({
          relations: ['items'],
        })
      );
    });
  }
}

export default new RandomizerRegistry();
