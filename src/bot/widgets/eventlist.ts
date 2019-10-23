import { settings } from '../decorators';
import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';

class EventList extends Widget {
  @settings()
  public widgetEventlistFollows = true;
  @settings()
  public widgetEventlistHosts = true;
  @settings()
  public widgetEventlistRaids = true;
  @settings()
  public widgetEventlistCheers = true;
  @settings()
  public widgetEventlistSubs = true;
  @settings()
  public widgetEventlistSubgifts = true;
  @settings()
  public widgetEventlistSubcommunitygifts = true;
  @settings()
  public widgetEventlistResubs = true;
  @settings()
  public widgetEventlistTips = true;
  @settings()
  public widgetEventlistShow = 5;
  @settings()
  public widgetEventlistSize = 20;
  @settings()
  public widgetEventlistMessageSize = 15;

  constructor() {
    super();
    this.addWidget('eventlist', 'widget-title-eventlist', 'far fa-calendar');
  }

  public sockets() {
    adminEndpoint(this.nsp, 'get', async () => {
      this.update();
    });

    adminEndpoint(this.nsp, 'cleanup', () => {
      global.db.engine.remove('widgetsEventList', {});
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
