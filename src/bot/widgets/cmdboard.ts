import { getOwner } from '../commons';
import { settings } from '../decorators';
import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { CommandsBoard } from '../database/entity/commands';
import tmi from '../tmi';

class Cmdboard extends Widget {
  @settings()
  public displayAsOpts: string[] = ['list', 'grid'];
  @settings()
  public displayAs = 'list';

  constructor() {
    super();
    this.addWidget('cmdboard', 'widget-title-cmdboard', 'fas fa-th');
  }

  public sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(CommandsBoard).find());
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'cmdboard::save', async (items, cb) => {
      try {
        cb(null, await getRepository(CommandsBoard).save(items));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'cmdboard::remove', async (item, cb) => {
      try {
        cb(null, await getRepository(CommandsBoard).remove(item));
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'cmdboard::run', (item) => {
      tmi.message({
        message: {
          tags: { username: getOwner() },
          message: item.command,
        },
        skip: true,
      });
    });
  }
}

export default new Cmdboard();
