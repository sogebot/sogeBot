import Widget from './_interface';
import { getOwner } from '../commons';

class Cmdboard extends Widget {
  constructor() {
    const options: InterfaceSettings = {
      settings: {
        _: {
          displayAsOpts: ['list', 'grid'],
        },
        displayAs: 'list',
      },
    };
    super(options);
    this.addWidget('cmdboard', 'widget-title-cmdboard', 'fas fa-th');
  }

  public sockets() {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
    this.socket.on('connection', (socket) => {
      socket.on('cmdboard.widget.fetch', async (cb) => {
        cb(await global.db.engine.find('widgetsCmdBoard'));
      });
      socket.on('cmdboard.widget.run', (command) => {
        global.tmi.message({
          message: {
            tags: { username: getOwner() },
            message: command,
          },
          skip: true,
        });
      });
      socket.on('cmdboard.widget.add', async (data, cb) => {
        await global.db.engine.insert('widgetsCmdBoard', { text: data.name, command: data.command });
        cb(await global.db.engine.find('widgetsCmdBoard'));
      });
      socket.on('cmdboard.widget.remove', async (data, cb) => {
        await global.db.engine.remove('widgetsCmdBoard', { text: data.name });
        cb(await global.db.engine.find('widgetsCmdBoard'));
      });
    });
  }
}

module.exports = new Cmdboard();
