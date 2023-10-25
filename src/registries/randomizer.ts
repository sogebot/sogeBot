import { Randomizer as RandomizerEntity } from '@entity/randomizer.js';
import { LOW } from '@sogebot/ui-helpers/constants.js';
import { validateOrReject } from 'class-validator';
import { merge } from 'lodash-es';

import { AppDataSource } from '~/database.js';

import { v4 } from 'uuid';

import { app } from '~/helpers/panel.js';
import { check } from '~/helpers/permissions/check.js';
import { adminMiddleware } from '~/socket.js';

import Registry from './_interface.js';
import { parser } from '../decorators.js';

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

    app.get('/api/registries/randomizer', adminMiddleware, async (req, res) => {
      res.send({
        data: await RandomizerEntity.find(),
      });
    });
    app.get('/api/registries/randomizer/visible', async (req, res) => {
      res.send({
        data: await RandomizerEntity.findOneBy({ isShown: true }),
      });
    });
    app.get('/api/registries/randomizer/:id', adminMiddleware, async (req, res) => {
      res.send({
        data: await RandomizerEntity.findOneBy({ id: req.params.id }),
      });
    });
    app.post('/api/registries/randomizer/hide', adminMiddleware, async (req, res) => {
      await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
      res.status(204).send();
    });
    app.post('/api/registries/randomizer/:id/show', adminMiddleware, async (req, res) => {
      await AppDataSource.getRepository(RandomizerEntity).update({}, { isShown: false });
      await AppDataSource.getRepository(RandomizerEntity).update({ id: String(req.params.id) }, { isShown: true });
      res.status(204).send();
    });
    app.post('/api/registries/randomizer/:id/spin', adminMiddleware, async (req, res) => {
      const { default: tts, services } = await import ('../tts.js');
      let key = v4();
      if (tts.ready) {
        if (tts.service === services.RESPONSIVEVOICE) {
          key = tts.responsiveVoiceKey;
        }
        if (tts.service === services.GOOGLE) {
          tts.addSecureKey(key);
        }
      }
      this.socket?.emit('spin', {
        service: tts.service,
        key,
      });
      res.status(204).send();
    });
    app.delete('/api/registries/randomizer/:id', adminMiddleware, async (req, res) => {
      await RandomizerEntity.delete({ id: req.params.id });
      res.status(404).send();
    });
    app.post('/api/registries/randomizer', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = new RandomizerEntity();
        merge(itemToSave, req.body);
        await validateOrReject(itemToSave);
        await itemToSave.save();
        res.send({ data: itemToSave });
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
