import { settings } from '../decorators';
import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { EventList as EventListDB } from '../database/entity/eventList';

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
      getRepository(EventListDB).delete({});
    });
  }

  public async update() {
    try {
      this.emit('update',
        await getRepository(EventListDB).find({
          order: { timestamp: 'DESC' },
          take: this.widgetEventlistShow,
        })
      );
    } catch (e) {
      this.emit('update', []);
    }
  }
}

export default new EventList();
