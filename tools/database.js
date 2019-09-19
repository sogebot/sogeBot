'use strict';
require('module-alias/register');
global.migration = true;

const fs = require('fs');

const availableDbs = ['nedb', 'mongodb'];

const argv = require('yargs')
  .usage('Usage: $0 --from <database> --to <database> --mongoUri <connectionUri>')
  .nargs('mongoUri', 1)
  .describe('from', 'database from migrate')
  .describe('to', 'database to migrate')
  .describe('mongoUri', 'connectionUri of your mongodb instance')
  .demandOption(['from', 'to'])
  .help('h')
  .alias('h', 'help')
  .alias('f', 'from')
  .alias('t', 'to')
  .epilog('  <database> can be ' + availableDbs.join(', ') + '\n\n!!! WARNING: All data on --to <database> will be erased !!!')
  .argv;

const mappings = {};

if (argv.from.toLowerCase() === argv.to.toLowerCase()) {
  return console.error('Error: Cannot migrate between same dbs');
}
if (!availableDbs.includes(argv.from)) {
  return console.error('Error: From database ' + argv.from + ' is not supported - available options: ' + availableDbs.join(', '));
}
if (!availableDbs.includes(argv.to)) {
  return console.error('Error: From database ' + argv.from + ' is not supported - available options: ' + availableDbs.join(', '));
}
if ((argv.from === 'nedb') && (!fs.existsSync('./db') || (!fs.existsSync('./db/nedb')))) {
  return console.error('Error: no NeDB directory was found');
};
if ((argv.from === 'mongodb' || argv.to === 'mongodb') && !argv.mongoUri) {
  return console.error('Error: --mongoUri needs to be defined for MongoDB');
};

// NeDB prerequisites
if (argv.to === 'nedb') {
  // purge directory
  const path = './db/nedb';
  if (fs.existsSync(path)) {
    for (const file of fs.readdirSync(path)) {
      fs.unlinkSync(path + '/' + file);
    }
  }
}

const dbName = {
  from: function() {
    if (argv.from === 'mongodb') {
      return argv.mongoUri;
    } else {
      return null;
    };
  },
  to: function() {
    if (argv.to === 'mongodb') {
      return argv.mongoUri;
    } else {
      return null;
    };
  },
};

const from = new (require('../dest/databases/database'))(false, false, argv.from, dbName.from());
const to = new (require('../dest/databases/database'))(false, false, argv.to, dbName.to());

async function main() {
  if (!from.engine.connected || !to.engine.connected) {
    return setTimeout(() => main(), 10);
  };

  console.log('Info: Databases connections established');
  const collections = await from.engine.collections();

  // # go through rest 1:1 collections
  for (const table of collections) {
    await to.engine.remove(table, {});
    console.log('Process: ' + table);
    const items = await from.engine.find(table, {});
    for (const item of items) {
      delete item._id;
      await to.engine.insert(table, item);
    }
  }

  console.log('Info: Completed');
  process.exit();
};

console.log('Info: Connecting to dbs');
main();
