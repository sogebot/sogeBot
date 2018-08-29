require('module-alias/register')

const _ = require('lodash')
const figlet = require('figlet')
const config = require('../config.json')
const compareVersions = require('compare-versions')
const XRegExp = require('xregexp')
const fs = require('fs')

// logger
const Logger = require('../dest/logging')
global.logger = new Logger()

const dropFiles = [
  'playlist.db', 'songrequest.db', 'ranks.db', 'prices.db',
  'commands.db', 'keywords.db', 'cooldowns.db', 'alias.db',
  'cooldowns.viewers.db', 'raffles.db', 'raffle_participants.db',
  'timers.db', 'timers.responses.db', 'moderation.message.cooldown.db',
  'moderation.permit.db', 'moderation.warnings.db', 'songbanned.db',
  'songrequests.db', 'system.alias.db', 'system.alias.settings.db',
  'system.bets.db', 'system.bets.settings.db', 'system.bets.users.db',
  'system.commercial.settings.db', 'system.cooldown.db', 'system.cooldown.settings.db'
]

if (process.argv[2] && process.argv[2] === '--delete') {
  console.info(('-').repeat(56))
  console.info('Removing nedb files')

  if (fs.existsSync('db/nedb/')) {
    for (let file of dropFiles) {
      if (fs.existsSync(`db/nedb/${file}`)) {
        console.info(`- Removing db/nedb/${file}`)
        fs.unlinkSync(`db/nedb/${file}`)
      }
    }
  } else {
    console.info('Nothing to do')
  }
  console.info(('-').repeat(56))
  process.exit()
}

// db
const Database = require('../dest/databases/database')
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
  permission: [{
    version: '8.0.0',
    do: async () => {
      console.log('Updating permissions')
      let processed = 0
      const permissions = await global.db.engine.find('permissions')
      for (let p of permissions) {
        if (!_.isNil(p.key) && !p.key.startsWith('!')) {
          await global.global.db.engine.update('permissions', { _id: String(p._id) }, { key: `!${p.key}` })
          processed++
        }
      }

      console.info(` => ${processed} processed`)
    }
  }],
  settings: [{
    version: '8.0.0',
    do: async () => {
      let processed = 0

      const mappings = {
        'betPercentGain': 'systems.bets.settings.betPercentGain',

        'disableCooldownWhispers': 'systems.cooldown.settings.cooldownNotifyAsWhisper',

        'moderationLinks': 'systems.moderation.settings.links.enabled',
        'moderationLinksWithSpaces': 'systems.moderation.settings.links.includeSpaces',
        'moderationLinksSubs': 'systems.moderation.settings.links.moderateSubscribers',
        'moderationLinksClips': 'systems.moderation.settings.links.includeClips',
        'moderationLinksTimeout': 'systems.moderation.settings.links.timeout',

        'moderationSymbols': 'systems.moderation.settings.symbols.enabled',
        'moderationSymbolsSubs': 'systems.moderation.settings.symbols.moderateSubscribers',
        'moderationSymbolsTimeout': 'systems.moderation.settings.symbols.timeout',
        'moderationSymbolsTriggerLength': 'systems.moderation.settings.symbols.triggerLength',
        'moderationSymbolsMaxConsecutively': 'systems.moderation.settings.symbols.maxSymbolsConsecutively',
        'moderationSymbolsMaxPercent': 'systems.moderation.settings.symbols.maxSymbolsPercent',

        'moderationLongMessage': 'systems.moderation.settings.longMessage.enabled',
        'moderationLongMessageSubs': 'systems.moderation.settings.longMessage.moderateSubscribers',
        'moderationLongMessageTimeout': 'systems.moderation.settings.longMessage.timeout',
        'moderationLongMessageTriggerLength': 'systems.moderation.settings.longMessage.triggerLength',

        'moderationSpam': 'systems.moderation.settings.spam.enabled',
        'moderationSpamSubs': 'systems.moderation.settings.spam.moderateSubscribers',
        'moderationSpamTimeout': 'systems.moderation.settings.spam.timeout',
        'moderationSpamTriggerLength': 'systems.moderation.settings.spam.triggerLength',
        'moderationSpamMaxLength': 'systems.moderation.settings.spam.maxLength',

        'moderationCaps': 'systems.moderation.settings.caps.enabled',
        'moderationCapsSubs': 'systems.moderation.settings.caps.moderateSubscribers',
        'moderationCapsTimeout': 'systems.moderation.settings.caps.timeout',
        'moderationCapsTriggerLength': 'systems.moderation.settings.caps.triggerLength',
        'moderationCapsMaxPercent': 'systems.moderation.settings.caps.maxCapsPercent',

        'moderationColor': 'systems.moderation.settings.color.enabled',
        'moderationColorSubs': 'systems.moderation.settings.color.moderateSubscribers',
        'moderationColorTimeout': 'systems.moderation.settings.color.timeout',

        'moderationEmotes': 'systems.moderation.settings.emotes.enabled',
        'moderationEmotesSubs': 'systems.moderation.settings.emotes.moderateSubscribers',
        'moderationEmotesTimeout': 'systems.moderation.settings.emotes.timeout',
        'moderationEmotesMaxCount': 'systems.moderation.settings.emotes.maxCount',

        'moderationWarnings': 'systems.moderation.settings.warnings.warningCount',
        'moderationAnnounceTimeouts': 'systems.moderation.settings.warnings.announce',
        'moderationWarningsTimeouts': 'systems.moderation.settings.warnings.shouldClearChat',

        'pointsName': 'systems.points.settings.points.name',
        'pointsInterval': 'systems.points.settings.points.interval',
        'pointsPerInterval': 'systems.points.settings.points.perInterval',
        'pointsIntervalOffline': 'systems.points.settings.points.offlineInterval',
        'pointsPerIntervalOffline': 'systems.points.settings.points.perOfflineInterval',
        'pointsMessageInterval': 'systems.points.settings.points.messageInterval',
        'pointsPerMessageInterval': 'systems.points.settings.points.perMessageInterval'
      }

      console.info('Updating settings')
      console.info(' -> entries')
      for (let [o, n] of Object.entries(mappings)) {
        let item = await global.db.engine.findOne('settings', { key: o })
        if (!_.isEmpty(item)) {
          let regexp = XRegExp(`
            (?<collection> [a-zA-Z]*.[a-zA-Z]*.settings)
            .
            (?<category> [a-zA-Z]*)
            ?.
            ?(?<key> [a-zA-Z]*)`, 'ix')
          const match = XRegExp.exec(n, regexp)
          if (match.key.trim().length === 0) match.key = undefined
          if (!_.isNil(item.value)) {
            await global.db.engine.insert(match.collection, { category: match.category, key: match.key, isMultiValue: false, value: item.value })
            processed++
          } else {
            console.warn(`Settings ${match.category} ${match.key} is missing value`)
          }
          await global.db.engine.remove('settings', { key: o })
        }
      }

      let blacklist = _.get(await global.db.engine.findOne('settings', { key: 'blacklist' }), 'value', [])
      let whitelist = _.get(await global.db.engine.findOne('settings', { key: 'whitelist' }), 'value', [])

      console.info(' -> blacklist')
      for (let list of blacklist) {
        await global.db.engine.insert('systems.moderation.settings', { category: 'list', key: 'blacklist', isMultiValue: true, value: list })
        processed++
      }

      console.info(' -> whitelist')
      for (let list of whitelist) {
        await global.db.engine.insert('systems.moderation.settings', { category: 'list', key: 'whitelist', isMultiValue: true, value: list })
        processed++
      }

      console.info(` => ${processed} processed`)
    }
  }],
  events: [{
    version: '8.0.0',
    do: async () => {
      console.info('Updating keyword-send-x-times events with resetCountEachMessage')
      let items = await global.db.engine.find('events', { key: 'keyword-send-x-times' })
      let processed = 0
      for (let i of items) {
        if (typeof i.definitions.resetCountEachMessage === 'undefined' || i.definitions.resetCountEachMessage === null) {
          i.definitions.resetCountEachMessage = false
          const _id = i._id; delete i._id
          await global.db.engine.update('events', { _id: String(_id) }, i)
          processed++
        }
      }
      console.info(` => ${processed} processed`)
    }
  }],
  timers: [{
    version: '8.0.0',
    do: async () => {
      console.info('Moving timers to systems.timers')
      let items = await global.db.engine.find('timers')
      let processed = 0
      for (let item of items) {
        let newItem = await global.db.engine.insert('systems.timers', item)
        let responses = await global.db.engine.find('timers.responses', { timerId: String(item._id) })
        for (let response of responses) {
          response.timerId = String(newItem._id)
          await global.db.engine.insert('systems.timers.responses', response)
          processed++
        }
        processed++
      }
      await global.db.engine.remove('timers', {})
      await global.db.engine.remove('timers.responses', {})
      console.info(` => ${processed} processed`)
      console.info(` !! timers collection can be deleted`)
      console.info(` !! timers.responses collection can be deleted`)
    }
  }],
  songs: [{
    version: '8.0.0',
    do: async () => {
      console.info('Moving playlist to systems.songs.playlist')
      let items = await global.db.engine.find('playlist')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.songs.playlist', item)
        processed++
      }
      await global.db.engine.remove('playlist', {})
      console.info(` => ${processed} processed`)
      console.info(` !! playlist collection can be deleted`)
    }
  },
  {
    version: '8.0.0',
    do: async () => {
      console.info('Moving bannedsong to systems.songs.ban')
      let items = await global.db.engine.find('bannedsong')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.songs.ban', item)
        processed++
      }
      await global.db.engine.remove('bannedsong', {})
      console.info(` => ${processed} processed`)
      console.info(` !! bannedsong collection can be deleted`)
    }
  },
  {
    version: '8.0.0',
    do: async () => {
      console.info('Moving songrequest to systems.songs.request')
      let items = await global.db.engine.find('songrequest')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.songs.request', item)
        processed++
      }
      await global.db.engine.remove('songrequest', {})
      console.info(` => ${processed} processed`)
      console.info(` !! songrequest collection can be deleted`)
    }
  }],
  ranks: [{
    version: '8.0.0',
    do: async () => {
      console.info('Moving ranks from ranks to systems.ranks')
      let items = await global.db.engine.find('ranks')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.ranks', item)
        processed++
      }
      await global.db.engine.remove('ranks', {})
      console.info(` => ${processed} processed`)
      console.info(` !! ranks collection can be deleted`)
    }
  }],
  prices: [{
    version: '8.0.0',
    do: async () => {
      console.info('Moving prices from prices to systems.price')
      let items = await global.db.engine.find('prices')
      let processed = 0
      for (let item of items) {
        delete item._id
        item.command = `!${item.command}`
        await global.db.engine.insert('systems.price', item)
        processed++
      }
      await global.db.engine.remove('prices', {})
      console.info(` => ${processed} processed`)
      console.info(` !! prices collection can be deleted`)
    }
  }],
  moderation: [{
    version: '8.0.0',
    do: async () => {
      console.info('Moving blacklist and whitelist from settings to systems.moderation.settings')
      let processed = 0
      for (let list of ['whitelist', 'blacklist']) {
        let item = await global.db.engine.findOne('settings', { key: list })
        if (!_.isEmpty(item)) {
          for (let word of item.value) {
            await global.db.engine.insert('systems.moderation.settings', { category: 'lists', key: list, value: word, isMultiValue: true })
            processed++
          }
        }
        await global.db.engine.remove('settings', { key: list })
      }
      console.info(` => ${processed} processed`)
    }
  }],
  keywords: [{
    version: '8.0.0',
    do: async () => {
      console.info('Moving keywords to systems.keywords')
      let items = await global.db.engine.find('keywords')
      let processed = 0
      for (let item of items) {
        delete item._id
        await global.db.engine.insert('systems.keywords', item)
        processed++
      }
      await global.db.engine.remove('keywords', {})
      console.info(` => ${processed} processed`)
      console.info(` !! keywords collection can be deleted`)
    }
  }],
  customcommands: [{
    version: '8.0.0',
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
    version: '8.0.0',
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
      console.info(` !! cooldowns collections can be deleted`)
    }
  }],
  alias: [{
    version: '8.0.0',
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
  widgets: [{
    version: '8.0.0',
    do: async () => {
      console.info('Removing joinpart widget')
      let items = await global.db.engine.find('widgets', { id: 'joinpart' })
      await global.db.engine.remove('widgets', { id: 'joinpart' })
      let processed = items.length
      console.info(` => ${processed} deleted joinpart widgets`)
    }
  }],
  users: [{
    version: '8.0.0',
    do: async () => {
      console.info('Migration of watched stats')
      let users = await global.db.engine.find('users')
      let updated = 0
      for (let user of users) {
        if (_.isNil(user.time) || _.isNil(user.time.watched)) continue
        updated++
        await global.db.engine.remove('users', { _id: String(user._id) })
        await global.db.engine.insert('users.watched', { username: user.username, watched: parseInt(user.time.watched, 10) })
        delete user._id; delete user.time.watched
        await global.db.engine.insert('users', user)
      }
      console.info(` => ${updated} users`)
    }
  }]
}
