'use strict';
require('module-alias/register');
global.migration = true;

const fs = require('fs');

const availableDbs = ['nedb', 'mongodb'];

const { createConnection, getConnectionOptions, getManager } = require('typeorm');
const { CacheTitles } = require('../dest/entity/cacheTitles');
const { Settings } = require('../dest/entity/settings');
const { EventList } = require('../dest/entity/eventList');

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
    synchronize: true,
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

  console.log('Migr: cache.titles');
  await getManager().createQueryBuilder().delete().from(CacheTitles).execute();
  for (const item of await from.engine.find('cache.titles')) {
    await getManager()
      .createQueryBuilder()
      .insert()
      .into(CacheTitles)
      .values([
        { game: item.game, title: item.title, timestamp: Number(item.timestamp || 0) },
      ])
      .execute();
  }

  await getManager().createQueryBuilder().delete().from(Settings).execute();
  for (const type of ['core', 'overlays', 'games', 'registries', 'integrations']) {
    console.log(`Migr: ${type}.settings`);
    for (const item of await from.engine.find(`${type}.settings`)) {
      if (item.key.includes('.')) {
        continue;
      }
      await getManager()
        .createQueryBuilder()
        .insert()
        .into(Settings)
        .values([
          { namespace: `/${type}/${item.system}`, key: item.key, value: JSON.stringify(item.value) },
        ])
        .execute();
    }
  }


  console.log(`Migr: widgetsEventList`);
  await getManager().createQueryBuilder().delete().from(EventList).execute();
  const items = (await from.engine.find('widgetsEventList')).map(o => {
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
  for (const chunk of _.chunk(items, 200)) {
    await getManager()
      .createQueryBuilder()
      .insert()
      .into(EventList)
      .values(chunk)
      .execute();
  }

  console.log('Info: Completed');
  process.exit();
};

console.log('Info: Connecting to dbs');
main();
