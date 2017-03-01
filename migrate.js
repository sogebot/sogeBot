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
      console.log('-> Alias table update')
      await aliasDbUpdate()
      console.log('-> Removing bet templates')
      await removeFromDB('bets_template')
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

async function aliasDbUpdate() {
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

async function removeFromDB(id) {
  await DB.remove({ _id: id })
}