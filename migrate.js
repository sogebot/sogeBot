'use strict'

var Database = require('nedb-promise')
var DB = new Database({
  filename: 'sogeBot.db',
  autoload: true
})

var migration = {
  '1.1': {
    description: '1.0 to 1.1',
    process: {
      settings_rename: async function () {
        console.log('-> Renaming settings')
        await settingsRename('volume', 'songs_volume')
        await settingsRename('duration', 'songs_duration')
        await settingsRename('shuffle', 'songs_shuffle')
      }
    }
  }
}

async function main () {
  await migrate('1.1')
  console.log('=> EVERY PROCESS IS DONE')
  process.exit()
}

async function migrate (aVersion) {
  console.log('Migration from %s', migration[aVersion].description)
  await migration[aVersion].process.settings_rename()
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