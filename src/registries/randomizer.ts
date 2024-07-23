import { Randomizer as RandomizerEntity } from '@entity/randomizer.js';
import { Request } from 'express';

import Registry from './_interface.js';
import { parser } from '../decorators.js';

import { AppDataSource } from '~/database.js';
import { Delete, Get, Post } from '~/decorators/endpoint.js';
import { LOW } from '~/helpers/constants.js';
import { check } from '~/helpers/permissions/check.js';

class Randomizer extends Registry {
  constructor() {
    super();
    this.addMenu({
      category: 'registry', name: 'randomizer', id: 'registry/randomizer/', this: null, scopeParent: this.scope(),
    });
  }

  @Get('/')
  async getAll () {
    return RandomizerEntity.find();
  }

  @Get('/visible', { scope: 'public' })
  async getVisible () {
    return RandomizerEntity.findOneBy({ isShown: true });
  }

  @Get('/:id', { scope: 'public' })
  async getOne (req: Request) {
    return RandomizerEntity.findOneBy({ id: req.params.id });
  }

  @Post('/hide')
  async hide () {
    await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
  }

  @Post('/:id/show')
  async show (req: Request) {
    await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
    await AppDataSource.getRepository(RandomizerEntity).update({ id: String(req.params.id) }, { isShown: true });
  }

  @Post('/:id/spin')
  async spin (req: Request) {
    const { generateAndAddSecureKey } = await import ('../tts.js');
    this.socket?.emit('spin', {
      key: generateAndAddSecureKey(),
    });
  }

  @Delete('/:id')
  async delete (req: Request) {
    await RandomizerEntity.delete({ id: req.params.id });
  }

  @Post('/')
  async create (req: Request) {
    return RandomizerEntity.create(req.body).save();
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
    if (!opts.sender || !opts.message.startsWith('!')) {
      return true;
    } // do nothing if it is not a command

    const [command, subcommand] = opts.message.split(' ');

    const randomizer = await AppDataSource.getRepository(RandomizerEntity).findOneBy({ command });
    if (!randomizer) {
      return true;
    }

    // user doesn't have permision to use command
    if (!(await check(opts.sender.userId, randomizer.permissionId, false)).access) {
      return true;
    }

    if (!subcommand) {
      await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
      await AppDataSource.getRepository(RandomizerEntity).update({ id: randomizer.id }, { isShown: !randomizer.isShown });
    } else if (subcommand === 'go') {
      if (!randomizer.isShown) {
        await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
        await AppDataSource.getRepository(RandomizerEntity).update({ id: randomizer.id }, { isShown: !randomizer.isShown });
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
