import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { EventList as EventListDB } from '../database/entity/eventList';
import { error } from '../helpers/log';
import alerts from '../registries/alerts';
import { getLocalizedName } from '../commons';
import users from '../users';

class EventList extends Widget {
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
    adminEndpoint(this.nsp, 'eventlist::get', async (count: number) => {
      this.update(count);
    });

    adminEndpoint(this.nsp, 'cleanup', () => {
      getRepository(EventListDB).delete({});
    });

    adminEndpoint(this.nsp, 'eventlist::resend', async (id) => {
      const event = await getRepository(EventListDB).findOne({ id: String(id) });
      if (event) {
        const values = JSON.parse(event.values_json);
        const eventType = event.event + 's';
        switch(eventType) {
          case 'follows':
          case 'subs':
            alerts.trigger({
              event: eventType,
              name: await users.getNameById(event.userId),
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
              name: await users.getNameById(event.userId),
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
              name: await users.getNameById(event.userId),
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
              name: await users.getNameById(event.userId),
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
              name: await users.getNameById(event.userId),
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
              name: await users.getNameById(event.userId),
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

  public async askForGet() {
    this.emit('askForGet');
  }

  public async update(count: number) {
    try {
      const events = await getRepository(EventListDB).find({
        order: { timestamp: 'DESC' },
        take: count,
      });
      // we need to change userId => username and from => from username for eventlist compatibility
      const mapping = new Map() as Map<string, string>;
      for (const event of events) {
        const values = JSON.parse(event.values_json);
        if (values.from && values.from != '0') {
          if (!mapping.has(values.from)) {
            mapping.set(values.from, await users.getNameById(values.from));
          }
        }
        if (!mapping.has(event.userId)) {
          mapping.set(event.userId, await users.getNameById(event.userId));
        }
      }
      this.emit('update',
        events.map(event => {
          const values = JSON.parse(event.values_json);
          if (values.from && values.from != '0') {
            values.from = mapping.get(values.from);
          }
          return {
            ...event,
            username: mapping.get(event.userId),
            values_json: JSON.stringify(values),
          };
        })
      );
    } catch (e) {
      this.emit('update', []);
    }
  }
}

export default new EventList();
