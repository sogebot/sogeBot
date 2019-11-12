/*
 * Changelog is saving informations about varaible
 * change to update it on memory on cluster
 */

import uuid from 'uuid/v4';
import { set } from 'lodash';

import { getManager, getRepository, LessThan, MoreThan, Not } from 'typeorm';
import { Settings } from './entity/settings';
import { Changelog } from './entity/changelog';

let lastTimestamp = Date.now();
const threadId = uuid();

export const change = ((namespace) => {
  getRepository(Changelog).save({ namespace, timestamp: Date.now(), threadId });
});

export const changelog = async () => {
  const changes = await getRepository(Changelog).find({
    where: {
      timestamp: MoreThan(lastTimestamp),
      threadId: Not(threadId),
    },
  });
  for (const change of changes.sort((a, b) => a.timestamp - b.timestamp )) {
    let self: null | any = null;

    const [type, name, variable] = change.namespace.split('.');

    if (type === 'core') {
      self = Object.values(global).find((o) => {
        return typeof o !== 'undefined' && o.constructor.name.toLowerCase() === name.toLowerCase();
      });
    } else {
      self = Object.values(global[type]).find((o: any) => {
        return typeof o !== 'undefined' && o.constructor.name.toLowerCase() === name.toLowerCase();
      }) as any;
    }
    const variableFromDb
     = await getManager().createQueryBuilder().select('settings').from(Settings, 'settings')
       .where('namespace = :namespace', { namespace: self.nsp })
       .andWhere('name = :name', { name: variable })
       .getOne();
    if (variableFromDb) {
      const value = JSON.stringify(variableFromDb.value);
      set(global, change.namespace.replace('core.', ''), value);
    }
    lastTimestamp = change.timestamp;
  }
  setTimeout(() => changelog(), 1000);
};

setInterval(() => {
  getRepository(Changelog).delete({
    timestamp: LessThan(Date.now() - 60000),
  });
}, 60000);
