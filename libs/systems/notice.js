'use strict'

// 3rdparty libraries
var crypto = require('crypto')
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

function Notice () {
  this.lastNoticeSent = new Date().getTime()
  this.msgCountSent = global.parser.linesParsed

  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!notice add', this.add, constants.OWNER_ONLY)
    global.parser.register(this, '!notice list', this.list, constants.OWNER_ONLY)
    global.parser.register(this, '!notice get', this.get, constants.OWNER_ONLY)
    global.parser.register(this, '!notice remove', this.remove, constants.OWNER_ONLY)
    global.parser.register(this, '!notice', this.help, constants.OWNER_ONLY)

    global.parser.registerHelper('!notice')

    global.configuration.register('noticeInterval', 'notice.settings.noticeInterval', 'number', 10)
    global.configuration.register('noticeMsgReq', 'notice.settings.noticeMsgReq', 'number', 10)

    // start interval for posting notices
    var self = this
    setInterval(function () {
      self.send()
    }, 1000)

    this.webPanel()
  }
}

Notice.prototype.webPanel = function () {
  global.panel.addMenu({category: 'systems', name: 'Notices', id: 'notice'})

  global.panel.socketListening(this, 'getNoticeConfiguration', this.sendConfiguration)
  global.panel.socketListening(this, 'getNotices', this.sendNotices)
  global.panel.socketListening(this, 'deleteNotice', this.deleteNotice)
  global.panel.socketListening(this, 'createNotice', this.createNotice)
}

Notice.prototype.sendNotices = function (self, socket) {
  global.botDB.find({$where: function () { return this._id.startsWith('notice') }}, function (err, items) {
    if (err) { log.error(err) }
    items.forEach(function (e, i, ar) { e.id = e._id.split('_')[1] })
    socket.emit('Notices', items)
  })
}

Notice.prototype.deleteNotice = function (self, socket, data) {
  self.remove(self, null, data)
  self.sendNotices(self, socket)
}

Notice.prototype.createNotice = function (self, socket, data) {
  self.add(self, null, data.response)
  self.sendNotices(self, socket)
}

Notice.prototype.sendConfiguration = function (self, socket) {
  socket.emit('noticesConfiguration', {
    interval: global.configuration.getValue('noticeInterval'),
    msgreq: global.configuration.getValue('noticeMsgReq')
  })
}

Notice.prototype.send = function () {
  var timeIntervalInMs = global.configuration.getValue('noticeInterval') * 60 * 1000
  var noticeMinChatMsg = global.configuration.getValue('noticeMsgReq')
  var now = new Date().getTime()

  if (now - this.lastNoticeSent >= timeIntervalInMs && global.parser.linesParsed - this.msgCountSent >= noticeMinChatMsg) {
    var self = this
    global.botDB.findOne({$where: function () { return this._id.startsWith('notice') }}).sort({ time: 1 }).exec(function (err, item) {
      if (err) log.error(err)
      if (typeof item !== 'undefined' && item !== null) {
        global.botDB.update({_id: item._id}, {$set: {time: new Date().getTime()}}, {}, function () {
          // reset counters
          self.lastNoticeSent = new Date().getTime()
          self.msgCountSent = global.parser.linesParsed
          global.commons.sendMessage(item.text, {username: global.configuration.get().twitch.owner})
        })
      }
    })
  }
}

Notice.prototype.help = function (self, sender) {
  global.commons.sendMessage(global.translate('core.usage') + ': !notice add <text> | !notice get <id> | !notice remove <id> | !notice list', sender)
}

Notice.prototype.add = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w.+)$/)
    var hash = crypto.createHash('md5').update(parsed[0]).digest('hex').substring(0, 5)
    global.commons.insertIfNotExists({__id: 'notice_' + hash, _text: parsed[0], time: new Date().getTime(), success: 'notice.success.add', error: 'notice.failed.add'})
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.list = function (self, sender, text) {
  if (_.isNull(text.match(/^(\w+)$/))) {
    global.botDB.find({$where: function () { return this._id.startsWith('notice') }}, function (err, docs) {
      if (err) { log.error(err) }
      var list = []
      docs.forEach(function (e, i, ar) { list.push(e._id.split('_')[1]) })
      var output = (docs.length === 0 ? global.translate('notice.failed.list') : global.translate('notice.success.list') + ': ' + list.join(', '))
      global.commons.sendMessage(output, sender)
    })
  } else {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.get = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.botDB.findOne({_id: 'notice_' + parsed[0]}, function (err, docs) {
      if (err) log.error(err)
      var output = (typeof docs === 'undefined' || docs === null ? global.translate('notice.failed.notFound') : 'Notice#' + parsed[0] + ': ' + docs.text)
      global.commons.sendMessage(output, sender)
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

Notice.prototype.remove = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    global.commons.remove({__id: 'notice_' + parsed[1], success: 'notice.success.remove', error: 'notice.failed.notFound'})
  } catch (e) {
    global.commons.sendMessage(global.translate('notice.failed.parse'), sender)
  }
}

module.exports = new Notice()
