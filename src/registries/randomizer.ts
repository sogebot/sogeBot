import { LOW } from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import { Randomizer as RandomizerEntity } from '../database/entity/randomizer';
import { parser } from '../decorators';
import { addToViewersCache, getFromViewersCache } from '../helpers/permissions';
import { check } from '../helpers/permissions/';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import Registry from './_interface';

class Randomizer extends Registry {
  constructor() {
    super();
    this.addMenu({
      category: 'registry', name: 'randomizer', id: 'registry/randomizer/', this: null,
    });
  }

  sockets () {
    publicEndpoint(this.nsp, 'randomizer::getVisible', async (cb) => {
      cb(null, await getRepository(RandomizerEntity).findOne({ where: { isShown: true }, relations: [ 'items'] }));
    });
    adminEndpoint(this.nsp, 'randomizer::startSpin', async () => {
      this.socket?.emit('spin');
    });
    adminEndpoint(this.nsp, 'randomizer::showById', async (id, cb) => {
      try {
        await getRepository(RandomizerEntity).update({}, { isShown: false });
        await getRepository(RandomizerEntity).update({ id: String(id) }, { isShown: true });
        cb(null);
      } catch (e) {
        cb (e);
      }
    });
  }

  /**
   * Check if command is in randomizer (priority: low, fireAndForget)
   *
   * !<command> - hide/show randomizer
   *
   * !<command> go - spin up randomizer
   */
  @parser({ priority: LOW, fireAndForget: true })
  async run (opts: ParserOptions) {
    if (!opts.message.startsWith('!')) {
      return true;
    } // do nothing if it is not a command

    const [command, subcommand] = opts.message.split(' ');

    const randomizer = await getRepository(RandomizerEntity).findOne({ command });
    if (!randomizer) {
      return true;
    }

    if (typeof getFromViewersCache(opts.sender.userId, randomizer.permissionId) === 'undefined') {
      addToViewersCache(
        opts.sender.userId,
        randomizer.permissionId,
        (await check(opts.sender.userId, randomizer.permissionId, false)).access,
      );
    }

    // user doesn't have permision to use command
    if (!getFromViewersCache(opts.sender.userId, randomizer.permissionId)) {
      return true;
    }

    if (!subcommand) {
      await getRepository(RandomizerEntity).update({}, { isShown: false });
      await getRepository(RandomizerEntity).update({ id: randomizer.id }, { isShown: !randomizer.isShown });
    } else if (subcommand === 'go') {
      if (!randomizer.isShown) {
        await getRepository(RandomizerEntity).update({}, { isShown: false });
        await getRepository(RandomizerEntity).update({ id: randomizer.id }, { isShown: !randomizer.isShown });
        setTimeout(() => {
          this.socket?.emit('spin');
        }, 5000);
      } else {
        this.socket?.emit('spin');
      }
    }

    return true;
  }
}

export default new Randomizer();
