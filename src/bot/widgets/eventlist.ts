import { settings } from '../decorators';
import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { EventList as EventListDB } from '../database/entity/eventList';
import { error } from '../helpers/log';
import alerts from '../registries/alerts';
import { getLocalizedName } from '../commons';

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
    adminEndpoint(this.nsp, 'eventlist::removeById', async (id, cb) => {
      const ids = Array.isArray(id) ? [...id] : [id];
      await getRepository(EventListDB).delete(ids);
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'get', async () => {
      this.update();
    });

    adminEndpoint(this.nsp, 'cleanup', () => {
      getRepository(EventListDB).delete({});
    });

    adminEndpoint(this.nsp, 'eventlist::resend', async (id) => {
      if (typeof id !== 'string') {
        return;
      }

      const event = await getRepository(EventListDB).findOne({ id });
      if (event) {
        const values = JSON.parse(event.values_json);
        const eventType = event.event + 's';
        switch(eventType) {
          case 'follows':
          case 'subs':
            alerts.trigger({
              event: eventType,
              name: event.username,
              amount: 0,
              currency: '',
              monthsName: '',
              message: '',
              autohost: false,
            });
            break;
          case 'hosts':
          case 'raids':
            alerts.trigger({
              event: eventType,
              name: event.username,
              amount: Number(values.viewers),
              currency: '',
              monthsName: '',
              message: '',
              autohost: values.autohost ?? false,
            });
            break;
          case 'resubs':
            alerts.trigger({
              event: eventType,
              name: event.username,
              amount: Number(values.subCumulativeMonths),
              currency: '',
              monthsName: getLocalizedName(values.subCumulativeMonths, 'core.months'),
              message: values.message,
              autohost: false,
            });
            break;
          case 'subgifts':
            alerts.trigger({
              event: eventType,
              name: event.username,
              amount: Number(values.count),
              currency: '',
              monthsName: '',
              message: '',
              autohost: false,
            });
            break;
          case 'cheers':
            alerts.trigger({
              event: eventType,
              name: event.username,
              amount: Number(values.bits),
              currency: '',
              monthsName: '',
              message: values.message,
              autohost: false,
            });
            break;
          case 'tips':
            alerts.trigger({
              event: eventType,
              name: event.username,
              amount: Number(values.amount),
              currency: values.currency,
              monthsName: '',
              message: values.message,
              autohost: false,
            });
            break;
          default:
            error(`Eventtype ${event.event} cannot be retriggered`);
        }

      } else {
        error(`Event ${id} not found.`);
      }
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
