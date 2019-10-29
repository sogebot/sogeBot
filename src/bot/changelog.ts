/*
 * Changelog is saving informations about varaible
 * change to update it on memory on cluster
 */

import uuid from 'uuid/v4';
import { set } from 'lodash';

let lastTimestamp = Date.now();
const threadId = uuid();

export const change = ((namespace) => {
  global.db.engine.insert('changelog', { namespace, timestamp: Date.now(), threadId });
});

export const changelog = async () => {
  const changes = await global.db.engine.find('changelog', { timestamp: { $gt: lastTimestamp }, threadId: { $ne: threadId } });
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
      = await global.db.engine.findOne(self.collection.settings,
        { system: name.toLowerCase(), key: variable }
      );
    if (variableFromDb) {
      const value = variable.startsWith('__permission_based') ? JSON.stringify(variableFromDb.value) : variableFromDb.value;
      set(global, change.namespace.replace('core.', ''), value);
    }
    lastTimestamp = change.timestamp;
  }
  setTimeout(() => changelog(), 1000);
};

setInterval(() => {
  global.db.engine.remove('changelog', { timestamp: { $lt: Date.now() - 60000 } });
}, 60000);
