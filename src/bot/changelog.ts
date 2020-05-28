/*
 * Changelog is saving informations about varaible
 * change to update it on memory on cluster
 */

import { v4 as uuid } from 'uuid';

import { getRepository, LessThan, MoreThan, Not } from 'typeorm';
import { Settings } from './database/entity/settings';
import { Changelog } from './database/entity/changelog';
import { isDbConnected } from './helpers/database';
import { find } from './helpers/register';

let lastTimestamp = Date.now();
const threadId = uuid();

export const change = ((namespace: string) => {
  if (!isDbConnected) {
    setTimeout(() => change(namespace), 1000);
  } else {
    getRepository(Changelog).save({ namespace, timestamp: Date.now(), threadId });
  }
});

export const changelog = async () => {
  if (!isDbConnected) {
    setTimeout(() => changelog(), 1000);
    return;
  }

  const changes = await getRepository(Changelog).find({
    where: {
      timestamp: MoreThan(lastTimestamp),
      threadId: Not(threadId),
    },
  });
  for (const change2 of changes.sort((a, b) => a.timestamp - b.timestamp )) {
    const [type, name, variable] = change2.namespace.split('.');

    const self = find(type, name);
    if (!self) {
      throw new Error(`${type}.${name} not found in list`);
    }
    const variableFromDb
     = await getRepository(Settings).createQueryBuilder('settings').select('settings')
       .where('namespace = :namespace', { namespace: self.nsp })
       .andWhere('name = :name', { name: variable })
       .getOne();
    if (variableFromDb) {
      const value = JSON.stringify(variableFromDb.value);
      const [ type2, name2 ] = change2.namespace.split('.');
      const self2 = find(type2, name2);
      if (!self2) {
        throw new Error(`${type}.${name} not found in list`);
      }
      (self as any)[change2.namespace.split('.')[2]] = value;
    }
    lastTimestamp = change2.timestamp;
  }
  setTimeout(() => changelog(), 1000);
};

setInterval(() => {
  getRepository(Changelog).delete({
    timestamp: LessThan(Date.now() - 60000),
  });
}, 60000);
