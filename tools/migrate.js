require('module-alias/register')

const _ = require('lodash')
const figlet = require('figlet')
const config = require('../config.json')
const compareVersions = require('compare-versions')
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

if (process.argv[2] && process.argv[2] === '--delete') {
  runDeletion()
} else runMigration()

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
    version: '9.0.0',
    do: async () => {
      let processed = 0

      console.info('Redoing event ids to uuid/v4')
      const mappings = {};
      const events = await global.db.engine.find('events');
      for (const e of events) {
        const id = uuidv4();
        mappings[String(e._id)] = id;
        await global.db.engine.update('events', { _id: String(e._id) }, { id })
        processed++;
        console.info(` -> event ${String(e._id)} => ${id}`)
      }

      const ops = await global.db.engine.find('events.operations');
      for (const o of ops) {
        if (!mappings[String(o.eventId)]) {
          await global.db.engine.remove('events.operations', { _id: String(o._id) })
          console.info(` -> operation ${String(o._id)} removed`)
        } else {
          await global.db.engine.update('events.operations', { _id: String(ops._id) }, { eventId: mappings[String(o.eventId)] })
          console.info(` -> operation ${String(o.eventId)} => ${mappings[String(o.eventId)]}`)
        }
        processed++;
      }

      const filters = await global.db.engine.find('events.filters');
      for (const f of filters) {
        if (!mappings[String(f.eventId)]) {
          await global.db.engine.remove('events.filters', { _id: String(f._id) })
          console.info(` -> filter ${String(f._id)} removed`)
        } else {
          await global.db.engine.update('events.filters', { _id: String(f._id) }, { eventId: mappings[String(f.eventId)] })
          console.info(` -> filter ${String(f.eventId)} => ${mappings[String(f.eventId)]}`)
        }
        processed++;
      }
      console.info(` => ${processed} processed`)
    }
  }],
  settings: [{
    version: '9.0.0',
    do: async () => {
      let processed = 0

      console.info('Updating settings | users => tmi')

      const mappings = {
        'users.showWithAt': 'chat.showWithAt',
        'users.ignorelist': 'chat.ignorelist',
      }

      for (let [before, after] of Object.entries(mappings)) {
        let item = await global.db.engine.findOne('core.settings', { key: before, system: 'users' })
        if (typeof item.key !== 'undefined') {
          console.info(` -> users.${before} => tmi.${after}`)
          await global.db.engine.update('core.settings', { _id: String(item._id) }, { key: after, system: 'tmi' })
          processed++
        }
      }
      console.info(` => ${processed} processed`)
    }
  },
  {
    version: '9.0.0',
    do: async () => {
      let processed = 0

      console.info('Updating settings | legacy => interface')

      const uiMappings = {
        'theme': 'theme',
        'percentage': 'percentage',
        'shortennumbers': 'shortennumbers',
        'stickystats': 'stickystats',
        'showdiff': 'showWithAt',
      }

      const generalMappings = {
        'lang': 'lang',
      }

      const tmiMappings = {
        'sendWithMe': 'chat.sendWithMe',
        'disableWhisperListener': 'chat.whisperListener'
      }

      for (let [before, after] of Object.entries(uiMappings)) {
        let item = await global.db.engine.findOne('settings', { key: before })
        if (typeof item.key !== 'undefined') {
          console.info(` -> ${before} => ui.${after}`)
          await global.db.engine.insert('core.settings', { value: item.value, key: after, system: 'ui' })
          processed++
        }
      }

      for (let [before, after] of Object.entries(generalMappings)) {
        let item = await global.db.engine.findOne('settings', { key: before })
        if (typeof item.key !== 'undefined') {
          console.info(` -> ${before} => general.${after}`)
          await global.db.engine.insert('core.settings', { value: item.value, key: after, system: 'general' })
          processed++
        }
      }

      for (let [before, after] of Object.entries(tmiMappings)) {
        let item = await global.db.engine.findOne('settings', { key: before })
        if (typeof item.key !== 'undefined') {
          console.info(` -> ${before} => tmi.${after}`)
          await global.db.engine.insert('core.settings', { value: item.value, key: after, system: 'tmi' })
          processed++
        }
      }
      console.info(` => ${processed} processed`)
    }
  }]
}