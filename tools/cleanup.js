'use strict'

require('module-alias/register')

const _ = require('lodash')
const term = require('terminal-kit').terminal

const Database = require('../dest/databases/database')
const db = new Database(true)

global.log = {
  error: (msg) => console.error(msg)
}

function doYouHaveBackup () {
  term('DO YOU HAVE A BACKUP OF YOUR DB? [y|N]\n')
  term.yesOrNo({ yes: ['y'], no: ['n', 'ENTER'] }, (error, result) => {
    if (error) process.exit(error)

    if (result) {
      areYouSure()
    } else {
      term.red("'No' detected, backup your DB before cleanup!\n")
      process.exit()
    }
  })
}

function areYouSure () {
  term('DO YOU KNOW WHAT ARE YOU DOING? [y|N]\n')
  term.yesOrNo({ yes: ['y'], no: ['n', 'ENTER'] }, (error, result) => {
    if (error) process.exit(error)

    if (result) {
      main()
    } else {
      term.red("'No' detected, if you don't know what are you doing, ask on https://discordapp.com/invite/52KpmuH\n")
      process.exit()
    }
  })
}

async function cleanUsersWithoutTime () {
  let users = await db.engine.find('users')
  let size = _.size(users)

  users = _.filter(users, function (o) {
    return !_.isNil(o.time) && !_.isNil(o.time.watched) && o.time.watched > 0
  })

  await db.engine.remove('users', {})
  for (let user of users) {
    delete user._id
    await db.engine.insert('users', user)
  }
  console.log('Cleaned ' + (size - _.size(users) + ' users'))
}

async function cleanUsersDuplicates () {
  let users = await db.engine.find('users')
  let uniqueUsernames = []

  for (let user of users) {
    uniqueUsernames.push(user.username.toLowerCase())
  }

  let size = _.size(uniqueUsernames)
  uniqueUsernames = _.uniq(uniqueUsernames)

  let newUsers = []
  for (var i = 0, len = uniqueUsernames.length; i < len; i++) {
    let user = _.filter(users, (o) => o.username === uniqueUsernames[i])
    if (user.length > 0) newUsers.push(user[0])
    else continue
  }
  await db.engine.remove('users', {})
  for (let user of newUsers) {
    delete user._id
    await db.engine.insert('users', user)
  }
  console.log('Cleaned ' + (size - _.size(_.uniq(uniqueUsernames)) + ' users'))
}

async function cleanUsersWithoutID () {
  let users = await db.engine.find('users')
  let size = _.size(users)

  users = _.filter(users, (o) => !_.isNil(o.id))

  await db.engine.remove('users', {})
  for (let user of users) {
    delete user._id
    await db.engine.insert('users', user)
  }
  console.log('Cleaned ' + (size - _.size(users) + ' users'))
}

async function main () {
  console.log('Cleaning up duplicates users')
  await cleanUsersDuplicates()
  console.log('- DONE')

  console.log('Cleaning up users without watched time')
  await cleanUsersWithoutTime()
  console.log('- DONE')

  console.log('Cleaning up users without id')
  await cleanUsersWithoutID()
  console.log('- DONE')
  process.exit()
}

doYouHaveBackup()
