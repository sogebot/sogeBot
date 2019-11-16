import { getOwner } from '../commons';
import { settings } from '../decorators';
import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { CommandsBoard } from '../database/entity/commands';

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
    adminEndpoint(this.nsp, 'cmdboard::save', async (items: CommandsBoard[], cb) => {
      cb(await getRepository(CommandsBoard).save(items));
    });
    adminEndpoint(this.nsp, 'cmdboard::remove', async (item: CommandsBoard, cb) => {
      cb(await getRepository(CommandsBoard).remove(item));
    });
    adminEndpoint(this.nsp, 'cmdboard::run', (command) => {
      global.tmi.message({
        message: {
          tags: { username: getOwner() },
          message: command,
        },
        skip: true,
      });
    });
  }
}

export default Cmdboard;
export { Cmdboard };
