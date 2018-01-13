const _ = require('lodash')
const figlet = require('figlet')

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
    version: '5.12.0',
    do: async () => {
      console.info('Migration cache to %s', '5.12.0')
      let cache = await global.db.engine.findOne('cache')

      if (!_.isNil(cache.cachedGamesTitles)) {
        let when = {
          offline: null,
          online: null,
          upsert: true
        }
        let users = {
          followers: cache.followers,
          subscribers: cache.subscribers,
          upsert: true
        }
        let newCache = {
          games_and_titles: cache.cachedGamesTitles,
          upsert: true
        }

        await global.db.engine.remove('cache', {_id: cache._id.toString()})
        await global.db.engine.insert('cache', newCache)
        await global.db.engine.insert('cache.when', when)
        await global.db.engine.insert('cache.users', users)
      }
    }
  }]
}
