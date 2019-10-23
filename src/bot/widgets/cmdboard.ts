import { getOwner } from '../commons';
import { settings } from '../decorators';
import Widget from './_interface';
import { isMainThread } from 'worker_threads';
import { adminEndpoint } from '../helpers/socket';

class Cmdboard extends Widget {
  @settings()
  public displayAsOpts: string[] = ['list', 'grid'];
  @settings()
  public displayAs = 'list';

  constructor() {
    super();

    if (isMainThread) {
      global.db.engine.index('widgetsCmdBoard', { index: 'command' });
    }
    this.addWidget('cmdboard', 'widget-title-cmdboard', 'fas fa-th');
  }

  public sockets() {
    adminEndpoint(this.nsp, 'cmdboard.widget.fetch', async (cb) => {
      cb(await global.db.engine.find('widgetsCmdBoard'));
    });
    adminEndpoint(this.nsp, 'cmdboard.widget.run', (command) => {
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
