'use strict'

var _ = require('lodash')
var Database = require('nedb-promise')
var DB = new Database({
  filename: './sogeBot.db',
  autoload: true
})

async function clean_users () {
  let users = await DB.findOne({ _id: 'users' })
  let size = _.size(users.users)

  users = _.filter(users.users, function (o) {
    return !_.isNil(o.time) && !_.isNil(o.time.watched) && o.time.watched > 0
  })
  users = {
    _id: 'users',
    users: users
  }
  await DB.update({ _id: 'users' }, { $set: users }, { upsert: true })
  console.log('Cleaned ' + (size - _.size(users.users) + ' users'))
}

async function main () {
  console.log('Cleaning up users without watched time')
  await clean_users()
  console.log('- DONE')
}

main()