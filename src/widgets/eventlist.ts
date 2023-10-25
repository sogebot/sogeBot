import type { EmitData } from '@entity/alert.js';
import { EventList as EventListDB } from '@entity/eventList.js';
import { UserTip } from '@entity/user.js';
import { SECOND } from '@sogebot/ui-helpers/constants.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import { Between } from 'typeorm';

import Widget from './_interface.js';
import alerts from '../registries/alerts.js';

import { AppDataSource } from '~/database.js';
import { error } from '~/helpers/log.js';
import { adminEndpoint } from '~/helpers/socket.js';
import getNameById from '~/helpers/user/getNameById.js';
import { translate } from '~/translate.js';

class EventList extends Widget {
  public sockets() {
    adminEndpoint('/widgets/eventlist', 'eventlist::removeById', async (idList, cb) => {
      const ids = Array.isArray(idList) ? [...idList] : [idList];
      for (const id of ids) {
        await AppDataSource.getRepository(EventListDB).update(id, { isHidden: true });
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/widgets/eventlist', 'eventlist::get', async (count) => {
      this.update(count);
    });

    adminEndpoint('/widgets/eventlist', 'skip', () => {
      alerts.skip();
    });

    adminEndpoint('/widgets/eventlist', 'cleanup', () => {
      AppDataSource.getRepository(EventListDB).update({ isHidden: false }, { isHidden: true });
    });

    adminEndpoint('/widgets/eventlist', 'eventlist::resend', async (id) => {
      const event = await AppDataSource.getRepository(EventListDB).findOneBy({ id: String(id) });
      if (event) {
        const values = JSON.parse(event.values_json);
        switch(event.event) {
          case 'follow':
          case 'sub':
            alerts.trigger({
              event:      event.event,
              name:       await getNameById(event.userId),
              amount:     0,
              tier:       String(values.tier) as EmitData['tier'],
              currency:   '',
              monthsName: '',
              message:    '',
            });
            break;
          case 'raid':
            alerts.trigger({
              event:      event.event,
              name:       await getNameById(event.userId),
              amount:     Number(values.viewers),
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    '',
            });
            break;
          case 'resub':
            alerts.trigger({
              event:      event.event,
              name:       await getNameById(event.userId),
              amount:     Number(values.subCumulativeMonths),
              tier:       String(values.tier) as EmitData['tier'],
              currency:   '',
              monthsName: getLocalizedName(values.subCumulativeMonths, translate('core.months')),
              message:    values.message,
            });
            break;
          case 'subgift':
            alerts.trigger({
              event:      event.event,
              name:       await getNameById(values.fromId),
              tier:       null,
              recipient:  await getNameById(event.userId),
              amount:     Number(values.months),
              monthsName: getLocalizedName(Number(values.months), translate('core.months')),
              currency:   '',
              message:    '',
            });
            break;
          case 'cheer':
            alerts.trigger({
              event:      event.event,
              name:       await getNameById(event.userId),
              amount:     Number(values.bits),
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    values.message,
            });
            break;
          case 'tip':
            alerts.trigger({
              event:      event.event,
              name:       await getNameById(event.userId),
              amount:     Number(values.amount),
              tier:       null,
              currency:   values.currency,
              monthsName: '',
              message:    values.message,
            });
            break;
          case 'rewardredeem':
            alerts.trigger({
              event:      event.event,
              name:       values.titleOfReward,
              rewardId:   values.rewardId,
              amount:     0,
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    values.message,
              recipient:  await getNameById(event.userId),
            });
            break;
          default:
            error(`event.event ${event.event} cannot be retriggered`);
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
      const events = await AppDataSource.getRepository(EventListDB).find({
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
            try {
              mapping.set(values.fromId, await getNameById(values.fromId));
            } catch {
              event.isHidden = true; // hide event if user is unknown
              await AppDataSource.getRepository(EventListDB).save(event);
            }
          }
        }
        if (!event.userId.includes('__anonymous__')) {
          if (!mapping.has(event.userId)) {
            try {
              mapping.set(event.userId, await getNameById(event.userId));
            } catch {
              event.isHidden = true; // hide event if user is unknown
              await AppDataSource.getRepository(EventListDB).save(event);
            }
          }
        } else {
          mapping.set(event.userId, event.userId.replace('#__anonymous__', ''));
        }
        // pair tips so we have sortAmount to use in eventlist filter
        if (event.event === 'tip') {
          // search in DB for corresponding tip, unfortunately pre 13.0.0 timestamp won't exactly match (we are adding 10 seconds up/down)
          const tip = await AppDataSource.getRepository(UserTip).findOneBy({
            userId:   event.userId,
            tippedAt: Between(event.timestamp - (10 * SECOND), event.timestamp + (10 * SECOND)),
          });
          tipMapping.set(event.id, tip?.sortAmount ?? 0);
        }
      }
      this.emit('update',
        events
          .filter(o => !o.isHidden) // refilter as we might have new hidden events
          .map(event => {
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
    } catch (e: any) {
      this.emit('update', []);
    }
  }
}

export default new EventList();
