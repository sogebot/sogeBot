'use strict'

var chalk = require('chalk')
var Database = require('nedb')
var constants = require('../constants')

var database = new Database({
  filename: 'db/notice.db',
  autoload: true
})
database.persistence.setAutocompactionInterval(60000)

function Notice (configuration) {
  this.lastNoticeSent = new Date().getTime()
  this.msgCountSent = global.parser.linesParsed

  if (global.configuration.get().systems.notice === true) {
    global.parser.register('!notice add', this.addNotice, constants.OWNER_ONLY)
    global.parser.register('!notice list', this.listNotices, constants.OWNER_ONLY)
    global.parser.register('!notice get', this.getNotice, constants.OWNER_ONLY)
    global.parser.register('!notice remove', this.delNotice, constants.OWNER_ONLY)
    global.parser.register('!notice', this.help, constants.OWNER_ONLY)

    // start interval for posting notices
    var self = this
    setInterval(function () {
      self.sendNotice()
    }, 60000)
  }

  console.log('Notice system loaded and ' + (global.configuration.get().systems.notice === true ? chalk.green('enabled') : chalk.red('disabled')))
}

Notice.prototype.sendNotice = function () {
  var timeIntervalInMs = global.configuration.get().systems.noticeTimeInterval * 60 * 1000
  var noticeMinChatMsg = global.configuration.get().systems.noticeMinChatMsg
  var now = new Date().getTime()

  if (now - this.lastNoticeSent >= timeIntervalInMs && global.parser.linesParsed - this.msgCountSent >= noticeMinChatMsg) {
    database.findOne({ }).sort({ time: 1 }).exec(function (err, item) {
      if (err) console.log(err)
      if (typeof item !== 'undefined' && item !== null) {
        database.update({_id: item._id}, {$set: {time: new Date().getTime()}}, {}, function () {
          global.client.action(global.configuration.get().twitch.owner, item.text)
        })
      }
    })

    // reset counters
    this.lastNoticeSent = new Date().getTime()
    this.msgCountSent = global.parser.linesParsed
  }
}

Notice.prototype.help = function () {
  var text = 'Usage: !notice add <text> | !notice get <id> | !notice remove <id> | !notice list'
  global.client.action(global.configuration.get().twitch.owner, text)
}

Notice.prototype.addNotice = function (user, text) {
  if (text.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Notice error: Cannot add empty notice.')
    return
  }

  database.find({ text: text }, function (err, docs) {
    if (err) console.log(err)
    if (docs.length === 0) { // it is safe to insert new notice?
      database.insert({text: text, time: new Date().getTime()}, function (err, newItem) {
        if (err) console.log(err)
        global.client.action(global.configuration.get().twitch.owner, 'Notice#' + newItem._id + ' succesfully added')
      })
    } else {
      global.client.action(global.configuration.get().twitch.owner, 'Notice error: Cannot add duplicate notice.')
    }
  })
}

Notice.prototype.listNotices = function () {
  database.find({}, function (err, docs) {
    if (err) console.log(err)
    var ids = []
    docs.forEach(function (e, i, ar) { ids.push(e._id) })
    var output = (docs.length === 0 ? 'Notice list is empty.' : 'Notice ID list: ' + ids.join(', ') + '.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Notice.prototype.getNotice = function (user, id) {
  if (id.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Notice error: Cannot get notice without id.')
    return
  }

  database.findOne({ _id: id }, function (err, docs) {
    if (err) console.log(err)
    var output = (typeof docs === 'undefined' || docs === null ? 'Notice#' + id + ' cannot be found.' : docs.text)
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

Notice.prototype.delNotice = function (user, id) {
  if (id.length < 1) {
    global.client.action(global.configuration.get().twitch.owner, 'Notice error: Cannot delete notice without id.')
    return
  }

  database.remove({_id: id}, {}, function (err, numRemoved) {
    if (err) console.log(err)
    var output = (numRemoved === 0 ? 'Notice#' + id + ' cannot be found.' : 'Notice#' + id + ' is succesfully deleted.')
    global.client.action(global.configuration.get().twitch.owner, output)
  })
}

module.exports = new Notice()
