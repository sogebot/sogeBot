import Widget from './_interface';

class Cmdboard extends Widget {
  [x: string]: any; // TODO: remove after interface ported to TS

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
    this.socket.on('connection', (socket) => {
      socket.on('cmdboard.widget.fetch', async (cb) => {
        cb(await global.db.engine.find('widgetsCmdBoard'));
      });
      socket.on('cmdboard.widget.run', (command) => {
        global.tmi.message({
          sender: { username: global.commons.getOwner() },
          message: command,
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
