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
    }
  }
}

async function main () {
  await migrate('1.1')
  await migrate('1.3')
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
    aliasUpdate.alias.push({alias: alias.alias, command: alias.command})
  })
  await DB.update({ _id: 'alias' }, { $set: aliasUpdate }, { upsert: true })
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
    commandsUpdate.commands.push({command: command.command, response: command.response})
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
    kwdsUpdate.keywords.push({keyword: kwd.keyword, response: kwd.response})
  })
  await DB.remove({
    $where: function () {
      return this._id.startsWith('kwd_')
    }
  }, { multi: true })
  await DB.update({ _id: 'keywords' }, { $set: kwdsUpdate }, { upsert: true })
}

async function removeFromDB(id) {
  await DB.remove({ _id: id })
}