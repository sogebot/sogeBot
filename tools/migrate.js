require('module-alias/register')

const _ = require('lodash')
const figlet = require('figlet')
const config = require('../config.json')
const XRegExp = require('xregexp')
const fs = require('fs')
const uuidv4 = require('uuid/v4')

// logger
const Logger = require('../dest/logging')
global.logger = new Logger()

const dropFiles = [ 'settings' ]

// db
const Database = require('../dest/databases/database')
global.db = new Database(false, true)

let interval = 0;

const header = function (message) {
  console.info(` # ${message}`);
  interval = setInterval(() => {
    console.info('.');
  }, 200)
};

const end = function (updated) {
  console.info(` OK (${updated} processed)`);
  clearInterval(interval);
}

const migration = {
  2: async () => {
    header('Add id to keywords');
    let updated = 0;
    for (let item of await global.db.engine.find('systems.keywords')) {
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
    ]
    for (const key of list) {
      const item = await global.db.engine.findOne('systems.settings', { system: 'points', key });
      if (typeof item.value !== 'undefined') {
        await global.db.engine.update('systems.settings',
          { _id: String(item._id) },
          {
            key: `__permission_based__${key}`,
            value: JSON.stringify({
              [permId]: item.value
            })
          });
        updated++;
      }
    }
    end(updated);
  },
};

const runDeletion = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runDeletion(), 1000)
    return
  }

  console.info(('-').repeat(56))
  if (config.database.type === 'nedb') {
    console.info('Removing nedb files')

    if (fs.existsSync('db/nedb/')) {
      for (let file of dropFiles) {
        if (fs.existsSync(`db/nedb/${file}.db`)) {
          console.info(`- Removing db/nedb/${file}.db`)
          fs.unlinkSync(`db/nedb/${file}.db`)
        }
      }
    } else {
      console.info('Nothing to do')
    }
    console.info(('-').repeat(56))
  } else if (config.database.type === 'mongodb') {
    console.info('Removing mongodb collections')
    const collections = await global.db.engine.collections()
    for (let file of dropFiles) {
      if (collections.includes(file)) {
        console.info(`- Removing ${file}`)
        await global.db.engine.drop(file)
      }
    }
  }
  process.exit()
}

var runMigration = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runMigration(), 1000)
    return
  }
  let info = await global.db.engine.find('info')
  const version = Object.keys(migration).sort().reverse()[0];

  let dbVersion = _.isEmpty(info) || _.isNil(_.find(info, (o) => !_.isNil(o.version)).version)
    ? 0
    : _.find(info, (o) => !_.isNil(o.version)).version

  if (isNaN(Number(dbVersion)) || dbVersion > 1000000) {
    dbVersion = 0;
  }

  if (version === dbVersion) {
    process.exit()
  }

  console.log(figlet.textSync('MIGRATE', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }))

  console.info(('-').repeat(56))
  console.info('Current bot version: %s', version)
  console.info('DB version: %s', dbVersion)
  console.info('DB engine: %s', config.database.type)
  console.info(('-').repeat(56))

  await updates(dbVersion, version)

  console.info(('-').repeat(56))
  console.info('All process DONE! Database is upgraded to %s', version)
  await global.db.engine.remove('info', {})
  await global.db.engine.insert('info', { version: version })
  process.exit()
}

if (process.argv[2] && process.argv[2] === '--delete') {
  runDeletion()
} else {
  runMigration()
}

let updates = async (from, to) => {
  console.info('Performing update from %s to %s', from, to)
  console.info(('-').repeat(56))

  for (const key of Object.keys(migration).sort((a,b) => a-b )) {
    if (key > from) {
      await migration[key]();
    }
  }
}