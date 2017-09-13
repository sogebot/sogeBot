'use strict'

var _ = require('lodash')
var Database = require('nedb-promise')
var DB = new Database({
  filename: 'sogeBot.db',
  autoload: true
})

var migration = {
  '1.1': {
    description: '1.0 to 1.1',
    process: async function () {
      console.log('-> Renaming settings')
      await settingsRename('volume', 'songs_volume')
      await settingsRename('duration', 'songs_duration')
      await settingsRename('shuffle', 'songs_shuffle')
    }
  },
  '1.3': {
    description: '1.1 to 1.3',
    process: async function () {
      console.log('-> Removing bet templates')
      await removeFromDB('bets_template')
      console.log('-> Alias table update')
      await aliasDbUpdate_1_3()
      console.log('-> Custom Commands update')
      await customCmdsDbUpdate_1_3()
      console.log('-> Keywords update')
      await keywordsDbUpdate_1_3()
      console.log('-> Users update')
      await usersDbUpdate_1_3()
      console.log('-> Prices update')
      await pricesDbUpdate_1_3()
      console.log('-> Notices update')
      await noticesDbUpdate_1_3()
    }
  },
  '5.8.0': {
    description: '5.7.x to 5.8.x',
    process: async function () {
      console.log('-> Users update')
      await usersDbUpdate_5_8_0()
      console.log('-> Notices update')
      await noticesUpdate_5_8_0()
      console.log('-> Custom Commands update')
      await commandsUpdate_5_8_0()
      console.log('-> Keywords update')
      await keywordsUpdate_5_8_0()
      console.log('-> Price update')
      await priceUpdate_5_8_0()
      console.log('-> Playlist update')
      await playlistUpdate_5_8_0()
      console.log('-> Banned songs update')
      await bannedsongsUpdate_5_8_0()
      console.log('-> Alias update')
      await aliasUpdate_5_8_0()
      console.log('-> Configuration update')
      await configurationUpdate_5_8_0()
      console.log('-> CustomVars update')
      await customVariablesUpdate_5_8_0()
      console.log('-> Events update')
      await eventsUpdate_5_8_0()
      console.log('-> Permissions update')
      await permissionsUpdate_5_8_0()
      console.log('-> Widgets update')
      await widgetsUpdate_5_8_0()
      console.log('-> Moderation update')
      await moderationUpdate_5_8_0()
      console.log('-> Ranks update')
      await ranksUpdate_5_8_0()
    }
  }
}

async function main () {
  await migrate('1.1')
  await migrate('1.3')
  await migrate('5.8.0')
  console.log('=> EVERY PROCESS IS DONE')
  process.exit()
}

async function migrate (aVersion) {
  console.log('Migration from %s', migration[aVersion].description)
  await migration[aVersion].process()
  console.log('=> DONE')
}

main();

async function settingsRename(aOrig, aRenamed) {
  let setting = await DB.findOne({
    $where: function () {
      return this.type === 'settings' && Object.keys(this).indexOf(aOrig) >= 0;
    }
  })
  if (!_.isNull(setting)) {
    setting[aRenamed] = setting[aOrig]
    await DB.remove({ _id: setting._id})
    delete setting[aOrig]
    delete setting._id
    await DB.insert(setting)
  }
}

async function aliasDbUpdate_1_3() {
  let aliases = await DB.find({
    $where: function () {
      return this._id.startsWith('alias_')
    }
  })
  if (aliases.length === 0) return

  let aliasUpdate = { alias: []}
  _.each(aliases, function (alias) {
    DB.remove({_id: alias._id})
    aliasUpdate.alias.push({alias: alias.alias, command: alias.command, enabled: true})
  })
  await DB.update({ _id: 'alias' }, { $set: aliasUpdate }, { upsert: true })
}

async function pricesDbUpdate_1_3() {
  let prices = await DB.find({
    $where: function () {
      return this._id.startsWith('price_')
    }
  })
  if (prices.length === 0) return

  let pricesUpdate = { prices: []}
  _.each(prices, function (price) {
    DB.remove({_id: price._id})
    pricesUpdate.prices.push({price: price.price, command: price.command, enabled: true})
  })
  await DB.update({ _id: 'prices' }, { $set: pricesUpdate }, { upsert: true })
}

async function customCmdsDbUpdate_1_3() {
  let commands = await DB.find({
    $where: function () {
      return this._id.startsWith('customcmds_')
    }
  })
  if (commands.length === 0) return

  let commandsUpdate = { commands: []}
  _.each(commands, function (command) {
    commandsUpdate.commands.push({command: command.command, response: command.response, enabled: true})
  })
  await DB.remove({
    $where: function () {
      return this._id.startsWith('customcmds_')
    }
  }, { multi: true })
  await DB.update({ _id: 'commands' }, { $set: commandsUpdate }, { upsert: true })
}

async function removeFromDB(id) {
  await DB.remove({ _id: id })
}

async function keywordsDbUpdate_1_3() {
  let kwds = await DB.find({
    $where: function () {
      return this._id.startsWith('kwd_')
    }
  })
  if (kwds.length === 0) return

  let kwdsUpdate = { keywords: [] }
  _.each(kwds, function (kwd) {
    kwdsUpdate.keywords.push({keyword: kwd.keyword, response: kwd.response, enabled: true})
  })
  await DB.remove({
    $where: function () {
      return this._id.startsWith('kwd_')
    }
  }, { multi: true })
  await DB.update({ _id: 'keywords' }, { $set: kwdsUpdate }, { upsert: true })
}

async function noticesDbUpdate_1_3() {
  let list = await DB.find({
    $where: function () {
      return this._id.startsWith('notice_')
    }
  })
  if (list.length === 0) return

  let listUpdate = { notices: [] }
  _.each(list, function (o) {
    listUpdate.notices.push({text: o.text, time: o.time, id: o._id.split('_')[1], enabled: true})
  })
  await DB.remove({
    $where: function () {
      return this._id.startsWith('notice_')
    }
  }, { multi: true })
  await DB.update({ _id: 'notices' }, { $set: listUpdate }, { upsert: true })
}

async function usersDbUpdate_1_3() {
  let users = await DB.find({
    $where: function () {
      return this._id.startsWith('user_')
    }
  })
  if (users.length === 0) return

  let usersUpdate = { users: {} }
  _.each(users, function (user) {
    delete user._id

    let time = {
      message: (_.isUndefined(user.lastMessageTime)) ? 0 : user.lastMessageTime,
      watched: (_.isUndefined(user.watchTime)) ? 0 : user.watchTime,
      parted: (_.isUndefined(user.partedTime)) ? 0 : user.partedTime,
      points: (_.isUndefined(user.pointsGrantedAt)) ? 0 : user.pointsGrantedAt
    }
    delete user.lastMessageTime
    delete user.watchTime
    delete user.partedTime
    delete user.pointsGrantedAt
    user.time = time

    let is = {
      online: false,
      follower: (_.isUndefined(user.isFollower)) ? false : user.isFollower
    }
    delete user.isOnline
    delete user.isFollower
    user.is = is

    usersUpdate.users[user.username] = user
  })
  await DB.remove({
    $where: function () {
      return this._id.startsWith('user_')
    }
  }, { multi: true })
  await DB.update({ _id: 'users' }, { $set: usersUpdate }, { upsert: true })
}

async function usersDbUpdate_5_8_0() {
  let users = await DB.findOne({ _id: 'users' })
  if (users.users.length === 0) return

  _.each(users.users, async function (user) {
    user._table = 'users'
    await DB.update({ _table: 'users', username: user.username }, user, { upsert: true })
  })
  await DB.remove({ _id: 'users' })
}

async function noticesUpdate_5_8_0() {
  let notices = await DB.findOne({ _id: 'notices' })
  if (notices.notices.length === 0) return

  _.each(notices.notices, async function (notice) {
    delete notice.id
    notice._table = 'notices'
    await DB.update({ _table: 'notices', text: notice.text }, notice, { upsert: true })
  })
  await DB.remove({ _id: 'notices' })
}

async function commandsUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'commands' })
  if (items.commands.length === 0) return

  _.each(items.commands, async function (item) {
    delete item.id
    item._table = 'commands'
    await DB.update({ _table: 'commands', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'commands' })
}

async function keywordsUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'keywords' })
  if (items.keywords.length === 0) return

  _.each(items.keywords, async function (item) {
    delete item.id
    item._table = 'keywords'
    await DB.update({ _table: 'keywords', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'keywords' })
}

async function priceUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'prices' })
  if (items.prices.length === 0) return

  _.each(items.prices, async function (item) {
    item._table = 'prices'
    await DB.update({ _table: 'prices', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'prices' })
}

async function playlistUpdate_5_8_0() {
  let items = await DB.find({ type: 'playlist' })
  if (items.length === 0) return

  _.each(items, async function (item) {
    delete item.type
    delete item._id

    item._table = 'playlist'
    await DB.update({ _table: 'playlist', item }, item, { upsert: true })
  })
  await DB.remove({ type: 'playlist' }, { multi: true })
}

async function bannedsongsUpdate_5_8_0() {
  let items = await DB.find({ type: 'banned-song' })
  if (items.length === 0) return

  _.each(items, async function (item) {
    item.videoId = item._id
    item._table = 'bannedsong'

    delete item.type
    delete item._id

    await DB.update({ _table: 'bannedsong', item }, item, { upsert: true })
  })
  await DB.remove({ type: 'bannedsong' }, { multi: true })
}

async function aliasUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'alias' })
  if (items.alias.length === 0) return

  _.each(items.alias, async function (item) {
    delete item.id
    item._table = 'alias'
    await DB.update({ _table: 'alias', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'alias' })
}

async function configurationUpdate_5_8_0() {
  let items = await DB.find({ type: 'settings' })
  if (items.length === 0) return

  _.each(items, async function (item) {
    delete item.type
    delete item._id
    delete item.quiet

    item = {
      key: Object.keys(item)[0],
      value: item[Object.keys(item)[0]]
    }

    item._table = 'settings'
    await DB.update({ _table: 'settings', item }, item, { upsert: true })
  })
  await DB.remove({ type: 'settings' }, { multi: true })
}

async function customVariablesUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'customVariables' })
  if (items.variables.length === 0) return

  _.each(items.variables, async function (value, key) {
    let item = {
      _table: 'customvars',
      key: key,
      value: value
    }
    await DB.update({ _table: 'customvars', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'customVariables' })
}

async function eventsUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'Events' })
  if (items.events.length === 0) return

  _.each(items.events, async function (events, key) {
    let item = {
      _table: 'events',
      key: key,
      value: []
    }
    _.each(events, function (event) {
      item.value.push(event[0])
    })

    await DB.update({ _table: 'events', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'Events' })
}

async function permissionsUpdate_5_8_0() {
  let items = await DB.find({$where: function () { return this._id.startsWith('permission') }})
  if (items.length === 0) return

  _.each(items, async function (item, key) {
    delete item._id

    item = {
      _table: 'permissions',
      key: item.command,
      permission: item.permission
    }

    await DB.update({ _table: 'permissions', item }, item, { upsert: true })
  })
  await DB.remove({ $where: function () { return this._id.startsWith('permission') }})
}

async function moderationUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'moderation_lists' })

  let item = {
    _table: 'settings',
    key: 'blacklist',
    value: items.blacklist
  }
  await DB.update({ _table: 'settings', item }, item, { upsert: true })

  item = {
    _table: 'settings',
    key: 'whitelist',
    value: items.whitelist
  }
  await DB.update({ _table: 'settings', item }, item, { upsert: true })
  await DB.remove({ _id: 'moderation_lists' })
}

async function widgetsUpdate_5_8_0() {
  let items = await DB.findOne({ _id: 'dashboard_widgets' })
  if (items.widgets.length === 0) return

  _.each(items.widgets, async function (widget) {
    let item = {
      _table: 'widgets',
      widget: widget.split(':')[1],
      column: widget.split(':')[0]
    }
    await DB.update({ _table: 'widgets', item }, item, { upsert: true })
  })
  await DB.remove({ _id: 'dashboard_widgets' })
}

async function ranksUpdate_5_8_0() {
  let items = await DB.find({$where: function () { return this._id.startsWith('rank') }})
  if (items.length === 0) return

  _.each(items, async function (rank) {
    let item = {
      _table: 'ranks',
      hours: parseInt(rank.hours, 10),
      value: rank.rank
    }
    await DB.update({ _table: 'ranks', item }, item, { upsert: true })
  })
  await DB.remove({$where: function () { return this._id.startsWith('rank') }})
}
