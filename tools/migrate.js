const _ = require('lodash')
const figlet = require('figlet')
const config = require('../config.json')
const compareVersions = require('compare-versions')

// logger
const Logger = require('../libs/logging')
global.logger = new Logger()

// db
const Database = require('../libs/databases/database')
global.db = new Database()

var runMigration = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runMigration(), 1000)
    return
  }
  let info = await global.db.engine.find('info')

  let dbVersion = _.isEmpty(info) || _.isNil(_.find(info, (o) => !_.isNil(o.version)).version)
    ? '0.0.0'
    : _.find(info, (o) => !_.isNil(o.version)).version

  if (process.env.npm_package_version === dbVersion && !_.includes(process.env.npm_package_version, 'SNAPSHOT')) {
    process.exit()
  }

  console.log(figlet.textSync('MIGRATE', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }))

  console.info(('-').repeat(56))
  console.info('Current bot version: %s', process.env.npm_package_version)
  console.info('DB version: %s', dbVersion)
  console.info('DB engine: %s', config.database.type)
  console.info(('-').repeat(56))

  await updates(dbVersion, process.env.npm_package_version)

  console.info(('-').repeat(56))
  console.info('All process DONE! Database is upgraded to %s', process.env.npm_package_version)
  if (dbVersion !== '0.0.0') await global.db.engine.update('info', { version: dbVersion }, { version: process.env.npm_package_version })
  else await global.db.engine.insert('info', { version: process.env.npm_package_version })
  process.exit()
}
runMigration()

let updates = async (from, to) => {
  console.info('Performing update from %s to %s', from, to)
  console.info(('-').repeat(56))

  let migrate = []

  for (let table of _.values(migration)) {
    for (let i of table) {
      if (compareVersions(to.replace('-SNAPSHOT', ''), i.version) !== -1 && compareVersions(i.version, from.replace('-SNAPSHOT', '')) !== -1) {
        migrate.push(i)
      }
    }
  }
  for (let i of _.orderBy(migrate, 'version', 'asc')) { await i.do() }
}

let migration = {
  events: [{
    version: '6.1.0',
    do: async () => {
      console.info('Migration events to %s', '6.1.0')
      let events = await global.db.engine.find('events')
      for (let event of events) {
        if (event.key === 'hosted') {
          await global.db.engine.update('events', {_id: event._id.toString()}, {
            definitions: {
              viewersAtLeast: _.get(event, 'definitions.viewersAtLeast', 1),
              ignoreAutohost: _.get(event, 'definitions.ignoreAutohost', false)
            }
          })
        }
      }
    }
  }]
}
