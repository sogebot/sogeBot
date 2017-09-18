const _ = require('lodash')
const figlet = require('figlet')

// db
const OldDatabase = require('nedb-promise')
const Database = require('../libs/databases/database')
global.db = new Database();

(async () => {
  let info = await global.db.engine.find('info')

  let dbVersion = _.isEmpty(info) || _.isNil(_.find(info, (o) => !_.isNil(o.version)).version)
    ? '0.0.0'
    : _.find(info, (o) => !_.isNil(o.version)).version

  if (process.env.npm_package_version === dbVersion) {
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
  console.info(('-').repeat(56))

  await updates(dbVersion, process.env.npm_package_version)

  console.info(('-').repeat(56))
  console.info('All process DONE! Database is upgraded to %s', process.env.npm_package_version)
  if (dbVersion !== '0.0.0') await global.db.engine.update('info', { version: dbVersion }, { version: process.env.npm_package_version })
  else await global.db.engine.insert('info', { version: process.env.npm_package_version })
  process.exit()
})()

let updates = async (from, to) => {
  console.info('Performing update from %s to %s', from, to)
  console.info(('-').repeat(56))

  let migrate = []

  for (let table of _.values(migration)) {
    for (let i of table) {
      if (parseInt(i.version.replace(/\./g, ''), 10) > parseInt(from.replace(/\./g, ''), 10) &&
          parseInt(i.version.replace(/\./g, ''), 10) <= parseInt(to.replace(/\./g, ''), 10)) {
        migrate.push(i)
      }
    }
  }
  for (let i of _.orderBy(migrate, 'version', 'asc')) { await i.do() }
}

// TODO: change versions to 5.8.0

let migration = {
  users: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration users to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let users = await db.findOne({ _id: 'users' })
      if (_.isNil(users) || _.size(users.users) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i users', _.size(users.users))
      for (let user of _.values(users.users)) {
        await global.db.engine.update('users', user, user)
      }
    }
  }],
  notices: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration notices to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'notices' })
      if (_.isNil(items) || _.size(items.notices) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i notices', _.size(items.notices))
      for (let item of _.values(items.notices)) {
        delete item.id
        await global.db.engine.update('notices', item, item)
      }
    }
  }],
  commands: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration notices to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'commands' })
      if (_.isNil(items) || _.size(items.commands) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i commands', _.size(items.commands))
      for (let item of _.values(items.commands)) {
        await global.db.engine.update('commands', item, item)
      }
    }
  }],
  keywords: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration keywords to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'keywords' })
      if (_.isNil(items) || _.size(items.keywords) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i keywords', _.size(items.keywords))
      for (let item of _.values(items.keywords)) {
        await global.db.engine.update('keywords', item, item)
      }
    }
  }],
  prices: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration prices to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'prices' })
      if (_.isNil(items) || _.size(items.prices) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i prices', _.size(items.prices))
      for (let item of _.values(items.prices)) {
        await global.db.engine.update('prices', item, item)
      }
    }
  }],
  playlist: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration playlist to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.find({ type: 'playlist' })
      if (_.isNil(items) || items.length === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i playlist', items.length)
      for (let item of items) {
        delete item.type
        await global.db.engine.insert('playlist', item)
      }
    }
  }],
  bannedsongs: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration banned songs to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.find({ type: 'banned-song' })
      if (_.isNil(items) || items.length === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i banned songs', items.length)
      for (let item of items) {
        item.videoId = item._id

        delete item.type
        delete item._id
        await global.db.engine.insert('bannedsong', item)
      }
    }
  }],
  alias: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration aliases to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'alias' })
      if (_.isNil(items) || _.size(items.alias) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i aliases', _.size(items.alias))
      for (let item of _.values(items.alias)) {
        await global.db.engine.update('alias', item, item)
      }
    }
  }],
  settings: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration settings to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.find({ type: 'settings' })
      if (_.isNil(items) || items.length === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i settings', items.length)
      for (let item of items) {
        delete item.type
        delete item._id
        delete item.quiet

        item = {
          key: Object.keys(item)[0],
          value: item[Object.keys(item)[0]]
        }
        await global.db.engine.insert('settings', item)
      }
    }
  }],
  customVariables: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration custom variables to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'customVariables' })
      if (_.isNil(items) || _.size(items.variables) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i custom variables', _.size(items.variables))
      for (let k of Object.keys(items.variables)) {
        await global.db.engine.insert('customvars', { key: k, value: items.variables[k] })
      }
    }
  }],
  events: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration events to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'Events' })
      if (_.isNil(items) || _.size(items.events) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i events', _.size(items.events))
      for (let k of Object.keys(items.events)) {
        let item = {
          key: k,
          value: []
        }

        _.each(items.events[k], function (event) {
          item.value.push(event[0])
        })
        await global.db.engine.insert('events', item)
      }
    }
  }],
  permissions: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration permissions to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.find({$where: function () { return this._id.startsWith('permission') }})
      if (_.isNil(items) || items.length === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %i permissions', items.length)
      for (let item of items) {
        await global.db.engine.insert('permissions', { key: item.command, permission: item.permission })
      }
    }
  }],
  moderation: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration moderation to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'moderation_lists' })
      if (_.isNil(items)) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating blacklist')
      await global.db.engine.insert('settings', { key: 'blacklist', value: items.blacklist })

      console.info('Migrating whitelist')
      await global.db.engine.insert('settings', { key: 'whitelist', value: items.whitelist })
    }
  }],
  widgets: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration widgets to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'dashboard_widgets' })
      if (_.isNil(items) || items.widgets.length === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %s widgets', items.widgets.length)
      for (let item of items.widgets) {
        await global.db.engine.insert('widgets', { widget: item.split(':')[1], column: item.split(':')[0] })
      }
    }
  }],
  ranks: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration widgets to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.find({$where: function () { return this._id.startsWith('rank') }})
      if (_.isNil(items) || items.length === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %s ranks', items.length)
      for (let item of items) {
        await global.db.engine.insert('ranks', { hours: parseInt(item.hours, 10), value: item.rank })
      }
    }
  }],
  cooldowns: [{
    version: '5.7.2',
    do: async () => {
      console.info('Migration widgets to %s', '5.7.2')
      const db = new OldDatabase({ filename: 'sogeBot.db', autoload: true })
      let items = await db.findOne({ _id: 'cooldowns' })
      if (_.isNil(items) || _.size(items.list) === 0) {
        console.info('Nothing to do ...')
        return
      }

      console.info('Migrating %s cooldowns', _.size(items.list))
      for (let k of Object.keys(items.list)) {
        items.list[k].key = k
        await global.db.engine.insert('cooldowns', items.list[k])
      }
    }
  }]
}
