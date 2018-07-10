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
  const version = _.get(process, 'env.npm_package_version', '999.9.9-SNAPSHOT')

  let dbVersion = _.isEmpty(info) || _.isNil(_.find(info, (o) => !_.isNil(o.version)).version)
    ? '0.0.0'
    : _.find(info, (o) => !_.isNil(o.version)).version

  if (version === dbVersion && !_.includes(version, 'SNAPSHOT')) {
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
  if (dbVersion !== '0.0.0') await global.db.engine.update('info', { version: dbVersion }, { version: version })
  else await global.db.engine.insert('info', { version: version })
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
  keywords: [{
    version: '7.6.0',
    do: async () => {
      console.info('Moving custom commands from keywords to systems.keywords')
      let items = await global.db.engine.find('keywords')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.keywords', item)
        processed++
      }
      await global.db.engine.remove('keywords', {})
      console.info(` => ${processed} processed`)
      console.info(` !! commands collection can be deleted`)
    }
  }],
  customcommands: [{
    version: '7.6.0',
    do: async () => {
      console.info('Moving custom commands from customcommands to systems.customcommands')
      let items = await global.db.engine.find('commands')
      let processed = 0
      for (let item of items) {
        delete item._id
        item.command = `!${item.command}`
        await global.db.engine.insert('systems.customcommands', item)
        processed++
      }
      await global.db.engine.remove('commands', {})
      console.info(` => ${processed} processed`)
      console.info(` !! commands collection can be deleted`)
    }
  }],
  cooldown: [{
    version: '7.6.0',
    do: async () => {
      console.info('Moving cooldowns from cooldowns to systems.cooldown')
      let items = await global.db.engine.find('cooldowns')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.cooldown', item)
        processed++
      }
      await global.db.engine.remove('cooldowns', {})
      console.info(` => ${processed} processed`)
      console.info(` !! cooldowns and cooldown.viewers collections can be deleted`)
    }
  }],
  alias: [{
    version: '7.0.0',
    do: async () => {
      console.info('Migration alias to %s', '7.0.0')
      let alias = await global.db.engine.find('alias')
      const constants = require('../libs/constants')
      for (let item of alias) {
        await global.db.engine.update('alias', { _id: item._id.toString() }, { permission: constants.VIEWERS })
      }
    }
  }, {
    version: '7.6.0',
    do: async () => {
      console.info('Moving alias from alias to systems.alias')
      let items = await global.db.engine.find('alias')
      let processed = 0
      for (let item of items) {
        delete item._id
        item.alias = `!${item.alias}`
        item.command = `!${item.command}`
        await global.db.engine.insert('systems.alias', item)
        processed++
      }
      await global.db.engine.remove('alias', {})
      console.info(` => ${processed} processed`)
      console.info(` !! alias collection can be deleted`)
    }
  }],
  cache: [{
    version: '7.5.0',
    do: async () => {
      console.info('Moving gameTitles from cache to cache.titles')
      let cache = await global.db.engine.findOne('cache', { key: 'gamesTitles' })
      let processed = 0
      if (!_.isEmpty(cache)) {
        for (let [game, titles] of Object.entries(cache['games_and_titles'])) {
          for (let title of titles) {
            await global.db.engine.insert('cache.titles', { game, title })
            processed++
          }
        }
        await global.db.engine.remove('cache', { key: 'gamesTitles' })
      }
      console.info(` => ${processed} titles`)
    }
  }],
  users: [{
    version: '7.3.0',
    do: async () => {
      console.info('Removing users incorrect created_at time %s', '7.3.0')
      let users = await global.db.engine.find('users')
      for (let user of users) {
        if (_.isNil(user.time)) continue
        await global.db.engine.remove('users', { _id: String(user._id) })
        delete user._id; delete user.time.created_at
        await global.db.engine.insert('users', user)
      }
    }
  }, {
    version: '7.5.0',
    do: async () => {
      console.info('Removing users is.online')
      let users = await global.db.engine.find('users')
      let updated = 0
      for (let user of users) {
        if (_.isNil(user.is) || _.isNil(user.is.online)) continue
        updated++
        await global.db.engine.remove('users', { _id: String(user._id) })
        delete user._id; delete user.is.online
        await global.db.engine.insert('users', user)
      }
      console.info(` => ${updated} users`)
    }
  }, {
    version: '7.4.0',
    do: async () => {
      console.info('Migration of messages stats')
      let users = await global.db.engine.find('users')
      let updated = 0
      for (let user of users) {
        if (_.isNil(user.stats) || _.isNil(user.stats.messages)) continue
        updated++
        await global.db.engine.remove('users', { _id: String(user._id) })
        await global.db.engine.insert('users.messages', { username: user.username, messages: parseInt(user.stats.messages, 10) })
        delete user._id; delete user.stats.messages
        await global.db.engine.insert('users', user)
      }
      console.info(` => ${updated} users`)
    }
  }],
  points: [{
    version: '7.3.0',
    do: async () => {
      console.info('Migration points to %s', '7.3.0')
      let users = await global.db.engine.find('users')
      for (let user of users) {
        if (_.isNil(user.points)) continue
        await global.db.engine.remove('users', { _id: user._id.toString() })
        await global.db.engine.insert('users.points', { username: user.username, points: parseInt(user.points, 10) })

        delete user._id; delete user.points
        await global.db.engine.insert('users', user)
      }
    }
  }],
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
        await global.db.engine.remove('users', { username: user.username })
        await global.db.engine.insert('users.bits', { username: user.username, amount: user.stats.bits, message: 'Migrated from 6.x', timestamp: _.now() })
        delete user.stats.bits
        delete user._id
        await global.db.engine.update('users', { username: user.username }, user)
      }
    }
  }]
}
