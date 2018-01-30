const _ = require('lodash')
const figlet = require('figlet')
const config = require('../config.json')
const crypto = require('crypto')
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
  cache: [{
    version: '6.0.0',
    do: async () => {
      console.info('Migration cache to %s', '6.0.0')
      let cache = await global.db.engine.findOne('cache')
      if (_.isEmpty(cache)) return

      let when = {
        offline: null,
        online: null,
        upsert: true
      }
      let users = {
        followers: _.get(cache, 'followers', []),
        subscribers: _.get(cache, 'subscribers', []),
        upsert: true
      }
      let newCache = {
        games_and_titles: _.get(cache, 'games_and_titles', {}),
        gidToGame: _.get(cache, 'gidToGame', {}),
        upsert: true
      }

      await global.db.engine.remove('cache', {_id: _.get(cache, '_id', '').toString()})
      await global.db.engine.insert('cache', newCache)
      await global.db.engine.insert('cache.when', when)
      await global.db.engine.insert('cache.users', users)
    }
  }],
  events: [{
    version: '6.0.0',
    do: async () => {
      console.info('Migration events to %s', '6.0.0')
      let events = await global.db.engine.find('events')

      for (let event of events) {
        event.value = event.value || '{}'
        const operations = _.isArray(event.value) ? event.value : JSON.parse(event.value)
        if (_.isNil(event.definitions)) await global.db.engine.remove('events', { _id: event._id.toString() })
        if (_.size(operations) === 0) continue

        let definitions = _.find(operations[0], (o) => o.definition)
        let updatedDefinitions = {}
        if (!_.isNil(definitions)) {
          if (!_.isNil(definitions.command)) {
            updatedDefinitions.commandToWatch = definitions.command
          }

          if (_.isNil(definitions.command) && !_.isNil(definitions.tCount) && event.key === 'stream-is-running-x-minutes') {
            updatedDefinitions.runAfterXMinutes = definitions.tCount
          } else if (_.isNil(definitions.command) && !_.isNil(definitions.tCount) && event.key === 'every-x-seconds') {
            updatedDefinitions.runEveryXMinutes = definitions.tCount
          } else if (!_.isNil(definitions.tCount)) {
            updatedDefinitions.runEveryXCommands = definitions.tCount
          }

          if (!_.isNil(definitions.tTimestamp)) {
            updatedDefinitions.runInterval = definitions.tTimestamp
          }
          if (!_.isNil(definitions.viewers)) {
            updatedDefinitions.viewersAtLeast = definitions.viewers
          }
        } else updatedDefinitions = {}

        if (event.key === 'every-x-seconds') event.key = 'every-x-minutes-of-stream'

        const eventId = (await global.db.engine.insert('events', {
          name: 'events#' + crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5),
          key: event.key,
          definitions: updatedDefinitions,
          triggered: {},
          enabled: true
        }))._id.toString()

        await global.db.engine.insert('events.filters', {
          eventId: eventId,
          filters: ''
        })

        for (let operation of operations) {
          operation = operation[0]
          if (!_.isNil(operation.definition)) continue

          if (operation.name === 'run-command') {
            await global.db.engine.insert('events.operations', {
              eventId: eventId,
              key: operation.name,
              definitions: {
                commandToRun: operation.command,
                isCommandQuiet: operation.quiet
              }
            })
          }

          if (operation.name === 'emote-explosion') {
            await global.db.engine.insert('events.operations', {
              eventId: eventId,
              key: operation.name,
              definitions: {
                emotesToExplode: operation.emotes
              }
            })
          }

          if (operation.name === 'send-chat-message' || operation.name === 'send-whisper') {
            await global.db.engine.insert('events.operations', {
              eventId: eventId,
              key: operation.name,
              definitions: {
                messageToSend: operation.send
              }
            })
          }

          if (operation.name === 'play-sound') {
            await global.db.engine.insert('events.operations', {
              eventId: eventId,
              key: operation.name,
              definitions: {
                urlOfSoundFile: operation.sound
              }
            })
          }

          if (operation.name === 'start-commercial') {
            await global.db.engine.insert('events.operations', {
              eventId: eventId,
              key: operation.name,
              definitions: {
                durationOfCommercial: operation.duration
              }
            })
          }
        }
      }
    }
  }]
}
