const _ = require('lodash')
const figlet = require('figlet')
const crypto = require('crypto')

// db
const Database = require('../libs/databases/database')
global.db = new Database();

(async () => {
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
})()

let updates = async (from, to) => {
  console.info('Performing update from %s to %s', from, to)
  console.info(('-').repeat(56))

  let migrate = []

  for (let table of _.values(migration)) {
    for (let i of table) {
      if (parseInt(i.version.replace(/\./g, ''), 10) >= parseInt(from.replace(/\./g, ''), 10) &&
          parseInt(i.version.replace(/\./g, ''), 10) <= parseInt(to.replace(/\./g, ''), 10)) {
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
        const operations = JSON.parse(event.value)
        if (_.isNil(event.definitions)) await global.db.engine.remove('events', { _id: event._id.toString() })
        if (_.size(operations) === 0) continue

        const eventId = (await global.db.engine.insert('events', {
          name: 'events#' + crypto.createHash('md5').update(new Date().getTime().toString()).digest('hex').slice(0, 5),
          key: event.key,
          definitions: {},
          triggered: {}
        }))._id.toString()

        console.log(operations)
      }
      //{"key":"hosted","_id":"EvhtlWOJ9b0EDX9M","value":"[[{\"name\":\"run-command\",\"duration\":\"30\",\"command\":\"!alert type=text position=left class=follow text='Nový host' y-offset=-50 x-offset=-7 time=13500 | type=text position=left class=name text='$username - $viewers' y-offset=-50 x-offset=-30 time=11500 delay=2000 | type=audio url=http://sogebot.sogehige.tv/dist/gallery/7422e0116e.mp3 volume=20\",\"quiet\":false}]]"}
    }
  }]
}
