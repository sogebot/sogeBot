import { settings } from '../decorators';
import Widget from './_interface';

class EventList extends Widget {
  @settings()
  public widgetEventlistFollows: boolean = true;
  @settings()
  public widgetEventlistHosts: boolean = true;
  @settings()
  public widgetEventlistRaids: boolean = true;
  @settings()
  public widgetEventlistCheers: boolean = true;
  @settings()
  public widgetEventlistSubs: boolean = true;
  @settings()
  public widgetEventlistSubgifts: boolean = true;
  @settings()
  public widgetEventlistSubcommunitygifts: boolean = true;
  @settings()
  public widgetEventlistResubs: boolean = true;
  @settings()
  public widgetEventlistTips: boolean = true;
  @settings()
  public widgetEventlistShow: number = 5;
  @settings()
  public widgetEventlistSize: number = 20;
  @settings()
  public widgetEventlistMessageSize: number = 15;

  constructor() {
    super();
    this.addWidget('eventlist', 'eventlist', 'far fa-calendar');
  }

  public sockets() {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
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
      const limit = this.widgetEventlistShow;
      const events = await global.db.engine.find('widgetsEventList', {
        _sort: 'timestamp',
        _total: limit,
      });
      this.emit('update', events);
    } catch (e) {
      this.emit('update', []);
    }
  }
}

export default EventList;
export { EventList };
