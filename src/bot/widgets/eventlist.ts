import Widget from './_interface';

class EventList extends Widget {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        widgetEventlistFollows: true,
        widgetEventlistHosts: true,
        widgetEventlistRaids: true,
        widgetEventlistCheers: true,
        widgetEventlistSubs: true,
        widgetEventlistSubgifts: true,
        widgetEventlistSubcommunitygifts: true,
        widgetEventlistResubs: true,
        widgetEventlistTips: true,
        widgetEventlistShow: 5,
        widgetEventlistSize: 20,
        widgetEventlistMessageSize: 15,
      },
    };
    super(options);
    this.addWidget('eventlist', 'eventlist', 'far fa-calendar');
  }

  public sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('get', async () => {
        this.update();
      });

      socket.on('cleanup', () => {
        global.db.engine.remove('widgetsEventList', {});
      });
    });
  }

  public async update() {
    try {
      const limit = this.settings.widgetEventlistShow;
      const events = await global.db.engine.find('widgetsEventList', {
        _sort: 'timestamp',
        _total: limit,
      });
      this.socket.emit('update', events);
    } catch (e) {
      this.socket.emit('update', []);
    }
  }
}

module.exports = new EventList();
