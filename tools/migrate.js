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
  forceRetype: [
    {
      version: '9.4.0',
      do: async () => {
        let processed = 0;

        console.info('Force type Number(amount)');
        for (const item of await global.db.engine.find('users.bits')) {
          if (typeof item.amount !== 'number') {
            await global.db.engine.update('users.bits', item, { amount: Number(item.amount) })
            processed++;
          }
        }
        for (const item of await global.db.engine.find('users.tips')) {
          if (typeof item.amount !== 'number') {
            await global.db.engine.update('users.tips', item, { amount: Number(item.amount) })
            processed++;
          }
        }
        console.info(` => ${processed} processed`)
      }
    }
  ],
  events: [{
    version: '9.0.0',
    do: async () => {
      let processed = 0

      console.info('Redoing event ids to uuid/v4')
      const mappings = {};
      const events = await global.db.engine.find('events');
      for (const e of events) {
        if (typeof e.id !== 'undefined') {
          console.info(` -> skipping, id found in events`)
          return
        }
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
          await global.db.engine.update('events.operations', { _id: String(o._id) }, { eventId: mappings[String(o.eventId)] })
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
    version: '9.1.0',
    do: async () => {
      let processed = 0;
      console.info('Performing update of settings for 9.1.0');

      const mappings = {
        'core.settings': {
          oauth: {
            'general.channel': 'generalChannel',
            'general.owners': 'generalOwners',

            'broadcaster.accessToken': 'broadcasterAccessToken',
            'broadcaster.refreshToken': 'broadcasterRefreshToken',
            'broadcaster.username': 'broadcasterUsername',
            'broadcaster._authenticatedScopes': 'broadcasterCurrentScopes',

            'bot.accessToken': 'botAccessToken',
            'bot.refreshToken': 'botRefreshToken',
            'bot.username': 'botUsername',
            'bot._authenticatedScopes': 'botCurrentScopes',
          },
          tmi: {
            'chat.ignorelist': 'ignorelist',
            'chat.sendWithMe': 'sendWithMe',
            'chat.showWithAt': 'showWithAt',
            'chat.mute': 'mute',
            'chat.whisperListener': 'whisperListener',
          },
          currency: {
            'currency.mainCurrency': 'mainCurrency',
          }
        },
        'systems.settings': {
          raffles: {
            'luck.subscribersPercent': 'subscribersPercent',
            'luck.followersPercent': 'followersPercent',
          },
          points: {
            'points.name': 'name',
            'points.interval': 'interval',
            'points.perInterval': 'perInterval',
            'points.offlineInterval': 'offlineInterval',
            'points.perOfflineInterval': 'perOfflineInterval',
            'points.messageInterval': 'messageInterval',
            'points.perMessageInterval': 'perMessageInterval',
            'points.messageOfflineInterval': 'messageOfflineInterval',
            'points.perMessageOfflineInterval': 'perMessageOfflineInterval',
          },
          scrim: {
            'time.waitForMatchIdsInSeconds': 'waitForMatchIdsInSeconds',
          },
          polls: {
            'polls.everyXMessages': 'everyXMessages',
            'polls.everyXSeconds': 'everyXSeconds',
          },
          userinfo: {
            'me._order': 'order',
            'me._formatDisabled': '_formatDisabled',
            'me.formatSeparator': 'formatSeparator',
          },
          moderation: {
            'lists.whitelist': 'cListsWhitelist',
            'lists.blacklist': 'cListsBlacklist',
            'lists.moderateSubscribers': 'cListsModerateSubscribers',
            'lists.timeout': 'cListsTimeout',
            'links.enabled': 'cLinksEnabled',
            'links.moderateSubscribers': 'cLinksModerateSubscribers',
            'links.includeSpaces': 'cLinksIncludeSpaces',
            'links.includeClips': 'cLinksIncludeClips',
            'links.timeout': 'cLinksTimeout',
            'symbols.enabled': 'cSymbolsEnabled',
            'symbols.moderateSubscribers': 'cSymbolsModerateSubscribers',
            'symbols.triggerLength': 'cSymbolsTriggerLength',
            'symbols.maxSymbolsConsecutively': 'cSymbolsMaxSymbolsConsecutively',
            'symbols.maxSymbolsPercent': 'cSymbolsMaxSymbolsPercent',
            'symbols.timeout': 'cSymbolsTimeout',
            'longMessage.enabled': 'cLongMessageEnabled',
            'longMessage.moderateSubscribers': 'cLongMessageModerateSubscribers',
            'longMessage.triggerLength': 'cLongMessageTriggerLength',
            'longMessage.timeout': 'cLongMessageTimeout',
            'caps.enabled': 'cCapsEnabled',
            'caps.moderateSubscribers': 'cCapsModerateSubscribers',
            'caps.triggerLenght': 'cCapsTriggerLength',
            'caps.maxCapsPercent': 'cCapsMaxCapsPercent',
            'caps.timeout': 'cCapsTimeout',
            'spam.enabled': 'cSpamEnabled',
            'spam.moderateSubscribers': 'cSpamModerateSubscribers',
            'spam.triggerLength': 'cSpamTriggerLength',
            'spam.maxLength': 'cSpamMaxLength',
            'spam.timeout': 'cSpamTimeout',
            'color.enabled': 'cColorEnabled',
            'color.moderateSubscribers': 'cColorModerateSubscribers',
            'color.timeout': 'cColorTimeout',
            'emotes.enabled': 'cEmotesEnabled',
            'emotes.moderateSubscribers': 'cEmotesModerateSubscribers',
            'emotes.maxCount': 'cEmotesMaxCount',
            'emotes.timeout': 'cEmotesTimeout',
            'warnings.warningCount': 'cWarningsAllowedCount',
            'warnings.announce': 'cWarningsAnnounceTimeouts',
            'warnings.shouldClearChat': 'cWarningsShouldClearChat',
          },
          queue: {
            'eligibility.all': 'eligibilityAll',
            'eligibility.followers': 'eligibilityFollowers',
            'eligibility.subscribers': 'eligibilitySubscribers'
          }
        },
        'overlays.settings': {
          polls: {
            'display.theme': 'cDisplayTheme',
            'display.hideAfterInactivity': 'cDisplayHideAfterInactivity',
            'display.inactivityTime': 'cDisplayInactivityTime',
            'display.align': 'cDisplayAlign',
          },
          clipscarousel: {
            'clips.customPeriodInDays': 'cClipsCustomPeriodInDays',
            'clips.numOfClips': 'cClipsNumOfClips',
            'clips.timeToNextClip': 'cClipsTimeToNextClip',
          },
          clips: {
            'clips.volume': 'cClipsVolume',
            'clips.filter': 'cClipsFilter',
            'clips.label': 'cClipsLabel',
          },
          emotes: {
            'emotes.size': 'cEmotesSize',
            'emotes.maxEmotesPerMessage': 'cEmotesMaxEmotesPerMessage',
            'emotes.animation': 'cEmotesAnimation',
            'emotes.animationTime': 'cEmotesAnimationTime',
            'explosion.numOfEmotes': 'cExplosionNumOfEmotes',
            'fireworks.numOfEmotesPerExplosion': 'cExplosionNumOfEmotesPerExplosion',
            'fireworks.numOfExplosions': 'cExplosionNumOfExplosions',
          },
          credits: {
            'credits.speed': 'cCreditsSpeed',
            'credits.aggregated': 'cCreditsAggregated',
            'show.followers': 'cShowFollowers',
            'show.hosts': 'cShowHosts',
            'show.raids': 'cShowRaids',
            'show.subscribers': 'cShowSubscribers',
            'show.subgifts': 'cShowSubgifts',
            'show.subcommunitygifts': 'cShowSubcommunitygifts',
            'show.resubs': 'cShowResubs',
            'show.cheers': 'cShowCheers',
            'show.clips': 'cShowClips',
            'show.tips': 'cShowTips',
            'text.lastMessage': 'cTextLastMessage',
            'text.lastSubMessage': 'cTextLastSubMessage',
            'text.streamBy': 'cTextStreamBy',
            'text.follow': 'cTextFollow',
            'text.host': 'cTextHost',
            'text.raid': 'cTextRaid',
            'text.cheer': 'cTextCheer',
            'text.sub': 'cTextSub',
            'text.resub': 'cTextResub',
            'text.subgift': 'cTextSubgift',
            'text.subcommunitygift': 'cTextSubcommunitygift',
            'text.tip': 'cTextTip',
            'customTexts.values': 'cCustomTextsValues',
            'social.values': 'cSocialValues',
            'clips.period': 'cClipsPeriod',
            'clips.customPeriodInDays': 'cClipsCustomPeriodInDays',
            'clips.numOfClips': 'cClipsNumOfClips',
            'clips.shouldPlay': 'cClipsShouldPlay',
            'clips.volume': 'cClipsVolume',
          }
        },
        'integrations.settings': {
          spotify: {
            '_.accessToken': '_accessToken',
            '_.refreshToken': '_refreshToken',
            'output.format': 'format',
            'output.playlistToPlay': 'playlistToPlay',
            'output.continueOnPlaylistAfterRequest': 'continueOnPlaylistAfterRequest',
            'connection.clientId': 'clientId',
            'connection.clientSecret': 'clientSecret',
            'connection.redirectURI': 'redirectURI',
            'connection._authenticatedScopes': 'authenticatedScopes',
          },
          twitter: {
            'token.consumerKey': 'consumerKey',
            'token.consumerSecret': 'consumerSecret',
            'token.accessToken': 'accessToken',
            'token.secretToken': 'secretToken',
          }
        }
      };

      for (const collection of Object.keys(mappings)) {
        console.info(`\t*** ${collection}`);
        for (const system of Object.keys(mappings[collection])) {
          for (const [ before, after ] of Object.entries(mappings[collection][system])) {
            let item = await global.db.engine.findOne(collection, { key: before, system })
            if (typeof item.key !== 'undefined') {
              console.info(`\t\t-> ${system}.${before} => ${system}.${after}`)
              await global.db.engine.update(collection, { _id: String(item._id) }, { key: after, system })
              processed++;
            }
          }
        }
      }
      console.info(`\t=> ${processed} processed`);
    }
  }, {
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