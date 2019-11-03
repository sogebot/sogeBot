'use strict';
require('module-alias/register');

const fs = require('fs');

const availableDbs = ['nedb', 'mongodb'];

const { createConnection, getConnectionOptions, getManager, getRepository } = require('typeorm');
const { Alias } = require('../dest/entity/alias');
const { Commands, CommandsCount } = require('../dest/entity/commands');
const { CacheTitles } = require('../dest/entity/cacheTitles');
const { Settings } = require('../dest/entity/settings');
const { EventList } = require('../dest/entity/eventList');
const { Quotes } = require('../dest/entity/quotes');
const { Permissions, PermissionFilters } = require('../dest/entity/permissions');

const _ = require('lodash');

const argv = require('yargs')
  .usage('Usage: $0 --from <database> --to <database> --mongoUri <connectionUri>')
  .nargs('mongoUri', 1)
  .describe('from', 'database from migrate')
  .describe('mongoUri', 'connectionUri of your mongodb instance')
  .demandOption(['from'])
  .help('h')
  .alias('h', 'help')
  .alias('f', 'from')
  .epilog('  <database> can be ' + availableDbs.join(', ') + '\n\n!!! WARNING: All data on --to <database> will be erased !!!')
  .argv;

if (!availableDbs.includes(argv.from)) {
  return console.error('Error: From database ' + argv.from + ' is not supported - available options: ' + availableDbs.join(', '));
}
if ((argv.from === 'nedb') && (!fs.existsSync('./db') || (!fs.existsSync('./db/nedb')))) {
  return console.error('Error: no NeDB directory was found');
};
if ((argv.from === 'mongodb') && !argv.mongoUri) {
  return console.error('Error: --mongoUri needs to be defined for MongoDB');
};

const dbName = {
  from: function() {
    if (argv.from === 'mongodb') {
      return argv.mongoUri;
    } else {
      return null;
    };
  }
};

const from = new (require('../dest/databases/database'))(false, false, argv.from, dbName.from());

const connect = async function () {
  const connectionOptions = await getConnectionOptions();
  createConnection({
    synchronize: true, // force to recreate table!!! careful
    logging: false,
    entities: [__dirname + '/../dest/entity/*.{js,ts}'],
    ...connectionOptions,
  });
};
async function main() {
  if (!from.engine.connected) {
    return setTimeout(() => main(), 1000);
  };
  await connect();
  await new Promise((resolve) => setTimeout(() => resolve(), 1000));

  console.log('Info: Databases connections established');

  let items;
  console.log('Migr: cache.titles');
  await getManager().clear(CacheTitles);
  items = (await from.engine.find('cache.titles')).map(o => {
    delete o._id; delete o.id; return {...o, timestamp: Number(o.timestamp || 0) };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(CacheTitles).insert(chunk)
    }
  }

  await getManager().clear(Settings);
  for (const type of ['core', 'overlays', 'games', 'registries', 'integrations']) {
    console.log(`Migr: ${type}.settings`);
    for (const item of await from.engine.find(`${type}.settings`)) {
      if (item.key.includes('.')) {
        continue;
      }
      await getRepository(Settings).insert({ namespace: `/${type}/${item.system}`, key: item.key, value: JSON.stringify(item.value) })
    }
  }

  console.log(`Migr: widgetsEventList`);
  await getManager().clear(EventList);
  items = (await from.engine.find('widgetsEventList')).map(o => {
    delete o._id;
    return {
      event: o.event,
      username: o.username,
      timestamp: Number(o.timestamp),
      values_json: JSON.stringify(
        Object.keys(o)
          .filter(key => !['event', 'username', 'timestamp'].includes(key))
          .reduce((obj, key) => {
            return {
              ...obj,
              [key]: o[key],
            };
          }, {}),
      ),
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(EventList).insert(chunk)
    }
  }

  console.log(`Migr: systems.quotes`);
  await getManager().clear(Quotes);
  items = (await from.engine.find('systems.quotes')).map(o => {
    delete o._id; delete o.id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(Quotes).insert(chunk)
    }
  }

  console.log(`Migr: systems.alias`);
  await getManager().clear(Alias);
  items = (await from.engine.find('systems.alias')).map(o => {
    delete o._id; delete o.id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(Alias).insert(chunk)
    }
  }

  console.log(`Migr: systems.customcommands, systems.customcommands.responses`);
  await getManager().clear(Commands);
  items = await from.engine.find('systems.customcommands')
  for (const item of items) {
    // add responses
    const responses = (await from.engine.find('systems.customcommands.responses', { cid: item.id })).map(o => {
      delete o._id; delete o.id;
      if (typeof o.filter === 'undefined') {
        o.filter = '';
      }
      if (typeof o.stopIfExecuted === 'undefined') {
        o.stopIfExecuted = false;
      }
      return o;
    });
    item.responses = responses
  }
  items = items.map(o => {
    delete o._id; delete o.id; delete o.cid; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(Commands).save(chunk)
    }
  }

  console.log(`Migr: core.commands.count `);
  await getManager().clear(CommandsCount);
  items = (await from.engine.find('core.commands.count')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(CommandsCount).insert(chunk)
    }
  }

  console.log(`Migr: permissions`);
  await getManager().clear(Permissions);
  await getManager().clear(PermissionFilters);
  items = (await from.engine.find('core.permissions')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      await getRepository(Permissions).insert(chunk)
    }
  }

  console.log('Info: Completed');
  process.exit();
};

console.log('Info: Connecting to dbs');
main();
