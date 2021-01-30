import { SECOND } from '@sogebot/ui-helpers/constants';
import { Between, getRepository } from 'typeorm';

import type { EmitData } from '../database/entity/alert';
import { EventList as EventListDB } from '../database/entity/eventList';
import { UserTip } from '../database/entity/user';
import { getLocalizedName } from '../helpers/getLocalized';
import { error } from '../helpers/log';
import { adminEndpoint } from '../helpers/socket';
import alerts from '../registries/alerts';
import { translate } from '../translate';
import users from '../users';
import Widget from './_interface';

class EventList extends Widget {
  public sockets() {
    adminEndpoint(this.nsp, 'eventlist::removeById', async (idList, cb) => {
      const ids = Array.isArray(idList) ? [...idList] : [idList];
      for (const id of ids) {
        await getRepository(EventListDB).update(id, { isHidden: true });
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'eventlist::get', async (count: number) => {
      this.update(count);
    });

    adminEndpoint(this.nsp, 'skip', () => {
      alerts.skip();
    });

    adminEndpoint(this.nsp, 'cleanup', () => {
      getRepository(EventListDB).update({ isHidden: false }, { isHidden: true });
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
              event:      eventType,
              name:       await users.getNameById(event.userId),
              amount:     0,
              tier:       String(values.tier) as EmitData['tier'],
              currency:   '',
              monthsName: '',
              message:    '',
            });
            break;
          case 'hosts':
          case 'raids':
            alerts.trigger({
              event:      eventType,
              name:       await users.getNameById(event.userId),
              amount:     Number(values.viewers),
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    '',
            });
            break;
          case 'resubs':
            alerts.trigger({
              event:      eventType,
              name:       await users.getNameById(event.userId),
              amount:     Number(values.subCumulativeMonths),
              tier:       String(values.tier) as EmitData['tier'],
              currency:   '',
              monthsName: getLocalizedName(values.subCumulativeMonths, translate('core.months')),
              message:    values.message,
            });
            break;
          case 'subgifts':
            alerts.trigger({
              event:      eventType,
              name:       await users.getNameById(event.userId),
              amount:     Number(values.count),
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    '',
            });
            break;
          case 'cheers':
            alerts.trigger({
              event:      eventType,
              name:       await users.getNameById(event.userId),
              amount:     Number(values.bits),
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    values.message,
            });
            break;
          case 'tips':
            alerts.trigger({
              event:      eventType,
              name:       await users.getNameById(event.userId),
              amount:     Number(values.amount),
              tier:       null,
              currency:   values.currency,
              monthsName: '',
              message:    values.message,
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
        where: { isHidden: false },
        order: { timestamp: 'DESC' },
        take:  count,
      });
      // we need to change userId => username and from => from username for eventlist compatibility
      const mapping = new Map() as Map<string, string>;
      const tipMapping = new Map() as Map<string, number>;
      for (const event of events) {
        const values = JSON.parse(event.values_json);
        if (values.fromId && values.fromId != '0') {
          if (!mapping.has(values.fromId)) {
            mapping.set(values.fromId, await users.getNameById(values.fromId));
          }
        }
        if (!event.userId.includes('__anonymous__')) {
          if (!mapping.has(event.userId)) {
            mapping.set(event.userId, await users.getNameById(event.userId));
          }
        } else {
          mapping.set(event.userId, event.userId.replace('#__anonymous__', ''));
        }
        // pair tips so we have sortAmount to use in eventlist filter
        if (event.event === 'tip') {
          // search in DB for corresponding tip, unfortunately pre 13.0.0 timestamp won't exactly match (we are adding 10 seconds up/down)
          const tip = await getRepository(UserTip).findOne({
            where: {
              userId:   event.userId,
              tippedAt: Between(event.timestamp - (10 * SECOND), event.timestamp + (10 * SECOND)),
            },
          });
          tipMapping.set(event.id, tip?.sortAmount ?? 0);
        }
      }
      this.emit('update',
        events.map(event => {
          const values = JSON.parse(event.values_json);
          if (values.fromId && values.fromId != '0') {
            values.fromId = mapping.get(values.fromId);
          }
          return {
            ...event,
            username:    mapping.get(event.userId),
            sortAmount:  tipMapping.get(event.id),
            values_json: JSON.stringify(values),
          };
        }),
      );
    } catch (e) {
      this.emit('update', []);
    }
  }
}

export default new EventList();
