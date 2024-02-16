import { Randomizer as RandomizerEntity } from '@entity/randomizer.js';

import Registry from './_interface.js';
import { parser } from '../decorators.js';

import { AppDataSource } from '~/database.js';
import { LOW } from '~/helpers/constants.js';
import { app } from '~/helpers/panel.js';
import { check } from '~/helpers/permissions/check.js';
import { withScope } from '~/helpers/socket.js';

class Randomizer extends Registry {
  constructor() {
    super();
    this.addMenu({
      category: 'registry', name: 'randomizer', id: 'registry/randomizer/', this: null,
    });
  }

  sockets () {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/registries/randomizer', withScope(['randomizer:read']), async (req, res) => {
      res.send({
        data: await RandomizerEntity.find(),
      });
    });
    app.get('/api/registries/randomizer/visible', async (req, res) => {
      res.send({
        data: await RandomizerEntity.findOneBy({ isShown: true }),
      });
    });
    app.get('/api/registries/randomizer/:id', withScope(['randomizer:read']), async (req, res) => {
      res.send({
        data: await RandomizerEntity.findOneBy({ id: req.params.id }),
      });
    });
    app.post('/api/registries/randomizer/hide', withScope(['randomizer:manage']), async (req, res) => {
      await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
      res.status(204).send();
    });
    app.post('/api/registries/randomizer/:id/show', withScope(['randomizer:manage']), async (req, res) => {
      await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
      await AppDataSource.getRepository(RandomizerEntity).update({ id: String(req.params.id) }, { isShown: true });
      res.status(204).send();
    });
    app.post('/api/registries/randomizer/:id/spin', withScope(['randomizer:manage']), async (req, res) => {
      const { generateAndAddSecureKey } = await import ('../tts.js');
      this.socket?.emit('spin', {
        key: generateAndAddSecureKey(),
      });
      res.status(204).send();
    });
    app.delete('/api/registries/randomizer/:id', withScope(['randomizer:manage']), async (req, res) => {
      await RandomizerEntity.delete({ id: req.params.id });
      res.status(404).send();
    });
    app.post('/api/registries/randomizer', withScope(['randomizer:manage']), async (req, res) => {
      try {
        res.send({ data: await RandomizerEntity.create(req.body).save() });
      } catch (e) {
        res.status(400).send({ errors: e });
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
