import { getOwner } from '../commons';
import { settings } from '../decorators';
import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { CommandsBoard, CommandsBoardInterface } from '../database/entity/commands';
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
    adminEndpoint(this.nsp, 'cmdboard::getAll', async (cb) => {
      cb(await getRepository(CommandsBoard).find());
    });
    adminEndpoint(this.nsp, 'cmdboard::save', async (items: CommandsBoardInterface[], cb) => {
      cb(await getRepository(CommandsBoard).save(items));
    });
    adminEndpoint(this.nsp, 'cmdboard::remove', async (item: Required<CommandsBoardInterface>, cb) => {
      cb(await getRepository(CommandsBoard).remove(item));
    });
    adminEndpoint(this.nsp, 'cmdboard::run', (command) => {
      tmi.message({
        message: {
          tags: { username: getOwner() },
          message: command,
        },
        skip: true,
      });
    });
  }
}

export default new Cmdboard();
