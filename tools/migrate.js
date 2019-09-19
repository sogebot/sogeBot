require('module-alias/register');

const _ = require('lodash');
const figlet = require('figlet');
const config = require('../config.json');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

// logger
const Logger = require('../dest/logging');
global.logger = new Logger();

const dropFiles = [ 'settings' ];

// db
const Database = require('../dest/databases/database');
global.db = new Database(false, true);

let interval = 0;

const header = function (message) {
  console.info(` # ${message}`);
  interval = setInterval(() => {
    console.info('.');
  }, 200);
};

const end = function (updated) {
  console.info(` OK (${updated} processed)`);
  clearInterval(interval);
};

const migration = {
  7: async () => {
    header('Add id for dashboard and update dashboardId in widgets');
    let updated = 0;

    const dashboards = await global.db.engine.find('dashboards');
    for (const dashboard of dashboards) {
      const id = uuidv4();
      await global.db.engine.update('dashboards', { _id: String(dashboard._id) }, { id });
      updated++;

      const widgets = await global.db.engine.find('widgets', { dashboardId: String(dashboard._id) });
      for (const widget of widgets) {
        updated++;
        await global.db.engine.update('widgets', { _id: String(widget._id) }, { dashboardId: id });
      }

    }
    const mainWidgetsWith0String = await global.db.engine.find('widgets', { dashboardId: '0' });
    const mainWidgetsWith0Number = await global.db.engine.find('widgets', { dashboardId: 0 });
    for (const widget of [...mainWidgetsWith0Number, ...mainWidgetsWith0String]) {
      updated++;
      await global.db.engine.update('widgets', { _id: String(widget._id) }, { dashboardId: null });
    }
    end(updated);
  },
  6: async () => {
    header('Update quotes id to uuid');
    let updated = 0;

    const quotes = await global.db.engine.find('systems.quotes');
    for (const quote of quotes) {
      await global.db.engine.update('systems.quotes', { _id: String(quote._id) }, { id: uuidv4() });
      updated++;
    }
    end(updated);
  },
  5: async () => {
    header('Update quotes datetime to timestamp');
    let updated = 0;

    const quotes = await global.db.engine.find('systems.quotes');
    for (const quote of quotes) {
      await global.db.engine.update('systems.quotes', { _id: String(quote._id) }, { createdAt: new Date(quote.createdAt).getTime() });
      updated++;
    }
    end(updated);
  },
  4: async () => {
    header('Update moderation settings to __permission_based__');
    let updated = 0;

    const keys = [
      'cListsEnabled', 'cListsTimeout',
      'cLinksEnabled', 'cLinksIncludeSpaces', 'cLinksTimeout',
      'cSymbolsEnabled', 'cSymbolsTriggerLength', 'cSymbolsMaxSymbolsConsecutively', 'cSymbolsMaxSymbolsPercent', 'cSymbolsTimeout',
      'cLongMessageEnabled', 'cLongMessageTriggerLength', 'cLongMessageTimeout',
      'cCapsEnabled', 'cCapsTriggerLength', 'cCapsMaxCapsPercent', 'cCapsTimeout',
      'cSpamEnabled', 'cSpamTriggerLength', 'cSpamMaxLength', 'cSpamTimeout',
      'cColorEnabled', 'cColorTimeout',
      'cEmotesEnabled', 'cEmotesEmojisAreEmotes', 'cEmotesMaxCount', 'cEmotesTimeout',
    ];
    for (const key of keys) {
      const item = await global.db.engine.findOne('systems.settings', { key });
      if (typeof item.value !== 'undefined') {
        const value = {
          '0efd7b1c-e460-4167-8e06-8aaf2c170311': item.value,
          'c168a63b-aded-4a90-978f-ed357e95b0d2': null,
          'e8490e6e-81ea-400a-b93f-57f55aad8e31': null,
          'e3b557e7-c26a-433c-a183-e56c11003ab7': null,
          'b38c5adb-e912-47e3-937a-89fabd12393a': null,
          '4300ed23-dca0-4ed9-8014-f5f2f7af55a9': null,
        };
        await global.db.engine.remove('systems.settings', { key });
        await global.db.engine.insert('systems.settings',
          { key: '__permission_based__' + key, value });
      }
      updated++;
    }

    const keysToDelete = [
      'cLinksModerateSubscribers',
      'cSymbolsModerateSubscribers',
      'cLongMessageModerateSubscribers',
      'cCapsModerateSubscribers',
      'cSpamModerateSubscribers',
      'cColorModerateSubscribers',
      'cEmoteModerateSubscribers',
    ];
    for (const key of keysToDelete) {
      const item = await global.db.engine.findOne('systems.settings', { key });
      if (typeof item.value !== 'undefined') {
        await global.db.engine.remove('systems.settings', { key });
      }
      updated++;
    }
    end(updated);
  },
  3: async () => {
    header('Remove user.time.points');
    let updated = 0;
    for (const item of await global.db.engine.find('users')) {
      if (typeof _.get(item, 'time.points', undefined) !== 'undefined') {
        delete item.time.points;
        await global.db.engine.update('users', { _id: String(item._id) }, item);
        updated++;
      }
    }
    end(updated);
  },
  2: async () => {
    header('Add id to keywords');
    let updated = 0;
    for (const item of await global.db.engine.find('systems.keywords')) {
      if (typeof item.id === 'undefined') {
        item.id = uuidv4();
        await global.db.engine.update('systems.keywords', { _id: String(item._id) }, item);
        updated++;
      }
    }
    end(updated);
  },
  1: async () => {
    header('Updating points settings to permission based settings');
    let updated = 0;
    const permId = '0efd7b1c-e460-4167-8e06-8aaf2c170311';
    const list = [
      'interval',
      'perInterval',
      'offlineInterval',
      'perOfflineInterval',
      'messageInterval',
      'perMessageInterval',
      'messageOfflineInterval',
      'perMessageOfflineInterval',
    ];
    for (const key of list) {
      const item = await global.db.engine.findOne('systems.settings', { system: 'points', key });
      if (typeof item.value !== 'undefined') {
        await global.db.engine.update('systems.settings',
          { _id: String(item._id) },
          {
            key: `__permission_based__${key}`,
            value: JSON.stringify({
              [permId]: item.value,
            }),
          });
        updated++;
      }
    }
    end(updated);
  },
};

const runDeletion = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runDeletion(), 1000);
    return;
  }

  console.info(('-').repeat(56));
  if (config.database.type === 'nedb') {
    console.info('Removing nedb files');

    if (fs.existsSync('db/nedb/')) {
      for (const file of dropFiles) {
        if (fs.existsSync(`db/nedb/${file}.db`)) {
          console.info(`- Removing db/nedb/${file}.db`);
          fs.unlinkSync(`db/nedb/${file}.db`);
        }
      }
    } else {
      console.info('Nothing to do');
    }
    console.info(('-').repeat(56));
  } else if (config.database.type === 'mongodb') {
    console.info('Removing mongodb collections');
    const collections = await global.db.engine.collections();
    for (const file of dropFiles) {
      if (collections.includes(file)) {
        console.info(`- Removing ${file}`);
        await global.db.engine.drop(file);
      }
    }
  }
  process.exit();
};

const runMigration = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runMigration(), 1000);
    return;
  }
  const info = await global.db.engine.find('info');
  const version = Object.keys(migration).sort().reverse()[0];

  let dbVersion = _.isEmpty(info) || _.isNil(_.find(info, (o) => !_.isNil(o.version)).version)
    ? 0
    : _.find(info, (o) => !_.isNil(o.version)).version;

  if (isNaN(Number(dbVersion)) || dbVersion > 1000000) {
    dbVersion = 0;
  }

  if (version === dbVersion) {
    process.exit();
  }

  console.log(figlet.textSync('MIGRATE', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  }));

  console.info(('-').repeat(56));
  console.info('Current bot version: %s', version);
  console.info('DB version: %s', dbVersion);
  console.info('DB engine: %s', config.database.type);
  console.info(('-').repeat(56));

  await updates(dbVersion, version);

  console.info(('-').repeat(56));
  console.info('All process DONE! Database is upgraded to %s', version);
  await global.db.engine.remove('info', {});
  await global.db.engine.insert('info', { version: version });
  process.exit();
};

if (process.argv[2] && process.argv[2] === '--delete') {
  runDeletion();
} else {
  runMigration();
}

const updates = async (from, to) => {
  console.info('Performing update from %s to %s', from, to);
  console.info(('-').repeat(56));

  for (const key of Object.keys(migration).sort((a,b) => a-b )) {
    if (key > from) {
      await migration[key]();
    }
  }
};