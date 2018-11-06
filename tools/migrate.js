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
  'playlist', 'songrequest', 'ranks', 'prices',
  'commands', 'keywords', 'cooldowns', 'alias',
  'cooldowns.viewers', 'raffles', 'raffle_participants',
  'timers', 'timers.responses', 'moderation.message.cooldown',
  'moderation.permit', 'moderation.warnings', 'songbanned',
  'songrequests', 'system.alias', 'system.alias.settings',
  'system.bets', 'system.bets.settings', 'system.bets.users',
  'system.commercial.settings', 'system.cooldown', 'system.cooldown.settings',
  'users_ignorelist', 'overlay.credits.socials', 'overlay.credits.customTexts',
  'overlay.carousel', 'bannedsong', 'highlights', 'notices'
]

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
    version: '8.1.0',
    do: async () => {
      console.info('Updating overlays credits settings')

      console.info(' => customTexts')
      let customTexts =
        (await global.db.engine.find('overlay.credits.customTexts'))
          .map(o => {
            o.left = o.text.left
            o.middle = o.text.middle
            o.right = o.text.right
            delete o._id
            return o
          })
      await global.db.engine.update('overlays.credits.settings', { key: 'customTexts.values' }, { key: 'customTexts.values', value: customTexts })

      console.info(' => socials')
      let socials =
        (await global.db.engine.find('overlay.credits.socials'))
          .map(o => {
            delete o._id; return o
          })
      await global.db.engine.update('overlays.credits.settings', { key: 'social.values' }, { key: 'social.values', value: socials })
      console.info(' => DONE')
    }
  }, {
    version: '8.1.0',
    do: async () => {
      let processed = 0

      const mappings = {
        'creditsAggregate': null,
        'creditsHosts': 'overlays.credits.settings.show.hosts',
        'creditsRaids': 'overlays.credits.settings.show.raids',
        'creditsSubscribers': 'overlays.credits.settings.show.subscribers',
        'creditsSubgifts': 'overlays.credits.settings.show.subgifts',
        'creditsSubcommunitygifts': 'overlays.credits.settings.show.subcommunitygifts',
        'creditsResubs': 'overlays.credits.settings.show.resubs',
        'creditsCheers': 'overlays.credits.settings.show.cheers',
        'creditsClips': 'overlays.credits.settings.show.clips',
        'creditsTips': 'overlays.credits.settings.show.tips',
        'creditsSpeed': null,
        'creditsMaxFontSize': null,
        'creditsLastMessage': 'overlays.credits.settings.text.lastMessage',
        'creditsLastSubMessage': 'overlays.credits.settings.text.lastSubMessage',
        'creditsStreamBy': 'overlays.credits.settings.text.streamBy',
        'creditsFollowedBy': 'overlays.credits.settings.text.follow',
        'creditsHostedBy': 'overlays.credits.settings.text.host',
        'creditsRaidedBy': 'overlays.credits.settings.text.raid',
        'creditsCheerBy': 'overlays.credits.settings.text.cheer',
        'creditsSubscribedBy': 'overlays.credits.settings.text.sub',
        'creditsResubscribedBy': 'overlays.credits.settings.text.resub',
        'creditsSubgiftBy': 'overlays.credits.settings.text.subgift',
        'creditsSubcommunitygiftBy': 'overlays.credits.settings.text.subcommunitygift',
        'creditsClippedBy': null,
        'creditsTipsBy': 'overlays.credits.settings.text.tip',
        'creditsTopClipsPeriod': null,
        'creditsTopClipsPlay': 'overlays.credits.settings.clips.shouldPlay',
        'creditsTopClipsCount': 'overlays.credits.settings.clips.numOfClips',

        'OEmotesSize': null,
        'OEmotesMax': 'overlays.emotes.settings.emotes.maxEmotesPerMessage',
        'OEmotesAnimation': 'overlays.emotes.settings.emotes.animation',
        'OEmotesAnimationTime': 'overlays.emotes.settings.emotes.animationTime'
      }

      console.info('Updating overlays settings')
      console.info(' -> entries')
      for (let [o, n] of Object.entries(mappings)) {
        if (n !== null) {
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
          }
          await global.db.engine.remove('settings', { key: o })
        }
      }
      console.info(` => ${processed} processed`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      let processed = 0
      console.info('Moving gallery files to db')
      for (let fname of fs.readdirSync('public/dist/gallery')) {
        let data = Buffer.from(fs.readFileSync('public/dist/gallery/' + fname)).toString('base64')
        let type = null

        if (fname.endsWith('ogg')) type = 'audio/ogg'
        if (fname.endsWith('mp3')) type = 'audio/mp3'
        if (fname.endsWith('mp4')) type = 'video/mp4'
        if (fname.endsWith('jpg')) type = 'image/jpg'
        if (fname.endsWith('png')) type = 'image/png'
        if (fname.endsWith('gif')) type = 'image/gif'

        if (type) {
          data = 'data:' + type + ';base64,' + data
          await global.db.engine.insert('overlays.gallery', { type, data })
        }

        fs.unlinkSync('public/dist/gallery/' + fname)
        processed++
      }
      console.info(` => ${processed} processed`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      let processed = 0
      console.info('Updating settings db format')
      if (config.database.type === 'nedb') {
        for (let f of fs.readdirSync('db/nedb')) {
          if (f.includes('.settings.db')) {
            const collection = f.slice(0, -3)
            const items = await global.db.engine.find(collection)

            let arrays = {}
            for (let i = 0, length = items.length; i < length; i++) {
              const _id = String(items[i]._id)
              const value = items[i].value
              const isArray = items[i].isMultiValue || false
              const key = [items[i].category, items[i].key].filter(o => typeof o === 'string').join('.')

              if (key.startsWith('_')) {
                // remove underscore keys / this may cause some compatibility issues between versions
                await global.db.engine.remove(collection, { _id })
              } else if (!isArray) {
                // simple remove -> insert
                processed++
                await global.db.engine.remove(collection, { _id })
                await global.db.engine.insert(collection, { key, value })
              } else {
                if (!arrays[key]) arrays[key] = []
                arrays[key].push(value)
                await global.db.engine.remove(collection, { _id })
              }
            }

            for (let [key, value] of Object.entries(arrays)) {
              processed++
              await global.db.engine.insert(collection, { key, value })
            }
          }
        }
      } else if (config.database.type === 'mongodb') {
        for (let collection of (await global.db.engine.collections())) {
          if (collection.includes('.settings')) {
            const items = await global.db.engine.find(collection)

            let arrays = {}
            for (let i = 0, length = items.length; i < length; i++) {
              const _id = String(items[i]._id)
              const value = items[i].value
              const isArray = items[i].isMultiValue || false
              const key = [items[i].category, items[i].key].filter(o => typeof o === 'string').join('.')

              if (key.startsWith('_')) {
                // remove underscore keys / this may cause some compatibility issues between versions
                await global.db.engine.remove(collection, { _id })
              } else if (!isArray) {
                // simple remove -> insert
                processed++
                await global.db.engine.remove(collection, { _id })
                await global.db.engine.insert(collection, { key, value })
              } else {
                if (!arrays[key]) arrays[key] = []
                arrays[key].push(value)
                await global.db.engine.remove(collection, { _id })
              }
            }

            for (let [key, value] of Object.entries(arrays)) {
              processed++
              await global.db.engine.insert(collection, { key, value })
            }
          }
        }
      }
      console.info(` => ${processed} processed`)
    }
  },
  {
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
  customvariables: [{
    version: '8.0.0',
    do: async () => {
      console.info('Add responseType to custom.variables')
      let items = await global.db.engine.find('custom.variables')
      let processed = 0
      for (let item of items) {
        const _id = item._id; delete item._id
        if (typeof item.responseType === 'undefined') item.responseType = 0
        await global.db.engine.update('custom.variables', { _id }, item)
        processed++
      }
      console.info(` => ${processed} processed`)
    }
  }],
  customcommands: [{
    version: '8.1.0',
    do: async () => {
      console.info('Moving responses to systems.customcommands.responses')
      let processed = 0
      let responses = {}
      for (let item of await global.db.engine.find('systems.customcommands')) {
        if (item.response) {
          if (typeof responses[item.command] === 'undefined') responses[item.command] = 0
          else responses[item.command]++

          const order = responses[item.command]
          const response = item.response
          const permission = item.permission
          const stopIfExecuted = false

          await global.db.engine.remove('systems.customcommands', { _id: String(item._id) })
          delete item.response; delete item._id; delete item.permission
          item = await global.db.engine.insert('systems.customcommands', item)
          await global.db.engine.insert('systems.customcommands.responses', { cid: String(item._id), response, order, permission, stopIfExecuted })
          processed++
        }
      }
      console.info(` => ${processed} processed`)
    }
  }, {
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
    version: '8.1.0',
    do: async () => {
      let processed = 0
      console.info('Moving ignorelist to user settings')
      let users = await global.db.engine.find('users_ignorelist')
      if (!_.isEmpty(users)) {
        users = users.map(o => o.username)
        processed = users.length
        await global.db.engine.update('core.users.settings', { key: 'users.ignorelist' }, { key: 'users.ignorelist', value: users })
      }
      console.info(` => ${processed} items moved to settings`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      console.info('Translating points from username to id')
      let points = await global.db.engine.find('users.points')
      let updated = 0
      for (let p of points) {
        if (p.username) {
          let user = await global.db.engine.findOne('users', { username: p.username })
          await global.db.engine.remove('users.points', { username: p.username })
          delete p.username; delete p._id
          if (user.id) {
            p.id = user.id
            await global.db.engine.insert('users.points', p)
          }
          updated++
        }
      }
      console.info(` => ${updated} items moved to ids key`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      console.info('Translating tips from username to id')
      let points = await global.db.engine.find('users.tips')
      let updated = 0
      for (let p of points) {
        if (p.username) {
          let user = await global.db.engine.findOne('users', { username: p.username })
          await global.db.engine.remove('users.tips', { username: p.username })
          delete p.username; delete p._id
          if (user.id) {
            p.id = user.id
            await global.db.engine.insert('users.tips', p)
          }
          updated++
        }
      }
      console.info(` => ${updated} items moved to ids key`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      console.info('Translating bits from username to id')
      let points = await global.db.engine.find('users.bits')
      let updated = 0
      for (let p of points) {
        if (p.username) {
          let user = await global.db.engine.findOne('users', { username: p.username })
          await global.db.engine.remove('users.bits', { username: p.username })
          delete p.username; delete p._id
          if (user.id) {
            p.id = user.id
            await global.db.engine.insert('users.bits', p)
          }
          updated++
        }
      }
      console.info(` => ${updated} items moved to ids key`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      console.info('Translating messages from username to id')
      let points = await global.db.engine.find('users.messages')
      let updated = 0
      for (let p of points) {
        if (p.username) {
          let user = await global.db.engine.findOne('users', { username: p.username })
          await global.db.engine.remove('users.messages', { username: p.username })
          delete p.username; delete p._id
          if (user.id) {
            p.id = user.id
            await global.db.engine.insert('users.messages', p)
          }
          updated++
        }
      }
      console.info(` => ${updated} items moved to ids key`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      console.info('Translating watched from username to id')
      let points = await global.db.engine.find('users.watched')
      let updated = 0
      for (let p of points) {
        if (p.username) {
          let user = await global.db.engine.findOne('users', { username: p.username })
          await global.db.engine.remove('users.watched', { username: p.username })
          delete p.username; delete p._id
          if (user.id) {
            p.id = user.id
            await global.db.engine.insert('users.watched', p)
          }
          updated++
        }
      }
      console.info(` => ${updated} items moved to ids key`)
    }
  }, {
    version: '8.1.0',
    do: async () => {
      console.info('Merging users with same id')
      let users = await global.db.engine.find('users')
      let updated = 0
      let removed = 0
      let alreadyMergedIds = []
      for (let user of users) {
        if (!user.id) {
          await global.db.engine.remove('users', { _id: String(user._id) })
          removed++
        } else {
          let data = {
            id: user.id,
            is: {
              mod: false,
              regular: false,
              subscriber: false,
              follower: false
            },
            time: {}
          }
          let toMerge = users.filter(o => String(o.id) === String(user.id))
          if (toMerge.length > 1 && !alreadyMergedIds.includes(user.id)) {
            updated++
            alreadyMergedIds.push(user.id)
            // get possible latest username
            let followCheck = 0
            for (let u of toMerge) {
              if (!data.username) data.username = u.username
              if (typeof u.time !== 'undefined' && new Date(followCheck).getTime() < new Date(u.time.followCheck).getTime()) {
                data.username = u.username
                followCheck = new Date(u.time.followCheck).getTime()
              }
              await global.db.engine.remove('users', { _id: String(u._id) })

              if (typeof u.is !== 'undefined') {
                if (u.is.mod) data.is.mod = true
                if (u.is.regular) data.is.regular = true
                if (u.is.subscriber) data.is.subscriber = true
                if (u.is.follower) data.is.follower = true
              }

              if (typeof u.time !== 'undefined') {
                if (u.time.created_at) data.time.created_at = u.time.created_at
                if (u.time.subscribed_at) data.time.subscribed_at = u.time.subscribed_at
                if (u.time.follow) data.time.follow = u.time.follow
                if (u.time.message && data.time.message < u.time.message) data.time.message = u.time.message
              }
            }
            await global.db.engine.insert('users', data)
          }
        }
      }
      console.info(` => ${updated} merged users`)
      console.info(` => ${removed} removed users without id`)
    }
  }, {
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
