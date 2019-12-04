import Registry from './_interface';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Randomizer as RandomizerEntity } from '../database/entity/randomizer';

class Randomizer extends Registry {
  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'randomizer', id: 'registry/randomizer/list' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'randomizer::getAll', async (cb) => {
      cb(
        await getRepository(RandomizerEntity).find({
          relations: ['items'],
        })
      );
    });
    adminEndpoint(this.nsp, 'randomizer::remove', async (item: RandomizerEntity, cb) => {
      try {
        cb(
          null,
          await getRepository(RandomizerEntity).remove(item)
        );
      } catch (e) {
        cb (e, null);
      }
    });
    adminEndpoint(this.nsp, 'randomizer::save', async (item: RandomizerEntity, cb) => {
      try {
        cb(
          null,
          await getRepository(RandomizerEntity).save(item)
        );
      } catch (e) {
        cb (e, null);
      }
    });
    adminEndpoint(this.nsp, 'randomizer::showById', async (id: string, cb) => {
      try {
        await getRepository(RandomizerEntity).update({}, { isShown: false });
        await getRepository(RandomizerEntity).update({ id }, { isShown: true });
        cb(null);
      } catch (e) {
        cb (e);
      }
    });
    adminEndpoint(this.nsp, 'randomizer::hideAll', async (cb) => {
      try {
        await getRepository(RandomizerEntity).update({}, { isShown: false });
        cb(null);
      } catch (e) {
        cb (e);
      }
    });
    adminEndpoint(this.nsp, 'randomizer::getOne', async (id: string, cb) => {
      try {
        cb(
          null,
          await getRepository(RandomizerEntity).findOne({ where: { id }, relations: ['items'] })
        );
      } catch (e) {
        cb (e, null);
      }
    });
  }
}

export default new Randomizer();
