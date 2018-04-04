const _ = require('lodash')
const figlet = require('figlet')
const config = require('../config.json')
const compareVersions = require('compare-versions')

// logger
const Logger = require('../libs/logging')
global.logger = new Logger()

// db
const Database = require('../libs/databases/database')
global.db = new Database(false)

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
  commands: [{
    version: '7.0.0',
    do: async () => {
      console.info('Migration commands to %s', '7.0.0')
      let commands = await global.db.engine.find('commands')
      const constants = require('../libs/constants')
      for (let command of commands) {
        await global.db.engine.update('commands', { _id: command._id.toString() }, { permission: constants.VIEWERS })
      }
    }
  }],
  bits: [{
    version: '7.0.0',
    do: async () => {
      console.info('Migration bits to %s', '7.0.0')
      let users = await global.db.engine.find('users')
      for (let user of users) {
        if (!_.has(user, 'stats.bits') || _.isNil(user.stats.bits)) continue // skip if bits are null/undefined
        await Promise.all([
          global.db.engine.remove('users', { _id: user._id.toString() }),
          global.db.engine.insert('users.bits', { username: user.username, amount: user.stats.bits, message: 'Migrated from 6.x', timestamp: _.now() })
        ])
        delete user.stats.bits
        delete user._id``
        await global.db.engine.insert('users', user)
      }
    }
  }]
}
